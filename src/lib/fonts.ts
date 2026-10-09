import {
  Caveat,
  DM_Serif_Display,
  Inter,
  Lora,
  Montserrat,
  Playfair_Display,
  Space_Grotesk,
} from "next/font/google";

/**
 * Fonts are self-hosted by `next/font` at build time (no runtime request to
 * Google, no layout shift, no third-party cookie). Each face is exposed as a CSS
 * custom property; an event's chosen font is applied by pointing
 * `--font-body` / `--font-heading` at one of them, which means the invitation
 * page re-themes with zero JavaScript.
 *
 * The admin stores a *key* from this registry rather than a raw font stack, so a
 * malicious value can never end up inside a `font-family` declaration.
 */

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});
const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif",
  display: "swap",
});
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

/** Every font variable, applied once on <html> so any page can reference them. */
export const fontVariables = [
  inter.variable,
  playfair.variable,
  montserrat.variable,
  lora.variable,
  spaceGrotesk.variable,
  dmSerif.variable,
  caveat.variable,
].join(" ");

export type FontKey =
  | "inter"
  | "playfair"
  | "montserrat"
  | "lora"
  | "space-grotesk"
  | "dm-serif"
  | "caveat";

export interface FontOption {
  key: FontKey;
  label: string;
  /** Value to assign to --font-body / --font-heading. */
  stack: string;
  category: "sans" | "serif" | "display" | "script";
}

export const FONT_OPTIONS: readonly FontOption[] = [
  { key: "inter", label: "Inter", stack: "var(--font-inter), system-ui, sans-serif", category: "sans" },
  { key: "montserrat", label: "Montserrat", stack: "var(--font-montserrat), system-ui, sans-serif", category: "sans" },
  { key: "space-grotesk", label: "Space Grotesk", stack: "var(--font-space-grotesk), system-ui, sans-serif", category: "sans" },
  { key: "lora", label: "Lora", stack: "var(--font-lora), Georgia, serif", category: "serif" },
  { key: "playfair", label: "Playfair Display", stack: "var(--font-playfair), Georgia, serif", category: "serif" },
  { key: "dm-serif", label: "DM Serif Display", stack: "var(--font-dm-serif), Georgia, serif", category: "display" },
  { key: "caveat", label: "Caveat", stack: "var(--font-caveat), cursive", category: "script" },
] as const;

export const FONT_KEYS = FONT_OPTIONS.map((f) => f.key) as [FontKey, ...FontKey[]];

const byKey = new Map(FONT_OPTIONS.map((f) => [f.key, f]));

export function fontStack(key: string | null | undefined, fallback: FontKey = "inter"): string {
  return (byKey.get(key as FontKey) ?? byKey.get(fallback)!).stack;
}

export function fontLabel(key: string | null | undefined): string {
  return byKey.get(key as FontKey)?.label ?? "Inter";
}
