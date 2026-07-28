import { describe, it, expect } from "vitest";
import {
  FIELD_TYPES,
  normalizeType,
  needsOptions,
  getFieldName,
  getFieldLabel,
  getFieldPlaceholder,
  getFieldRequired,
  getFieldOptions,
  getFieldCondition,
  getEffectiveType,
  getFieldRules,
  makeField,
  applyFieldPatch,
  formatDateValue,
} from "@/app/_data/fieldUtils";

// The two real shapes Gemini produced (from the live DB): one uses
// formFieldName/formLabel/options, the other fieldName/label/items.
const form29Radio = {
  formFieldName: "Attendance",
  formLabel: "Attendance",
  fieldType: "radiogroup",
  isRequired: true,
  options: [
    { value: "Attending", label: "Attending" },
    { value: "Not Attending", label: "Not Attending" },
  ],
};
const form28Radio = {
  fieldName: "gender",
  label: "Gender",
  fieldType: "radiogroup",
  isRequired: true,
  items: [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
  ],
};

describe("normalizeType", () => {
  it("maps text-ish types to 'text'", () => {
    for (const t of ["input", "input-text", "text", "", "string"]) {
      expect(normalizeType(t)).toBe("text");
    }
  });
  it("maps aliases to canonical types", () => {
    expect(normalizeType("radio")).toBe("radiogroup");
    expect(normalizeType("dropdown")).toBe("select");
    expect(normalizeType("date")).toBe("calendar");
    expect(normalizeType("number")).toBe("digits");
    expect(normalizeType("stars")).toBe("rating");
    expect(normalizeType("upload")).toBe("file");
    expect(normalizeType("checkbox")).toBe("checkbox");
  });
});

describe("needsOptions", () => {
  it("is true only for choice types", () => {
    expect(needsOptions("select")).toBe(true);
    expect(needsOptions("radiogroup")).toBe(true);
    expect(needsOptions("checkbox")).toBe(true);
    expect(needsOptions("text")).toBe(false);
    expect(needsOptions("rating")).toBe(false);
  });
});

describe("accessors handle both AI shapes", () => {
  it("getFieldName resolves formFieldName and fieldName", () => {
    expect(getFieldName(form29Radio)).toBe("Attendance");
    expect(getFieldName(form28Radio)).toBe("gender");
    expect(getFieldName({ formLabel: "Only Label" })).toBe("Only Label");
    expect(getFieldName({})).toBe("");
  });
  it("getFieldLabel prefers formLabel/label", () => {
    expect(getFieldLabel(form29Radio)).toBe("Attendance");
    expect(getFieldLabel(form28Radio)).toBe("Gender");
    expect(getFieldLabel({ fieldName: "x" })).toBe("x");
  });
  it("getFieldOptions normalizes options and items", () => {
    expect(getFieldOptions(form29Radio)).toEqual([
      { label: "Attending", value: "Attending" },
      { label: "Not Attending", value: "Not Attending" },
    ]);
    expect(getFieldOptions(form28Radio)).toEqual([
      { label: "Male", value: "male" },
      { label: "Female", value: "female" },
    ]);
    expect(getFieldOptions({ options: ["A", "B"] })).toEqual([
      { label: "A", value: "A" },
      { label: "B", value: "B" },
    ]);
    expect(getFieldOptions({})).toEqual([]);
  });
  it("getFieldRequired reads any required flag", () => {
    expect(getFieldRequired({ fieldRequired: true })).toBe(true);
    expect(getFieldRequired({ isRequired: true })).toBe(true);
    expect(getFieldRequired({ required: true })).toBe(true);
    expect(getFieldRequired({})).toBe(false);
  });
  it("getFieldPlaceholder reads either key", () => {
    expect(getFieldPlaceholder({ placeholderName: "a" })).toBe("a");
    expect(getFieldPlaceholder({ placeholder: "b" })).toBe("b");
    expect(getFieldPlaceholder({})).toBe("");
  });
});

describe("getEffectiveType", () => {
  it("keeps explicit non-text types", () => {
    expect(getEffectiveType({ fieldType: "radiogroup" })).toBe("radiogroup");
    expect(getEffectiveType({ fieldType: "digits" })).toBe("digits");
  });
  it("infers email/phone from a text field's name or label", () => {
    expect(
      getEffectiveType({ fieldType: "input-text", label: "Email Address" })
    ).toBe("email");
    expect(
      getEffectiveType({ fieldType: "text", fieldName: "mobileNumber" })
    ).toBe("digits");
    expect(
      getEffectiveType({ fieldType: "text", label: "WhatsApp number" })
    ).toBe("digits");
  });
  it("leaves ordinary text alone", () => {
    expect(getEffectiveType({ fieldType: "text", label: "Full Name" })).toBe(
      "text"
    );
    expect(getEffectiveType({ fieldType: "text", label: "Address" })).toBe(
      "text"
    );
  });
});

describe("getFieldCondition", () => {
  it("returns null without a valid condition", () => {
    expect(getFieldCondition({})).toBeNull();
    expect(getFieldCondition({ condition: {} })).toBeNull();
  });
  it("normalizes a condition and defaults the operator", () => {
    expect(getFieldCondition({ condition: { field: "gender" } })).toEqual({
      field: "gender",
      operator: "equals",
      value: "",
    });
  });
});

