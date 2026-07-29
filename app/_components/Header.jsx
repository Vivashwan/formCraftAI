"use client";
import { Button } from "@/components/ui/button";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import ModeToggle from "./ModeToggle";

function Header() {
  const { user, isSignedIn } = useUser();
  const path = usePathname();
  const { resolvedTheme } = useTheme();
  const clerkAppearance =
    resolvedTheme === "dark" ? { baseTheme: dark } : undefined;

  return (
    !path.includes("aiform") && (
      <div className="p-3 md:p-5 border-b shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <Link href="/#" className="shrink-0">
            <Image
              src={"/formCraftAi.png"}
              width={150}
              height={50}
              alt="logo"
              className="cursor-pointer w-28 md:w-[150px] h-auto"
            />
          </Link>
          <div className="flex items-center gap-2 md:gap-5 shrink-0">
            <ModeToggle />
            {isSignedIn ? (
              <UserButton appearance={clerkAppearance} />
            ) : (
              <SignInButton>
                <Button>Get Started</Button>
              </SignInButton>
            )}
          </div>
        </div>
      </div>
    )
  );
}

export default Header;
