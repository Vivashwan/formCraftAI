import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import {
  DATE_FORMATS,
  FIELD_TYPES,
  getFieldLabel,
  getFieldName,
  getFieldOptions,
  isPageBreak,
  needsOptions,
} from "@/app/_data/fieldUtils";

// Common upload extensions, grouped, offered as multi-select chips.
const FILE_TYPE_GROUPS = [
  { label: "Images", exts: ["jpg", "jpeg", "png", "gif", "webp", "svg"] },
  { label: "Documents", exts: ["pdf", "doc", "docx", "txt", "rtf"] },
  { label: "Spreadsheets", exts: ["xls", "xlsx", "csv"] },
  { label: "Other", exts: ["ppt", "pptx", "zip", "mp4", "mp3"] },
];

const OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "answered", label: "is answered" },
  { value: "not_answered", label: "is not answered" },
];

// Plain-English "the answer must look like…" presets. Each maps to a regex
// stored in validation.pattern, so nobody has to write regex by hand. "__any"
// = no restriction; "__custom" = reveal the raw regex box for advanced users.
const FORMAT_PRESETS = [
  { value: "__any", label: "Any format (no restriction)" },
  { value: "^[A-Za-z ]+$", label: "Letters only" },
  { value: "^[0-9]+$", label: "Numbers only" },
  { value: "^[A-Za-z0-9 ]+$", label: "Letters & numbers only" },
  { value: "^\\S+$", label: "No spaces" },
  { value: "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$", label: "Email address" },
  { value: "__custom", label: "Custom pattern (advanced)…" },
];

