/**
 * The blocks every output is built from. The tables, the register and the bars-as-boxes are
 * root-agnostic (no Svg, no phone styles), so a figure is the same in the email, the page and the
 * PDF. The Svg usage chart is for the Page, Document and Canvas only.
 */
import type { ReactNode } from "react";
import { Column, LineBreak, Span, Line as SvgLine, Rect, Row, Svg, Table, TableCell, TableRow, Text, defineElement, prop } from "@hyper-elements/react";
import type { Fmt, WorkedBill } from "./bill";
import { INK, MONO, MUTED, RULE, WASH } from "./theme";

export const LABEL = { fontSize: 11, lineHeight: 1.4, fontWeight: 600, letterSpacing: 0.9, textTransform: "uppercase", color: MUTED } as const;
export const hair = `1px solid ${RULE}`;

/** The largest mono size, up to `max`, at which `text` fits in `width` (Plex Mono is 0.6em a character). */
export const fitMono = (text: string, width: number, max: number) => Math.min(max, Math.floor(width / (text.length * 0.6)));

/** The utility's mark: its letters on its accent, drawn with a box and text so it shows with images off. */
export const Mark = defineElement({
  type: "metered.Mark",
  label: "Mark",
  description: "The utility's letters on its accent colour, in place of a logo file.",
  props: {
    letters: prop.text({ label: "Letters", required: true }),
    color: prop.color({ label: "Colour", default: "#0B5D5B" }),
    size: prop.number({ label: "Size", default: 40, min: 20, max: 160 }),
  },
  render: ({ letters, color, size }) => {
    const fs = Math.round(size * 0.38);
    return (
      <Column style={{ width: size, backgroundColor: color, padding: [Math.round((size - fs) / 2), 0] }}>
        <Text style={{ color: "#FFFFFF", fontSize: fs, fontWeight: 700, lineHeight: 1, textAlign: "center", letterSpacing: 0.5 }}>{letters}</Text>
      </Column>
    );
  },
});

/** The bill's state as a flat tag: DUE SOON, PAID, OVERDUE. */
export const Badge = defineElement({
  type: "metered.Badge",
  label: "State badge",
  description: "The bill's state in its own flat colour.",
  props: {
    text: prop.text({ label: "Text", required: true }),
    background: prop.color({ label: "Background", default: INK }),
    color: prop.color({ label: "Text colour", default: "#FFFFFF" }),
    size: prop.number({ label: "Size", default: 11, min: 8, max: 40 }),
  },
  render: ({ text, background, color, size }) => (
    <Column style={{ backgroundColor: background, padding: [Math.round(size * 0.45), Math.round(size * 0.8)] }}>
      <Text style={{ color, fontSize: size, lineHeight: 1.2, fontWeight: 700, letterSpacing: size * 0.1, textTransform: "uppercase", textAlign: "center" }}>{text}</Text>
    </Column>
  ),
});

/** A meter register: each digit in its own dark cell, the way the meter on the wall shows it. */
export const Register = defineElement({
  type: "metered.Register",
  label: "Meter register",
  description: "A meter reading drawn as a row of digit cells.",
  props: {
    value: prop.text({ label: "Reading", required: true }),
    size: prop.number({ label: "Digit size", default: 16, min: 8, max: 72 }),
    color: prop.color({ label: "Cell colour", default: INK }),
  },
  render: ({ value, size, color }) => {
    const w = Math.round(size * 0.95);
    return (
      <Row stackOnMobile={false} style={{ gap: Math.max(2, Math.round(size / 8)), width: value.length * (w + Math.max(2, Math.round(size / 8))) }}>
        {[...value].map((ch, i) => (
          <Column key={i} style={{ width: w, backgroundColor: ch === "," || ch === "." ? "transparent" : color, padding: [Math.round(size * 0.22), 0] }}>
            <Text style={{ fontFamily: MONO, fontSize: size, lineHeight: 1, color: ch === "," || ch === "." ? INK : "#FFFFFF", textAlign: "center" }}>{ch}</Text>
          </Column>
        ))}
      </Row>
    );
  },
});

