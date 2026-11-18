import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { AccountFile } from "../src/types";
import { scenario, workAccount } from "../src/bill";
import { checkFile } from "../src/check";
import { roundHalfUp } from "../src/money";

const load = (name: string) => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), "utf8")) as AccountFile;
const nv = load("northvale-energy");
const kw = load("kirichwa-water");
const clone = (f: AccountFile): AccountFile => structuredClone(f);

describe("charges", () => {
  it("prices each register at its own rate, adds the standing charge and VAT", () => {
    const b = workAccount(nv).latest;
    const day = b.registers.find((r) => r.code === "DAY")!;
    expect(day.used).toBe(day.current - day.previous);
    expect(b.lines[0].amount).toBe(roundHalfUp(day.used * 0.2703 * 100));
    const standing = b.lines.find((l) => l.kind === "standing")!;
    expect(standing.amount).toBe(roundHalfUp(31 * 0.5335 * 100));
    expect(b.taxes[0].amount).toBe(roundHalfUp(b.subtotal * 0.05));
    expect(b.charges).toBe(b.subtotal + b.taxes[0].amount);
  });
  it("prices water in rising blocks, with sewerage as a share of the water charge", () => {
    const b = workAccount(kw).latest;
    const blocks = b.lines.filter((l) => l.kind === "consumption");
    expect(blocks[0].amount).toBe(6 * 53 * 100);
    expect(blocks[1].amount).toBe((b.used - 6) * 96 * 100);
    const water = blocks.reduce((a, l) => a + l.amount, 0);
    expect(b.lines.find((l) => l.kind === "surcharge")!.amount).toBe(roundHalfUp(water * 0.75));
    expect(b.taxes).toEqual([]);
  });
  it("uses the top block only for use above it", () => {
    const f = clone(kw);
    const last = f.bills[f.bills.length - 1];
    last.readings[0].current = last.readings[0].previous + 75;
    const b = workAccount(f).latest;
    expect(b.lines.filter((l) => l.kind === "consumption").map((l) => l.amount)).toEqual([6 * 53 * 100, 54 * 96 * 100, 15 * 114 * 100]);
  });
});

describe("balances and late payment", () => {
  it("carries a bill paid after the next bill was issued, and charges it late once, untaxed", () => {
    const a = workAccount(nv);
    const march = a.bills.find((b) => b.bill.id === "2026-03")!;
    const feb = a.bills.find((b) => b.bill.id === "2026-02")!;
    expect(march.broughtForward).toBe(feb.amountDue);
    const fees = a.bills.flatMap((b) => b.lines.filter((l) => l.kind === "fee").map(() => b.bill.id));
    expect(fees).toEqual(["2026-04"]);
    const april = a.bills.find((b) => b.bill.id === "2026-04")!;
    const fee = april.lines.find((l) => l.kind === "fee")!;
    expect(april.taxes[0].amount).toBe(roundHalfUp(((april.subtotal - fee.amount) * 5) / 100));
  });
  it("ends every past bill paid, with nothing carried", () => {
    const a = workAccount(nv);
    for (const b of a.bills.slice(0, -1)) expect(b.state).toBe("paid");
    expect(a.latest.broughtForward).toBe(0);
  });
});

describe("states", () => {
  it("works out the real state on the file's date", () => {
    expect(workAccount(nv).latest.state).toBe("due");
    expect(workAccount(nv).latest.days2).toBe(7);
    expect(workAccount(kw).latest.state).toBe("overdue");
  });
  it("shows the same bill paid and overdue on other days, without changing its charges", () => {
    const base = workAccount(nv).latest;
    const paid = workAccount(scenario(nv, "paid")).latest;
    const overdue = workAccount(scenario(nv, "overdue")).latest;
    expect(paid.state).toBe("paid");
    expect(paid.paid).toBe(base.amountDue);
    expect(overdue.state).toBe("overdue");
    expect(overdue.days2).toBe(14);
    expect([paid.charges, overdue.charges]).toEqual([base.charges, base.charges]);
    expect(workAccount(scenario(kw, "due")).latest.state).toBe("due");
  });
});

describe("data checks", () => {
  it("passes the samples", () => {
    expect(checkFile(nv)).toEqual([]);
    expect(checkFile(kw)).toEqual([]);
  });
  it("names the path to fix", () => {
    const f = clone(nv);
    f.bills[3].readings[0].current = f.bills[3].readings[0].previous - 10;
    f.bills[5].readings[1].previous += 1;
    f.bills[6].dueDate = "2026-01-01";
    f.bills[7].readings[0].register = "PEAK";
    f.utility.accent = "teal";
    const paths = checkFile(f).map((i) => i.path);
    expect(paths).toEqual(expect.arrayContaining(["bills[3].readings[0]", "bills[5].readings[1].previous", "bills[6].dueDate", "bills[7].readings[0].register", "bills[7].readings", "utility.accent"]));
  });
  it("refuses blocks that don't rise or end open", () => {
    const f = clone(kw);
    f.tariff.blocks = [{ upTo: 10, rate: 50 }, { upTo: 6, rate: 90 }];
    expect(checkFile(f).map((i) => i.path)).toEqual(expect.arrayContaining(["tariff.blocks[1].upTo"]));
  });
});
