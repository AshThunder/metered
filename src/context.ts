import type { AccountFile } from "./types";
import { formatter, scenario, workAccount, type State, type WorkedBill } from "./bill";
import { STATE, themeFor } from "./theme";
import { toMinor } from "./money";
import sample from "../data/northvale-energy.json";

/** The sample every template renders with no props: Northvale Energy, the October 2026 bill. */
export const SAMPLE = sample as unknown as AccountFile;

export interface TemplateProps {
  /** The account file. Defaults to the Northvale Energy sample. */
  file?: AccountFile;
  /** A bill id ("2026-10"). Defaults to the latest bill issued by the file's asOf date. */
  bill?: string;
  /** Show the latest bill in this state (the file seen on another day). Defaults to its real state. */
  state?: State;
}

/** Everything a template needs: the account worked out, the bill, its state and look, formatters, theme. */
export function context({ file: given = SAMPLE, bill, state }: TemplateProps) {
  const file = state ? scenario(given, state) : given;
  const account = workAccount(file);
  const b: WorkedBill | undefined = bill ? account.bills.find((x) => x.bill.id === bill) : account.latest;
  if (!b) throw new Error(`No bill ${bill} in the account file`);
  const fmt = formatter(file);
  const { t, fill } = fmt;
  const soon = b.state === "due" && b.days2 <= file.settings.dueSoonDays;
  const look = STATE[soon ? "soon" : b.state];
  const month = fmt.month(b.bill.id);
  const dd = file.account.payment.method === "direct-debit";
  const lastPay = b.state === "paid" ? file.bills.flatMap((x) => x.payments).filter((p) => p.date >= b.bill.issueDate && p.date <= file.asOf).pop() : undefined;
  const badge = b.state === "paid" ? t.statePaid : b.state === "overdue" ? t.stateOverdue : soon ? t.stateDueSoon : t.stateDue;
  const when = b.state === "paid" ? fill(t.paidOn, { date: fmt.date(b.paidOn!) }) : b.state === "overdue" ? fill(t.overdueBy, { days: b.days2 }) : b.days2 === 0 ? t.dueToday : b.days2 === 1 ? t.dueTomorrow : fill(t.dueIn, { days: b.days2 });
  const headline = b.state === "paid" ? fill(t.headlinePaid, { month }) : fill(b.state === "overdue" ? t.headlineOverdue : t.headlineDue, { month, amount: fmt.money(b.outstanding), date: fmt.date(b.bill.dueDate) });
  const fee = file.tariff.lateFee ? fmt.money(toMinor(file.tariff.lateFee.amount, file.settings.currency)) : null;
  const note =
    b.state === "paid"
      ? lastPay ? fill(t.paidBy, { date: fmt.date(lastPay.date), method: lastPay.method, reference: lastPay.reference }) : ""
      : b.state === "overdue"
        ? fill(fee ? t.overdueNote : t.overdueNoteNoFee, { date: fmt.date(b.bill.dueDate), fee: fee ?? "" })
        : dd ? fill(t.ddNote, { method: file.account.payment.detail, date: fmt.date(b.bill.dueDate) }) : "";
  /** The figure the bill leads with: what is still owed, or what was paid. */
  const figure = b.state === "paid" ? b.paid : b.outstanding;
  const figureLabel = b.state === "paid" ? t.amountPaid : b.state === "overdue" ? t.amountOverdue : t.amountDue;
  const history = account.bills.filter((x) => x.index <= b.index).slice(-12);
  const vsLast = b.lastYear ? (b.used - b.lastYear) / b.lastYear : null;
  return { file, account, b, fmt, theme: themeFor(file), accent: file.utility.accent, lang: file.settings.locale, look, soon, badge, when, headline, note, month, figure, figureLabel, history, vsLast, dd };
}
export type Ctx = ReturnType<typeof context>;
