"use client";

import { SignedIn } from "@clerk/nextjs";
import React, { useState } from "react";
import SideNav from "./_components/SideNav";
import { Menu, X } from "lucide-react";

function DashboardLayout({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <SignedIn>
      <div>
        {/* Mobile top bar with hamburger (hidden on md+) */}
        <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 border-b bg-background p-4">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="p-1"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-bold">formCraftAi</span>
        </div>

        {/* Backdrop (mobile only, when the drawer is open) */}
        {open && (
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Sidebar: slide-over drawer on mobile, fixed on md+ */}
        <div
          className={`fixed top-0 left-0 z-50 h-screen w-64 bg-background transition-transform md:z-auto md:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute top-3 right-3 z-10 p-1 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
          <SideNav onNavigate={() => setOpen(false)} />
        </div>

        <div className="md:ml-64">{children}</div>
      </div>
    </SignedIn>
  );
}

export default DashboardLayout;
