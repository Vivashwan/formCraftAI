import React from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

// Per-form settings editor. `settings` is the form record; `onChange(patch)`
// persists the change and updates local state.
function FormSettings({ settings, onChange }) {
  const s = settings || {};

  return (
    <div className="mt-8">
      <h2 className="font-medium mb-2">Form Settings</h2>
      <div className="space-y-4 text-sm">
        <div className="flex items-center gap-2">
          <Checkbox
            id="accept-responses"
            checked={!s.closed}
            onCheckedChange={(v) => onChange({ closed: !v })}
          />
          <label htmlFor="accept-responses">Accept responses</label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="one-per-user"
            checked={!!s.limitOneResponse}
            onCheckedChange={(v) => onChange({ limitOneResponse: !!v })}
          />
          <label htmlFor="one-per-user">
            One response per user (requires sign-in)
          </label>
        </div>

        <div>
          <label className="text-base block mb-1 font-semibold">
            Max responses (leave blank for unlimited)
          </label>
          <Input
            type="number"
            min="1"
            defaultValue={s.maxResponses ?? ""}
            onBlur={(e) =>
              onChange({ maxResponses: e.target.value === "" ? null : e.target.value })
            }
            placeholder="Unlimited"
          />
        </div>

        <div>
          <label className="text-base block mb-1 font-semibold">Thank-you page heading</label>
          <Input
            defaultValue={s.thankYouMessage ?? ""}
            onBlur={(e) => onChange({ thankYouMessage: e.target.value })}
            placeholder="Thank you!"
          />
        </div>

        <div>
          <label className="text-base block mb-1 font-semibold">
            Thank-you page description
          </label>
          <Input
            defaultValue={s.thankYouDescription ?? ""}
            onBlur={(e) => onChange({ thankYouDescription: e.target.value })}
            placeholder="Your response has been recorded."
          />
        </div>

        <div>
          <label className="text-base block mb-1 font-semibold">
            Redirect URL after submit (optional)
          </label>
          <Input
            defaultValue={s.redirectUrl ?? ""}
            onBlur={(e) => onChange({ redirectUrl: e.target.value })}
            placeholder="https://example.com/thanks"
          />
        </div>

        <div>
          <label className="text-base block mb-1 font-semibold">
            Google Sheet (optional)
          </label>
          <Input
            defaultValue={s.googleSheetId ?? ""}
            onBlur={(e) => onChange({ googleSheetId: e.target.value })}
            placeholder="Paste the Google Sheet link or ID"
          />
          <p className="text-xs text-muted-foreground mt-1">
            New responses are appended as rows. Share the sheet (Editor access)
            with the service account email shown in setup.
          </p>
        </div>
      </div>
    </div>
  );
}

export default FormSettings;
