import { defineTheme, extendTheme } from "@hyper-elements/react";
import type { AccountFile } from "./types";
import type { State } from "./bill";

/**
 * Metered's look, written once for all four roots.
 *
 * A bill is read for three things: how much, by when, and why. So the state of the bill (due,
 * paid, overdue) is the loudest thing on every output, in one flat colour each; the amount is set
 * large in IBM Plex Mono, the type of a meter's register; and everything else is calm Inter on
 * cool paper with hairline rules. The utility's own accent carries the brand and the usage chart.
 */
export const SANS = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif";
export const MONO = "'IBM Plex Mono', Menlo, Consolas, 'Courier New', monospace";

export const INK = "#121519";
export const MUTED = "#59606B";
export const RULE = "#D6D9D4";
export const PAPER = "#F1F2EE";
export const WASH = "#E6E8E2";

/** One flat colour per state, with the ink that reads on it. */
export const STATE: Record<State | "soon", { bg: string; fg: string; soft: string }> = {
  due: { bg: INK, fg: "#FFFFFF", soft: "#E6E8E2" },
  soon: { bg: "#8F5400", fg: "#FFFFFF", soft: "#F6E7CF" },
  paid: { bg: "#2D6A3E", fg: "#FFFFFF", soft: "#DDEBDF" },
  overdue: { bg: "#B3261E", fg: "#FFFFFF", soft: "#F5DCD9" },
};

export const metered = defineTheme({
  colors: {
    background: PAPER,
    foreground: INK,
    primary: "#0B5D5B",
    primaryForeground: "#FFFFFF",
    muted: MUTED,
    border: RULE,
    card: "#FFFFFF",
    wash: WASH,
  },
  fonts: { body: SANS, heading: SANS, mono: MONO },
  fontSizes: { body: 15, small: 13, label: 11 },
  lineHeights: { body: 1.5 },
  elements: {
    Heading: {
      fontWeight: 700,
      by: {
        level: {
          1: { fontSize: 30, lineHeight: 1.15, letterSpacing: -0.6 },
          2: { fontSize: 12, lineHeight: 1.3, letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, color: "{colors.muted}" },
          3: { fontSize: 17, lineHeight: 1.3, letterSpacing: -0.2 },
        },
      },
    },
    Button: { borderRadius: 0, padding: [15, 26], fontWeight: 600, hover: { backgroundColor: INK } },
    Divider: { borderTop: `1px solid ${RULE}` },
  },
  styles: {
    card: { backgroundColor: "{colors.card}", padding: 28, gap: 20, border: `1px solid ${RULE}` },
    label: { fontSize: 11, lineHeight: 1.4, fontWeight: 600, letterSpacing: 0.9, textTransform: "uppercase", color: "{colors.muted}" },
  },
  formats: {
    document: { colors: { background: "#FFFFFF" }, fontSizes: { body: 10 }, lineHeights: { body: 1.45 } },
    canvas: { colors: { background: PAPER } },
  },
});

export function themeFor(file: AccountFile) {
  return extendTheme(metered, { colors: { primary: file.utility.accent } });
}
