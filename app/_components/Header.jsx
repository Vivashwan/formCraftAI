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
      <div className="p-5 border-b shadow-sm">
        <div className="flex items-center justify-between">
          <Link href="/#">
            <Image
              src={"/formCraftAi.png"}
              width={150}
              height={50}
              alt="logo"
              className="cursor-pointer"
            />
          </Link>
          <div className="flex items-center gap-5">
            <ModeToggle />
            {isSignedIn ? (
              <>
                <Link href={"/dashboard"}>
                  <Button variant="outline">Dashboard</Button>
                </Link>
                <UserButton appearance={clerkAppearance} />
              </>
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
