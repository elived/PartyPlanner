import type { CSSProperties } from "react";
import { fontStack } from "@/lib/fonts";
import { hexToRgbChannels, readableTextColor } from "@/lib/utils";

/**
 * Turns a saved theme into a plain style object of CSS custom properties.
 *
 * Why custom properties rather than generated Tailwind classes: the palette is
 * user data, so there is no finite set of classes to compile. Setting variables
 * on a wrapper element lets the *same* markup re-theme instantly — which is
 * exactly what the live preview needs — with no runtime CSS injection and no
 * arbitrary string ever reaching a `style` attribute unvalidated (every value
 * here is either a validated hex or a key from the font registry).
 */

export interface ThemeValues {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  bodyFont: string;
  headingFont: string;
  buttonStyle: "SOLID" | "OUTLINE" | "SOFT";
  buttonShape: "SQUARE" | "ROUNDED" | "PILL";
}

const RADIUS: Record<ThemeValues["buttonShape"], string> = {
  SQUARE: "0.25rem",
  ROUNDED: "0.75rem",
  PILL: "9999px",
};

export function themeStyle(theme: ThemeValues): CSSProperties {
  return {
    "--pp-primary": theme.primaryColor,
    "--pp-primary-rgb": hexToRgbChannels(theme.primaryColor),
    "--pp-primary-contrast": readableTextColor(theme.primaryColor),
    "--pp-secondary": theme.secondaryColor,
    "--pp-secondary-rgb": hexToRgbChannels(theme.secondaryColor),
    "--pp-secondary-contrast": readableTextColor(theme.secondaryColor),
    "--pp-bg": theme.backgroundColor,
    "--pp-surface": theme.surfaceColor,
    "--pp-text": theme.textColor,
    "--pp-text-rgb": hexToRgbChannels(theme.textColor),
    "--pp-radius": RADIUS[theme.buttonShape],
    "--font-body": fontStack(theme.bodyFont, "inter"),
    "--font-heading": fontStack(theme.headingFont, "playfair"),
  } as CSSProperties;
}

/** Tailwind classes for the primary call-to-action in each button style. */
export function buttonClasses(style: ThemeValues["buttonStyle"]): string {
  switch (style) {
    case "OUTLINE":
      return "bg-transparent text-[var(--pp-primary)] border-2 border-[var(--pp-primary)] hover:bg-[rgb(var(--pp-primary-rgb)/0.08)]";
    case "SOFT":
      return "bg-[rgb(var(--pp-primary-rgb)/0.14)] text-[var(--pp-primary)] border border-transparent hover:bg-[rgb(var(--pp-primary-rgb)/0.22)]";
    default:
      return "bg-[var(--pp-primary)] text-[var(--pp-primary-contrast)] border border-transparent hover:brightness-110";
  }
}

export const DEFAULT_THEME_VALUES: ThemeValues = {
  primaryColor: "#7C3AED",
  secondaryColor: "#EC4899",
  backgroundColor: "#FAF5FF",
  surfaceColor: "#FFFFFF",
  textColor: "#1F1235",
  bodyFont: "inter",
  headingFont: "playfair",
  buttonStyle: "SOLID",
  buttonShape: "ROUNDED",
};

/** Curated starting points, offered as one-click presets in the editor. */
export const THEME_PRESETS: { name: string; values: Partial<ThemeValues> }[] = [
  {
    name: "Violet party",
    values: {
      primaryColor: "#7C3AED", secondaryColor: "#EC4899", backgroundColor: "#FAF5FF",
      surfaceColor: "#FFFFFF", textColor: "#1F1235", headingFont: "playfair", bodyFont: "inter",
    },
  },
  {
    name: "Midnight",
    values: {
      primaryColor: "#38BDF8", secondaryColor: "#A78BFA", backgroundColor: "#0B1120",
      surfaceColor: "#151E32", textColor: "#E7ECF5", headingFont: "space-grotesk", bodyFont: "inter",
    },
  },
  {
    name: "Botanical",
    values: {
      primaryColor: "#2F6F4E", secondaryColor: "#C2703D", backgroundColor: "#F3F6F0",
      surfaceColor: "#FFFFFF", textColor: "#1D2B22", headingFont: "lora", bodyFont: "lora",
    },
  },
  {
    name: "Golden hour",
    values: {
      primaryColor: "#B45309", secondaryColor: "#DB2777", backgroundColor: "#FFF8ED",
      surfaceColor: "#FFFFFF", textColor: "#3B2A16", headingFont: "dm-serif", bodyFont: "montserrat",
    },
  },
  {
    name: "Handwritten",
    values: {
      primaryColor: "#1D4ED8", secondaryColor: "#0EA5E9", backgroundColor: "#F8FAFC",
      surfaceColor: "#FFFFFF", textColor: "#0F172A", headingFont: "caveat", bodyFont: "inter",
    },
  },
  {
    name: "Monochrome",
    values: {
      primaryColor: "#111111", secondaryColor: "#6B7280", backgroundColor: "#FFFFFF",
      surfaceColor: "#F7F7F7", textColor: "#111111", headingFont: "space-grotesk", bodyFont: "inter",
    },
  },
];
