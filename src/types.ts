import type { Labels } from "./strings";

/**
 * The one account file. Every bill email, online bill, PDF bill and reminder card is read from a
 * file of this shape: the utility, the account, its tariff, and a bill per period with the meter
 * readings it was worked out from and the payments made against it. Works for any metered
 * service: electricity in kWh, water in m³, gas in kWh or therms.
 */
export interface AccountFile {
  utility: Utility;
  settings: Settings;
  /** Overrides for any printed word. Keys in strings.ts. */
  labels?: Partial<Labels>;
  account: Account;
  tariff: Tariff;
  bills: Bill[];
  /** Usage before the first bill, by month ("2024-11": 412), for the same-month-last-year marks. */
  history?: Record<string, number>;
  /** The date the bills are looked at: what decides due, paid or overdue. */
  asOf: string;
}

export interface Utility {
  name: string;
  /** Two or three letters for the mark. No logo file is needed in any output. */
  monogram: string;
  legalName: string;
  address: string[];
  registration: string;
  phone: string;
  email: string;
  website: string;
  /** Where a bill is paid online. The account number and bill id are appended. */
  payUrl: string;
  accent: string;
}

export interface Settings {
  locale: string;
  currency: string;
  /** "Electricity", "Water": printed on every bill. */
  service: string;
  /** "kWh", "m³". */
  unit: string;
  /** Decimal places a meter reading is shown with. */
  readingDecimals: number;
  /** Days before the due date the reminder card says "due soon". */
  dueSoonDays: number;
}

export interface Account {
  number: string;
  holder: string;
  /** How the bill addresses them: "Ms Raman". */
  salutation: string;
  email: string;
  supplyAddress: string[];
  meter: { serial: string; type: string };
  payment: { method: "direct-debit" | "on-receipt"; detail: string };
}

export interface Register {
  code: string;
  label: string;
  /** Price per unit in major units (0.2703 is 27.03p). Leave out when the tariff uses blocks. */
  rate?: number;
}

export interface Tariff {
  name: string;
  registers: Register[];
  /** Rising blocks on total use, for tariffs priced that way: the first 6 m³ at one rate, the next at another. */
  blocks?: { upTo: number | null; rate: number }[];
  /** A fixed charge per day of the period, in major units. */
  standingPerDay: number;
  /** Charges worked out as a share of the consumption charge, such as sewerage on water. */
  surcharges?: { label: string; percent: number }[];
  /** Taxes as a percentage of everything above them. */
  taxes: { label: string; percent: number }[];
  /** Added to the next bill when a bill is paid this many days or more after its due date. */
  lateFee?: { amount: number; afterDays: number };
}

export interface Reading {
  register: string;
  previous: number;
  current: number;
  date: string;
  kind: "actual" | "estimated" | "customer";
}

export interface Bill {
  id: string;
  start: string;
  end: string;
  issueDate: string;
  dueDate: string;
  readings: Reading[];
  /** One-off lines on this bill, in major units: a goodwill credit is negative. */
  adjustments?: { label: string; amount: number }[];
  /** Payments made against this bill. */
  payments: { date: string; amount: number; method: string; reference: string }[];
  message?: string;
}
