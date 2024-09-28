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
import { AiChatSession } from "@/configs/AiModal";
import { useUser } from "@clerk/nextjs";
import { JsonForms } from "@/configs/schema";
import moment from "moment/moment";
import { db } from "@/configs";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { desc, eq } from "drizzle-orm";

const PROMPT =
  ", on the basis of description please give form in json format with form title, form subheading with form having Form field, form name, placeholder name and form label, field type, field required in json format. Give only from checkbox, radiogroup, radiogroupitem, input text, calendar, digits like for mobile number ";

function CreateForm() {
  const [openDialog, setOpenDialog] = useState(false);
  const [userInput, setUserInput] = useState();
  const [loading, setLoading] = useState();

  const { user } = useUser();
  const route = useRouter();

  const [formList, setFormList] = useState();

  useEffect(() => {
    user && GetFormList()
  }, [user])

  const GetFormList = async () => {
    const result = await db.select().from(JsonForms)
      .where(eq(JsonForms.createdBy, user?.primaryEmailAddress?.emailAddress))
      .orderBy(desc(JsonForms.id));

    setFormList(result);
  }

  const onCreateForm = async () => {

    if (formList?.length == 3) {
      toast('Upgrade to create unlimited forms')
      return;
    }

    setLoading(true);

    const result = await AiChatSession.sendMessage(
      "Description: " + userInput + PROMPT
    );

    if (result.response.text()) {
      const resp = await db
        .insert(JsonForms)
        .values({
          jsonform: result.response.text(),
          createdBy: user?.primaryEmailAddress?.emailAddress,
          createdAt: moment().format("DD/MM/yyyy"),
        })
        .returning({ id: JsonForms.id });

      if (resp[0].id) {
        route.push("/edit-style/" + resp[0].id);
      }

      setLoading(false);
    }

    setLoading(false);
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
