import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Loader2,
  Star,
  Trash2,
} from "lucide-react";
import FieldEdit from "./FieldEdit";
import FormHeaderEdit from "./FormHeaderEdit";
import DateField from "./DateField";
import { submitResponse } from "@/app/_actions/responses";
import { SignInButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  getEffectiveType,
  getFieldCondition,
  getFieldLabel,
  getFieldName,
  getFieldOptions,
  getFieldPlaceholder,
  getFieldRequired,
  getFieldRules,
  getFileTypes,
  formatDateValue,
  isPageBreak,
  isPhoneField,
  normalizeType,
  splitIntoPages,
} from "@/app/_data/fieldUtils";
import { getStyleCss } from "@/app/_data/Style";
import {
  DIAL_CODES,
  DEFAULT_DIAL_CODE,
  dialEntry,
  phoneLengthError,
} from "@/app/_data/dialCodes";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Picks black or white text for readability over a custom hex background,
// based on its perceived brightness (luminance).
function readableText(hex) {
  const h = String(hex).replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111827" : "#f9fafb";
}

function FormUi({
  jsonForm,
  selectedTheme,
  selectedStyle,
  onFieldUpdate,
  onFormDetailUpdate,
  onMoveField,
  deleteField,
  editable = true,
  formId = 0,
  enabledSignIn = false,
  disableSubmit = false,
  thankYouMessage,
  thankYouDescription,
  redirectUrl,
  closed = false,
}) {
  const [formData, setFormData] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [honeypot, setHoneypot] = useState(""); // bot trap — kept out of formData
  const [currentPage, setCurrentPage] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({}); // debounced per-field
  const validationTimers = useRef({});
  const [phoneCodes, setPhoneCodes] = useState({}); // per phone field: dial code
  const [phoneNumbers, setPhoneNumbers] = useState({}); // per phone field: number
  const [redirecting, setRedirecting] = useState(false); // post-submit redirect
  const [redirectProgress, setRedirectProgress] = useState(false);
  let formReference = useRef();
  const { user, isSignedIn } = useUser();

  // After a successful submit with a redirect URL, show the thank-you screen
  // briefly (with an animated progress bar), then navigate — instead of an
  // abrupt jump that skips the thank-you message entirely.
  const REDIRECT_DELAY_MS = 2600;
  useEffect(() => {
    if (!redirecting || !redirectUrl) return;
    const start = setTimeout(() => setRedirectProgress(true), 60); // trigger CSS
    const go = setTimeout(() => {
      window.location.href = redirectUrl;
    }, REDIRECT_DELAY_MS);
    return () => {
      clearTimeout(start);
      clearTimeout(go);
    };
  }, [redirecting, redirectUrl]);

  // Returns a validation error string for a non-empty value, or null if valid.
  // Emptiness is handled separately by the required-field check. Covers email
  // format plus the owner-configured rules (length, numeric range, regex).
  const fieldError = (field, rawValue) => {
    const type = getEffectiveType(field);
    const rules = getFieldRules(field);
    const str = rawValue == null ? "" : String(rawValue);
    if (str.trim() === "") return null;
    const custom = rules.message;
    if (type === "email" && !EMAIL_RE.test(str)) {
      return custom || "Please enter a valid email address.";
    }
    // Phone: validate the national number length against the selected country.
    if (type === "digits" && isPhoneField(field)) {
      return custom || phoneLengthError(str); // null when length is OK
    }
    // Date: must be a real date within the owner-defined min/max range.
    if (type === "calendar") {
      if (Number.isNaN(Date.parse(str)))
        return custom || "Please enter a valid date.";
      const fmt = (d) => formatDateValue(d, rules.dateFormat);
      const belowMin = rules.minDate && str < rules.minDate;
      const aboveMax = rules.maxDate && str > rules.maxDate;
      if (belowMin || aboveMax) {
        return (
          custom ||
          `Allowed: ${fmt(rules.minDate)} – ${fmt(rules.maxDate)}`
        );
      }
      return null;
    }
    if (type === "digits") {
      const num = parseFloat(str.replace(/[^0-9.\-]/g, ""));
      if (Number.isFinite(num)) {
        if (rules.min != null && num < rules.min)
          return custom || `Must be at least ${rules.min}.`;
        if (rules.max != null && num > rules.max)
          return custom || `Must be at most ${rules.max}.`;
      }
    }
    if (rules.minLength != null && str.length < rules.minLength)
      return custom || `Must be at least ${rules.minLength} characters.`;
    if (rules.maxLength != null && str.length > rules.maxLength)
      return custom || `Must be at most ${rules.maxLength} characters.`;
    if (rules.pattern) {
      try {
        if (!new RegExp(rules.pattern).test(str))
          return custom || "Please match the requested format.";
      } catch (e) {
        // Invalid regex authored by the owner — skip rather than block.
      }
    }
    return null;
  };

  // Update the value immediately, but only surface the "invalid" hint ~0.8s
  // after the user stops typing so it doesn't flash on every keystroke.
  const handleValidatedChange = (field, value) => {
    const name = getFieldName(field);
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: null }));
    clearTimeout(validationTimers.current[name]);
    validationTimers.current[name] = setTimeout(() => {
      setFieldErrors((prev) => ({ ...prev, [name]: fieldError(field, value) }));
    }, 800);
  };

  // Phone field: keep the dial code + number separately, but store the combined
  // "<code> <number>" as the field's value so it's complete everywhere.
  const updatePhone = (field, code, number) => {
    const name = getFieldName(field);
    // Cap the number to the selected country's max digit length (keeping any
    // spaces/dashes the user typed), so an Indian number can't exceed 10 etc.
    const max = dialEntry(code)?.max ?? 15;
    let digits = 0;
    let capped = "";
    for (const ch of number) {
      if (/\d/.test(ch)) {
        if (digits >= max) continue;
        digits++;
      }
      capped += ch;
    }
    setPhoneCodes((prev) => ({ ...prev, [name]: code }));
    setPhoneNumbers((prev) => ({ ...prev, [name]: capped }));
    const combined = capped.trim() ? `${code} ${capped.trim()}` : "";
    handleValidatedChange(field, combined);
  };

  const handleSelectChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleRadioChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleCheckboxChange = (fieldName, itemLabel, checked) => {
    // Store the selected checkbox items as a plain array of labels so they
    // serialize and display cleanly in the responses sheet.
    setFormData((prevData) => {
      const list = Array.isArray(prevData?.[fieldName])
        ? [...prevData[fieldName]]
        : [];

      if (checked) {
        return { ...prevData, [fieldName]: [...list, itemLabel] };
      }
      return {
        ...prevData,
        [fieldName]: list.filter((label) => label !== itemLabel),
      };
    });
  };

  const handleRatingChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Files are stored inline as a base64 data URL (self-contained, no external
  // storage). Capped at 2MB to keep response rows reasonable.
  const handleFileChange = (name, file, allowed = []) => {
    if (!file) {
      setFormData((prev) => ({ ...prev, [name]: undefined }));
      return;
    }
    if (allowed.length) {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      if (!allowed.includes(ext)) {
        toast.error(`Only ${allowed.join(", ")} file(s) are allowed.`);
        return;
      }
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File is too large (max 2MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setFormData((prev) => ({
        ...prev,
        [name]: { name: file.name, type: file.type, dataUrl: reader.result },
      }));
    reader.readAsDataURL(file);
  };

  const isEmptyVal = (v) =>
    v === undefined ||
    v === null ||
    v === "" ||
    (Array.isArray(v) && v.length === 0);

  // A field with a condition is only shown when its controlling field matches.
  const isFieldVisible = (field) => {
    const c = getFieldCondition(field);
    if (!c) return true;
    const cv = formData[c.field];
    switch (c.operator) {
      case "answered":
        return !isEmptyVal(cv);
      case "not_answered":
        return isEmptyVal(cv);
      case "not_equals":
        return Array.isArray(cv)
          ? !cv.includes(c.value)
          : String(cv ?? "") !== String(c.value);
      case "equals":
      default:
        return Array.isArray(cv)
          ? cv.includes(c.value)
          : String(cv ?? "") === String(c.value);
    }
  };

  // Enforce required fields for ALL types. Native `required` only covers plain
  // inputs; Radix select/radio/checkbox need an explicit check against state.
  const getMissingRequired = (fieldsArg) => {
    const fields = fieldsArg || jsonForm?.form || jsonForm?.formFields || [];
    const missing = [];
    fields.forEach((field) => {
      if (!getFieldRequired(field)) return;
      if (!isFieldVisible(field)) return; // hidden fields aren't required
      const value = formData[getFieldName(field)];
      const type = normalizeType(field.fieldType);
      const empty =
        type === "checkbox"
          ? !Array.isArray(value) || value.length === 0
          : value === undefined || value === null || String(value).trim() === "";
      if (empty) missing.push(getFieldLabel(field));
    });
    return missing;
  };

  // Non-empty visible fields whose value fails a validation rule. Returns
  // "Label: reason" strings for a friendly toast.
  const getInvalidFields = (fieldsArg) => {
    const fields = fieldsArg || jsonForm?.form || jsonForm?.formFields || [];
    const invalid = [];
    fields.forEach((field) => {
      if (isPageBreak(field)) return;
      if (!isFieldVisible(field)) return;
      const err = fieldError(field, formData[getFieldName(field)]);
      if (err) invalid.push(`${getFieldLabel(field)}: ${err}`);
    });
    return invalid;
  };

  // Advance to the next page, validating the current page's visible fields.
  const handleNext = () => {
    const allFields = jsonForm?.form || jsonForm?.formFields || [];
    const pageFields = splitIntoPages(allFields)[currentPage] || [];
    const missing = getMissingRequired(pageFields);
    if (missing.length > 0) {
      toast.error(`Please fill required field(s): ${missing.join(", ")}`);
      return;
    }
    const invalid = getInvalidFields(pageFields);
    if (invalid.length > 0) {
      toast.error(`Please fix: ${invalid.join("; ")}`);
      return;
    }
    setCurrentPage((p) => p + 1);
  };

  const onFormSubmit = async (event) => {
    event.preventDefault();

    const missing = getMissingRequired();
    if (missing.length > 0) {
      toast.error(`Please fill required field(s): ${missing.join(", ")}`);
      return;
    }
    const invalid = getInvalidFields();
    if (invalid.length > 0) {
      toast.error(`Please fix: ${invalid.join("; ")}`);
      return;
    }

    if (submitting) return; // guard against double-submit
    setSubmitting(true);
    try {
      // `formData` state is kept in sync by every field handler (inputs,
      // selects, radios and checkboxes), unlike a native FormData snapshot
      // which only captures plain <input> elements.
      const result = await submitResponse(formId, formData, { honeypot });

      if (result?.ok) {
        setFormData({});
        setPhoneCodes({});
        setPhoneNumbers({});
        setHoneypot("");
        // Always show the thank-you screen first. If a redirect URL is set, the
        // effect above navigates after a short, visible delay (so the thank-you
        // message isn't skipped and the transition isn't abrupt).
        setSubmitted(true);
        if (redirectUrl && redirectUrl.trim()) {
          setRedirecting(true);
        }
      } else {
        toast.error(result?.error || "Submission was not accepted.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(
        "An error occurred while submitting the form. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field, index) => {
    const fieldName = getFieldName(field);
    const fieldLabel = getFieldLabel(field);
    const fieldType = getEffectiveType(field);
    const placeholderName = getFieldPlaceholder(field);
    const isRequired = getFieldRequired(field);
    const options = getFieldOptions(field);

    switch (fieldType) {
      case "select":
        return (
          <div className="my-1 w-full">
            <label className="text-xs">
              {fieldLabel}
              {isRequired && <span className="text-red-500"> *</span>}
            </label>
            <Select
              value={formData[fieldName] || ""}
              onValueChange={(v) => handleSelectChange(fieldName, v)}
            >
              <SelectTrigger className="w-full bg-white text-gray-900">
                <SelectValue placeholder={placeholderName || "Select"} />
              </SelectTrigger>
              <SelectContent>
                {options.map((item, idx) => (
                  <SelectItem key={idx} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case "checkbox":
        return (
          <div className="my-1 w-full">
            <label className="text-xs">
              {fieldLabel}
              {isRequired && <span className="text-red-500"> *</span>}
            </label>
            {options.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Checkbox
                  className="bg-white border-gray-500"
                  checked={(formData[fieldName] || []).includes(item.label)}
                  onCheckedChange={(v) =>
                    handleCheckboxChange(fieldName, item.label, v)
                  }
                />
                <Label>{item.label}</Label>
              </div>
            ))}
          </div>
        );
      case "radiogroup":
        return (
          <div className="my-1 w-full">
            <label className="text-xs">
              {fieldLabel}
              {isRequired && <span className="text-red-500"> *</span>}
            </label>
            <RadioGroup
              value={formData[fieldName] || ""}
              onValueChange={(v) => handleRadioChange(fieldName, v)}
            >
              {options.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <RadioGroupItem
                    className="bg-white border-gray-500 text-gray-900"
                    value={item.value}
                    id={`${fieldName}-${item.value}-${idx}`}
                  />
                  <Label htmlFor={`${fieldName}-${item.value}-${idx}`}>
                    {item.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );
      case "rating": {
        const current = Number(formData[fieldName]) || 0;
        return (
          <div className="my-1 w-full">
            <label className="text-xs">
              {fieldLabel}
              {isRequired && <span className="text-red-500"> *</span>}
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleRatingChange(fieldName, n)}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  className="p-0.5"
                >
                  <Star
                    className={`h-6 w-6 ${
                      n <= current
                        ? "fill-yellow-400 text-yellow-400"
                        : "fill-none opacity-40"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        );
      }
      case "file": {
        const allowed = getFileTypes(field);
        return (
          <div className="my-1 w-full">
            <label className="text-xs">
              {fieldLabel}
              {isRequired && <span className="text-red-500"> *</span>}
            </label>
            <Input
              type="file"
              className="bg-white text-gray-900"
              name={fieldName}
              accept={
                allowed.length
                  ? allowed.map((t) => "." + t).join(",")
                  : undefined
              }
              onChange={(e) =>
                handleFileChange(fieldName, e.target.files?.[0], allowed)
              }
            />
            {allowed.length > 0 && (
              <p className="text-xs opacity-70 mt-1">
                Allowed: {allowed.join(", ")}
              </p>
            )}
            {formData[fieldName]?.name && (
              <p className="text-xs opacity-70 mt-1">
                Selected: {formData[fieldName].name}
              </p>
            )}
          </div>
        );
      }
      case "textarea":
        return (
          <div className="my-1 w-full">
            <label className="text-xs">
              {fieldLabel}
              {isRequired && <span className="text-red-500"> *</span>}
            </label>
            <Textarea
              className="bg-white text-gray-900 placeholder:text-gray-400"
              placeholder={placeholderName || "Enter value"}
              name={fieldName}
              required={isRequired}
              value={formData[fieldName] || ""}
              onChange={(e) => handleValidatedChange(field, e.target.value)}
            />
            {fieldErrors[fieldName] && (
              <p className="text-xs text-red-500 mt-1">
                {fieldErrors[fieldName]}
              </p>
            )}
          </div>
        );
      case "calendar": {
        const dateRules = getFieldRules(field);
        return (
          <DateField
            label={fieldLabel}
            value={formData[fieldName] || ""}
            format={dateRules.dateFormat}
            minDate={dateRules.minDate}
            maxDate={dateRules.maxDate}
            required={isRequired}
            onChange={(v) =>
              setFormData((prev) => ({ ...prev, [fieldName]: v }))
            }
          />
        );
      }
      case "digits": {
        // Phone fields get a dialing-code picker; plain numbers stay a single
        // input. The stored value is "<code> <number>" so it's complete in the
        // responses/sheet/email.
        if (isPhoneField(field)) {
          const code = phoneCodes[fieldName] || DEFAULT_DIAL_CODE;
          const number = phoneNumbers[fieldName] || "";
          return (
            <div className="my-1 w-full">
              <label className="text-xs">
              {fieldLabel}
              {isRequired && <span className="text-red-500"> *</span>}
            </label>
              <div className="flex gap-2">
                <Select
                  value={code}
                  onValueChange={(c) => updatePhone(field, c, number)}
                >
                  <SelectTrigger className="w-24 shrink-0 bg-white text-gray-900">
                    {/* Custom compact display (flag + code); the dropdown
                        items show the country name for easy scanning/search. */}
                    <span className="truncate">
                      {dialEntry(code)?.flag} {code}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {DIAL_CODES.map((d) => (
                      <SelectItem
                        key={d.code}
                        value={d.code}
                        textValue={`${d.name} ${d.code}`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-16 shrink-0">
                            {d.flag} {d.code}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {d.name}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="tel"
                  inputMode="numeric"
                  className="bg-white text-gray-900 placeholder:text-gray-400 flex-1"
                  placeholder={placeholderName || "Phone number"}
                  value={number}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9\-() ]/g, "");
                    updatePhone(field, code, cleaned);
                  }}
                />
              </div>
              {fieldErrors[fieldName] && (
                <p className="text-xs text-red-500 mt-1">
                  {fieldErrors[fieldName]}
                </p>
              )}
            </div>
          );
        }
        return (
          <div className="my-1 w-full">
            <label className="text-xs">
              {fieldLabel}
              {isRequired && <span className="text-red-500"> *</span>}
            </label>
            <Input
              type="tel"
              inputMode="numeric"
              className="bg-white text-gray-900 placeholder:text-gray-400"
              placeholder={placeholderName || "Enter number"}
              name={fieldName}
              required={isRequired}
              value={formData[fieldName] || ""}
              onChange={(e) => {
                // Number field: allow digits and common symbols only.
                const cleaned = e.target.value.replace(/[^0-9+\-() .]/g, "");
                handleValidatedChange(field, cleaned);
              }}
            />
            {fieldErrors[fieldName] && (
              <p className="text-xs text-red-500 mt-1">
                {fieldErrors[fieldName]}
              </p>
            )}
          </div>
        );
      }
      case "email":
        return (
          <div className="my-1 w-full">
            <label className="text-xs">
              {fieldLabel}
              {isRequired && <span className="text-red-500"> *</span>}
            </label>
            <Input
              type="email"
              className="bg-white text-gray-900 placeholder:text-gray-400"
              placeholder={placeholderName || "you@example.com"}
              name={fieldName}
              required={isRequired}
              value={formData[fieldName] || ""}
              onChange={(e) => handleValidatedChange(field, e.target.value)}
            />
            {fieldErrors[fieldName] && (
              <p className="text-xs text-red-500 mt-1">
                {fieldErrors[fieldName]}
              </p>
            )}
          </div>
        );
      default:
        return (
          <div className="my-1 w-full">
            <label className="text-xs">
              {fieldLabel}
              {isRequired && <span className="text-red-500"> *</span>}
            </label>
            <Input
              type="text"
              className="bg-white text-gray-900 placeholder:text-gray-400"
              placeholder={placeholderName || "Enter value"}
              name={fieldName}
              required={isRequired}
              value={formData[fieldName] || ""}
              onChange={(e) => handleValidatedChange(field, e.target.value)}
            />
            {fieldErrors[fieldName] && (
              <p className="text-xs text-red-500 mt-1">
                {fieldErrors[fieldName]}
              </p>
            )}
          </div>
        );
    }
  };

  const formFields = jsonForm.form || jsonForm.formFields || [];

  // A theme value starting with "#" is a custom color: apply it as the form's
  // background instead of a named daisyUI data-theme.
  const isCustomThemeColor =
    typeof selectedTheme === "string" && selectedTheme.startsWith("#");
  const themeAttr = isCustomThemeColor ? undefined : selectedTheme;
  const containerStyle = {
    ...getStyleCss(selectedStyle),
    // Pin the text color so the form looks the same regardless of the editor's
    // (or viewer's) light/dark preference. daisyUI themes use their own
    // base-content color (below); custom backgrounds get a contrasting color.
    ...(isCustomThemeColor
      ? { background: selectedTheme, color: readableText(selectedTheme) }
      : {}),
  };
  // For named daisyUI themes, follow the theme's own content color instead of
  // inheriting the app's dark/light foreground.
  const containerTextClass = isCustomThemeColor ? "" : "text-base-content";

  // Up/down stepper to reorder an item without dragging.
  const moveButtons = (index) =>
    editable && onMoveField ? (
      <div className="flex flex-col mr-1 shrink-0">
        <button
          type="button"
          aria-label="Move up"
          disabled={index === 0}
          onClick={() => onMoveField(index, index - 1)}
          className="opacity-50 hover:opacity-100 disabled:opacity-20"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Move down"
          disabled={index === formFields.length - 1}
          onClick={() => onMoveField(index, index + 1)}
          className="opacity-50 hover:opacity-100 disabled:opacity-20"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    ) : null;

  // Multi-page: split on page-break markers. Only paginate the public form.
  const pages = splitIntoPages(formFields);
  const multiPage = !editable && pages.length > 1;
  const publicFields = multiPage
    ? pages[Math.min(currentPage, pages.length - 1)]
    : formFields.filter((f) => !isPageBreak(f));

  // The current view's required fields must all be filled before the user can
  // submit (or advance to the next page).
  const pageComplete =
    editable ||
    (getMissingRequired(publicFields).length === 0 &&
      getInvalidFields(publicFields).length === 0);

  const submitButton =
    !enabledSignIn || isSignedIn ? (
      <button
        type="submit"
        className="btn btn-primary"
        disabled={disableSubmit || !pageComplete || submitting}
      >
        {submitting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
          </span>
        ) : (
          "Submit"
        )}
      </button>
    ) : (
      <Button>
        <SignInButton mode="modal">Sign In before submitting !!!</SignInButton>
      </Button>
    );

  // Closed forms (public view only) don't accept responses.
  if (closed && !editable) {
    return (
      <div
        className={`border p-8 md:w-[600px] rounded-lg text-center ${containerTextClass}`}
        data-theme={themeAttr}
        style={containerStyle}
      >
        <h2 className="font-bold text-2xl">
          {jsonForm?.formTitle || "Form"}
        </h2>
        <p className="text-sm mt-3">
          This form is no longer accepting responses.
        </p>
      </div>
    );
  }

  // Confirmation screen shown after a successful submission.
  if (submitted) {
    return (
      <div
        className={`border p-8 md:w-[600px] rounded-lg text-center animate-in fade-in zoom-in-95 duration-700 ${containerTextClass}`}
        data-theme={themeAttr}
        style={containerStyle}
      >
        <div className="flex flex-col items-center gap-3">
          <CheckCircle2 className="h-14 w-14 text-green-500" />
          <h2 className="font-bold text-2xl">
            {thankYouMessage || jsonForm?.thankYouMessage || "Thank you!"}
          </h2>
          <p className="text-sm">
            {thankYouDescription || "Your response has been recorded."}
          </p>

          {redirecting ? (
            /* Smooth hand-off: keep the thank-you visible, fill a progress bar,
               then navigate (handled by the effect). */
            <div className="mt-4 w-full max-w-xs">
              <p className="text-sm opacity-80 mb-2">Taking you to the next page…</p>
              <div className="h-1.5 w-full rounded-full bg-gray-300/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 ease-linear"
                  style={{
                    width: redirectProgress ? "100%" : "0%",
                    transitionProperty: "width",
                    transitionDuration: `${REDIRECT_DELAY_MS - 100}ms`,
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (redirectUrl) window.location.href = redirectUrl;
                }}
                className="text-xs underline opacity-70 hover:opacity-100 mt-3"
              >
                Continue now
              </button>
            </div>
          ) : (
            <Button
              type="button"
              className="mt-3"
              onClick={() => {
                setFormData({});
                setPhoneCodes({});
                setPhoneNumbers({});
                setSubmitted(false);
              }}
            >
              Submit another response
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      ref={formReference}
      onSubmit={onFormSubmit}
      className={`border p-3 md:w-[600px] rounded-lg ${containerTextClass}`}
      data-theme={themeAttr}
      style={containerStyle}
    >
      {/* Honeypot: hidden from users, tempting to bots. Off-screen (not
          display:none, which some bots skip) and excluded from tab order. */}
      <input
        type="text"
        name="_website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        style={{
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
          opacity: 0,
        }}
      />
      <div className="relative">
        {editable && onFormDetailUpdate && (
          <div className="absolute top-0 right-0">
            <FormHeaderEdit
              title={jsonForm?.formTitle}
              subheading={jsonForm?.formSubheading || jsonForm?.formSubHeading}
              onSave={onFormDetailUpdate}
            />
          </div>
        )}
        <h2 className="font-bold text-center text-2xl">
          {jsonForm?.formTitle || "Untitled Form"}
        </h2>
        <h2 className="text-sm text-center">
          {jsonForm?.formSubheading ||
            jsonForm?.formSubHeading ||
            "Fill out the form below"}
        </h2>
      </div>

      {editable ? (
        /* Editor: show every field (with page-break dividers) for editing. */
        formFields.length > 0 ? (
          formFields.map((field, index) => {
            if (isPageBreak(field)) {
              return (
                <div
                  key={index}
                  className="my-3 flex items-center gap-2"
                  onDragOver={onMoveField ? (e) => e.preventDefault() : undefined}
                  onDrop={
                    onMoveField
                      ? () => {
                          if (dragIndex !== null && dragIndex !== index) {
                            onMoveField(dragIndex, index);
                          }
                          setDragIndex(null);
                        }
                      : undefined
                  }
                >
                  {moveButtons(index)}
                  {onMoveField && (
                    <span
                      draggable
                      onDragStart={() => setDragIndex(index)}
                      onDragEnd={() => setDragIndex(null)}
                      className="cursor-grab shrink-0 opacity-50"
                      aria-label="Drag to reorder"
                    >
                      <GripVertical className="h-4 w-4" />
                    </span>
                  )}
                  <div className="flex-1 border-t border-dashed border-current opacity-40" />
                  <span className="text-xs uppercase tracking-wide opacity-60">
                    Page break
                  </span>
                  <div className="flex-1 border-t border-dashed border-current opacity-40" />
                  <button
                    type="button"
                    onClick={() => deleteField(index)}
                    className="opacity-60 hover:opacity-100 hover:text-red-600 shrink-0"
                    aria-label="Remove page break"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            }
            return (
              <div
                key={index}
                className={`my-2 flex items-center ${
                  dragIndex === index ? "opacity-40" : ""
                }`}
                onDragOver={onMoveField ? (e) => e.preventDefault() : undefined}
                onDrop={
                  onMoveField
                    ? () => {
                        if (dragIndex !== null && dragIndex !== index) {
                          onMoveField(dragIndex, index);
                        }
                        setDragIndex(null);
                      }
                    : undefined
                }
              >
                {moveButtons(index)}
                {onMoveField && (
                  <span
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragEnd={() => setDragIndex(null)}
                    className="cursor-grab mr-1 shrink-0"
                    aria-label="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4 opacity-50" />
                  </span>
                )}
                {renderField(field, index)}
                <div className="ml-2">
                  <FieldEdit
                    defaultValue={field}
                    onUpdate={(value) => onFieldUpdate(value, index)}
                    deleteField={() => deleteField(index)}
                    fields={formFields}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <p>No fields available in the form.</p>
        )
      ) : (
        /* Public form: render only the current page's visible fields. */
        publicFields.map((field, i) =>
          isFieldVisible(field) ? (
            <div key={i} className="my-2">
              {renderField(field, i)}
            </div>
          ) : null
        )
      )}

      {multiPage ? (
        <div className="flex items-center justify-between mt-5">
          <span className="text-xs opacity-70">
            Step {currentPage + 1} of {pages.length}
          </span>
          <div className="flex gap-2">
            {currentPage > 0 && (
              // Uses the form's own text color (currentColor) so it stays
              // visible on any theme — the shadcn "outline" variant is tied to
              // the app palette, not the form's, and goes invisible on dark/
              // custom-colored forms.
              <button
                type="button"
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-4 py-2 rounded-md border border-current text-sm font-medium opacity-90 hover:opacity-70 transition-opacity"
              >
                Back
              </button>
            )}
            {currentPage < pages.length - 1 ? (
              <Button type="button" onClick={handleNext} disabled={!pageComplete}>
                Next
              </Button>
            ) : (
              submitButton
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4">{submitButton}</div>
      )}
    </form>
  );
}

export default FormUi;
