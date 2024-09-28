import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import moment from "moment/moment";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FieldEdit from "./FieldEdit";
import { db } from "@/configs";
import { userResponses } from "@/configs/schema";
import { SignInButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

function FormUi({
  jsonForm,
  selectedTheme,
  selectedStyle,
  onFieldUpdate,
  deleteField,
  editable = true,
  formId = 0,
  enabledSignIn = false,
  disableSubmit = false,
}) {
  const [formData, setFormData] = useState({});
  let formReference = useRef();
  const { user, isSignedIn } = useUser();

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleRadioChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleCheckboxChange = (fieldName, itemName, value) => {
    const list = formData?.[fieldName] ? formData?.[fieldName] : [];

    if (value) {
      list.push({
        label: itemName,
        value: value,
      });
      setFormData({
        ...formData,
        [fieldName]: list,
      });
    } else {
      const result = list.filter((item) => item.label !== itemName);
      setFormData({
        ...formData,
        [fieldName]: result,
      });
    }
  };

  const extractFormData = (form) => {
    const formData = new FormData(form);
    const extractedData = {};
    for (let [key, value] of formData.entries()) {
      if (extractedData[key]) {
        if (!Array.isArray(extractedData[key])) {
          extractedData[key] = [extractedData[key]];
        }
        extractedData[key].push(value);
      } else {
        extractedData[key] = value;
      }
    }
    return extractedData;
  };

  const onFormSubmit = async (event) => {
    event.preventDefault();
    try {
      const extractedData = extractFormData(event.target);
      console.log("Extracted form data:", extractedData);

      const result = await db.insert(userResponses).values({
        jsonResponse: JSON.stringify(extractedData),
        createdAt: moment().format("DD/MM/yyyy"),
        formReference: formId,
      });

      if (result) {
        formReference.current.reset();
        setFormData({});
        toast("Response submitted successfully !!!");
      } else {
        throw new Error("No result returned from database insert operation");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
      toast(
        "An error occurred while submitting the form. Please check the console for more details."
      );
    }
  };

  const renderField = (field, index) => {
    console.log(`Rendering field at index ${index}:`, field);
    const fieldName = field.fieldName || field.formField;
    const fieldLabel = field.formLabel || field.fieldName;
    const fieldType = field.fieldType;
    const placeholderName = field.placeholderName || field.placeholder;
    const isRequired = field.fieldRequired;

    switch (fieldType) {
      case "select":
        return (
          <div className="my-1 w-full">
            <label className="text-xs">{fieldLabel}</label>
            <Select
              name={fieldName}
              onValueChange={(v) => handleSelectChange(fieldName, v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={placeholderName || "Select"} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((item, idx) => (
                  <SelectItem key={idx} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case "checkbox":
        return (
          <div className="my-1 w-full">
            <label className="text-xs">{fieldLabel}</label>
            {(field.checkboxItems || field.options)?.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Checkbox
                  onCheckedChange={(v) =>
                    handleCheckboxChange(
                      fieldName,
                      item.label || item.checkboxItemLabel,
                      v
                    )
                  }
                />
                <Label>{item.label || item.checkboxItemLabel}</Label>
              </div>
            ))}
          </div>
        );
      case "radiogroup":
        return (
          <div className="my-1 w-full">
            <label className="text-xs">{fieldLabel}</label>
            <RadioGroup onValueChange={(v) => handleRadioChange(fieldName, v)}>
              {(field.radiogroupItems || field.options)?.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={item.value || item.radiogroupItemValue}
                    id={item.value || item.radiogroupItemValue}
                  />
                  <Label htmlFor={item.value || item.radiogroupItemValue}>
                    {item.label || item.radiogroupItemLabel}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );
      default:
        return (
          <div className="my-1 w-full">
            <label className="text-xs">{fieldLabel}</label>
            <Input
              type={fieldType === "digits" ? "number" : fieldType || "text"}
              placeholder={placeholderName || "Enter value"}
              name={fieldName}
              required={isRequired}
              onChange={handleInputChange}
            />
          </div>
        );
    }
  };

  const formFields = jsonForm.form || jsonForm.formFields || [];

  return (
    <form
      ref={formReference}
      onSubmit={onFormSubmit}
      className="border p-3 md:w-[600px] rounded-lg"
      data-theme={selectedTheme}
      style={{
        boxShadow: selectedStyle?.key === "boxshadow" && "5px 5px 0px black",
        border: selectedStyle?.key === "border" && selectedStyle.value,
      }}
    >
      <h2 className="font-bold text-center text-2xl">
        {jsonForm?.formTitle || "Untitled Form"}
      </h2>
      <h2 className="text-sm text-center">
        {jsonForm?.formSubheading || "Fill out the form below"}
      </h2>

      {formFields.length > 0 ? (
        formFields.map((field, index) => (
          <div key={index} className="my-2 flex items-center">
            {renderField(field, index)}
            {editable && (
              <div className="ml-2">
                <FieldEdit
                  defaultValue={field}
                  onUpdate={(value) => onFieldUpdate(value, index)}
                  deleteField={() => deleteField(index)}
                />
              </div>
            )}
          </div>
        ))
      ) : (
        <p>No fields available in the form.</p>
      )}

      {!enabledSignIn ? (
        <button
          type="submit"
          className="btn btn-primary"
          disabled={disableSubmit} // disabling button based on the prop
        >
          Submit
        </button>
      ) : isSignedIn ? (
        <button
          type="submit"
          className="btn btn-primary"
          disabled={disableSubmit} // disabling button based on the prop
        >
          Submit
        </button>
      ) : (
        <Button>
          <SignInButton mode="modal">
            Sign In before submitting !!!
          </SignInButton>
        </Button>
      )}
    </form>
  );
}

export default FormUi;
