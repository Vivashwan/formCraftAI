import { Edit, Trash } from "lucide-react";
import React, { useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

import FieldForm from "./FieldForm";
import {
  getFieldCondition,
  getFieldLabel,
  getFieldName,
  getFieldOptions,
  getFieldPlaceholder,
  getFieldRequired,
  getFieldRules,
  getFileTypes,
  needsOptions,
  normalizeType,
} from "@/app/_data/fieldUtils";

function FieldEdit({ defaultValue, onUpdate, deleteField, fields = [] }) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [def, setDef] = useState(fieldToDef(defaultValue));

  function fieldToDef(field) {
    return {
      label: getFieldLabel(field),
      placeholder: getFieldPlaceholder(field),
      fieldType: normalizeType(field?.fieldType),
      required: getFieldRequired(field),
      options: getFieldOptions(field),
      condition: getFieldCondition(field),
      fileTypes: getFileTypes(field),
      validation: getFieldRules(field),
    };
  }

  // Re-sync inputs to the field's current values each time the popover opens.
  const handleOpenChange = (open) => {
    if (open) setDef(fieldToDef(defaultValue));
    setIsPopoverOpen(open);
  };

  const handleUpdate = () => {
    if (!def.label.trim()) {
      toast.error("Please enter a label.");
      return;
    }
    if (needsOptions(def.fieldType)) {
      const valid = (def.options || []).filter((o) => o.label.trim());
      if (valid.length === 0) {
        toast.error("Please add at least one option.");
        return;
      }
    }
    if (def.fieldType === "file" && (def.fileTypes || []).length === 0) {
      toast.error("Please select at least one allowed file type.");
      return;
    }
    if (def.fieldType === "calendar") {
      if (!def.validation?.minDate || !def.validation?.maxDate) {
        toast.error("Please set both an earliest and latest date.");
        return;
      }
      if (!def.validation?.dateFormat) {
        toast.error("Please choose a date format.");
        return;
      }
    }
    onUpdate({
      label: def.label,
      placeholder: def.placeholder,
      fieldType: def.fieldType,
      required: def.required,
      options: def.options,
      condition: def.condition,
      fileTypes: def.fileTypes,
      validation: def.validation,
    });
    setIsPopoverOpen(false);
  };

  return (
    <div className="flex gap-2 items-center">
      {/* Popover for editing / converting the field */}
      <Popover open={isPopoverOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="p-0">
            <Edit className="h-4 w-4 text-gray-600" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-4 w-80 max-h-[70vh] overflow-y-auto">
          <h2 className="text-sm font-semibold mb-3">Edit Field</h2>
          <FieldForm
            value={def}
            onChange={setDef}
            fields={fields}
            selfName={getFieldName(defaultValue)}
          />
          <Button
            size="sm"
            className="w-full text-sm mt-4"
            onClick={handleUpdate}
          >
            Update
          </Button>
        </PopoverContent>
      </Popover>

      {/* Alert Dialog for deleting */}
      <AlertDialog>
        <AlertDialogTrigger>
          <Trash className="h-4 w-4 text-red-500" />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold">
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This action cannot be undone. This will permanently delete this
              field.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteField()}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default FieldEdit;
