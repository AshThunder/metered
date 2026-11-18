/**
 * The account worked out from the file alone: each bill's consumption, charges, balance carried
 * from the bill before, and its state (due, paid or overdue) on the file's `asOf` date. Money is
 * whole minor units throughout, each line rounded once, half up, so totals never drift.
 */
import type { AccountFile, Bill } from "./types";
import { formatAmount, formatMoney, minorDigits, roundHalfUp, toMinor } from "./money";
import { fill, labelsFor, type Labels } from "./strings";

export type State = "due" | "paid" | "overdue";

export interface Line {
  label: string;
  /** "412 kWh", "30 days". */
  quantity?: string;
  /** "£0.2703". */
  rate?: string;
  amount: number;
  kind: "consumption" | "standing" | "surcharge" | "adjustment" | "fee" | "tax";
}

export interface RegisterUse {
  code: string;
  label: string;
  previous: number;
  current: number;
  used: number;
  date: string;
  kind: "actual" | "estimated" | "customer";
}

export interface WorkedBill {
  bill: Bill;
  index: number;
  days: number;
  registers: RegisterUse[];
  used: number;
  estimated: boolean;
  lines: Line[];
  subtotal: number;
  taxes: Line[];
  charges: number;
  previousBalance: number;
  paymentsReceived: number;
  broughtForward: number;
  amountDue: number;
  paid: number;
  outstanding: number;
  state: State;
  /** Days until due (due), days past due (overdue), 0 for paid. */
  days2: number;
  paidOn?: string;
  lastYear: number | null;
  reference: string;
  url: string;
}

export interface WorkedAccount {
  file: AccountFile;
  bills: WorkedBill[];
  latest: WorkedBill;
}

const DAY = 86400000;
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
export const daysBetween = (a: string, b: string) => Math.round((utc(b) - utc(a)) / DAY);
export const plusDays = (iso: string, n: number) => new Date(utc(iso) + n * DAY).toISOString().slice(0, 10);
const shiftYear = (id: string, by: number) => `${Number(id.slice(0, 4)) + by}${id.slice(4)}`;

export function roundTo(value: number, decimals: number) {
  const f = 10 ** decimals;
  return Math.round(Number((value * f).toPrecision(12))) / f;
}

