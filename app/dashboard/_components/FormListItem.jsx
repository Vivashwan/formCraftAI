"use client";
import { Button } from "@/components/ui/button";
import { Copy, Edit, MoreVertical, Pencil, Trash } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

import { toast } from "sonner";
import ShareDialog from "@/app/_components/ShareDialog";
import { deleteForm, duplicateForm, renameForm } from "@/app/_actions/forms";

function FormListItem({ formRecord, jsonForm, refreshData }) {
  const [openDelete, setOpenDelete] = useState(false);
  const [openRename, setOpenRename] = useState(false);
  const [newTitle, setNewTitle] = useState(jsonForm?.formTitle || "");
  const [renaming, setRenaming] = useState(false);

  const onDeleteForm = async () => {
    try {
      await deleteForm(formRecord.id);
      toast("Form and associated responses deleted successfully!");
      refreshData ? refreshData() : window.location.reload();
    } catch (error) {
      console.error("Error deleting form:", error);
      toast.error("Failed to delete form. Please try again.");
    }
  };

  const onDuplicateForm = async () => {
    try {
      await duplicateForm(formRecord.id);
      toast("Form duplicated!");
      refreshData ? refreshData() : window.location.reload();
    } catch (error) {
      console.error("Error duplicating form:", error);
      toast.error("Failed to duplicate form.");
    }
  };

  const onRenameForm = async () => {
    const title = newTitle.trim();
    if (!title) {
      toast.error("Please enter a form title.");
      return;
    }
    setRenaming(true);
    try {
      await renameForm(formRecord.id, title);
      toast("Form renamed successfully!");
      setOpenRename(false);
      refreshData ? refreshData() : window.location.reload();
    } catch (error) {
      console.error("Error renaming form:", error);
      toast.error("Failed to rename form. Please try again.");
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div className="border shadow-sm rounded-lg p-4">
      <div className="flex justify-between">
        <h2></h2>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Form options"
              className="p-1 rounded-md hover:bg-gray-100 outline-none"
            >
              <MoreVertical className="h-4 w-4 text-gray-600" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                setNewTitle(jsonForm?.formTitle || "");
                setOpenRename(true);
              }}
            >
              <Pencil className="h-4 w-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDuplicateForm()}>
              <Copy className="h-4 w-4" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onSelect={() => setOpenDelete(true)}
            >
              <Trash className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Add conditional check to ensure jsonForm is defined */}
      {jsonForm ? (
        <>
          <h2 className="text-lg text-foreground">
            {jsonForm.formTitle || "Untitled Form"}
          </h2>
          <h2 className="text-sm">
            {jsonForm.formSubheading ||
              jsonForm.formSubHeading ||
              "No subheading available"}
          </h2>
        </>
      ) : (
        <p>Loading form details...</p>
      )}

      <hr className="my-4" />

      <div className="flex gap-2">
        <ShareDialog
          url={`${process.env.NEXT_PUBLIC_BASE_URL}aiform/${formRecord?.uuid}`}
          title={jsonForm?.formTitle}
        />

        <Link href={`/edit-style/${formRecord?.uuid}`}>
          <Button className="flex gap-2" size="sm">
            <Edit className="h-3 w-3" /> Edit
          </Button>
        </Link>
      </div>

      {/* Rename dialog */}
      <Dialog open={openRename} onOpenChange={setOpenRename}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename form</DialogTitle>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Enter new form title"
            onKeyDown={(e) => e.key === "Enter" && onRenameForm()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenRename(false)}>
              Cancel
            </Button>
            <Button onClick={onRenameForm} disabled={renaming}>
              {renaming ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              form and all associated responses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDeleteForm()}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default FormListItem;
