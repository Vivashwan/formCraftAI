// Canonical accessors and helpers for the loosely-typed, AI-generated form
// fields. Gemini emits inconsistent key names across generations (fieldName vs
// formFieldName, label vs formLabel, options vs items, etc.), so every consumer
// (renderer, responses sheet, editors) reads through these helpers instead of
// touching raw keys. New/edited fields are written with the canonical keys that
// each accessor checks first.

export const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long Text" },
  { value: "email", label: "Email" },
  { value: "digits", label: "Number" },
  { value: "calendar", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "radiogroup", label: "Radio Group" },
  { value: "checkbox", label: "Checkbox (multi-select)" },
  { value: "rating", label: "Star Rating" },
  { value: "file", label: "File Upload" },
];

const OPTION_TYPES = ["select", "radiogroup", "checkbox"];

export function normalizeType(fieldType) {
  const t = (fieldType || "").toString().toLowerCase().trim();
  if (["input", "input-text", "text", "string", "textfield", ""].includes(t))
    return "text";
  if (["textarea", "long-text", "longtext", "paragraph"].includes(t))
    return "textarea";
  if (["email", "mail"].includes(t)) return "email";
  if (["digits", "number", "numeric", "tel", "phone", "mobile"].includes(t))
    return "digits";
  if (["calendar", "date", "datepicker", "datetime"].includes(t))
    return "calendar";
  if (["select", "dropdown", "combobox"].includes(t)) return "select";
  if (["radiogroup", "radio", "radio-group", "radiogroupitem"].includes(t))
    return "radiogroup";
  if (
    ["checkbox", "checkboxes", "multiselect", "multi-select"].includes(t)
  )
    return "checkbox";
  if (["rating", "star", "stars", "star-rating"].includes(t)) return "rating";
  if (["file", "upload", "attachment", "fileupload"].includes(t)) return "file";
  return t || "text";
}

export const needsOptions = (type) => OPTION_TYPES.includes(normalizeType(type));

// Optional per-field validation rules, normalized (numbers or null).
export function getFieldRules(field) {
  const v = field?.validation || {};
  const toInt = (x) => {
    const n = parseInt(x, 10);
    return Number.isFinite(n) ? n : null;
  };
  const toNum = (x) => {
    const n = parseFloat(x);
    return Number.isFinite(n) ? n : null;
  };
  return {
    minLength: toInt(v.minLength),
    maxLength: toInt(v.maxLength),
    min: toNum(v.min),
    max: toNum(v.max),
    minDate: v.minDate ? String(v.minDate) : null,
    maxDate: v.maxDate ? String(v.maxDate) : null,
    dateFormat: v.dateFormat ? String(v.dateFormat) : null,
    pattern: v.pattern ? String(v.pattern) : null,
    message: v.message ? String(v.message) : null,
  };
}

// Display-format choices for a calendar field. The value is stored as ISO
// (YYYY-MM-DD); the owner picks how it's shown in responses/sheet/email.
export const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2026)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2026)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2026-12-31)" },
  { value: "DD-MM-YYYY", label: "DD-MM-YYYY (31-12-2026)" },
  { value: "DD MMM YYYY", label: "DD MMM YYYY (31 Dec 2026)" },
];

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Formats an ISO date string ("YYYY-MM-DD") into the chosen display format.
// Falls back to the raw value if it isn't an ISO date.
export function formatDateValue(value, format) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ""));
  if (!m) return value == null ? "" : String(value);
  const [, y, mo, d] = m;
  switch (format) {
    case "MM/DD/YYYY":
      return `${mo}/${d}/${y}`;
    case "YYYY-MM-DD":
      return `${y}-${mo}-${d}`;
    case "DD-MM-YYYY":
      return `${d}-${mo}-${y}`;
    case "DD MMM YYYY":
      return `${d} ${MONTHS_SHORT[Number(mo) - 1] || mo} ${y}`;
    case "DD/MM/YYYY":
    default:
      return `${d}/${mo}/${y}`;
  }
}

function normalizeValidation(v) {
  if (!v || typeof v !== "object") return undefined;
  const out = {};
  for (const k of [
    "minLength",
    "maxLength",
    "min",
    "max",
    "minDate",
    "maxDate",
    "dateFormat",
    "pattern",
    "message",
  ]) {
    if (v[k] !== undefined && v[k] !== null && String(v[k]).trim() !== "") {
      out[k] = v[k];
    }
  }
  return Object.keys(out).length ? out : undefined;
}

// Allowed upload extensions for a file field, normalized to lowercase, no dot.
export function getFileTypes(field) {
  const raw = field?.fileTypes;
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
    ? raw.split(",")
    : [];
  return list
    .map((t) => String(t).trim().replace(/^\./, "").toLowerCase())
    .filter(Boolean);
}

// Page breaks split a form into multiple steps. They are marker entries in the
// fields array, not real inputs.
export function isPageBreak(field) {
  const t = (field?.fieldType || "").toString().toLowerCase().trim();
  return ["pagebreak", "page-break", "page", "section", "step"].includes(t);
}

// Splits fields into pages at each page-break marker (markers are dropped).
export function splitIntoPages(fields) {
  const pages = [[]];
  (fields || []).forEach((f) => {
    if (isPageBreak(f)) pages.push([]);
    else pages[pages.length - 1].push(f);
  });
  return pages;
}

