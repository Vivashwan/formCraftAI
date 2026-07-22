"use client";
import FormUi from "@/app/edit-style/_components/FormUi";
import { getPublicForm } from "@/app/_actions/forms";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";

function LiveAiForm({ params }) {

  const [record, setRecord] = useState();
  const [jsonForm, setJsonForm] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    params && GetFormData();
  }, [params]);

  // Safely parse possibly-null / possibly-malformed JSON columns.
  const safeParse = (value, fallback) => {
    if (!value) return fallback;
    try {
      return JSON.parse(value);
    } catch (e) {
      return fallback;
    }
  };

  const GetFormData = async () => {
    try {
      const result = await getPublicForm(params?.formid);
      setRecord(result);
      setJsonForm(safeParse(result?.jsonform, {}));
    } finally {
      setLoaded(true);
    }
  };

  // Form doesn't exist (e.g. an old integer URL / bad link).
  if (loaded && !record) {
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-screen text-center">
        <h2 className="text-2xl font-bold">Form not found</h2>
        <p className="text-muted-foreground mt-2">
          This form doesn’t exist or the link is invalid.
        </p>
        <Link
          className="flex gap-2 items-center bg-black text-white px-3 py-1 rounded-full mt-5"
          href={"/"}
        >
          <Image src={"/logo.png"} width={26} height={26} alt="logo" />
          Build your own AI form
        </Link>
      </div>
    );
  }

  return (
    <div
      className="p-10 flex justify-center items-center min-h-screen"
      style={{ backgroundImage: record?.background }}
    >
      {record && (
        <FormUi
          jsonForm={jsonForm}
          onFieldUpdate={() => console.log}
          deleteField={() => console.log}
          selectedStyle={safeParse(record?.style, {})}
          selectedTheme={record?.theme}
          editable={false}
          formId={record.id}
          enabledSignIn={record?.enabledSignIn}
          disableSubmit={false}
          closed={record?.closed}
          thankYouMessage={record?.thankYouMessage}
          thankYouDescription={record?.thankYouDescription}
          redirectUrl={record?.redirectUrl}
        />
      )}
      <Link
        className="flex gap-2 items-center bg-black text-white px-3 py-1 rounded-full fixed bottom-5 left-5 cursor-pointer"
        href={"/"}
      >
        <Image src={"/logo.png"} width={26} height={26} />
        Build your own AI form !!!
      </Link>
    </div>
  );
}

export default LiveAiForm;
