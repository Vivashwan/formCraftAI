import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import FieldForm from "./FieldForm";
import { needsOptions } from "@/app/_data/fieldUtils";

const EMPTY_FIELD = {
  label: "",
  placeholder: "",
  fieldType: "text",
  required: false,
  options: [],
  condition: null,
  fileTypes: [],
  validation: {},
};

// Lets the user add a brand-new field of any type to the form.
function AddFieldDialog({ onAdd, fields = [] }) {
  const [open, setOpen] = useState(false);
  const [def, setDef] = useState(EMPTY_FIELD);

  const handleOpenChange = (next) => {
    if (next) setDef(EMPTY_FIELD); // reset each time it opens
    setOpen(next);
  };

  const handleAdd = () => {
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
    onAdd(def);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex gap-2 w-full">
          <Plus className="h-4 w-4" /> Add Field
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a new field</DialogTitle>
        </DialogHeader>
        <FieldForm value={def} onChange={setDef} fields={fields} selfName="" />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd}>Add Field</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddFieldDialog;
