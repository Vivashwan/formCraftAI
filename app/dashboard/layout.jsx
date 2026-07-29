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
        {/* Mobile menu button (hidden on md+) */}
        <div className="md:hidden sticky top-0 z-30 flex items-center border-b bg-background p-3">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="p-1"
          >
            <Menu className="h-6 w-6" />
          </button>
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
          className={`fixed top-0 left-0 z-50 flex h-screen w-64 flex-col bg-background transition-transform md:top-auto md:z-auto md:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Close row (mobile only) so the menu doesn't sit under the X */}
          <div className="flex justify-end p-3 md:hidden shrink-0">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="p-1"
            >
              <X className="h-6 w-6 text-red-500" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SideNav onNavigate={() => setOpen(false)} />
          </div>
        </div>

        <div className="md:ml-64">{children}</div>
      </div>
    </SignedIn>
  );
}

export default DashboardLayout;
