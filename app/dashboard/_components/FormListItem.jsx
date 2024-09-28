import { Button } from "@/components/ui/button";
import { Edit, Share, Trash } from "lucide-react";
import Link from "next/link";
import React from "react";

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

import { useUser } from "@clerk/nextjs";
import { db } from "@/configs";
import { JsonForms, userResponses } from "@/configs/schema";
import { and, eq } from "drizzle-orm";
import { toast } from "sonner";
import { RWebShare } from "react-web-share";

function FormListItem({ formRecord, jsonForm, refreshData }) {
  const { user } = useUser();

  const onDeleteForm = async () => {
    try {
      // First, delete all associated user responses
      await db
        .delete(userResponses)
        .where(eq(userResponses.formReference, formRecord.id));

      // Then, delete the form itself
      const result = await db
        .delete(JsonForms)
        .where(
          and(
            eq(JsonForms.id, formRecord.id),
            eq(JsonForms.createdBy, user?.primaryEmailAddress?.emailAddress)
          )
        );

      if (result) {
        toast("Form and associated responses deleted successfully!");
        window.location.reload();
      } else {
        toast.error("Failed to delete form. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting form:", error);
      toast.error("Failed to delete form. Please try again.");
    }
  };

  return (
    <div className="border shadow-sm rounded-lg p-4">
      <div className="flex justify-between">
        <h2></h2>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Trash className="h-4 w-4 text-red-600 cursor-pointer hover:scale-105 transition-all" />
          </AlertDialogTrigger>
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

      {/* Add conditional check to ensure jsonForm is defined */}
      {jsonForm ? (
        <>
          <h2 className="text-lg text-black">
            {jsonForm.formTitle || "Untitled Form"}
          </h2>
          <h2 className="text-sm">
            {jsonForm.formSubheading || "No subheading available"}
          </h2>
        </>
      ) : (
        <p>Loading form details...</p>
      )}

      <hr className="my-4" />

      <div className="flex gap-2">
        <RWebShare
          data={{
            text: `${jsonForm?.formSubheading} , Build your form in seconds with AI form builder`,
            url: `${process.env.NEXT_PUBLIC_BASE_URL}aiform/${formRecord?.id}`,
            title: jsonForm?.formTitle,
          }}
          onClick={() => console.log("shared successfully!")}
        >
          <Button variant="outline" size="sm" className="flex gap-2">
            <Share className="h-3 w-3" /> Share
          </Button>
        </RWebShare>

        <Link href={`/edit-style/${formRecord?.id}`}>
          <Button className="flex gap-2" size="sm">
            <Edit className="h-3 w-3" /> Edit
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default FormListItem;
