import { Button } from "@/components/ui/button";
import { db } from "@/configs";
import { userResponses } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { Loader2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";

function FormListItemResponse({ jsonForm, formRecord }) {
  const [loading, setLoading] = useState(false);
  const [totalResponses, setTotalResponses] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTotalResponses();
  }, []);

  const fetchTotalResponses = async () => {
    try {
      const result = await db
        .select()
        .from(userResponses)
        .where(eq(userResponses.formReference, formRecord.id));

      setTotalResponses(result.length);
    } catch (error) {
      console.error("Error fetching total responses:", error);
      setTotalResponses(0);
    }
  };

  const ExportData = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await db
        .select()
        .from(userResponses)
        .where(eq(userResponses.formReference, formRecord.id));

      if (result && result.length > 0) {
        const processedData = processResponseData(result);
        if (processedData.length > 0) {
          exportToExcel(processedData);
        } else {
          setError("Processed data is empty");
        }
      } else {
        setError("No responses found for this form");
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      setError("Failed to export data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const processResponseData = (responses) => {
    let formFields;
    try {
      const parsedJsonForm = JSON.parse(formRecord.jsonform);

      if (
        parsedJsonForm &&
        typeof parsedJsonForm === "object" &&
        Array.isArray(parsedJsonForm.formFields)
      ) {
        formFields = parsedJsonForm.formFields;
      } else {
        throw new Error(
          "Invalid form structure: expected an object with a 'formFields' array"
        );
      }
    } catch (error) {
      console.error("Error parsing jsonform:", error);
      setError("Invalid form structure: " + error.message);
      return [];
    }

    return responses
      .map((response, index) => {
        try {
          const parsedResponse = JSON.parse(response.jsonResponse);
          const processedResponse = {};

          formFields.forEach((field) => {
            const fieldValue = parsedResponse[field.fieldName];
            if (field.fieldType === "checkbox" && Array.isArray(fieldValue)) {
              processedResponse[field.formLabel] = fieldValue.join(", ");
            } else if (
              field.fieldType === "calendar" &&
              fieldValue instanceof Date
            ) {
              processedResponse[field.formLabel] = fieldValue
                .toISOString()
                .split("T")[0];
            } else if (field.fieldType === "radio") {
              const selectedOption = field.radioItems?.find(
                (item) => item.radioItemValue === fieldValue
              );
              processedResponse[field.formLabel] = selectedOption
                ? selectedOption.radioItemLabel
                : "";
            } else {
              processedResponse[field.formLabel] = fieldValue || "";
            }
          });

          return processedResponse;
        } catch (error) {
          console.error(`Error processing response ${index}:`, error);
          return null;
        }
      })
      .filter(Boolean);
  };

  const exportToExcel = (data) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    XLSX.writeFile(
      workbook,
      (jsonForm?.formTitle || "form_responses") + ".xlsx"
    );
  };

  return (
    <div className="border shadow-sm rounded-lg p-4 my-5">
      <h2 className="text-lg text-black">{jsonForm?.formTitle}</h2>
      <h2 className="text-sm">{jsonForm?.formSubheading}</h2>
      <hr className="my-4" />

      <div className="flex justify-between items-center">
        <h2 className="text-sm">
          <strong>{totalResponses}</strong> Responses
        </h2>
        <Button
          className=""
          size="sm"
          onClick={() => ExportData()}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" /> : "Export"}
        </Button>
      </div>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}

export default FormListItemResponse;
