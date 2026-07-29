"use server";

import { db } from "@/configs";
import { JsonForms, userResponses } from "@/configs/schema";
import { and, eq, inArray } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import moment from "moment";
import { checkRateLimit } from "@/app/_lib/rateLimit";
import { sendEmail } from "@/app/_lib/email";
import {
  appendResponseRow,
  clearSheetData,
  deleteRowByMatch,
} from "@/app/_lib/googleSheets";
import {
  formatDateValue,
  getEffectiveType,
  getFieldLabel,
  getFieldName,
  getFieldRules,
  getFileTypes,
  isPageBreak,
  isPhoneField,
  normalizeType,
} from "@/app/_data/fieldUtils";
import { phoneLengthError } from "@/app/_data/dialCodes";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Server-side mirror of the client field validation. Returns an error message
// for the first field that violates a rule, or null if all values are valid.
function validateFieldRules(formFields, data) {
  for (const field of formFields || []) {
    if (isPageBreak(field)) continue;
    const raw = data?.[getFieldName(field)];
    const str = raw == null ? "" : String(raw);
    if (str.trim() === "") continue; // emptiness handled by required, if set
    const type = getEffectiveType(field);
    const rules = getFieldRules(field);
    const label = getFieldLabel(field);
    const fail = (msg) => rules.message || msg;
    if (type === "email" && !EMAIL_RE.test(str)) {
      return `"${label}": ${fail("please enter a valid email address")}`;
    }
    if (type === "digits" && isPhoneField(field)) {
      const err = phoneLengthError(str);
      if (err) return `"${label}": ${rules.message || err}`;
      continue; // length OK; skip generic digit rules for phones
    }
    if (type === "calendar") {
      const fmtDate = (d) => formatDateValue(d, rules.dateFormat);
      if (Number.isNaN(Date.parse(str)))
        return `"${label}": ${fail("please enter a valid date")}`;
      const belowMin = rules.minDate && str < rules.minDate;
      const aboveMax = rules.maxDate && str > rules.maxDate;
      if (belowMin || aboveMax)
        return `"${label}": ${fail(
          `allowed ${fmtDate(rules.minDate)} – ${fmtDate(rules.maxDate)}`
        )}`;
      continue;
    }
    if (type === "digits") {
      const num = parseFloat(str.replace(/[^0-9.\-]/g, ""));
      if (Number.isFinite(num)) {
        if (rules.min != null && num < rules.min)
          return `"${label}": ${fail(`must be at least ${rules.min}`)}`;
        if (rules.max != null && num > rules.max)
          return `"${label}": ${fail(`must be at most ${rules.max}`)}`;
      }
    }
    if (rules.minLength != null && str.length < rules.minLength)
      return `"${label}": ${fail(`must be at least ${rules.minLength} characters`)}`;
    if (rules.maxLength != null && str.length > rules.maxLength)
      return `"${label}": ${fail(`must be at most ${rules.maxLength} characters`)}`;
    if (rules.pattern) {
      try {
        if (!new RegExp(rules.pattern).test(str))
          return `"${label}": ${fail("please match the requested format")}`;
      } catch (e) {
        // Invalid regex authored by the owner — don't block the submission.
      }
    }
  }
  return null;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatEmailValue(v) {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return v.name || JSON.stringify(v);
  return String(v);
}

// Field-aware plain text for a value: calendar values are stored as ISO but
// rendered in the field's chosen display format for the sheet/email.
function fieldDisplay(field, value) {
  if (normalizeType(field?.fieldType) === "calendar" && value) {
    const fmt = getFieldRules(field).dateFormat;
    if (fmt) return formatDateValue(value, fmt);
  }
  return formatEmailValue(value);
}

// Best-effort email to the form owner summarizing a new response.
async function notifyOwner(form, data, responseId) {
  const to = form.createdBy;
  if (!to || to === "anonymous") return;

  let parsed = {};
  try {
    parsed = JSON.parse(form.jsonform);
  } catch (e) {
    parsed = {};
  }
  const title = parsed.formTitle || "your form";
  // Page breaks are layout markers, not real fields — keep them out of the email.
  const fields = (parsed?.formFields || parsed?.form || []).filter(
    (f) => !isPageBreak(f)
  );
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  const rows = fields
    .map((f) => {
      const key = getFieldName(f);
      const value = data?.[key];
      let cell;
      if (value && typeof value === "object" && value.dataUrl && responseId) {
        const url = `${base}api/file/${responseId}/${encodeURIComponent(key)}`;
        cell = `<a href="${url}">${escapeHtml(value.name || "Download file")}</a>`;
      } else {
        cell = escapeHtml(fieldDisplay(f, value));
      }
      return `<tr><td style="padding:6px 10px;font-weight:600;border-bottom:1px solid #eee;">${escapeHtml(
        getFieldLabel(f)
      )}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;">${cell}</td></tr>`;
    })
    .join("");

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:600px;">
      <h2>New response to "${escapeHtml(title)}"</h2>
      <table style="border-collapse:collapse;width:100%;">${rows}</table>
      <p style="margin-top:16px;">
        <a href="${base}dashboard/responses">View all responses</a>
      </p>
    </div>`;

  await sendEmail({ to, subject: `New response: ${title}`, html });
}

// Confirmation email to the respondent — only sent for sign-in-gated forms,
// where we reliably have (and have consented to) the submitter's email.
async function notifyRespondent(form, submitterEmail) {
  if (!submitterEmail || submitterEmail === "anonymous") return;
  let parsed = {};
  try {
    parsed = JSON.parse(form.jsonform);
  } catch (e) {
    parsed = {};
  }
  const title = parsed.formTitle || "the form";
  const msg = form.thankYouMessage || "Thank you!";
  const desc = form.thankYouDescription || "Your response has been recorded.";
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:600px;">
      <h2>${escapeHtml(msg)}</h2>
      <p>${escapeHtml(desc)}</p>
      <p style="color:#666;">This confirms your submission to "${escapeHtml(
        title
      )}".</p>
    </div>`;
  await sendEmail({
    to: submitterEmail,
    subject: `Your response to "${title}"`,
    html,
  });
}

// Appends the response as a row to the form's linked Google Sheet (if any).
async function syncToSheet(form, data, responseId) {
  if (!form.googleSheetId) return;
  let parsed = {};
  try {
    parsed = JSON.parse(form.jsonform);
  } catch (e) {
    parsed = {};
  }
  const fields = (parsed?.formFields || parsed?.form || []).filter(
    (f) => !isPageBreak(f)
  );
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";

  // Sheets (USER_ENTERED) treats a cell starting with = + - @ as a formula, so
  // a value like a phone "+91 98…" errors. Prefix a literal apostrophe to force
  // plain text (the apostrophe isn't shown). Never applied to our own formulas.
  const sheetSafe = (v) => {
    const s = v == null ? "" : String(v);
    return /^[=+\-@]/.test(s) ? `'${s}` : s;
  };

  const cell = (field) => {
    const key = getFieldName(field);
    const value = data?.[key];
    // File uploads: link to the file-serving endpoint (data URLs are too big
    // for a cell), rendered as a clickable HYPERLINK.
    if (value && typeof value === "object" && value.dataUrl && responseId) {
      const url = `${base}api/file/${responseId}/${encodeURIComponent(key)}`;
      const name = String(value.name || "file").replace(/"/g, "'");
      return `=HYPERLINK("${url}","${name}")`;
    }
    return sheetSafe(fieldDisplay(field, value));
  };

  // "Response ID" lets us find and delete this exact row later.
  const header = [
    ...fields.map((f) => sheetSafe(getFieldLabel(f))),
    "Submitted",
    "Response ID",
  ];
  const row = [
    ...fields.map(cell),
    moment().format("YYYY-MM-DD HH:mm:ss"),
    String(responseId ?? ""),
  ];
  await appendResponseRow(form.googleSheetId, header, row);
}

const MAX_PAYLOAD_BYTES = 3_500_000; // ~3.5MB total submission
const MAX_FILE_DATAURL = 2_900_000; // ~2MB file as base64

async function getClientIp() {
  try {
    const h = await headers();
    return (
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "unknown"
    );
  } catch (e) {
    return "unknown";
  }
}

async function requireEmail() {
  const user = await currentUser();
  const email =
    user?.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress || user?.emailAddresses?.[0]?.emailAddress;
  if (!email) throw new Error("Unauthorized");
  return email;
}

async function ownsForm(email, formId) {
  const rows = await db
    .select()
    .from(JsonForms)
    .where(
      and(eq(JsonForms.id, Number(formId)), eq(JsonForms.createdBy, email))
    );
  return rows.length > 0;
}

export async function getResponses(formId) {
  const email = await requireEmail();
  if (!(await ownsForm(email, formId))) throw new Error("Unauthorized");
  return db
    .select()
    .from(userResponses)
    .where(eq(userResponses.formReference, Number(formId)));
}

export async function getResponseCount(formId) {
  const email = await requireEmail();
  if (!(await ownsForm(email, formId))) return 0;
  const rows = await db
    .select()
    .from(userResponses)
    .where(eq(userResponses.formReference, Number(formId)));
  return rows.length;
}

// Public submission. Enforces the form's settings (closed / limits / sign-in)
// on the server so they can't be bypassed from the client.
export async function submitResponse(formId, data, meta = {}) {
  // Honeypot: real users never fill this hidden field. Pretend success so bots
  // don't learn they were blocked, but store nothing.
  if (meta?.honeypot && String(meta.honeypot).trim() !== "") {
    return { ok: true };
  }

  // Rate limit by IP + form (max 5 submissions / minute).
  const ip = await getClientIp();
  if (!checkRateLimit(`submit:${ip}:${formId}`, 5, 60000)) {
    return { error: "Too many submissions. Please wait a moment and try again." };
  }

  // Payload + per-file size guards.
  const serialized = typeof data === "string" ? data : JSON.stringify(data);
  if (serialized.length > MAX_PAYLOAD_BYTES) {
    return { error: "Submission is too large." };
  }
  if (data && typeof data === "object") {
    for (const value of Object.values(data)) {
      if (
        value &&
        typeof value === "object" &&
        typeof value.dataUrl === "string" &&
        value.dataUrl.length > MAX_FILE_DATAURL
      ) {
        return { error: "An uploaded file is too large (max 2MB)." };
      }
    }
  }

  const rows = await db
    .select()
    .from(JsonForms)
    .where(eq(JsonForms.id, Number(formId)));
  const form = rows[0];
  if (!form) return { error: "Form not found." };

  if (form.closed) {
    return { error: "This form is no longer accepting responses." };
  }

  // Enforce per-field validation rules + allowed file types on the server
  // (client checks are only hints and can be bypassed).
  try {
    const parsedForm = JSON.parse(form.jsonform);
    const formFields = parsedForm?.formFields || parsedForm?.form || [];
    const ruleError = validateFieldRules(formFields, data);
    if (ruleError) return { error: ruleError };
    for (const f of formFields) {
      if (normalizeType(f.fieldType) !== "file") continue;
      const allowed = getFileTypes(f);
      if (!allowed.length) continue;
      const v = data?.[getFieldName(f)];
      if (v && v.name) {
        const ext = String(v.name).split(".").pop()?.toLowerCase();
        if (!allowed.includes(ext)) {
          return {
            error: `"${getFieldLabel(f)}" only accepts: ${allowed.join(", ")}`,
          };
        }
      }
    }
  } catch (e) {
    /* ignore malformed form json */
  }

  let submitterEmail = "anonymous";
  const needsAuth = form.enabledSignIn || form.limitOneResponse;
  if (needsAuth) {
    const user = await currentUser();
    if (!user) return { error: "Please sign in to submit this form." };
    submitterEmail =
      user?.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)
        ?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      "anonymous";
  }

  if (form.maxResponses) {
    const existing = await db
      .select()
      .from(userResponses)
      .where(eq(userResponses.formReference, Number(formId)));
    if (existing.length >= form.maxResponses) {
      return { error: "This form has reached its response limit." };
    }
  }

  if (form.limitOneResponse) {
    const mine = await db
      .select()
      .from(userResponses)
      .where(
        and(
          eq(userResponses.formReference, Number(formId)),
          eq(userResponses.createdBy, submitterEmail)
        )
      );
    if (mine.length > 0) {
      return { error: "You have already submitted this form." };
    }
  }

  const inserted = await db
    .insert(userResponses)
    .values({
      jsonResponse: typeof data === "string" ? data : JSON.stringify(data),
      createdAt: moment().format("DD/MM/yyyy"),
      createdBy: submitterEmail,
      formReference: Number(formId),
    })
    .returning({ id: userResponses.id });
  const responseId = inserted?.[0]?.id;

  // Fire-and-forget the emails so the submitter isn't blocked on the (slow)
  // email API round-trips. Works on a persistent server; on serverless hosts
  // that freeze after the response, use next/after or an await instead.
  (async () => {
    try {
      await notifyOwner(form, data, responseId);
      // Respondent confirmation only for sign-in-gated forms (we have their email).
      if (form.enabledSignIn) {
        await notifyRespondent(form, submitterEmail);
      }
    } catch (e) {
      console.error("Notification email failed:", e);
    }
    try {
      await syncToSheet(form, data, responseId);
    } catch (e) {
      console.error("Google Sheet sync failed:", e);
    }
  })();

  return { ok: true };
}

export async function deleteResponse(responseId) {
  const email = await requireEmail();
  const rows = await db
    .select()
    .from(userResponses)
    .where(eq(userResponses.id, Number(responseId)));
  const resp = rows[0];
  if (!resp) throw new Error("Not found");
  if (!(await ownsForm(email, resp.formReference)))
    throw new Error("Unauthorized");

  // Look up the form (for its linked sheet) before deleting the response.
  const formRows = await db
    .select()
    .from(JsonForms)
    .where(eq(JsonForms.id, resp.formReference));
  const form = formRows[0];

  await db
    .delete(userResponses)
    .where(eq(userResponses.id, Number(responseId)));

  // Best-effort: remove the matching row from the linked Google Sheet.
  if (form?.googleSheetId) {
    try {
      await deleteRowByMatch(form.googleSheetId, "Response ID", responseId);
    } catch (e) {
      console.error("Sheet row delete failed:", e);
    }
  }

  return { ok: true };
}

// Deletes a specific set of responses (bulk). Verifies the caller owns each
// response's form, then removes them and their linked sheet rows (best-effort).
export async function deleteResponses(ids) {
  const email = await requireEmail();
  const list = [
    ...new Set(
      (Array.isArray(ids) ? ids : [])
        .map(Number)
        .filter((n) => Number.isFinite(n))
    ),
  ];
  if (list.length === 0) return { ok: true, deleted: 0 };

  const rows = await db
    .select()
    .from(userResponses)
    .where(inArray(userResponses.id, list));
  if (rows.length === 0) return { ok: true, deleted: 0 };

  // Verify ownership once per distinct form referenced by the selection.
  const formIds = [...new Set(rows.map((r) => r.formReference))];
  const ownedForms = {};
  for (const fid of formIds) {
    const f = await db
      .select()
      .from(JsonForms)
      .where(and(eq(JsonForms.id, fid), eq(JsonForms.createdBy, email)));
    if (f[0]) ownedForms[fid] = f[0];
  }
  const deletable = rows.filter((r) => ownedForms[r.formReference]);
  if (deletable.length === 0) throw new Error("Unauthorized");

  const delIds = deletable.map((r) => r.id);
  await db.delete(userResponses).where(inArray(userResponses.id, delIds));

  for (const r of deletable) {
    const sheetId = ownedForms[r.formReference]?.googleSheetId;
    if (sheetId) {
      try {
        await deleteRowByMatch(sheetId, "Response ID", r.id);
      } catch (e) {
        console.error("Sheet row delete failed:", e);
      }
    }
  }
  return { ok: true, deleted: delIds.length };
}

// Deletes every response for a form the caller owns. Also clears the linked
// Google Sheet's data rows (keeping the header). Returns the number deleted.
export async function deleteAllResponses(formId) {
  const email = await requireEmail();
  if (!(await ownsForm(email, formId))) throw new Error("Unauthorized");

  const existing = await db
    .select({ id: userResponses.id })
    .from(userResponses)
    .where(eq(userResponses.formReference, Number(formId)));

  await db
    .delete(userResponses)
    .where(eq(userResponses.formReference, Number(formId)));

  const formRows = await db
    .select()
    .from(JsonForms)
    .where(eq(JsonForms.id, Number(formId)));
  const sheetId = formRows[0]?.googleSheetId;
  if (sheetId) {
    try {
      await clearSheetData(sheetId);
    } catch (e) {
      console.error("Sheet clear failed:", e);
    }
  }

  return { ok: true, deleted: existing.length };
}