export function Letterhead({ letters, accent, name, sub, size = 40, nameSize = 17, width = 300 }: { letters: string; accent: string; name: string; sub: string; size?: number; nameSize?: number; width?: number }) {
  return (
    <Row stackOnMobile={false} style={{ gap: Math.round(size * 0.3), alignItems: "center", width }}>
      <Column style={{ width: size }}>
        <Mark letters={letters} color={accent} size={size} />
      </Column>
      <Column style={{ gap: 2 }}>
        <Text style={{ fontSize: nameSize, fontWeight: 700, lineHeight: 1.2 }}>{name}</Text>
        <Text style={{ fontSize: Math.round(nameSize * 0.72), color: MUTED, lineHeight: 1.3 }}>{sub}</Text>
      </Column>
    </Row>
  );
}

export function Fact({ label, value, size = 15, mono = false, labelSize = 11 }: { label: string; value: ReactNode; size?: number; mono?: boolean; labelSize?: number }) {
  return (
    <Column style={{ gap: 3 }}>
      <Text style={{ ...LABEL, fontSize: labelSize }}>{label}</Text>
      <Text style={{ fontSize: size, lineHeight: 1.35, fontWeight: 500, fontFamily: mono ? MONO : undefined }}>{value}</Text>
    </Column>
  );
}

/**
 * The charges: consumption (by register or by block), surcharges, the standing charge, fees and
 * adjustments, the subtotal, taxes, this bill's charges; then the balance from the last bill.
 */
export function ChargesTable({ b, fmt, size = 14, detail = true, balance = true }: { b: WorkedBill; fmt: Fmt; size?: number; detail?: boolean; balance?: boolean }) {
  const { t } = fmt;
  const v = Math.round(size * 0.55);
  const num = { fontFamily: MONO, textAlign: "right", padding: [v, 0, v, 10] } as const;
  const cell = { padding: [v, 0], border: { bottom: hair }, verticalAlign: "top" } as const;
  const head = { ...LABEL, fontSize: Math.max(8, size * 0.75), padding: [0, 0, v], border: { bottom: `1px solid ${INK}` } } as const;
  const strong = { fontWeight: 700, padding: [v + 2, 0], border: { top: `1px solid ${INK}` } } as const;
  return (
    <Table style={{ fontSize: size, lineHeight: 1.35 }}>
      <TableRow header>
        <TableCell style={head}>{t.description}</TableCell>
        {detail ? <TableCell style={{ ...head, textAlign: "right", width: size * 7.5 }}>{t.quantity}</TableCell> : null}
        {detail ? <TableCell style={{ ...head, textAlign: "right", width: size * 7 }}>{t.rate}</TableCell> : null}
        <TableCell style={{ ...head, textAlign: "right", width: size * 9 }}>{t.amount}</TableCell>
      </TableRow>
      {b.lines.map((l, i) => (
        <TableRow key={i}>
          <TableCell style={cell}>
            {l.label}
            {!detail && l.quantity ? <LineBreak /> : null}
            {!detail && l.quantity ? <Span style={{ fontSize: Math.round(size * 0.82), color: MUTED }}>{`${l.quantity}${l.rate ? ` × ${l.rate}` : ""}`}</Span> : null}
          </TableCell>
          {detail ? <TableCell style={{ ...cell, ...num, color: MUTED }}>{l.quantity ?? ""}</TableCell> : null}
          {detail ? <TableCell style={{ ...cell, ...num, color: MUTED }}>{l.rate ?? ""}</TableCell> : null}
          <TableCell style={{ ...cell, ...num }}>{fmt.amount(l.amount)}</TableCell>
        </TableRow>
      ))}
      {b.taxes.length ? (
        <TableRow>
          <TableCell style={{ ...cell, color: MUTED }}>{t.subtotal}</TableCell>
          {detail ? <TableCell style={cell} /> : null}
          {detail ? <TableCell style={cell} /> : null}
          <TableCell style={{ ...cell, ...num, color: MUTED }}>{fmt.amount(b.subtotal)}</TableCell>
        </TableRow>
      ) : null}
      {b.taxes.map((l) => (
        <TableRow key={l.label}>
          <TableCell style={cell}>{l.label}</TableCell>
          {detail ? <TableCell style={cell} /> : null}
          {detail ? <TableCell style={cell} /> : null}
          <TableCell style={{ ...cell, ...num }}>{fmt.amount(l.amount)}</TableCell>
        </TableRow>
      ))}
      <TableRow footer>
        <TableCell style={strong}>{t.totalCharges}</TableCell>
        {detail ? <TableCell style={strong} /> : null}
        {detail ? <TableCell style={strong} /> : null}
        <TableCell style={{ ...strong, ...num, fontWeight: 500, padding: [v + 2, 0, v + 2, 10] }}>{fmt.money(b.charges)}</TableCell>
      </TableRow>
      {balance && b.index > 0
        ? [
            [t.previousBalance, fmt.amount(b.previousBalance)],
            [t.paymentsReceived, fmt.amount(-b.paymentsReceived)],
            [t.carriedForward, fmt.amount(b.broughtForward)],
          ].map(([k, val]) => (
            <TableRow key={k}>
              <TableCell style={{ padding: [Math.round(v * 0.6), 0], color: MUTED }}>{k}</TableCell>
              {detail ? <TableCell /> : null}
              {detail ? <TableCell /> : null}
              <TableCell style={{ ...num, padding: [Math.round(v * 0.6), 0, Math.round(v * 0.6), 10], color: MUTED }}>{val}</TableCell>
            </TableRow>
          ))
        : null}
    </Table>
  );
}

