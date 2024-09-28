import { Delete, Edit, Trash } from "lucide-react";
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

function FieldEdit({ defaultValue, onUpdate, deleteField }) {
  const [label, setLabel] = useState(defaultValue?.formLabel || '');
  const [placeholder, setPlaceholder] = useState(defaultValue?.placeholderName || '');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false); // Popover state

  const handleUpdate = () => {
    // Basic validation to ensure fields are not empty
    if (!label.trim() || !placeholder.trim()) {
      return; // Or show an error message
    }
    onUpdate({
      label: label,
      placeholder: placeholder,
    });
    setIsPopoverOpen(false); // Close the popover after updating
  };

  return (
    <div className="flex gap-2 items-center">
      {/* Popover for editing */}
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="p-0">
            <Edit className="h-4 w-4 text-gray-600" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-4">
          <h2 className="text-sm font-semibold mb-2">Edit Fields</h2>
          <div className="mb-2">
            <label className="text-xs block mb-1">Label Name</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="text-xs block mb-1">Placeholder Name</label>
            <input
              type="text"
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
          <Button size="sm" className="w-full text-sm" onClick={handleUpdate}>
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
              This action cannot be undone. This will permanently delete this field.
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