export function workAccount(file: AccountFile): WorkedAccount {
  const { currency } = file.settings;
  const m = (major: number) => toMinor(major, currency);
  const t = labelsFor(file.labels);
  const fmtRate = (r: number) => new Intl.NumberFormat(file.settings.locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(r);
  const fmtUnits = (n: number) => `${new Intl.NumberFormat(file.settings.locale, { maximumFractionDigits: file.settings.readingDecimals }).format(n)} ${file.settings.unit}`;
  const usedById = new Map<string, number>();
  /** The account's payments, whichever bill they were made against: balances are a running ledger. */
  const ledger = file.bills.flatMap((b) => b.payments).sort((a, b) => a.date.localeCompare(b.date));
  const paidBetween = (from: string, to: string, exclusive = false) => ledger.filter((p) => p.date >= from && (exclusive ? p.date < to : p.date <= to)).reduce((a, p) => a + m(p.amount), 0);
  const bills: WorkedBill[] = [];

  file.bills.forEach((bill, index) => {
    const days = daysBetween(bill.start, bill.end) + 1;
    const registers = bill.readings.map((r) => {
      const reg = file.tariff.registers.find((x) => x.code === r.register);
      return { code: r.register, label: reg?.label ?? r.register, previous: r.previous, current: r.current, used: roundTo(r.current - r.previous, file.settings.readingDecimals), date: r.date, kind: r.kind };
    });
    const used = roundTo(registers.reduce((a, r) => a + r.used, 0), file.settings.readingDecimals);
    usedById.set(bill.id, used);

    const lines: Line[] = [];
    let consumption = 0;
    if (file.tariff.blocks?.length) {
      let from = 0;
      file.tariff.blocks.forEach((b, i) => {
        const top = b.upTo ?? Infinity;
        const q = roundTo(Math.max(0, Math.min(used, top) - from), file.settings.readingDecimals);
        if (q > 0) {
          const amount = roundHalfUp(q * b.rate * 10 ** minorDigits(currency));
          consumption += amount;
          const range = b.upTo === null ? fill(t.blockOver, { from: String(from), unit: file.settings.unit }) : fill(t.blockRange, { from: String(from), to: String(b.upTo), unit: file.settings.unit });
          lines.push({ label: `${fill(t.block, { n: i + 1 })} · ${range}`, quantity: fmtUnits(q), rate: fmtRate(b.rate), amount, kind: "consumption" });
        }
        from = top;
      });
    } else {
      for (const r of registers) {
        const rate = file.tariff.registers.find((x) => x.code === r.code)?.rate ?? 0;
        const amount = roundHalfUp(r.used * rate * 10 ** minorDigits(currency));
        consumption += amount;
        lines.push({ label: r.label, quantity: fmtUnits(r.used), rate: fmtRate(rate), amount, kind: "consumption" });
      }
    }
    for (const s of file.tariff.surcharges ?? []) lines.push({ label: s.label, rate: `${new Intl.NumberFormat(file.settings.locale, { maximumFractionDigits: 2 }).format(s.percent)}%`, amount: roundHalfUp((consumption * s.percent) / 100), kind: "surcharge" });
    lines.push({ label: t.standingCharge, quantity: fill(t.days, { days }), rate: fmtRate(file.tariff.standingPerDay), amount: roundHalfUp(days * file.tariff.standingPerDay * 10 ** minorDigits(currency)), kind: "standing" });

    const prev = bills[index - 1];
    if (prev && file.tariff.lateFee) {
      // A late payment charge for every earlier bill that was still not paid afterDays after its
      // due date, charged on the first bill issued after that day.
      const after = file.tariff.lateFee.afterDays;
      for (const j of bills) {
        const cutoff = plusDays(j.bill.dueDate, after);
        if (!(cutoff >= prev.bill.issueDate && cutoff < bill.issueDate)) continue;
        if (paidBetween(j.bill.issueDate, cutoff) < j.amountDue && j.amountDue > 0) lines.push({ label: t.lateFee, amount: m(file.tariff.lateFee.amount), kind: "fee" });
      }
    }
    for (const a of bill.adjustments ?? []) lines.push({ label: a.label, amount: m(a.amount), kind: "adjustment" });

    const subtotal = lines.reduce((a, l) => a + l.amount, 0);
    /** A late payment charge is compensation, not a supply, so it carries no tax. */
    const taxable = lines.filter((l) => l.kind !== "fee").reduce((a, l) => a + l.amount, 0);
    const taxes: Line[] = file.tariff.taxes.map((x) => ({ label: `${x.label} ${new Intl.NumberFormat(file.settings.locale, { maximumFractionDigits: 2 }).format(x.percent)}%`, amount: roundHalfUp((taxable * x.percent) / 100), kind: "tax" }));
    const charges = subtotal + taxes.reduce((a, l) => a + l.amount, 0);

    const previousBalance = prev ? prev.amountDue : 0;
    const paymentsReceived = prev ? paidBetween(prev.bill.issueDate, bill.issueDate, true) : 0;
    const broughtForward = previousBalance - paymentsReceived;
    const amountDue = broughtForward + charges;

    const paidList = ledger.filter((p) => p.date >= bill.issueDate && p.date <= file.asOf);
    const paid = paidList.reduce((a, p) => a + m(p.amount), 0);
    const outstanding = Math.max(0, amountDue - paid);
    const state: State = outstanding === 0 ? "paid" : file.asOf > bill.dueDate ? "overdue" : "due";
    const reference = `${file.account.number}-${bill.id.replace(/\W/g, "")}`;
    bills.push({
      bill,
      index,
      days,
      registers,
      used,
      estimated: registers.some((r) => r.kind === "estimated"),
      lines,
      subtotal,
      taxes,
      charges,
      previousBalance,
      paymentsReceived,
      broughtForward,
      amountDue,
      paid,
      outstanding,
      state,
      days2: state === "due" ? daysBetween(file.asOf, bill.dueDate) : state === "overdue" ? daysBetween(bill.dueDate, file.asOf) : 0,
      paidOn: state === "paid" ? paidList.reduce((a, p) => (p.date > a ? p.date : a), "") || undefined : undefined,
      lastYear: null,
      reference,
      url: `${file.utility.payUrl.replace(/\/$/, "")}/${encodeURIComponent(file.account.number)}/${encodeURIComponent(bill.id)}`,
    });
  });
  for (const b of bills) {
    const id = shiftYear(b.bill.id, -1);
    b.lastYear = usedById.get(id) ?? file.history?.[id] ?? null;
  }
  const issued = bills.filter((b) => b.bill.issueDate <= file.asOf);
  return { file, bills, latest: issued[issued.length - 1] ?? bills[bills.length - 1] };
}

/**
 * The same file on another day: how the examples show one bill in all three states from real
 * data. "due" looks the day the file was written; "paid" adds the payment the customer made and
 * looks the day after it; "overdue" looks two weeks after the due date with nothing paid.
 */
export function scenario(file: AccountFile, state: State): AccountFile {
  const f: AccountFile = structuredClone(file);
  const account = workAccount(f);
  const last = f.bills[account.latest.index];
  const due = account.latest;
  const plus = plusDays;
  if (state === "due") {
    last.payments = last.payments.filter((p) => p.date <= f.asOf);
    if (f.asOf > last.dueDate) f.asOf = plus(last.dueDate, -Math.min(5, f.settings.dueSoonDays));
  }
  if (state === "overdue") {
    last.payments = [];
    f.asOf = plus(last.dueDate, 14);
  }
  if (state === "paid") {
    if (!last.payments.length) {
      const date = f.account.payment.method === "direct-debit" ? last.dueDate : plus(last.dueDate, -3);
      const major = due.amountDue / 10 ** minorDigits(f.settings.currency);
      last.payments = [{ date, amount: major, method: f.account.payment.method === "direct-debit" ? "Direct Debit" : "card", reference: `PAY-${last.id.replace(/\W/g, "")}-${f.account.number.slice(-4)}` }];
    }
    f.asOf = last.payments.reduce((a, p) => (p.date > a ? p.date : a), "");
  }
  return f;
}

export function formatter(file: AccountFile) {
  const { locale, currency, unit, readingDecimals } = file.settings;
  const t: Labels = labelsFor(file.labels);
  const date = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) => new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" }).format(new Date(utc(iso)));
  return {
    t,
    fill,
    money: (minor: number) => formatMoney(minor, currency, locale),
    amount: (minor: number) => formatAmount(minor, currency, locale),
    units: (n: number, d = readingDecimals) => `${new Intl.NumberFormat(locale, { maximumFractionDigits: d }).format(n)} ${unit}`,
    reading: (n: number) => new Intl.NumberFormat(locale, { minimumFractionDigits: readingDecimals, maximumFractionDigits: readingDecimals, useGrouping: false }).format(n).padStart(5 + (readingDecimals ? readingDecimals + 1 : 0), "0"),
    num: (n: number, d = 1) => new Intl.NumberFormat(locale, { maximumFractionDigits: d }).format(n),
    pct: (n: number) => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(n),
    date,
    short: (iso: string) => date(iso, { day: "numeric", month: "short" }),
    month: (id: string) => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(utc(`${id}-01`))),
    monthYear: (id: string) => new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(utc(`${id}-01`))),
    monthShort: (id: string) => new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(new Date(utc(`${id}-01`))),
    range: (a: string, b: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).formatRange(new Date(utc(a)), new Date(utc(b))),
  };
}
export type Fmt = ReturnType<typeof formatter>;
