"use client";
import { useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  Loader2,
  SeparatorHorizontal,
  Share2,
  SquareArrowOutUpRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import FormUi from "../_components/FormUi";
import { toast } from "sonner";
import Controller from "../_components/Controller";
import AddFieldDialog from "../_components/AddFieldDialog";
import FormSettings from "../_components/FormSettings";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import ShareDialog from "@/app/_components/ShareDialog";
import { applyFieldPatch, makeField } from "@/app/_data/fieldUtils";
import {
  getForm,
  updateFormColumn,
  updateFormJson,
  updateFormSettings,
} from "@/app/_actions/forms";

function EditForm({ params }) {
  const { user } = useUser();
  const [jsonForm, setJsonForm] = useState([]);

  const router = useRouter();
  const [updateTrigger, setUpdateTrigger] = useState();

  const [record, setRecord] = useState([]);

  const [selectedTheme, setSelectedTheme] = useState("valentine");
  const [selectedBackground, setSelectedBackground] = useState();
  const [selectedStyle, setSelectedStyle] = useState();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    user && GetFormData();
  }, [user]);

  // Tolerate null / malformed JSON columns.
  const safeParse = (value, fallback) => {
    if (!value) return fallback;
    try {
      return JSON.parse(value);
    } catch (e) {
      return fallback;
    }
  };

  const GetFormData = async () => {
    setLoading(true);
    const result = await getForm(params?.formId);

    setRecord(result);
    setJsonForm(safeParse(result?.jsonform, {}));
    setSelectedBackground(result?.background);
    setSelectedTheme(result?.theme);
    setSelectedStyle(safeParse(result?.style, {}));
    setLoading(false);
  };

  useEffect(() => {
    if (updateTrigger) {
      setJsonForm(jsonForm);
      updateJsonFormInDb();
    }
  }, [updateTrigger]);

  // Fields may live under `form` or `formFields` depending on the AI output;
  // target whichever the form actually uses.
  const getFieldsKey = () => (jsonForm?.form ? "form" : "formFields");

  const onFieldUpdate = (value, index) => {
    const key = getFieldsKey();
    if (!jsonForm?.[key]?.[index]) return;
    // Apply the full patch (type conversion, options, required, label, etc.).
    applyFieldPatch(jsonForm[key][index], value);

    setUpdateTrigger(Date.now());
  };

  // Update the form's title / description (edited inline from the form header)
  // and persist so the dashboard reflects it.
  const onFormDetailUpdate = (patch) => {
    setJsonForm((prev) => ({ ...prev, ...patch }));
    setUpdateTrigger(Date.now());
  };

  const onSettingsChange = async (patch) => {
    // Optimistically reflect in local state, then persist.
    setRecord((prev) => ({ ...prev, ...patch }));
    await updateFormSettings(record.id, patch);
    toast("Settings saved");
  };

  const onAddPageBreak = () => {
    const key = getFieldsKey();
    if (!jsonForm[key]) jsonForm[key] = [];
    jsonForm[key].push({
      fieldType: "pagebreak",
      fieldName: "pagebreak-" + jsonForm[key].length,
    });
    setUpdateTrigger(Date.now());
    toast("Page break added");
  };

  const onMoveField = (from, to) => {
    const key = getFieldsKey();
    const arr = [...(jsonForm[key] || [])];
    if (from < 0 || to < 0 || from >= arr.length || to >= arr.length) return;
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    jsonForm[key] = arr;
    setUpdateTrigger(Date.now());
  };

  const onAddField = (def) => {
    const key = getFieldsKey();
    if (!jsonForm[key]) jsonForm[key] = [];
    jsonForm[key].push(
      makeField({
        fieldName: def.label,
        label: def.label,
        placeholder: def.placeholder,
        fieldType: def.fieldType,
        required: def.required,
        options: def.options,
        condition: def.condition,
        fileTypes: def.fileTypes,
        validation: def.validation,
      })
    );
    setUpdateTrigger(Date.now());
    toast("Field added !!");
  };

  const updateJsonFormInDb = async () => {
    await updateFormJson(record.id, JSON.stringify(jsonForm));
    toast("Updated !!");
  };

  const deleteField = (indexToRemove) => {
    const key = getFieldsKey();
    jsonForm[key] = jsonForm[key].filter(
      (item, index) => index != indexToRemove
    );
    setUpdateTrigger(Date.now());
  };

  const updateControllerFields = async (value, columnName) => {
    // Guard against changes firing before the form record has loaded.
    if (!record?.id) return;
    await updateFormColumn(record.id, columnName, value);

    toast("Updated !!");
  };

  // Form doesn't exist (e.g. an old integer URL) or isn't owned by this user.
  if (!loading && !record?.id) {
    return (
      <div className="p-4 md:p-10 flex flex-col items-center justify-center text-center min-h-[60vh]">
        <h2 className="text-2xl font-bold">Form not found</h2>
        <p className="text-muted-foreground mt-2">
          This form doesn’t exist or you don’t have access to it.
        </p>
        <Button className="mt-4" onClick={() => router.push("/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10">
      <div className="flex justify-between items-center">
        <h2
          className="flex gap-2 items-center my-5 cursor-pointer hover:font-bold"
          onClick={() => router.back()}
        >
          <ArrowLeft /> Back
        </h2>
        <div className="flex gap-2">
          <Link href={"/aiform/" + record?.uuid} target="_blank">
            <Button className="flex gap-2">
              {" "}
              <SquareArrowOutUpRight className="h-5 w-5" /> Live Preview
            </Button>
          </Link>
          <ShareDialog
            url={process.env.NEXT_PUBLIC_BASE_URL + "aiform/" + record?.uuid}
            title={jsonForm?.formTitle}
            trigger={
              <Button className="flex gap-2 bg-green-600 hover:bg-green-700">
                {" "}
                <Share2 /> Share
              </Button>
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        <div className="p-4 md:p-5 border rounded-lg shadow-md">
          <div className="mb-5 space-y-2">
            <AddFieldDialog
              onAdd={onAddField}
              fields={jsonForm?.form || jsonForm?.formFields || []}
            />
            <Button
              variant="outline"
              size="sm"
              className="flex gap-2 w-full"
              onClick={onAddPageBreak}
            >
              <SeparatorHorizontal className="h-4 w-4" /> Add Page Break
            </Button>
          </div>
          <Controller
            selectedTheme={(value) => {
              updateControllerFields(value, "theme"), setSelectedTheme(value);
            }}
            selectedBackground={(value) => {
              updateControllerFields(value, "background"),
                setSelectedBackground(value);
            }}
            selectedStyle={(value) => {
              setSelectedStyle(value);
              updateControllerFields(value, "style");
            }}
            setSignInEnable={(value) => {
              updateControllerFields(value, "enabledSignIn");
            }}
            previewTheme={(value) => setSelectedTheme(value)}
            previewBackground={(value) => setSelectedBackground(value)}
          />
          {!loading && (
            <FormSettings settings={record} onChange={onSettingsChange} />
          )}
        </div>
        <div
          className="md:col-span-2 border rounded-lg p-3 md:p-5 flex items-center justify-center overflow-x-auto"
          style={{ backgroundImage: selectedBackground }}
        >
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 py-10">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading form...
            </div>
          ) : (
            <FormUi
              jsonForm={jsonForm}
              selectedTheme={selectedTheme}
              selectedStyle={selectedStyle}
              onFieldUpdate={onFieldUpdate}
              onFormDetailUpdate={onFormDetailUpdate}
              onMoveField={onMoveField}
              deleteField={(index) => deleteField(index)}
              disableSubmit={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default EditForm;
