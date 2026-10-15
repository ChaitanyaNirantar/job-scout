import type { SourceId } from "@/lib/types";

export const SOURCES: { id: SourceId; label: string; home: string }[] = [
  { id: "himalayas", label: "Himalayas", home: "https://himalayas.app" },
  { id: "remoteok", label: "Remote OK", home: "https://remoteok.com" },
  { id: "jobicy", label: "Jobicy", home: "https://jobicy.com" },
  { id: "arbeitnow", label: "Arbeitnow", home: "https://www.arbeitnow.com" },
  { id: "remotive", label: "Remotive", home: "https://remotive.com" },
];

export function sourceLabel(id: SourceId): string {
  return SOURCES.find((source) => source.id === id)?.label ?? id;
}
