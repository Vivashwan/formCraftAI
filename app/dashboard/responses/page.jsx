"use client";
import { useUser } from "@clerk/nextjs";
import React, { useEffect, useState } from "react";
import FormListItemResponse from "./_components/FormListItemResponse";
import { getMyForms } from "@/app/_actions/forms";

// Tolerate a malformed jsonform so one corrupt record can't crash the page.
const safeParse = (value) => {
  try {
    return JSON.parse(value || "{}");
  } catch (e) {
    return {};
  }
};

function Responses() {
  const { user } = useUser();

  const [formList, setFormList] = useState();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    user && getFormList();
  }, [user]);

  const getFormList = async () => {
    setLoading(true);
    try {
      const result = await getMyForms();
      setFormList(result || []);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="p-10">
      <h2 className="font-bold text-3xl flex items-center justify-between">
        Responses
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="border rounded-lg p-4 h-32 animate-pulse bg-muted/40"
            />
          ))
        ) : formList?.length ? (
          formList.map((form, index) => (
            <FormListItemResponse
              key={index}
              formRecord={form}
              jsonForm={safeParse(form.jsonform)}
            />
          ))
        ) : (
          <p className="text-muted-foreground col-span-full mt-5">
            No forms yet.
          </p>
        )}
      </div>
    </div>
  );
}

export default Responses;
