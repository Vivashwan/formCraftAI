import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit } from "lucide-react";
import { toast } from "sonner";

// Inline pencil editor for the form's title + description, matching the
// per-field FieldEdit affordance so header editing is consistent with fields.
function FormHeaderEdit({ title, subheading, onSave }) {
  const [open, setOpen] = useState(false);
  const [formTitle, setFormTitle] = useState(title || "");
  const [formSubheading, setFormSubheading] = useState(subheading || "");

  const handleOpenChange = (next) => {
    if (next) {
      setFormTitle(title || "");
      setFormSubheading(subheading || "");
    }
    setOpen(next);
  };

  const handleSave = () => {
    if (!formTitle.trim()) {
      toast.error("Please enter a form name.");
      return;
    }
    onSave({ formTitle, formSubheading });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="p-1 h-auto"
          aria-label="Edit form name and description"
        >
          <Edit className="h-4 w-4 text-gray-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-4 w-80">
        <h2 className="text-sm font-semibold mb-3">Edit Form Header</h2>
        <label className="text-xs block mb-1">Form Name</label>
        <Input
          value={formTitle}
          onChange={(e) => setFormTitle(e.target.value)}
          className="mb-3"
          placeholder="Form title"
        />
        <label className="text-xs block mb-1">Description</label>
        <Input
          value={formSubheading}
          onChange={(e) => setFormSubheading(e.target.value)}
          className="mb-4"
          placeholder="Form description"
        />
        <Button size="sm" className="w-full" onClick={handleSave}>
          Update
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export default FormHeaderEdit;
