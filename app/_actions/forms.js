"use server";

import { db } from "@/configs";
import { JsonForms, userResponses, Users } from "@/configs/schema";
import { and, desc, eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { AiChatSession } from "@/configs/AiModal";
import moment from "moment";

const FREE_FORM_LIMIT = 3;

// Guards uuid lookups so a non-uuid value (e.g. an old integer id) returns null
// instead of throwing a Postgres cast error.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PROMPT = `

Based on the description above, generate a form as a JSON object with EXACTLY this structure:
{
  "formTitle": "string",
  "formSubheading": "string",
  "formFields": [
    {
      "fieldName": "camelCaseKey",
      "formLabel": "Human readable label",
      "placeholder": "placeholder text (omit for choice fields)",
      "fieldType": "one of: text, textarea, email, digits, calendar, select, radiogroup, checkbox, rating, file",
      "fieldRequired": true,
      "options": [ { "label": "Option label", "value": "optionValue" } ],
      "fileTypes": ["jpg", "png"]
    }
  ]
}

Field type rules:
- "select" for dropdowns, "radiogroup" for single-choice, "checkbox" for multi-select.
- "rating" for star ratings, "calendar" for dates, "email" for email addresses.
- "digits" for phone/mobile numbers or numeric input.
- "file" for ANY file, image, document, resume, or upload field — NEVER use a text field or ask the user to paste a link for uploads.

File field rules:
- Every "file" field MUST include a non-empty "fileTypes" array of allowed lowercase extensions (no dot), chosen from the field's context. Examples: an image/screenshot/photo field → ["jpg","jpeg","png","gif","webp"]; a resume/CV or document → ["pdf","doc","docx"]; a spreadsheet → ["xls","xlsx","csv"]. When unsure, allow common documents: ["pdf","doc","docx"].
- Omit "fileTypes" for every non-file field.
- "textarea" for long/multi-line text, "text" for short text.

Options rules:
- Include the "options" array ONLY for "select", "radiogroup", and "checkbox" fields.
- Every option MUST have both a non-empty "label" and "value".

Return ONLY the raw JSON object — no markdown fences, no comments, no explanation.`;

// Returns the signed-in user's primary email, or throws if not authenticated.
async function requireEmail() {
  const user = await currentUser();
  const email =
    user?.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress || user?.emailAddresses?.[0]?.emailAddress;
  if (!email) throw new Error("Unauthorized");
  return email;
}

// Fetches an owned form by its integer primary key (used by owner actions that
// receive the numeric id, not the public uuid).
async function getOwnedFormById(email, id) {
  const rows = await db
    .select()
    .from(JsonForms)
    .where(and(eq(JsonForms.id, Number(id)), eq(JsonForms.createdBy, email)));
  return rows[0] || null;
}

// True when a free (non-paid) user has already hit the form cap. Enforced on
// both create and duplicate so neither path can exceed the limit.
async function isAtFreeLimit(email) {
  const forms = await db
    .select()
    .from(JsonForms)
    .where(eq(JsonForms.createdBy, email));
  const userRows = await db
    .select()
    .from(Users)
    .where(eq(Users.email, email));
  const isPaid = userRows?.[0]?.paymentSuccess === true;
  return !isPaid && forms.length >= FREE_FORM_LIMIT;
}

export async function getMyForms() {
  const email = await requireEmail();
  return db
    .select()
    .from(JsonForms)
    .where(eq(JsonForms.createdBy, email))
    .orderBy(desc(JsonForms.id));
}

// `id` here is the form's uuid (used in URLs), not the integer primary key.
export async function getForm(id) {
  if (!UUID_RE.test(String(id))) return null;
  const email = await requireEmail();
  const rows = await db
    .select()
    .from(JsonForms)
    .where(and(eq(JsonForms.uuid, id), eq(JsonForms.createdBy, email)));
  return rows[0] || null;
}

// Public: anyone can load a form in order to fill it out (by uuid).
export async function getPublicForm(id) {
  if (!UUID_RE.test(String(id))) return null;
  const rows = await db
    .select()
    .from(JsonForms)
    .where(eq(JsonForms.uuid, id));
  return rows[0] || null;
}

export async function createForm(description) {
  const email = await requireEmail();
  if (!description?.trim()) return { error: "EMPTY" };

  // Enforce the free-plan limit on the server (client checks are advisory).
  if (await isAtFreeLimit(email)) {
    return { error: "LIMIT" };
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error("createForm: GEMINI_API_KEY is not set");
    return { error: "AI_FAILED" };
  }

  let text;
  try {
    const result = await AiChatSession.sendMessage(
      "Description: " + description + PROMPT
    );
    text = result.response.text();
  } catch (e) {
    // Surface the real reason in server logs (Vercel Functions) — bad/expired
    // key, quota, model access, etc. — instead of an opaque server crash.
    console.error("createForm: Gemini request failed:", e?.message || e);
    return { error: "AI_FAILED" };
  }
  if (!text) return { error: "AI_FAILED" };

  // Strip stray markdown fences the model sometimes adds despite the prompt.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Only persist output that actually parses. A truncated/garbled generation
  // must never be saved — a bad jsonform would otherwise crash every consumer
  // that JSON.parse()s it (dashboard, editor, responses).
  try {
    JSON.parse(cleaned);
  } catch (e) {
    console.error("createForm: AI returned invalid JSON:", e?.message || e);
    return { error: "AI_FAILED" };
  }

  const resp = await db
    .insert(JsonForms)
    .values({
      jsonform: cleaned,
      createdBy: email,
      createdAt: moment().format("DD/MM/yyyy"),
    })
    .returning({ id: JsonForms.id, uuid: JsonForms.uuid });

  return { id: resp[0].id, uuid: resp[0].uuid };
}

export async function updateFormJson(id, jsonform) {
  const email = await requireEmail();
  await db
    .update(JsonForms)
    .set({
      jsonform:
        typeof jsonform === "string" ? jsonform : JSON.stringify(jsonform),
    })
    .where(and(eq(JsonForms.id, Number(id)), eq(JsonForms.createdBy, email)));
  return { ok: true };
}

export async function updateFormColumn(id, column, value) {
  const email = await requireEmail();
  const allowed = ["theme", "background", "style", "enabledSignIn"];
  if (!allowed.includes(column)) throw new Error("Invalid column");
  const v =
    column === "style" && typeof value !== "string"
      ? JSON.stringify(value)
      : value;
  await db
    .update(JsonForms)
    .set({ [column]: v })
    .where(and(eq(JsonForms.id, Number(id)), eq(JsonForms.createdBy, email)));
  return { ok: true };
}

export async function updateFormSettings(id, settings) {
  const email = await requireEmail();
  const allowed = [
    "closed",
    "maxResponses",
    "limitOneResponse",
    "thankYouMessage",
    "thankYouDescription",
    "redirectUrl",
    "googleSheetId",
  ];
  const patch = {};
  for (const key of allowed) {
    if (key in settings) patch[key] = settings[key];
  }
  if ("maxResponses" in patch) {
    const n = parseInt(patch.maxResponses, 10);
    patch.maxResponses = Number.isFinite(n) && n > 0 ? n : null;
  }
  if ("googleSheetId" in patch) {
    // Accept either a raw ID or a full Google Sheets URL.
    const v = (patch.googleSheetId || "").trim();
    const match = v.match(/\/d\/([a-zA-Z0-9-_]+)/);
    patch.googleSheetId = match ? match[1] : v || null;
  }
  if (Object.keys(patch).length === 0) return { ok: true };
  await db
    .update(JsonForms)
    .set(patch)
    .where(and(eq(JsonForms.id, Number(id)), eq(JsonForms.createdBy, email)));
  return { ok: true };
}

export async function renameForm(id, title) {
  const email = await requireEmail();
  const form = await getOwnedFormById(email, id);
  if (!form) throw new Error("Not found");
  let parsed = {};
  try {
    parsed = JSON.parse(form.jsonform || "{}");
  } catch (e) {
    parsed = {};
  }
  const updated = { ...parsed, formTitle: title };
  await db
    .update(JsonForms)
    .set({ jsonform: JSON.stringify(updated) })
    .where(and(eq(JsonForms.id, Number(id)), eq(JsonForms.createdBy, email)));
  return { ok: true };
}

export async function duplicateForm(id) {
  const email = await requireEmail();
  // Duplicating creates a new form, so it counts against the free-plan cap.
  if (await isAtFreeLimit(email)) return { error: "LIMIT" };
  const form = await getOwnedFormById(email, id);
  if (!form) throw new Error("Not found");
  let parsed = {};
  try {
    parsed = JSON.parse(form.jsonform || "{}");
  } catch (e) {
    parsed = {};
  }
  const copy = {
    ...parsed,
    formTitle: (parsed.formTitle || "Untitled Form") + " (Copy)",
  };
  await db.insert(JsonForms).values({
    jsonform: JSON.stringify(copy),
    theme: form.theme,
    background: form.background,
    style: form.style,
    enabledSignIn: form.enabledSignIn,
    createdBy: email,
    createdAt: moment().format("DD/MM/yyyy"),
  });
  return { ok: true };
}

export async function deleteForm(id) {
  const email = await requireEmail();
  await db
    .delete(userResponses)
    .where(eq(userResponses.formReference, Number(id)));
  await db
    .delete(JsonForms)
    .where(and(eq(JsonForms.id, Number(id)), eq(JsonForms.createdBy, email)));
  return { ok: true };
}
