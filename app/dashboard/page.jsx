import { Button } from "@/components/ui/button";
import React from "react";
import CreateForm from "../_components/CreateForm";
import FormList from "./_components/FormList";

// AI form generation (createForm server action) can take longer than Vercel's
// default 10s function limit, causing a FUNCTION_INVOCATION_TIMEOUT (504). Give
// it headroom (60s = Hobby-plan max).
export const maxDuration = 60;

function Dashboard() {
  return (
    <div className="p-4 md:p-10">
      <h2 className="font-bold text-3xl flex items-center justify-between">
        Dashboard
        <CreateForm/>
      </h2>
      <FormList/>
    </div>
  );
}

export default Dashboard;
