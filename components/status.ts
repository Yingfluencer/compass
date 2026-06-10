// Shared visual vocabulary for legal status and binding-ness.

import type { LegalStatus } from "@/lib/types";

export const STATUS_STYLE: Record<
  LegalStatus,
  { label: string; text: string; bg: string; border: string; dot: string }
> = {
  voluntary: {
    label: "Voluntary",
    text: "text-emerald-800",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  mixed: {
    label: "Mixed",
    text: "text-amber-800",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  mandatory: {
    label: "Mandatory",
    text: "text-orange-800",
    bg: "bg-orange-50",
    border: "border-orange-300",
    dot: "bg-orange-600",
  },
};

export const JURISDICTION_LABEL: Record<string, string> = {
  ASEAN: "ASEAN",
  Singapore: "Singapore",
  EU: "European Union",
};
