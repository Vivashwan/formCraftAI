import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getResponses,
  getResponseCount,
  deleteResponse as deleteResponseAction,
  deleteResponses as deleteResponsesAction,
  deleteAllResponses as deleteAllResponsesAction,
} from "@/app/_actions/responses";
import {
  ArrowLeft,
  ArrowUpDown,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Eye,
  List,
  Loader2,
  Search,
  Trash,
  Trash2,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDateValue,
  getFieldLabel,
  getFieldName,
  getFieldOptions,
  getFieldRules,
  isPageBreak,
  normalizeType,
} from "@/app/_data/fieldUtils";

// Rotating palette for the summary charts so each bar/segment is distinct.
const CHART_COLORS = [
  "#6366f1", // indigo
  "#22c55e", // green
  "#f59e0b", // amber
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#8b5cf6", // violet
  "#ef4444", // red
  "#14b8a6", // teal
  "#f97316", // orange
  "#84cc16", // lime
];
const chartColor = (i) => CHART_COLORS[i % CHART_COLORS.length];

// Column header that shows the active sort direction (▲ asc / ▼ desc) so the
// user can see exactly which column and direction is being sorted.
function SortHeader({ label, active, dir, onClick }) {
  return (
    <button
      type="button"
      className="flex items-center gap-1 hover:text-black"
      onClick={onClick}
      title={
        active
          ? `Sorted ${
              dir === "asc" ? "ascending" : "descending"
            } — click to ${dir === "asc" ? "reverse" : "clear sort"}`
          : "Click to sort ascending"
      }
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <ChevronUp className="h-3.5 w-3.5 text-black" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-black" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 text-gray-300" />
      )}
    </button>
  );
}