// Controlled editor for a single field's definition. `value` is
// { label, placeholder, fieldType, required, options, condition }.
// `fields` is the full list of form fields (for conditional-logic targets);
// `selfName` is this field's name, excluded from those targets.
function FieldForm({ value, onChange, fields = [], selfName = "" }) {
  const set = (patch) => onChange({ ...value, ...patch });

  const showOptions = needsOptions(value.fieldType);
  const options = value.options || [];

  const updateOption = (idx, label) => {
    const next = options.map((o, i) =>
      i === idx ? { label, value: label } : o
    );
    set({ options: next });
  };

  const addOption = () =>
    set({ options: [...options, { label: "", value: "" }] });

  const removeOption = (idx) =>
    set({ options: options.filter((_, i) => i !== idx) });

  const onTypeChange = (fieldType) => {
    const patch = { fieldType };
    if (needsOptions(fieldType) && options.length === 0) {
      patch.options = [
        { label: "", value: "" },
        { label: "", value: "" },
      ];
    }
    set(patch);
  };

  // --- Validation rules ---
  const validation = value.validation || {};
  const setVal = (patch) =>
    set({ validation: { ...validation, ...patch } });
  const textLike = ["text", "textarea", "email"].includes(value.fieldType);
  const numberLike = value.fieldType === "digits";
  const calendarLike = value.fieldType === "calendar";

  // Format dropdown: figure out which preset (if any) the stored pattern is.
  const patternVal = validation.pattern ?? "";
  const isPresetPattern = FORMAT_PRESETS.some(
    (p) => p.value === patternVal && p.value !== "__any" && p.value !== "__custom"
  );
  const [customFormat, setCustomFormat] = React.useState(false);
  const showCustomFormat = customFormat || (patternVal !== "" && !isPresetPattern);
  const formatSelection = showCustomFormat
    ? "__custom"
    : patternVal === ""
    ? "__any"
    : patternVal;

  // --- Conditional logic ---
  const condition = value.condition || null;
  const setCond = (patch) => set({ condition: { ...condition, ...patch } });

  // Other real fields that can drive this field's visibility (no page breaks).
  const targetFields = fields.filter((f) => {
    const name = getFieldName(f);
    return name && name !== selfName && !isPageBreak(f);
  });
  const controlling = targetFields.find(
    (f) => getFieldName(f) === condition?.field
  );
  const controllingOptions = controlling ? getFieldOptions(controlling) : [];
  const needsValue =
    condition &&
    (condition.operator === "equals" || condition.operator === "not_equals");

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs block mb-1">Field Type</label>
        <Select value={value.fieldType} onValueChange={onTypeChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {FIELD_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs block mb-1">Label Name</label>
        <Input
          value={value.label || ""}
          onChange={(e) => set({ label: e.target.value })}
          placeholder="e.g. Full Name"
        />
      </div>

      {!showOptions &&
        value.fieldType !== "calendar" &&
        value.fieldType !== "file" && (
          <div>
            <label className="text-xs block mb-1">Placeholder</label>
            <Input
              value={value.placeholder || ""}
              onChange={(e) => set({ placeholder: e.target.value })}
              placeholder="e.g. Enter your name"
            />
          </div>
        )}

      {value.fieldType === "file" && (
        <div>
          <label className="text-xs block mb-1">
            Allowed file types <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {FILE_TYPE_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="text-[11px] text-muted-foreground mb-1">
                  {group.label}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.exts.map((ext) => {
                    const current = Array.isArray(value.fileTypes)
                      ? value.fileTypes
                      : [];
                    const selected = current.includes(ext);
                    return (
                      <button
                        type="button"
                        key={ext}
                        onClick={() =>
                          set({
                            fileTypes: selected
                              ? current.filter((x) => x !== ext)
                              : [...current, ext],
                          })
                        }
                        className={`px-2 py-0.5 rounded-full border text-xs ${
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-input hover:bg-accent"
                        }`}
                      >
                        .{ext}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Select at least one type. Uploads outside these types are rejected.
          </p>
        </div>
      )}

      {showOptions && (
        <div>
          <label className="text-xs block mb-1">Options</label>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  value={opt.label}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeOption(idx)}
                  className="text-gray-500 hover:text-red-600 shrink-0"
                  aria-label="Remove option"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 flex gap-1"
            onClick={addOption}
          >
            <Plus className="h-4 w-4" /> Add option
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Checkbox
          checked={!!value.required}
          onCheckedChange={(v) => set({ required: !!v })}
          id="field-required"
        />
        <label htmlFor="field-required" className="text-sm">
          Required field
        </label>
      </div>

      {/* Validation rules */}
      {(textLike || numberLike || calendarLike) && (
        <div className="pt-2 border-t">
          <div className="text-sm font-medium mb-2">
            {calendarLike ? "Validation" : "Validation (optional)"}
          </div>
          {calendarLike && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs block mb-1">
                    Earliest date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={validation.minDate ?? ""}
                    onChange={(e) => setVal({ minDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1">
                    Latest date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={validation.maxDate ?? ""}
                    onChange={(e) => setVal({ maxDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-2">
                <label className="text-xs block mb-1">
                  Date format <span className="text-red-500">*</span>
                </label>
                <Select
                  value={validation.dateFormat ?? ""}
                  onValueChange={(v) => setVal({ dateFormat: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a format" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_FORMATS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {textLike && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs block mb-1">Min length</label>
                <Input
                  type="number"
                  min="0"
                  value={validation.minLength ?? ""}
                  onChange={(e) => setVal({ minLength: e.target.value })}
                  placeholder="e.g. 3"
                />
              </div>
              <div>
                <label className="text-xs block mb-1">Max length</label>
                <Input
                  type="number"
                  min="0"
                  value={validation.maxLength ?? ""}
                  onChange={(e) => setVal({ maxLength: e.target.value })}
                  placeholder="e.g. 200"
                />
              </div>
            </div>
          )}
          {numberLike && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs block mb-1">Min value</label>
                <Input
                  type="number"
                  value={validation.min ?? ""}
                  onChange={(e) => setVal({ min: e.target.value })}
                  placeholder="e.g. 0"
                />
              </div>
              <div>
                <label className="text-xs block mb-1">Max value</label>
                <Input
                  type="number"
                  value={validation.max ?? ""}
                  onChange={(e) => setVal({ max: e.target.value })}
                  placeholder="e.g. 100"
                />
              </div>
            </div>
          )}
          {textLike && (
            <div className="mt-2">
              <label className="text-xs block mb-1">Accepted format</label>
              <Select
                value={formatSelection}
                onValueChange={(v) => {
                  if (v === "__custom") {
                    setCustomFormat(true);
                  } else {
                    setCustomFormat(false);
                    setVal({ pattern: v === "__any" ? "" : v });
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAT_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Restrict what the answer may contain. Leave on “Any format” if
                unsure.
              </p>
              {showCustomFormat && (
                <Input
                  className="mt-2 font-mono text-xs"
                  value={validation.pattern ?? ""}
                  onChange={(e) => setVal({ pattern: e.target.value })}
                  placeholder="Regular expression, e.g. ^[A-Z]{2}\d{4}$"
                />
              )}
            </div>
          )}
          <div className="mt-2">
            <label className="text-xs block mb-1">
              Custom error message
            </label>
            <Input
              value={validation.message ?? ""}
              onChange={(e) => setVal({ message: e.target.value })}
              placeholder="Shown when this field is invalid"
            />
          </div>
        </div>
      )}

      {/* Conditional logic */}
      {targetFields.length > 0 && (
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Checkbox
              id="field-conditional"
              checked={!!condition}
              onCheckedChange={(v) =>
                set({
                  condition: v
                    ? { field: "", operator: "equals", value: "" }
                    : null,
                })
              }
            />
            <label htmlFor="field-conditional" className="text-sm">
              Show only if…
            </label>
          </div>

          {condition && (
            <div className="space-y-2 pl-1">
              <Select
                value={condition.field || ""}
                onValueChange={(f) => setCond({ field: f, value: "" })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {targetFields.map((f, i) => (
                    <SelectItem key={i} value={getFieldName(f)}>
                      {getFieldLabel(f)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={condition.operator}
                onValueChange={(op) => setCond({ operator: op })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {needsValue &&
                (controllingOptions.length > 0 ? (
                  <Select
                    value={condition.value || ""}
                    onValueChange={(val) => setCond({ value: val })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select value" />
                    </SelectTrigger>
                    <SelectContent>
                      {controllingOptions.map((o, i) => (
                        <SelectItem key={i} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={condition.value || ""}
                    onChange={(e) => setCond({ value: e.target.value })}
                    placeholder="Value"
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FieldForm;