/** The meter readings the bill was worked out from, each with how it was read. */
export function ReadingsTable({ b, fmt, size = 13 }: { b: WorkedBill; fmt: Fmt; size?: number }) {
  const { t } = fmt;
  const v = Math.round(size * 0.55);
  const cell = { padding: [v, 0], border: { bottom: hair } } as const;
  const num = { fontFamily: MONO, textAlign: "right", padding: [v, 0, v, 8] } as const;
  const head = { ...LABEL, fontSize: Math.max(8, size * 0.75), padding: [0, 0, v], border: { bottom: `1px solid ${INK}` } } as const;
  const kind = { actual: t.actual, estimated: t.estimated, customer: t.customer } as const;
  return (
    <Table style={{ fontSize: size }}>
      <TableRow header>
        <TableCell style={head}>{t.register}</TableCell>
        <TableCell style={{ ...head, textAlign: "right", width: size * 6 }}>{t.previous}</TableCell>
        <TableCell style={{ ...head, textAlign: "right", width: size * 6 }}>{t.current}</TableCell>
        <TableCell style={{ ...head, textAlign: "right", width: size * 6.5 }}>{t.used}</TableCell>
        <TableCell style={{ ...head, textAlign: "right", width: size * 9 }}>{t.readOn}</TableCell>
      </TableRow>
      {b.registers.map((r) => (
        <TableRow key={r.code}>
          <TableCell style={cell}>{r.label}</TableCell>
          <TableCell style={{ ...cell, ...num, color: MUTED }}>{fmt.reading(r.previous)}</TableCell>
          <TableCell style={{ ...cell, ...num }}>{fmt.reading(r.current)}</TableCell>
          <TableCell style={{ ...cell, ...num, fontWeight: 500 }}>{fmt.units(r.used)}</TableCell>
          <TableCell style={{ ...cell, textAlign: "right", padding: [v, 0, v, 8], color: r.kind === "estimated" ? "#8F5400" : INK, fontWeight: r.kind === "estimated" ? 600 : 400 }}>
            {`${fmt.short(r.date)} · ${kind[r.kind]}`}
          </TableCell>
        </TableRow>
      ))}
    </Table>
  );
}

