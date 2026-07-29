import CreateForm from "@/app/_components/CreateForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useUser } from "@clerk/nextjs";
import { getMyForms } from "@/app/_actions/forms";
import { getPaymentStatus } from "@/app/_actions/user";
import { Crown, LibraryBig, MessageSquare, Shield } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";

function SideNav({ onNavigate }) {
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
  const [isPaid, setIsPaid] = useState(null); // null = not yet known

  useEffect(() => {
    if (!user) return;
    GetFormList();
    getPaymentStatus().then(setIsPaid);
  }, [user]);

  const GetFormList = async () => {
    const result = (await getMyForms()) || [];
    setFormList(result);
    setPercentageFileCreated((result.length / 3) * 100);
  };

  return (
    <div className="h-full min-h-screen md:min-h-0 md:h-screen shadow-md border">
      <div className="p-5">
        {menuList.map((menu, index) => (
          <Link
            href={menu.path}
            key={index}
            onClick={() => onNavigate?.()}
            className={`flex items-center gap-3 p-5 mb-3 hover:bg-primary hover:text-primary-foreground rounded-lg cursor-pointer ${
              path == menu.path && "bg-primary text-primary-foreground"
            }`}
          >
            <menu.icon />
            {menu.name}
          </Link>
        ))}
      </div>

      <div className="fixed bottom-7 p-6 w-64">
        {isPaid === null ? null : isPaid ? (
          <div className="my-7">
            <div className="flex items-center justify-center gap-2 rounded-xl border border-amber-400 bg-amber-50 text-amber-700 px-3 py-2">
              <Crown className="h-4 w-4" />
              <span className="text-sm font-semibold">Pro plan</span>
            </div>
            <h2 className="text-sm mt-3 text-center">
              <strong>{formList?.length}</strong> forms created
            </h2>
          </div>
        ) : (
          <div className="my-7">
            <div className="border rounded-xl">
              <Progress value={percentageFileCreated} />
            </div>
            <h2 className="text-sm mt-2">
              <strong>{formList?.length} </strong>out of <strong>3</strong>{" "}
              forms created
            </h2>
            <h2 className="text-sm mt-3">
              Upgrade your plan for unlimited AI forms
            </h2>
          </div>
        )}
      </div>
    </div>
  );
}

export default SideNav;