describe("makeField", () => {
  it("builds a canonical text field without options", () => {
    const f = makeField({ label: "Name", fieldType: "input-text" });
    expect(f.fieldName).toBe("Name");
    expect(f.formLabel).toBe("Name");
    expect(f.fieldType).toBe("text");
    expect(f.options).toBeUndefined();
  });
  it("keeps options only for choice types and drops empties", () => {
    const f = makeField({
      label: "Pick",
      fieldType: "select",
      options: [{ label: "A" }, { label: "" }, { label: "B" }],
    });
    expect(f.options).toEqual([
      { label: "A", value: "A" },
      { label: "B", value: "B" },
    ]);
  });
  it("includes a valid condition and ignores an invalid one", () => {
    expect(
      makeField({ label: "X", fieldType: "text", condition: { field: "g", value: "m" } })
        .condition
    ).toEqual({ field: "g", operator: "equals", value: "m" });
    expect(
      makeField({ label: "X", fieldType: "text", condition: { field: "" } }).condition
    ).toBeUndefined();
  });
});

describe("applyFieldPatch", () => {
  it("converts type and clears stale option-variant keys", () => {
    const field = {
      fieldName: "q",
      formLabel: "Q",
      fieldType: "radiogroup",
      items: [{ label: "old", value: "old" }],
    };
    applyFieldPatch(field, { label: "Q2", fieldType: "text", required: true });
    expect(field.fieldType).toBe("text");
    expect(field.formLabel).toBe("Q2");
    expect(field.fieldRequired).toBe(true);
    expect(field.items).toBeUndefined();
    expect(field.options).toBeUndefined();
  });
  it("sets options when converting to a choice type", () => {
    const field = { fieldName: "q", formLabel: "Q", fieldType: "text" };
    applyFieldPatch(field, {
      label: "Q",
      fieldType: "checkbox",
      options: [{ label: "a" }, { label: "b" }],
    });
    expect(field.fieldType).toBe("checkbox");
    expect(field.options).toEqual([
      { label: "a", value: "a" },
      { label: "b", value: "b" },
    ]);
  });
  it("adds and removes a condition", () => {
    const field = { fieldName: "q", formLabel: "Q", fieldType: "text" };
    applyFieldPatch(field, {
      label: "Q",
      fieldType: "text",
      condition: { field: "g", operator: "equals", value: "m" },
    });
    expect(field.condition).toEqual({ field: "g", operator: "equals", value: "m" });
    applyFieldPatch(field, { label: "Q", fieldType: "text", condition: null });
    expect(field.condition).toBeUndefined();
  });
  it("adds and clears validation rules", () => {
    const field = { fieldName: "q", formLabel: "Q", fieldType: "text" };
    applyFieldPatch(field, {
      label: "Q",
      fieldType: "text",
      validation: { minLength: "3", maxLength: "", message: "too short" },
    });
    // Empty values are dropped; set values are kept as authored.
    expect(field.validation).toEqual({ minLength: "3", message: "too short" });
    applyFieldPatch(field, { label: "Q", fieldType: "text", validation: {} });
    expect(field.validation).toBeUndefined();
  });
});

describe("getFieldRules", () => {
  it("returns nulls when no validation is set", () => {
    expect(getFieldRules({ fieldType: "text" })).toEqual({
      minLength: null,
      maxLength: null,
      min: null,
      max: null,
      minDate: null,
      maxDate: null,
      dateFormat: null,
      pattern: null,
      message: null,
    });
  });
  it("coerces string rule values to numbers", () => {
    const r = getFieldRules({
      fieldType: "digits",
      validation: { min: "0", max: "100", message: "out of range" },
    });
    expect(r.min).toBe(0);
    expect(r.max).toBe(100);
    expect(r.message).toBe("out of range");
    expect(r.minLength).toBeNull();
  });
  it("formats an ISO date into the chosen display format", () => {
    expect(formatDateValue("2026-12-31", "DD/MM/YYYY")).toBe("31/12/2026");
    expect(formatDateValue("2026-12-31", "MM/DD/YYYY")).toBe("12/31/2026");
    expect(formatDateValue("2026-12-31", "YYYY-MM-DD")).toBe("2026-12-31");
    expect(formatDateValue("2026-01-05", "DD MMM YYYY")).toBe("05 Jan 2026");
    expect(formatDateValue("", "DD/MM/YYYY")).toBe("");
    expect(formatDateValue("not-a-date", "DD/MM/YYYY")).toBe("not-a-date");
  });
  it("keeps min/max date rules for a calendar field", () => {
    const r = getFieldRules({
      fieldType: "calendar",
      validation: { minDate: "2020-01-01", maxDate: "2030-12-31" },
    });
    expect(r.minDate).toBe("2020-01-01");
    expect(r.maxDate).toBe("2030-12-31");
  });
  it("persists validation through makeField", () => {
    const f = makeField({
      label: "Code",
      fieldType: "text",
      validation: { pattern: "^[A-Z]{2}$", minLength: "2" },
    });
    expect(f.validation).toEqual({ pattern: "^[A-Z]{2}$", minLength: "2" });
    expect(getFieldRules(f).minLength).toBe(2);
  });
});

describe("FIELD_TYPES", () => {
  it("exposes the expected field types", () => {
    const values = FIELD_TYPES.map((t) => t.value);
    expect(values).toEqual(
      expect.arrayContaining([
        "text",
        "textarea",
        "email",
        "digits",
        "calendar",
        "select",
        "radiogroup",
        "checkbox",
        "rating",
        "file",
      ])
    );
  });
});
