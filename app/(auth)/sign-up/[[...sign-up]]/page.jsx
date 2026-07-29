"use client";
import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";

export default function Page() {
  const { resolvedTheme } = useTheme();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/dashboard"
        appearance={resolvedTheme === "dark" ? { baseTheme: dark } : undefined}
      />
    </div>
  );
}
