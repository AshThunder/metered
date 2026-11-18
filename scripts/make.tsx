/**
 * npm run make: everything Metered makes, for every file in data/ (or the files given), into
 * examples/<file>/. Nothing renders unless the gate passes.
 *
 *   <state>/email.html, email.txt   the bill email: due, paid or overdue        (Email, render)
 *   <state>/page.html               the online bill                             (Page, render)
 *   <state>/bill.pdf                the A4 bill                                 (Document, renderPdf)
 *   <state>/reminder.png            the 1200x630 reminder card                  (Canvas, renderImage)
 *   year/bill-<id>.pdf              every bill in the file, each as it stood    (Document, renderPdf)
 *
 * The three states are the same file seen on three days (src/bill.ts, scenario()): nothing is
 * typed in per state.
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { formatDiagnostics, render } from "@hyper-elements/react";
import { renderPdf } from "@hyper-elements/react/pdf";
import { renderImage } from "@hyper-elements/react/image";
import { loadFonts } from "../src/fonts";
import { workAccount } from "../src/bill";
import BillPdf from "../templates/bill-pdf";
import { artefacts, gate, loadData, passed, report, ROOT, sampleFiles, STATES } from "./lib";

const files = process.argv.slice(2).length ? process.argv.slice(2) : await sampleFiles();
const fonts = await loadFonts();
const timings: Record<string, unknown> = {};

const say = (label: string, diagnostics: { severity: string }[]) => {
  const loud = diagnostics.filter((d) => d.severity !== "info");
  if (loud.length) console.warn(`${label}:\n${formatDiagnostics(loud as never)}`);
};

for (const path of files) {
  const { slug, file } = await loadData(path);
  const result = await gate(slug, file);
  if (!passed(result)) {
    console.error(report(result));
    process.exitCode = 1;
    continue;
  }
  const out = join(ROOT, "examples", slug);
  for (const state of STATES) {
    const dir = join(out, state);
    await mkdir(dir, { recursive: true });
    const a = artefacts(file, state);
    const email = await render(a.email, { plugins: [] });
    await writeFile(join(dir, "email.html"), email.html);
    await writeFile(join(dir, "email.txt"), email.text);
    await writeFile(join(dir, "page.html"), (await render(a.page)).html);
    const pdf = await renderPdf(a.pdf, { fonts });
    say(`${slug} ${state} bill.pdf`, pdf.diagnostics);
    await writeFile(join(dir, "bill.pdf"), pdf.pdf);
    const img = await renderImage(a.card, { fonts, scale: 1 });
    say(`${slug} ${state} reminder.png`, img.diagnostics);
    await writeFile(join(dir, "reminder.png"), img.image);
  }
  await rm(join(out, "year"), { recursive: true, force: true });
  await mkdir(join(out, "year"), { recursive: true });
  const started = performance.now();
  for (const b of file.bills) {
    const one = await renderPdf(<BillPdf file={file} bill={b.id} />, { fonts });
    say(`${slug} bill-${b.id}`, one.diagnostics);
    await writeFile(join(out, "year", `bill-${b.id}.pdf`), one.pdf);
  }
  const ms = Math.round(performance.now() - started);
  const acc = workAccount(file);
  timings[slug] = { bills: file.bills.length, yearBatchMs: ms, latest: acc.latest.bill.id, stateOnAsOf: acc.latest.state };
  console.log(`${slug}: 3 states (email, page, PDF, card each) and ${file.bills.length} bills in examples/${slug}/ (year batch ${ms} ms)`);
}
await writeFile(join(ROOT, "examples/timings.json"), JSON.stringify({ note: "Measured on the machine that last ran npm run make; for scale, not a benchmark.", node: process.version, ...timings }, null, 2) + "\n");
