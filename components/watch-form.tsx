"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Watch } from "@/lib/types";

export type WatchDraft = {
  name: string;
  keywords: string;
  location: string;
  exclude: string;
  remoteOnly: boolean;
};

const SUGGESTIONS: { label: string; keywords: string }[] = [
  { label: "Product designer", keywords: "product designer, brand designer" },
  { label: "Frontend engineer", keywords: "frontend engineer, react" },
  { label: "Account executive", keywords: "account executive" },
];

export function WatchForm({
  initial,
  submitLabel,
  pending,
  showSuggestions = false,
  onSubmit,
}: {
  initial?: Partial<Watch>;
  submitLabel: string;
  pending: boolean;
  showSuggestions?: boolean;
  onSubmit: (draft: WatchDraft) => Promise<void>;
}) {
  const formId = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [keywords, setKeywords] = useState(initial?.keywords ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [exclude, setExclude] = useState(initial?.exclude ?? "");
  const [remoteOnly, setRemoteOnly] = useState(initial?.remoteOnly ?? false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit({ name, keywords, location, exclude, remoteOnly });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn’t save that watch.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {showSuggestions && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <Button
              key={suggestion.label}
              type="button"
              variant="outline"
              className="h-8 bg-card"
              onClick={() => {
                setKeywords(suggestion.keywords);
                if (!name) setName(suggestion.label);
              }}
            >
              {suggestion.label}
            </Button>
          ))}
        </div>
      )}
      <Field label="Roles" htmlFor={`${formId}-roles`} hint="Separate alternatives with commas.">
        <Input
          id={`${formId}-roles`}
          value={keywords}
          onChange={(event) => setKeywords(event.target.value)}
          placeholder="product designer, brand designer"
          className="h-10 bg-card"
          required
          minLength={2}
        />
      </Field>
      <Field label="Watch name" htmlFor={`${formId}-name`} hint="Optional. Brief uses the role if you leave this blank.">
        <Input
          id={`${formId}-name`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Design roles"
          className="h-10 bg-card"
        />
      </Field>
      <Field label="Places" htmlFor={`${formId}-where`} hint="Leave blank for anywhere. Commas mean either place.">
        <Input
          id={`${formId}-where`}
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Berlin, Austin"
          className="h-10 bg-card"
        />
      </Field>
      <Field label="Skip roles that mention" htmlFor={`${formId}-skip`}>
        <Input
          id={`${formId}-skip`}
          value={exclude}
          onChange={(event) => setExclude(event.target.value)}
          placeholder="intern, unpaid"
          className="h-10 bg-card"
        />
      </Field>
      <div className="flex items-center justify-between gap-4 rounded-lg border bg-card px-3 py-3">
        <div>
          <p className="text-sm font-medium">Remote only</p>
          <p className="text-xs text-muted-foreground">Skip roles that need an office.</p>
        </div>
        <Switch
          checked={remoteOnly}
          onCheckedChange={setRemoteOnly}
          aria-label="Remote only"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="h-10" disabled={pending}>
        {pending ? "Reading the boards…" : submitLabel}
      </Button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
