import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { render } from "@hyper-elements/react";
import { renderPdf } from "@hyper-elements/react/pdf";
import { renderImage } from "@hyper-elements/react/image";
import type { AccountFile } from "../src/types";
import { formatter, scenario, workAccount } from "../src/bill";
import { loadFonts } from "../src/fonts";
import { artefacts, gate, passed, STATES } from "../scripts/lib";

const load = (name: string) => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), "utf8")) as AccountFile;
const plain = (s: string) => s.replace(/[\u00a0\u202f]/g, " ");

describe.each(["northvale-energy", "kirichwa-water"])("%s", (name) => {
  const file = load(name);
  const fmt = formatter(file);

  it("passes the gate in all three states and for every bill: no errors, no warnings", async () => {
    const r = await gate(name, file);
    expect([...r.errors, ...r.warnings]).toEqual([]);
    expect(passed(r)).toBe(true);
  }, 60000);

  it.each(STATES)("says what the %s state needs in the email and its plain text", async (state) => {
    const b = workAccount(scenario(file, state)).latest;
    const { text, html } = await render(artefacts(file, state).email, { plugins: [] });
    expect(plain(text)).toContain(plain(fmt.money(state === "paid" ? b.paid : b.outstanding)));
    if (state === "paid") expect(text).not.toMatch(/Pay .* now/);
    else expect(html).toContain(b.url);
    if (state === "overdue") expect(text).toContain(fmt.t.stateOverdue);
  });

  it("draws the bill as one A4 page and the card at 1200 by 630", async () => {
    const fonts = await loadFonts();
    const a = artefacts(file, "due");
    const pdf = Buffer.from((await renderPdf(a.pdf, { fonts })).pdf).toString("latin1");
    expect(pdf.match(/\/Type\s*\/Page[^s]/g)?.length).toBe(1);
    const png = Buffer.from((await renderImage(a.card, { fonts, scale: 1 })).image);
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  }, 30000);
});
