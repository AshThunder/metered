/**
 * Checks on the account file, run before anything is rendered: what Hyper Elements' validate()
 * can't know (a reading that goes backwards, a reading for a register the tariff doesn't have,
 * bills that overlap, a due date before the bill was issued, blocks out of order). Each problem
 * names the path in the file to fix.
 */
import type { AccountFile } from "./types";

export interface Issue {
  path: string;
  message: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const COLOR = /^#[0-9a-f]{6}$/i;

export function checkFile(file: AccountFile): Issue[] {
  const issues: Issue[] = [];
  const add = (path: string, message: string) => issues.push({ path, message });
  const { settings, utility, tariff, bills, account } = file;

  try {
    new Intl.NumberFormat(settings.locale, { style: "currency", currency: settings.currency });
    if (!Intl.supportedValuesOf("currency").includes(settings.currency)) add("settings.currency", `"${settings.currency}" is not an ISO 4217 currency code`);
  } catch {
    add("settings", `locale "${settings.locale}" or currency "${settings.currency}" is not valid`);
  }
  if (!COLOR.test(utility.accent)) add("utility.accent", `"${utility.accent}" is not a #rrggbb colour`);
  if (!/^[A-Z0-9]{1,3}$/.test(utility.monogram)) add("utility.monogram", "one to three capital letters or digits");
  if (!/^https:\/\//.test(utility.payUrl)) add("utility.payUrl", "must be an https URL");
  if (!ISO_DATE.test(file.asOf)) add("asOf", `"${file.asOf}" is not a YYYY-MM-DD date`);
  if (!account.number.trim()) add("account.number", "is empty");

  const codes = new Set(tariff.registers.map((r) => r.code));
  if (!tariff.registers.length) add("tariff.registers", "needs at least one register");
  if (tariff.blocks?.length) {
    tariff.blocks.forEach((b, i) => {
      const prev = tariff.blocks![i - 1];
      if (b.rate < 0) add(`tariff.blocks[${i}].rate`, "can't be negative");
      if (prev && (prev.upTo === null || (b.upTo !== null && b.upTo <= prev.upTo))) add(`tariff.blocks[${i}].upTo`, "blocks must rise, and only the last can be open (upTo: null)");
    });
    if (tariff.blocks[tariff.blocks.length - 1].upTo !== null) add(`tariff.blocks[${tariff.blocks.length - 1}].upTo`, "the last block must be open (upTo: null), so all use is priced");
  } else {
    tariff.registers.forEach((r, i) => r.rate === undefined && add(`tariff.registers[${i}].rate`, "needs a rate when the tariff has no blocks"));
  }
  if (tariff.standingPerDay < 0) add("tariff.standingPerDay", "can't be negative");
  [...tariff.taxes, ...(tariff.surcharges ?? [])].forEach((x) => (x.percent < 0 || x.percent > 100) && add("tariff", `"${x.label}" percent must be 0 to 100`));

  if (!bills.length) add("bills", "has no bills");
  const ids = new Set<string>();
  const last: Record<string, number> = {};
  bills.forEach((b, i) => {
    const at = `bills[${i}]`;
    if (!/^\d{4}-\d{2}$/.test(b.id)) add(`${at}.id`, `"${b.id}" should be the bill's month, YYYY-MM`);
    if (ids.has(b.id)) add(`${at}.id`, `"${b.id}" appears twice`);
    ids.add(b.id);
    for (const k of ["start", "end", "issueDate", "dueDate"] as const) if (!ISO_DATE.test(b[k])) add(`${at}.${k}`, `"${b[k]}" is not a YYYY-MM-DD date`);
    if (b.end < b.start) add(`${at}.end`, "ends before it starts");
    if (b.issueDate < b.end) add(`${at}.issueDate`, "issued before the period ends");
    if (b.dueDate < b.issueDate) add(`${at}.dueDate`, "due before it was issued");
    const prev = bills[i - 1];
    if (prev && b.start <= prev.end) add(`${at}.start`, `overlaps ${prev.id}`);
    for (const code of codes) if (!b.readings.some((r) => r.register === code)) add(`${at}.readings`, `no reading for register ${code}`);
    b.readings.forEach((r, j) => {
      const rp = `${at}.readings[${j}]`;
      if (!codes.has(r.register)) add(`${rp}.register`, `"${r.register}" is not a register in the tariff`);
      if (r.current < r.previous) add(rp, `the reading goes backwards (${r.previous} to ${r.current})`);
      if (last[r.register] !== undefined && r.previous !== last[r.register]) add(`${rp}.previous`, `should be the last bill's current reading, ${last[r.register]}`);
      last[r.register] = r.current;
    });
    b.payments.forEach((p, j) => {
      if (!ISO_DATE.test(p.date)) add(`${at}.payments[${j}].date`, `"${p.date}" is not a YYYY-MM-DD date`);
      if (p.date < b.issueDate) add(`${at}.payments[${j}].date`, "paid before the bill was issued");
      if (!(p.amount > 0)) add(`${at}.payments[${j}].amount`, "must be above zero");
    });
  });
  if (bills.length && !bills.some((b) => b.issueDate <= file.asOf)) add("asOf", "is before the first bill was issued");
  return issues;
}