/**
 * The last twelve bills' use as columns, the current one in the accent, with a short tick for the
 * same month a year before. Svg: for the Page, Document and Canvas.
 */
export function UsageChart({ history, current, width, height, accent, muted = "#B9BEB6", tick = INK, base = INK, labels }: { history: WorkedBill[]; current: string; width: number; height: number; accent: string; muted?: string; tick?: string | null; base?: string; labels?: (b: WorkedBill) => string }) {
  const n = history.length;
  const max = Math.max(...history.map((b) => Math.max(b.used, b.lastYear ?? 0))) * 1.08;
  const slot = width / n;
  const bar = Math.round(slot * 0.62);
  const plot = height - 1;
  const parts: ReactNode[] = [];
  history.forEach((b, i) => {
    const x = Math.round(i * slot + (slot - bar) / 2);
    const h = Math.max(2, Math.round((b.used / max) * plot));
    parts.push(<Rect key={`b${i}`} x={x} y={plot - h} width={bar} height={h} style={{ fill: b.bill.id === current ? accent : muted }} />);
    if (b.lastYear && tick) {
      const y = Math.round(plot - (b.lastYear / max) * plot);
      parts.push(<Rect key={`t${i}`} x={x - 3} y={y - 1} width={bar + 6} height={3} style={{ fill: tick }} />);
    }
  });
  return (
    <Column style={{ gap: 6, width }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} title="Use by bill, with the same month last year">
        {parts}
        <SvgLine x1={0} y1={plot + 0.5} x2={width} y2={plot + 0.5} style={{ stroke: base, strokeWidth: 1 }} />
      </Svg>
      {labels ? (
        <Row stackOnMobile={false} style={{ width }}>
          {history.map((b, i) => (
            <Column key={i} style={{ width: Math.floor(slot) }}>
              <Text style={{ fontSize: Math.min(11, Math.max(7, slot / 4.2)), color: b.bill.id === current ? INK : MUTED, fontWeight: b.bill.id === current ? 700 : 400, textAlign: "center" }}>{labels(b)}</Text>
            </Column>
          ))}
        </Row>
      ) : null}
    </Column>
  );
}

/** The same history as horizontal bars made of boxes: what the email gets instead of Svg. */
export function UsageRows({ history, current, fmt, accent, width = 300, size = 13 }: { history: WorkedBill[]; current: string; fmt: Fmt; accent: string; width?: number; size?: number }) {
  const max = Math.max(...history.map((b) => b.used));
  return (
    <Column style={{ gap: 6 }}>
      {history.map((b) => {
        const w = Math.max(4, Math.round((b.used / max) * width));
        const on = b.bill.id === current;
        return (
          <Row key={b.bill.id} stackOnMobile={false} style={{ gap: 10, alignItems: "center" }}>
            <Column style={{ width: 44 }}>
              <Text style={{ fontSize: size, color: on ? INK : MUTED, fontWeight: on ? 700 : 400 }}>{fmt.monthShort(b.bill.id)}</Text>
            </Column>
            <Column style={{ width: width + 4 }}>
              <Row stackOnMobile={false} style={{ width: width }}>
                <Column style={{ width: w, backgroundColor: on ? accent : WASH, padding: [Math.round(size * 0.4), 0] }}>
                  <Text style={{ fontSize: 1, lineHeight: 1, color: on ? accent : WASH }}>{" "}</Text>
                </Column>
                {w < width ? <Column style={{ width: width - w }} /> : null}
              </Row>
            </Column>
            <Column style={{ width: 110 }}>
              <Text style={{ fontFamily: MONO, fontSize: size, textAlign: "right", fontWeight: on ? 500 : 400 }}>{fmt.units(b.used)}</Text>
            </Column>
          </Row>
        );
      })}
    </Column>
  );
}
