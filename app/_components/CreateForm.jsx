"use client";
import React, { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createForm } from "@/app/_actions/forms";

function CreateForm() {
  const [openDialog, setOpenDialog] = useState(false);
  const [userInput, setUserInput] = useState();
  const [loading, setLoading] = useState();

  const { user } = useUser();
  const route = useRouter();

  const onCreateForm = async () => {
    if (!userInput?.trim()) {
      toast("Please describe your form first.");
      return;
    }

    setLoading(true);
    try {
      // Server enforces the free-plan limit, generates the form, and inserts it.
      const result = await createForm(userInput);

      if (result?.error === "LIMIT") {
        toast("Upgrade to create unlimited forms");
      } else if (result?.uuid) {
        route.push("/edit-style/" + result.uuid);
      } else {
        toast.error("Could not generate the form. Please try again.");
      }
    } catch (error) {
      console.error("Error creating form:", error);
      toast.error("Could not generate the form. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div>
      <Button onClick={() => setOpenDialog(true)}>Create Form</Button>
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create your new form</DialogTitle>
            <DialogDescription>
              <Textarea
                className="my-2"
                onChange={(event) => setUserInput(event.target.value)}
                placeholder="Write description for your form..."
              />
              <div className="flex gap-2 my-3 justify-end">
                <Button
                  onClick={() => setOpenDialog(false)}
                  variant="destructive"
                >
                  Cancel
                </Button>
                <Button disabled={loading} onClick={() => onCreateForm()}>
                  {loading ? <Loader2 className="animate-spin" /> : "Create"}
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CreateForm;
