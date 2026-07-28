import React, { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateValue } from "@/app/_data/fieldUtils";

// --- date helpers ---
function buildIso(y, m, d) {
  if (!y || !m || !d || String(y).length !== 4) return null;
  const yy = Number(y);
  const mm = Number(m);
  const dd = Number(d);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const iso = `${String(yy).padStart(4, "0")}-${String(mm).padStart(
    2,
    "0"
  )}-${String(dd).padStart(2, "0")}`;
  const dt = new Date(`${iso}T00:00:00Z`);
  if (
    dt.getUTCFullYear() !== yy ||
    dt.getUTCMonth() + 1 !== mm ||
    dt.getUTCDate() !== dd
  )
    return null;
  return iso;
}

function isoToParts(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? { y: m[1], m: m[2], d: m[3] } : { d: "", m: "", y: "" };
}

function dateLayout(format) {
  const sep = format === "DD MMM YYYY" ? " " : format?.includes("-") ? "-" : "/";
  if (format === "MM/DD/YYYY") return { order: ["m", "d", "y"], sep };
  if (format === "YYYY-MM-DD") return { order: ["y", "m", "d"], sep };
  return { order: ["d", "m", "y"], sep }; // DD/MM/YYYY, DD-MM-YYYY, DD MMM YYYY
}

const PART_META = {
  d: { placeholder: "DD", max: 2, width: "w-14" },
  m: { placeholder: "MM", max: 2, width: "w-14" },
  y: { placeholder: "YYYY", max: 4, width: "w-20" },
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

// A date field the respondent can either type (in the owner's chosen format) or
// pick from a calendar popover. Stores/returns the value as ISO (YYYY-MM-DD).
function DateField({
  label,
  value,
  format,
  minDate,
  maxDate,
  required,
  onChange,
}) {
  const [parts, setParts] = useState(() => isoToParts(value));
  const [open, setOpen] = useState(false);
  const inputRefs = useRef([]); // one <input> per part, in display order
  const [view, setView] = useState(() => {
    const base = isoToParts(value).y
      ? isoToParts(value)
      : isoToParts(minDate || maxDate || "");
    return base.y ? { y: Number(base.y), m: Number(base.m) } : { y: 2020, m: 1 };
  });

  const { order, sep } = dateLayout(format);
  const iso = buildIso(parts.y, parts.m, parts.d);
  const complete = parts.d && parts.m && parts.y.length === 4;

  let error = null;
  if (complete) {
    if (!iso) error = "Please enter a valid date.";
    else if ((minDate && iso < minDate) || (maxDate && iso > maxDate))
      error = `Allowed: ${formatDateValue(minDate, format)} – ${formatDateValue(
        maxDate,
        format
      )}`;
  }

  const commit = (next) => {
    setParts(next);
    onChange(buildIso(next.y, next.m, next.d) || "");
  };

  const setPart = (part, raw, idx) => {
    const meta = PART_META[part];
    const val = raw.replace(/\D/g, "").slice(0, meta.max);
    commit({ ...parts, [part]: val });
    // Auto-advance to the next field once this one is full.
    if (val.length === meta.max && idx < order.length - 1) {
      inputRefs.current[idx + 1]?.focus();
      inputRefs.current[idx + 1]?.select();
    }
  };

  const onPartKeyDown = (e, part, idx) => {
    // Backspace on an empty field jumps back to the previous one.
    if (e.key === "Backspace" && !parts[part] && idx > 0) {
      e.preventDefault();
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const pickDay = (y, m, d) => {
    commit({
      y: String(y),
      m: String(m).padStart(2, "0"),
      d: String(d).padStart(2, "0"),
    });
    setOpen(false);
  };

  const shiftMonth = (delta) =>
    setView((v) => {
      let m = v.m + delta;
      let y = v.y;
      if (m < 1) {
        m = 12;
        y -= 1;
      } else if (m > 12) {
        m = 1;
        y += 1;
      }
      return { y, m };
    });

  // Build the month grid (leading blanks + day numbers).
  const daysInMonth = new Date(Date.UTC(view.y, view.m, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(view.y, view.m - 1, 1)).getUTCDay();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  const dayIso = (day) =>
    `${String(view.y).padStart(4, "0")}-${String(view.m).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;
  const dayDisabled = (day) => {
    const di = dayIso(day);
    return (minDate && di < minDate) || (maxDate && di > maxDate);
  };

  return (
    <div className="my-1 w-full">
      <label className="text-xs">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div className="flex items-center gap-1">
        {order.map((part, idx) => (
          <React.Fragment key={part}>
            <Input
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              aria-label={`${label} ${PART_META[part].placeholder}`}
              placeholder={PART_META[part].placeholder}
              maxLength={PART_META[part].max}
              className={`bg-white text-gray-900 text-center placeholder:text-gray-400 ${PART_META[part].width}`}
              value={parts[part] || ""}
              onChange={(e) => setPart(part, e.target.value, idx)}
              onKeyDown={(e) => onPartKeyDown(e, part, idx)}
            />
            {idx < order.length - 1 && (
              <span className="text-gray-500 select-none">{sep}</span>
            )}
          </React.Fragment>
        ))}

        <Popover
          open={open}
          onOpenChange={(o) => {
            // When opening, jump the calendar to the date already entered so it
            // points at (and highlights) the manually-typed value.
            if (o && iso) {
              const p = isoToParts(iso);
              setView({ y: Number(p.y), m: Number(p.m) });
            }
            setOpen(o);
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Open calendar"
              className="ml-1 p-2 rounded-md border bg-white text-gray-700 hover:bg-gray-50 shrink-0"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium">
                {MONTH_NAMES[view.m - 1]} {view.y}
              </span>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {WEEKDAYS.map((w, i) => (
                <div key={i} className="text-[10px] text-gray-400 py-1">
                  {w}
                </div>
              ))}
              {cells.map((day, i) =>
                day == null ? (
                  <div key={i} />
                ) : (
                  <button
                    key={i}
                    type="button"
                    disabled={dayDisabled(day)}
                    onClick={() => pickDay(view.y, view.m, day)}
                    className={`h-8 w-8 text-xs rounded-full ${
                      iso === dayIso(day)
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-gray-100"
                    } disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed`}
                  >
                    {day}
                  </button>
                )
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export default DateField;
