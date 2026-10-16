"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Watch } from "@/lib/types";

export type WatchDraft = {
  name: string;
  keywords: string;
  location: string;
  exclude: string;
  remoteOnly: boolean;
  sponsorship: "any" | "required";
  newGradOnly: boolean;
};

const DATA_ROLES =
  "data analyst, data scientist, data science, data engineer, analytics engineer, business intelligence";

const LOCATIONS = ["United States", "New York", "San Francisco", "Seattle", "Austin", "Boston", "Chicago"];

const SUGGESTIONS: {
  label: string;
  keywords: string;
  name?: string;
  sponsorship?: "any" | "required";
  newGradOnly?: boolean;
}[] = [
  { label: "Product designer", keywords: "product designer, brand designer" },
  { label: "Frontend engineer", keywords: "frontend engineer, react" },
  { label: "Account executive", keywords: "account executive" },
  {
    label: "Data roles, 2027, sponsored",
    name: "Data roles",
    keywords: DATA_ROLES,
    sponsorship: "required",
    newGradOnly: true,
  },
];

function splitPlaces(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

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
  const [sponsorship, setSponsorship] = useState<"any" | "required">(
    initial?.sponsorship === "required" ? "required" : "any",
  );
  const [newGradOnly, setNewGradOnly] = useState(initial?.newGradOnly ?? false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit({ name, keywords, location, exclude, remoteOnly, sponsorship, newGradOnly });
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
                if (suggestion.sponsorship) setSponsorship(suggestion.sponsorship);
                if (suggestion.newGradOnly !== undefined) setNewGradOnly(suggestion.newGradOnly);
                if (!name) setName(suggestion.name ?? suggestion.label);
              }}
            >
              {suggestion.label}
            </Button>
          ))}
        </div>
      )}
      <Field label="Roles" htmlFor={`${formId}-roles`} hint="Separate alternatives with commas.">
        <Textarea
          id={`${formId}-roles`}
          value={keywords}
          onChange={(event) => setKeywords(event.target.value)}
          placeholder="product designer, brand designer"
          className="min-h-16 bg-card"
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
      <Field
        label="Location"
        htmlFor={`${formId}-where`}
        hint="Leave blank for anywhere. Commas mean either place. United States matches US cities and states."
      >
        <div className="flex flex-wrap gap-2">
          {LOCATIONS.map((place) => {
            const selected = splitPlaces(location).some((item) => item.toLowerCase() === place.toLowerCase());
            return (
              <Button
                key={place}
                type="button"
                variant={selected ? "default" : "outline"}
                className={selected ? "h-8" : "h-8 bg-card"}
                aria-pressed={selected}
                onClick={() => {
                  const current = splitPlaces(location);
                  const next = selected
                    ? current.filter((item) => item.toLowerCase() !== place.toLowerCase())
                    : [...current, place];
                  setLocation(next.join(", "));
                }}
              >
                {place}
              </Button>
            );
          })}
        </div>
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${formId}-sponsorship`}>Visa sponsorship</Label>
        <select
          id={`${formId}-sponsorship`}
          className="h-10 rounded-lg border border-input bg-card px-2.5 text-sm"
          value={sponsorship}
          onChange={(event) => setSponsorship(event.target.value === "required" ? "required" : "any")}
        >
          <option value="any">Any role</option>
          <option value="required">Only roles that sponsor</option>
        </select>
        <p className="text-xs text-muted-foreground">
          Sponsored means the posting says so, LinkedIn is searched for visa sponsorship, or Jobright marked it as an H-1B role.
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-lg border bg-card px-3 py-3">
        <div>
          <p className="text-sm font-medium">Entry level and 2027 grads</p>
          <p className="text-xs text-muted-foreground">
            New-graduate, entry-level, and class-of-2027 roles. Senior, staff, and director titles are skipped.
          </p>
        </div>
        <Switch
          checked={newGradOnly}
          onCheckedChange={setNewGradOnly}
          aria-label="New grad only"
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
