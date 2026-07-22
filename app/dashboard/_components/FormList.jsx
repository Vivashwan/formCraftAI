"use client";
import { useUser } from "@clerk/nextjs";
import React, { useEffect, useState } from "react";
import FormListItem from "./FormListItem";
import { getMyForms } from "@/app/_actions/forms";

function FormList() {
  const { user } = useUser();
  const [formList, setFormList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    user && GetFormList();
  }, [user]);
  const GetFormList = async () => {
    setLoading(true);
    try {
      const result = await getMyForms();
      setFormList(result || []);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="border rounded-lg p-4 h-40 animate-pulse bg-muted/40"
          />
        ))}
      </div>
    );
  }

  if (formList.length === 0) {
    return (
      <div className="mt-10 text-center text-muted-foreground">
        No forms yet. Click <strong>Create Form</strong> to build your first one.
      </div>
    );
  }

  return (
    <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-5">
      {formList.map((form, index) => (
        <div key={index}>
          <FormListItem
            jsonForm={JSON.parse(form.jsonform)}
            formRecord={form}
            refreshData={GetFormList}
          />
        </div>
      ))}
    </div>
  );
}

export default FormList;
