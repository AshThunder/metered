import { readFile, readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import type { ReactElement } from "react";
import { validate, type Diagnostic } from "@hyper-elements/react";
import { emailClients } from "@hyper-elements/email-clients";
import { lint } from "@hyper-elements/lint";
import type { AccountFile } from "../src/types";
import type { State } from "../src/bill";
import { checkFile } from "../src/check";
import BillEmail from "../templates/bill-email";
import BillPage from "../templates/bill-page";
import BillPdf from "../templates/bill-pdf";
import ReminderCard from "../templates/reminder-card";

export const ROOT = new URL("..", import.meta.url).pathname;
export const STATES: State[] = ["due", "paid", "overdue"];

export async function loadData(path: string): Promise<{ slug: string; file: AccountFile }> {
  return { slug: basename(path, ".json"), file: JSON.parse(await readFile(path, "utf8")) };
}

export async function sampleFiles(): Promise<string[]> {
  const dir = join(ROOT, "data");
  return (await readdir(dir)).filter((f) => f.endsWith(".json")).sort().map((f) => join(dir, f));
}

/** Everything the latest bill is sent as, in one state: what the gate checks and what make renders. */
export function artefacts(file: AccountFile, state?: State) {
  const props = { file, state };
  return {
    email: <BillEmail {...props} />,
    page: <BillPage {...props} pdfHref="bill.pdf" />,
    pdf: <BillPdf {...props} />,
    card: <ReminderCard {...props} />,
  } satisfies Record<string, ReactElement>;
}

export interface GateResult {
  slug: string;
  dataIssues: { path: string; message: string }[];
  checked: number;
  errors: Diagnostic[];
  warnings: Diagnostic[];
  notes: Record<string, number>;
}

let plugins: { email: unknown[]; page: unknown[] } | undefined;

/**
 * The gate: the data checks, then validate() on every artefact in all three states (the email
 * with the email-client models and lint, the page with lint) and every bill of the year as a PDF.
 * Errors and warnings fail it; notes are counted.
 */
export async function gate(slug: string, file: AccountFile): Promise<GateResult> {
  plugins ??= { email: [await emailClients(), lint({ kind: "transactional" })], page: [lint()] };
  const result: GateResult = { slug, dataIssues: checkFile(file), checked: 0, errors: [], warnings: [], notes: {} };
  if (result.dataIssues.length) return result;
  const run = (el: ReactElement, kind: "email" | "page" | "other", where: string) => {
    const v = validate(el, { plugins: (kind === "other" ? [] : plugins![kind]) as never });
    result.checked++;
    for (const d of v.diagnostics) {
      const tagged = { ...d, path: `${where}: ${d.path ?? ""}` };
      if (d.severity === "error") result.errors.push(tagged);
      else if (d.severity === "warning") result.warnings.push(tagged);
      else result.notes[d.code] = (result.notes[d.code] ?? 0) + 1;
    }
  };
  for (const state of STATES) {
    const a = artefacts(file, state);
    run(a.email, "email", `${state} email`);
    run(a.page, "page", `${state} page`);
    run(a.pdf, "other", `${state} bill.pdf`);
    run(a.card, "other", `${state} reminder card`);
  }
  for (const b of file.bills) run(<BillPdf file={file} bill={b.id} />, "other", `bill-${b.id}.pdf`);
  return result;
}

export function passed(r: GateResult) {
  return r.dataIssues.length === 0 && r.errors.length === 0 && r.warnings.length === 0;
}

export function report(r: GateResult) {
  const lines = [`${r.slug}: ${passed(r) ? "pass" : "FAIL"} (${r.checked} artefacts, ${r.errors.length} errors, ${r.warnings.length} warnings, ${Object.values(r.notes).reduce((a, b) => a + b, 0)} notes)`];
  for (const i of r.dataIssues) lines.push(`  data  ${i.path}: ${i.message}`);
  for (const d of [...r.errors, ...r.warnings]) lines.push(`  ${d.severity} ${d.code} at ${d.path}: ${d.message}`);
  return lines.join("\n");
}
