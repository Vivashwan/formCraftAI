"use client";
import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

// Reusable share dialog: copy link, QR code, and an iframe embed snippet.
function ShareDialog({ url, title, trigger }) {
  const [copied, setCopied] = useState(null);

  // Re-base the link on the actual origin the user is viewing (handles a dev
  // server on a different port, or a prod domain that differs from the
  // NEXT_PUBLIC_BASE_URL the link was built from).
  const [absUrl, setAbsUrl] = useState(url);
  useEffect(() => {
    if (typeof window === "undefined" || !url) return;
    try {
      const u = new URL(url, window.location.origin);
      setAbsUrl(window.location.origin + u.pathname + u.search);
    } catch (e) {
      setAbsUrl(url);
    }
  }, [url]);

  const embedCode = `<iframe src="${absUrl}" width="100%" height="700" style="border:1px solid #e5e7eb;border-radius:12px" title="${
    title || "Form"
  }"></iframe>`;

  const copy = async (text, which) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      toast("Copied to clipboard");
      setTimeout(() => setCopied(null), 1500);
    } catch (e) {
      toast.error("Could not copy. Please copy manually.");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="flex gap-2">
            <Share2 className="h-3 w-3" /> Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share form</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Copy link */}
          <div>
            <label className="text-xs block mb-1">Link</label>
            <div className="flex gap-2">
              <Input value={absUrl} readOnly onFocus={(e) => e.target.select()} />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copy(absUrl, "link")}
                className="shrink-0"
              >
                {copied === "link" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* QR code */}
          <div className="flex flex-col items-center gap-2">
            <div className="bg-white p-3 rounded-lg border">
              <QRCodeSVG value={absUrl || ""} size={160} />
            </div>
            <span className="text-xs text-gray-500">Scan to open the form</span>
          </div>

          {/* Embed */}
          <div>
            <label className="text-xs block mb-1">Embed on a website</label>
            <textarea
              readOnly
              value={embedCode}
              onFocus={(e) => e.target.select()}
              className="w-full text-xs border rounded-md p-2 h-20 font-mono bg-gray-50 text-gray-900"
            />
            <Button
              size="sm"
              variant="outline"
              className="mt-2 flex gap-2"
              onClick={() => copy(embedCode, "embed")}
            >
              {copied === "embed" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copy embed code
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShareDialog;