export function getFieldName(field) {
  return (
    field?.fieldName ||
    field?.formFieldName ||
    field?.formField ||
    field?.name ||
    field?.formLabel ||
    field?.label ||
    ""
  );
}

// Resolves the type to actually render/validate. The AI often mislabels an
// email or phone field as generic "text", so for text fields we infer intent
// from the field's name/label.
export function getEffectiveType(field) {
  const t = normalizeType(field?.fieldType);
  if (t !== "text") return t;
  // Substring match (no word boundaries) so camelCase names like
  // "mobileNumber" are caught after lowercasing.
  const hint = `${getFieldName(field)} ${getFieldLabel(field)}`.toLowerCase();
  if (/e-?mail/.test(hint)) return "email";
  if (/phone|mobile|whatsapp|telephone/.test(hint)) return "digits";
  return "text";
}

// True when a field is meant for a phone number (so we show a dialing-code
// picker). Detected by label/name intent, since "digits" also covers plain
// numbers like age or quantity, which should stay a single input.
export function isPhoneField(field) {
  const hint = `${getFieldName(field)} ${getFieldLabel(field)}`.toLowerCase();
  return /phone|mobile|whatsapp|telephone|contact\s*number/.test(hint);
}

export function getFieldLabel(field) {
  return (
    field?.formLabel ||
    field?.label ||
    field?.fieldLabel ||
    getFieldName(field) ||
    ""
  );
}

export function getFieldPlaceholder(field) {
  return field?.placeholderName || field?.placeholder || "";
}

export function getFieldRequired(field) {
  return (
    field?.fieldRequired ?? field?.isRequired ?? field?.required ?? false
  );
}

// Returns options normalized to [{ label, value }].
export function getFieldOptions(field) {
  const raw =
    field?.options ||
    field?.items ||
    field?.radiogroupItems ||
    field?.checkboxItems ||
    field?.selectItems ||
    field?.choices ||
    [];

  if (!Array.isArray(raw)) return [];

  return raw.map((o) => {
    if (o && typeof o === "object") {
      const label =
        o.label ??
        o.radiogroupItemLabel ??
        o.checkboxItemLabel ??
        o.selectItemLabel ??
        o.optionLabel ??
        o.name ??
        o.text ??
        o.title ??
        o.value ??
        "";
      const value =
        o.value ??
        o.radiogroupItemValue ??
        o.checkboxItemValue ??
        o.selectItemValue ??
        o.optionValue ??
        label;
      return { label: String(label), value: String(value) };
    }
    return { label: String(o), value: String(o) };
  });
}

// Conditional visibility rule: show a field only when another field's answer
// matches. Returns null when there's no valid condition.
export function getFieldCondition(field) {
  const c = field?.condition;
  if (!c || !c.field) return null;
  return {
    field: c.field,
    operator: c.operator || "equals",
    value: c.value ?? "",
  };
}

function normalizeCondition(condition) {
  if (!condition || !condition.field) return null;
  return {
    field: condition.field,
    operator: condition.operator || "equals",
    value: condition.value ?? "",
  };
}

// Builds a field object using the canonical, highest-precedence keys so all
// accessors resolve it consistently regardless of legacy keys elsewhere.
export function makeField({
  fieldName,
  label,
  placeholder = "",
  fieldType,
  required = false,
  options = [],
  condition = null,
  fileTypes = [],
  validation = null,
}) {
  const type = normalizeType(fieldType);
  const field = {
    fieldName: fieldName || label || "field",
    formLabel: label || fieldName || "Field",
    placeholderName: placeholder,
    fieldType: type,
    fieldRequired: !!required,
  };
  if (needsOptions(type)) {
    field.options = (options || [])
      .filter((o) => (o.label ?? o.value ?? "").toString().trim() !== "")
      .map((o) => ({
        label: String(o.label ?? o.value),
        value: String(o.value ?? o.label),
      }));
  }
  if (type === "file") {
    const ft = getFileTypes({ fileTypes });
    if (ft.length) field.fileTypes = ft;
  }
  const c = normalizeCondition(condition);
  if (c) field.condition = c;
  const val = normalizeValidation(validation);
  if (val) field.validation = val;
  return field;
}

// Applies an edit patch onto an existing field in place, writing canonical keys
// and clearing stale option-variant keys so accessors stay consistent.
export function applyFieldPatch(field, patch) {
  const type = normalizeType(patch.fieldType ?? field.fieldType);
  field.formLabel = patch.label;
  field.placeholderName = patch.placeholder ?? "";
  field.fieldType = type;
  field.fieldRequired = !!patch.required;

  // Remove every option-variant key first, then set canonical options if needed.
  delete field.options;
  delete field.items;
  delete field.radiogroupItems;
  delete field.checkboxItems;
  delete field.selectItems;
  delete field.choices;

  if (needsOptions(type)) {
    field.options = (patch.options || [])
      .filter((o) => (o.label ?? o.value ?? "").toString().trim() !== "")
      .map((o) => ({
        label: String(o.label ?? o.value),
        value: String(o.value ?? o.label),
      }));
  }

  delete field.fileTypes;
  if (type === "file") {
    const ft = getFileTypes({ fileTypes: patch.fileTypes });
    if (ft.length) field.fileTypes = ft;
  }

  const c = normalizeCondition(patch.condition);
  if (c) field.condition = c;
  else delete field.condition;

  delete field.validation;
  const val = normalizeValidation(patch.validation);
  if (val) field.validation = val;

  return field;
}
