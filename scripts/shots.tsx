/**
 * npm run shots: the pictures in the README, from the files npm run make wrote. Needs Chrome (or
 * Playwright's Chromium) for the HTML, and poppler's pdftoppm for the PDF pages. Writes
 *   examples/<file>/screens/   per state: the email, the PDF; the page on desktop and phone
 *   examples/<file>/clients/   the due email as classic Outlook, Gmail and Apple Mail draw it (Northvale only)
 *   docs/hero.png, docs/states.png, docs/two-utilities.png
 */
import { execFileSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { renderInEmailClients } from "@hyper-elements/email-clients";
import { artefacts, loadData, ROOT, sampleFiles, STATES } from "./lib";

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const shoot = async (file: string, out: string, width: number, scale = 1) => {
  const page = await browser.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: scale });
  await page.goto(pathToFileURL(file).href, { waitUntil: "networkidle" });
  await page.screenshot({ path: out, fullPage: true });
  await page.close();
};
const compose = async (html: string, out: string, width: number) => {
  await writeFile(join(ROOT, ".compose.html"), html);
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(pathToFileURL(join(ROOT, ".compose.html")).href);
  await page.waitForTimeout(300);
  await page.screenshot({ path: out, fullPage: true });
  await page.close();
  await rm(join(ROOT, ".compose.html"));
  console.log(out.replace(ROOT, ""));
};

for (const path of await sampleFiles()) {
  const { slug, file } = await loadData(path);
  const dir = join(ROOT, "examples", slug);
  const screens = join(dir, "screens");
  await mkdir(screens, { recursive: true });
  for (const s of STATES) {
    await shoot(join(dir, s, "email.html"), join(screens, `email-${s}.png`), 680);
    execFileSync("pdftoppm", ["-r", "110", "-png", "-singlefile", join(dir, s, "bill.pdf"), join(screens, `bill-${s}`)]);
  }
  await shoot(join(dir, "due/page.html"), join(screens, "page-desktop.png"), 1280);
  await shoot(join(dir, "overdue/page.html"), join(screens, "page-phone.png"), 390, 2);
  console.log(`${slug}: screens`);

  if (slug !== "northvale-energy") continue;
  const clients = join(dir, "clients");
  const tmp = join(ROOT, ".previews");
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  await mkdir(clients, { recursive: true });
  const { previews } = await renderInEmailClients(artefacts(file, "due").email, { emailClients: ["outlook", "gmail", "apple-mail", "gmail-app"], dark: true });
  const findings: Record<string, unknown> = {};
  for (const p of previews) {
    await writeFile(join(tmp, p.filename), p.html);
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(pathToFileURL(join(tmp, p.filename)).href);
    await page.waitForSelector("html[data-email-client-ready]", { timeout: 60000 });
    findings[p.filename] = JSON.parse((await page.textContent("#email-client-findings")) ?? "{}");
    await page.locator("#frames iframe").first().screenshot({ path: join(clients, p.filename.replace(/\.html$/, ".png")) });
    await page.close();
  }
  await writeFile(join(clients, "findings.json"), JSON.stringify(findings, null, 2) + "\n");
  await rm(tmp, { recursive: true, force: true });
  console.log(`${slug}: ${previews.length} client previews`);
}

await mkdir(join(ROOT, "docs"), { recursive: true });
const style = `body{margin:0;background:#E2E4DE;font:600 13px Inter,system-ui,sans-serif;color:#59606B}img{display:block;width:100%;border:1px solid #121519;background:#fff}p{margin:0 0 10px;letter-spacing:.08em;text-transform:uppercase}.crop{object-fit:cover;object-position:top}`;
const a = (slug: string, p: string) => pathToFileURL(join(ROOT, "examples", slug, p)).href;
const nv = "northvale-energy";
await compose(
  `<!doctype html><meta charset="utf-8"><style>${style}.w{display:grid;grid-template-columns:470px 600px 560px;gap:32px;padding:52px;align-items:start}.c{display:grid;gap:22px}</style><div class="w"><div><p>Bill email · due soon</p><img class="crop" style="height:820px" src="${a(nv, "screens/email-due.png")}"></div><div><p>A4 PDF bill</p><img src="${a(nv, "screens/bill-due.png")}"></div><div class="c"><div><p>Reminder card · due soon</p><img src="${a(nv, "due/reminder.png")}"></div><div><p>Paid</p><img src="${a(nv, "paid/reminder.png")}"></div><div><p>Overdue</p><img src="${a(nv, "overdue/reminder.png")}"></div></div></div>`,
  join(ROOT, "docs/hero.png"),
  1820,
);
await compose(
  `<!doctype html><meta charset="utf-8"><style>${style}.w{display:grid;grid-template-columns:repeat(3,520px);gap:32px;padding:48px;align-items:start}</style><div class="w">${STATES.map((s) => `<div><p>${s === "due" ? "Due (7 days left)" : s === "paid" ? "Paid" : "Overdue (14 days)"}</p><img class="crop" style="height:640px" src="${a(nv, `screens/email-${s}.png`)}"></div>`).join("")}</div>`,
  join(ROOT, "docs/states.png"),
  1720,
);
await compose(
  `<!doctype html><meta charset="utf-8"><style>${style}.w{display:grid;grid-template-columns:repeat(2,640px);gap:36px;padding:48px}</style><div class="w"><div><p>en-GB · GBP · electricity, kWh, day and night rates, VAT</p><img src="${a(nv, "screens/bill-due.png")}"></div><div><p>en-KE · KES · water, m³, rising blocks, sewerage</p><img src="${a("kirichwa-water", "screens/bill-overdue.png")}"></div></div>`,
  join(ROOT, "docs/two-utilities.png"),
  1410,
);
await browser.close();