function FormListItemResponse({ jsonForm, formRecord }) {
  const [loading, setLoading] = useState(false);
  const [totalResponses, setTotalResponses] = useState(0);
  const [error, setError] = useState(null);
  const [openView, setOpenView] = useState(false);

  const [columns, setColumns] = useState([]);
  const [responses, setResponses] = useState([]); // [{ id, createdAt, data }]
  const [tab, setTab] = useState("responses"); // "responses" | "summary"
  const [detail, setDetail] = useState(null); // a single response, or null
  const [pendingDelete, setPendingDelete] = useState(null); // response id
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [selected, setSelected] = useState(() => new Set()); // response ids
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);
  const [deletingSelected, setDeletingSelected] = useState(false);

  // Table controls
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(null); // { key, dir: "asc" | "desc" }
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    fetchTotalResponses();
  }, []);

  const safeParse = (value, fallback) => {
    if (!value) return fallback;
    try {
      return JSON.parse(value);
    } catch (e) {
      return fallback;
    }
  };

  const fetchTotalResponses = async () => {
    try {
      const count = await getResponseCount(formRecord.id);
      setTotalResponses(count);
    } catch (error) {
      console.error("Error fetching total responses:", error);
      setTotalResponses(0);
    }
  };

  const getFormFields = () => {
    try {
      const parsed = JSON.parse(formRecord.jsonform);
      const fields = parsed?.formFields || parsed?.form || [];
      // Page breaks aren't real fields — exclude them from responses.
      return fields.filter((f) => !isPageBreak(f));
    } catch (e) {
      return [];
    }
  };

  const isFile = (value) =>
    value && typeof value === "object" && typeof value.dataUrl === "string";

  const formatValue = (value) => {
    if (value === null || value === undefined || value === "") return "";
    if (isFile(value)) return value.name || "file";
    if (Array.isArray(value)) {
      return value
        .map((v) => (v && typeof v === "object" ? v.label ?? v.value ?? "" : v))
        .join(", ");
    }
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  // Column-aware display: calendar values are stored as ISO but shown in the
  // field's chosen date format; everything else uses formatValue.
  const displayValue = (col, value) => {
    if (col?.type === "calendar" && col?.dateFormat && value) {
      return formatDateValue(value, col.dateFormat);
    }
    return formatValue(value);
  };

  // Builds table columns. Surviving form fields keep their form order; a field
  // that was later deleted still appears in the stored responses, so instead of
  // dumping such columns at the end we slot each one back into the position it
  // held at submission time — right after the nearest surviving field that
  // preceded it in the response data (whose key order reflects the old layout).
  const buildColumns = (parsedResponses) => {
    const fields = getFormFields();
    const cols = []; // ordered keys
    const label = {};
    const meta = {}; // key -> { type, dateFormat }

    fields.forEach((field) => {
      const key = getFieldName(field);
      if (!key || key in label) return;
      label[key] = getFieldLabel(field) || key;
      meta[key] = {
        type: normalizeType(field.fieldType),
        dateFormat: getFieldRules(field).dateFormat,
      };
      cols.push(key);
    });
    const isFormField = new Set(cols);

    // Collect deleted keys with the anchor (preceding surviving field) they were
    // first seen next to.
    const anchorFor = {};
    parsedResponses.forEach((r) => {
      const keys = Object.keys(r.data || {});
      keys.forEach((key, i) => {
        if (isFormField.has(key) || key in anchorFor) return;
        let anchor = null;
        for (let j = i - 1; j >= 0; j--) {
          if (isFormField.has(keys[j])) {
            anchor = keys[j];
            break;
          }
        }
        anchorFor[key] = anchor; // null → belonged before any surviving field
      });
    });

    // Insert each deleted key just after its anchor (or at the front).
    Object.keys(anchorFor).forEach((key) => {
      label[key] = key;
      const anchor = anchorFor[key];
      const at = anchor == null ? 0 : cols.indexOf(anchor) + 1;
      cols.splice(at, 0, key);
    });

    return cols.map((key) => ({
      key,
      label: label[key],
      type: meta[key]?.type,
      dateFormat: meta[key]?.dateFormat,
    }));
  };

  // Fetches responses and updates the table/summary. `silent` skips the spinner
  // (used by the live poller).
  const loadResponses = async () => {
    const result = await getResponses(formRecord.id);
    const parsed = (result || []).map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      data: safeParse(r.jsonResponse, {}),
    }));
    setResponses(parsed);
    setColumns(buildColumns(parsed));
    setTotalResponses(parsed.length);
  };

  const openViewSheet = async () => {
    setLoading(true);
    setError(null);
    try {
      await loadResponses();
      setTab("responses");
      setDetail(null);
      setOpenView(true);
    } catch (error) {
      console.error("Error loading responses:", error);
      setError("Failed to load responses: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Live updates: while the view is open, poll for new responses every 5s.
  useEffect(() => {
    if (!openView) return;
    let inFlight = false;
    const interval = setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        await loadResponses();
      } catch (e) {
        /* transient — try again next tick */
      } finally {
        inFlight = false;
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [openView]);

  const deleteResponse = async (id) => {
    try {
      await deleteResponseAction(id);
      setResponses((prev) => prev.filter((r) => r.id !== id));
      setTotalResponses((t) => Math.max(0, t - 1));
      setDetail(null);
      toast("Response deleted");
    } catch (error) {
      console.error("Error deleting response:", error);
      toast.error("Failed to delete response.");
    } finally {
      setPendingDelete(null);
    }
  };

  // Distribution stats for choice fields (select / radio / checkbox).
  const buildSummary = () => {
    const fields = getFormFields();
    return fields
      .filter((f) => ["select", "radiogroup", "checkbox", "rating"].includes(
        normalizeType(f.fieldType)
      ))
      .map((field) => {
        const key = getFieldName(field);
        const type = normalizeType(field.fieldType);
        const options =
          type === "rating"
            ? [1, 2, 3, 4, 5].map((n) => ({
                label: `${n} ★`,
                value: String(n),
              }))
            : getFieldOptions(field);
        const counts = {};
        options.forEach((o) => (counts[o.label] = 0));

        const labelFor = (val) => {
          const opt = options.find(
            (o) => String(o.value) === String(val) || o.label === val
          );
          return opt ? opt.label : String(val);
        };

        responses.forEach((r) => {
          const v = r.data?.[key];
          if (type === "checkbox") {
            (Array.isArray(v) ? v : []).forEach((item) => {
              const l = labelFor(item);
              counts[l] = (counts[l] || 0) + 1;
            });
          } else if (v !== undefined && v !== null && v !== "") {
            const l = labelFor(v);
            counts[l] = (counts[l] || 0) + 1;
          }
        });

        const items = Object.entries(counts).map(([label, count]) => ({
          label,
          count,
        }));
        return { key, label: getFieldLabel(field), type, items };
      });
  };

  const exportToExcel = () => {
    if (sorted.length === 0) {
      toast.error("No responses to export");
      return;
    }
    const exportRows = sorted.map((r) => {
      const out = {};
      columns.forEach((c) => {
        out[c.label] = displayValue(c, r.data?.[c.key]);
      });
      out["Submitted"] = r.createdAt;
      return out;
    });
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, (jsonForm?.formTitle || "form_responses") + ".xlsx");
  };

  // Submissions grouped by day (createdAt is "DD/MM/yyyy").
  const buildTimeline = () => {
    const counts = {};
    responses.forEach((r) => {
      const d = r.createdAt || "unknown";
      counts[d] = (counts[d] || 0) + 1;
    });
    const toTime = (s) => {
      const [dd, mm, yy] = (s || "").split("/");
      return new Date(`${yy}-${mm}-${dd}`).getTime() || 0;
    };
    return Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => toTime(a.date) - toTime(b.date));
  };

  // --- Search / sort / pagination over the responses table ---
  const rowText = (r) =>
    [...columns.map((c) => displayValue(c, r.data?.[c.key])), r.createdAt || ""]
      .join(" ")
      .toLowerCase();

  const filtered = search.trim()
    ? responses.filter((r) => rowText(r).includes(search.trim().toLowerCase()))
    : responses;

  const parseDate = (s) => {
    const [dd, mm, yy] = (s || "").split("/");
    return new Date(`${yy}-${mm}-${dd}`).getTime() || 0;
  };

  const sorted = sort
    ? [...filtered].sort((a, b) => {
        let av, bv;
        if (sort.key === "__submitted") {
          av = parseDate(a.createdAt);
          bv = parseDate(b.createdAt);
        } else {
          av = formatValue(a.data?.[sort.key]);
          bv = formatValue(b.data?.[sort.key]);
          const an = parseFloat(av);
          const bn = parseFloat(bv);
          if (Number.isFinite(an) && Number.isFinite(bn) && `${an}` === av && `${bn}` === bv) {
            av = an;
            bv = bn;
          }
        }
        if (av < bv) return sort.dir === "asc" ? -1 : 1;
        if (av > bv) return sort.dir === "asc" ? 1 : -1;
        return 0;
      })
    : filtered;

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const paged = sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const toggleSort = (key) => {
    setPage(0);
    setSort((prev) =>
      prev?.key === key
        ? prev.dir === "asc"
          ? { key, dir: "desc" }
          : null // third click clears the sort
        : { key, dir: "asc" }
    );
  };

  const sortLabel =
    sort &&
    (sort.key === "__submitted"
      ? "Submitted"
      : columns.find((c) => c.key === sort.key)?.label || sort.key);

  // --- Row selection (bulk delete) ---
  const toggleRow = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allPageSelected =
    paged.length > 0 && paged.every((r) => selected.has(r.id));

  const togglePage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) paged.forEach((r) => next.delete(r.id));
      else paged.forEach((r) => next.add(r.id));
      return next;
    });

  const handleDeleteSelected = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setDeletingSelected(true);
    try {
      const res = await deleteResponsesAction(ids);
      const removed = new Set(ids);
      setResponses((prev) => prev.filter((r) => !removed.has(r.id)));
      setTotalResponses((t) => Math.max(0, t - (res?.deleted ?? ids.length)));
      setSelected(new Set());
      setDetail(null);
      toast(`Deleted ${res?.deleted ?? ids.length} response(s)`);
    } catch (error) {
      console.error("Error deleting selected responses:", error);
      toast.error("Failed to delete selected responses.");
    } finally {
      setDeletingSelected(false);
      setConfirmDeleteSelected(false);
    }
  };

  const escapeCsv = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const exportToCsv = () => {
    if (sorted.length === 0) {
      toast.error("No responses to export");
      return;
    }
    const header = [...columns.map((c) => c.label), "Submitted"];
    const lines = [header.map(escapeCsv).join(",")];
    sorted.forEach((r) => {
      const cells = [
        ...columns.map((c) => displayValue(c, r.data?.[c.key])),
        r.createdAt,
      ];
      lines.push(cells.map(escapeCsv).join(","));
    });
    const blob = new Blob(["﻿" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (jsonForm?.formTitle || "form_responses") + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const res = await deleteAllResponsesAction(formRecord.id);
      setResponses([]);
      setTotalResponses(0);
      setDetail(null);
      setPage(0);
      toast(`Deleted ${res?.deleted ?? 0} response(s)`);
    } catch (error) {
      console.error("Error deleting all responses:", error);
      toast.error("Failed to delete responses.");
    } finally {
      setDeletingAll(false);
      setConfirmDeleteAll(false);
    }
  };

  const summary = openView && tab === "summary" ? buildSummary() : [];
  const timeline = openView && tab === "summary" ? buildTimeline() : [];

  return (
    <div className="border shadow-sm rounded-lg p-4 my-5">
      <h2 className="text-lg text-foreground">{jsonForm?.formTitle}</h2>
      <h2 className="text-sm">
        {jsonForm?.formSubheading || jsonForm?.formSubHeading}
      </h2>
      <hr className="my-4" />

      <div className="flex justify-between items-center">
        <h2 className="text-sm">
          <strong>{totalResponses}</strong> Responses
        </h2>
        <Button
          size="sm"
          className="flex gap-2"
          onClick={openViewSheet}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="animate-spin h-4 w-4" />
          ) : (
            <>
              <Eye className="h-4 w-4" /> View
            </>
          )}
        </Button>
      </div>
      {error && <p className="text-red-500 mt-2">{error}</p>}

      <Dialog
        open={openView}
        onOpenChange={(o) => {
          setOpenView(o);
          if (!o) setSelected(new Set());
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center justify-between gap-3 pr-6">
              <span className="flex items-center gap-2">
                {jsonForm?.formTitle || "Responses"}
                <span className="flex items-center gap-1 text-xs font-normal text-green-600">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Live
                </span>
              </span>
              <div className="flex items-center gap-2">
                {!detail && (
                  <div className="flex rounded-md border overflow-hidden">
                    <button
                      className={`px-3 py-1 text-xs flex items-center gap-1 ${
                        tab === "responses" ? "bg-gray-900 text-white" : ""
                      }`}
                      onClick={() => setTab("responses")}
                    >
                      <List className="h-3 w-3" /> Responses
                    </button>
                    <button
                      className={`px-3 py-1 text-xs flex items-center gap-1 ${
                        tab === "summary" ? "bg-gray-900 text-white" : ""
                      }`}
                      onClick={() => setTab("summary")}
                    >
                      <BarChart3 className="h-3 w-3" /> Summary
                    </button>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="flex gap-2"
                  onClick={exportToExcel}
                  disabled={responses.length === 0}
                >
                  <Download className="h-4 w-4" /> Excel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex gap-2"
                  onClick={exportToCsv}
                  disabled={responses.length === 0}
                >
                  <Download className="h-4 w-4" /> CSV
                </Button>
                {!detail && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex gap-2 text-red-600 hover:text-red-700"
                    onClick={() => setConfirmDeleteAll(true)}
                    disabled={responses.length === 0}
                  >
                    <Trash className="h-4 w-4" /> Delete all
                  </Button>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {responses.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              No responses yet.
            </p>
          ) : detail ? (
            /* --- Single response detail --- */
            <div className="max-h-[70vh] overflow-auto">
              <button
                className="flex items-center gap-1 text-sm text-gray-600 mb-3 hover:text-black"
                onClick={() => setDetail(null)}
              >
                <ArrowLeft className="h-4 w-4" /> Back to all responses
              </button>
              <div className="space-y-3 border rounded-lg p-4">
                {columns.map((c) => {
                  const value = detail.data?.[c.key];
                  return (
                    <div key={c.key} className="grid grid-cols-3 gap-2 text-sm">
                      <div className="font-medium text-gray-600">{c.label}</div>
                      <div className="col-span-2">
                        {isFile(value) ? (
                          <a
                            href={value.dataUrl}
                            download={value.name}
                            className="text-blue-600 underline"
                          >
                            {value.name || "Download file"}
                          </a>
                        ) : (
                          displayValue(c, value) || (
                            <span className="text-gray-300">—</span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="grid grid-cols-3 gap-2 text-sm border-t pt-3">
                  <div className="font-medium text-gray-600">Submitted</div>
                  <div className="col-span-2 text-gray-500">
                    {detail.createdAt}
                  </div>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="mt-4 flex gap-2"
                onClick={() => setPendingDelete(detail.id)}
              >
                <Trash2 className="h-4 w-4" /> Delete this response
              </Button>
            </div>
          ) : tab === "summary" ? (
            /* --- Summary / analytics --- */
            <div className="max-h-[70vh] overflow-auto space-y-6 pr-1">
              {/* Submissions over time */}
              <div>
                <h3 className="font-medium text-sm mb-2">
                  Submissions over time
                </h3>
                <div className="flex items-end gap-1 h-28 border-b border-l pl-2 pb-0">
                  {timeline.map((t, i) => {
                    const max = Math.max(1, ...timeline.map((x) => x.count));
                    return (
                      <div
                        key={i}
                        className="flex flex-col items-center justify-end flex-1 min-w-[16px]"
                        title={`${t.date}: ${t.count}`}
                      >
                        <span className="text-[10px] text-gray-500">
                          {t.count}
                        </span>
                        <div
                          className="w-full rounded-t transition-all"
                          style={{
                            height: `${(t.count / max) * 90}px`,
                            backgroundColor: chartColor(i),
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1 mt-1">
                  {timeline.map((t, i) => (
                    <span
                      key={i}
                      className="text-[9px] text-gray-400 flex-1 min-w-[16px] text-center truncate"
                    >
                      {t.date?.slice(0, 5)}
                    </span>
                  ))}
                </div>
              </div>

              {summary.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">
                  No choice fields (dropdown / radio / checkbox) to summarize.
                </p>
              ) : (
                summary.map((field) => {
                  const max = Math.max(1, ...field.items.map((i) => i.count));
                  return (
                    <div key={field.key}>
                      <h3 className="font-medium text-sm mb-2">
                        {field.label}
                      </h3>
                      <div className="space-y-2">
                        {field.items.map((item, i) => {
                          const pct = totalResponses
                            ? Math.round((item.count / totalResponses) * 100)
                            : 0;
                          return (
                            <div key={i}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: chartColor(i) }}
                                  />
                                  {item.label}
                                </span>
                                <span className="text-gray-500">
                                  {item.count} ({pct}%)
                                </span>
                              </div>
                              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${(item.count / max) * 100}%`,
                                    backgroundColor: chartColor(i),
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* --- Responses table --- */
            <div className="space-y-3 min-w-0">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Search responses…"
                  className="pl-8"
                />
              </div>

              {/* Selection bar + current sort description */}
              <div className="flex flex-wrap items-center justify-between gap-2 min-h-[32px]">
                {selected.size > 0 ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {selected.size} selected
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex gap-2 h-8"
                      onClick={() => setConfirmDeleteSelected(true)}
                    >
                      <Trash className="h-4 w-4" /> Delete selected
                    </Button>
                    <button
                      className="text-xs text-gray-500 hover:text-black underline"
                      onClick={() => setSelected(new Set())}
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-500">
                    Tip: tick rows to select, then delete them together.
                  </span>
                )}
                {sort ? (
                  <span className="text-xs text-gray-500">
                    Sorted by <strong>{sortLabel}</strong> —{" "}
                    {sort.dir === "asc"
                      ? "ascending (A→Z, low→high, oldest first)"
                      : "descending (Z→A, high→low, newest first)"}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">
                    Click a column header to sort
                  </span>
                )}
              </div>

              <div className="max-h-[62vh] overflow-auto border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-8">
                        <Checkbox
                          checked={allPageSelected}
                          onCheckedChange={togglePage}
                          aria-label="Select all rows on this page"
                        />
                      </TableHead>
                      <TableHead className="w-10">#</TableHead>
                      {columns.map((c) => (
                        <TableHead key={c.key}>
                          <SortHeader
                            label={c.label}
                            active={sort?.key === c.key}
                            dir={sort?.dir}
                            onClick={() => toggleSort(c.key)}
                          />
                        </TableHead>
                      ))}
                      <TableHead>
                        <SortHeader
                          label="Submitted"
                          active={sort?.key === "__submitted"}
                          dir={sort?.dir}
                          onClick={() => toggleSort("__submitted")}
                        />
                      </TableHead>
                      <TableHead className="w-16 text-right">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length + 4}
                          className="text-center text-gray-500 py-6"
                        >
                          No responses match your search.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paged.map((r, i) => (
                        <TableRow
                          key={r.id}
                          data-state={selected.has(r.id) ? "selected" : undefined}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selected.has(r.id)}
                              onCheckedChange={() => toggleRow(r.id)}
                              aria-label="Select row"
                            />
                          </TableCell>
                          <TableCell className="text-gray-400">
                            {safePage * PAGE_SIZE + i + 1}
                          </TableCell>
                          {columns.map((c) => (
                            <TableCell key={c.key}>
                              {displayValue(c, r.data?.[c.key])}
                            </TableCell>
                          ))}
                          <TableCell className="whitespace-nowrap text-gray-500">
                            {r.createdAt}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <button
                                className="p-1 text-gray-500 hover:text-black"
                                onClick={() => setDetail(r)}
                                aria-label="View response"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>
                  {sorted.length} result{sorted.length === 1 ? "" : "s"}
                  {search.trim() && ` (of ${responses.length})`}
                </span>
                {pageCount > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      className="p-1 disabled:opacity-30 hover:text-black"
                      disabled={safePage === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span>
                      Page {safePage + 1} of {pageCount}
                    </span>
                    <button
                      className="p-1 disabled:opacity-30 hover:text-black"
                      disabled={safePage >= pageCount - 1}
                      onClick={() =>
                        setPage((p) => Math.min(pageCount - 1, p + 1))
                      }
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation (single, shared across rows/detail) */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this response?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The response will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteResponse(pendingDelete)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete-all confirmation */}
      <AlertDialog
        open={confirmDeleteAll}
        onOpenChange={(o) => !o && setConfirmDeleteAll(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all responses?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes all {totalResponses} response(s) for this
              form{formRecord?.googleSheetId ? " and clears the linked Google Sheet" : ""}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault(); // keep dialog open until the action resolves
                handleDeleteAll();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deletingAll}
            >
              {deletingAll ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Deleting…
                </span>
              ) : (
                "Delete all"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete-selected confirmation */}
      <AlertDialog
        open={confirmDeleteSelected}
        onOpenChange={(o) => !o && setConfirmDeleteSelected(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selected.size} selected response(s)?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the selected response(s)
              {formRecord?.googleSheetId
                ? " and their rows in the linked Google Sheet"
                : ""}
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingSelected}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteSelected();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deletingSelected}
            >
              {deletingSelected ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Deleting…
                </span>
              ) : (
                "Delete selected"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default FormListItemResponse;
