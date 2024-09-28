import CreateForm from "@/app/_components/CreateForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { db } from "@/configs";
import { JsonForms } from "@/configs/schema";
import { useUser } from "@clerk/nextjs";
import { desc, eq } from "drizzle-orm";
import { LibraryBig, LineChart, MessageSquare, Shield } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";

function SideNav() {
  const menuList = [
    {
      id: 1,
      name: "My Forms",
      icon: LibraryBig,
      path: "/dashboard",
    },
    {
      id: 1,
      name: "Responses",
      icon: MessageSquare,
      path: "/dashboard/responses",
    },
    {
      id: 1,
      name: "Upgrade",
      icon: Shield,
      path: "/dashboard/upgrade",
    },
  ];

  const { user } = useUser();
  const path = usePathname();

  const [formList, setFormList] = useState([]);
  const [percentageFileCreated, setPercentageFileCreated] = useState(0);

  useEffect(() => {
    user && GetFormList();
  }, [user]);

  const GetFormList = async () => {
    const result = await db
      .select()
      .from(JsonForms)
      .where(eq(JsonForms.createdBy, user?.primaryEmailAddress?.emailAddress))
      .orderBy(desc(JsonForms.id));

    setFormList(result);

    const perc = (result.length / 3) * 100;
    setPercentageFileCreated(perc);
  };

  return (
    <div className="h-screen shadow-md border">
      <div className="p-5">
        {menuList.map((menu, index) => (
          <Link
            href={menu.path}
            key={index}
            className={`flex items-center gap-3 p-5 mb-3 hover:bg-black hover:text-white rounded-lg cursor-pointer ${
              path == menu.path && "bg-black text-white"
            }`}
          >
            <menu.icon />
            {menu.name}
          </Link>
        ))}
      </div>

      <div className="fixed bottom-7 p-6 w-64">
        <div className="my-7">
          <div className="border border-black rounded-xl ">
            <Progress value={percentageFileCreated} />
          </div>
          <h2 className="text-sm mt-2">
            <strong>{formList?.length} </strong>out of <strong>3</strong> forms
            created
          </h2>
          <h2 className="text-sm mt-3">
            Upgrade your plan for unlimited AI forms
          </h2>
        </div>
      </div>
    </div>
  );
}

export default SideNav;
