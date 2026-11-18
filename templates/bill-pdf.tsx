/**
 * Metered: the PDF bill, A4, one page.
 *
 * The copy that is posted, attached, printed and kept: what a landlord, an accountant or a
 * benefits office asks for as proof of address and of what was paid. One page, top to bottom:
 * who and where, the state band with the amount and the date, the charges line by line beside a
 * year of use against the same months last year, the meter readings and how each was taken, the
 * last six bills, the tariff, how to pay, and a payment slip to tear off.
 */
import { Column, Document, Heading, PageFooter, PageHeader, PageNumber, Row, Table, TableCell, TableRow, Text } from "@hyper-elements/react";
import { context, type TemplateProps } from "../src/context";
import { Badge, ChargesTable, Fact, LABEL, Letterhead, ReadingsTable, Register, UsageChart, fitMono, hair } from "../src/parts";
import { INK, MONO, MUTED, STATE, WASH } from "../src/theme";

export const meta = {
  title: "Metered PDF bill",
  description: "A one-page A4 bill: the state band, charges beside a year of use, meter readings, recent bills, how to pay and a payment slip.",
  root: "Document",
};

export default function BillPdf(props: TemplateProps) {
  const { file, account, b, fmt, theme, accent, lang, look, badge, when, headline, note, month, figure, figureLabel, history, vsLast } = context(props);
  const { t, fill } = fmt;
  const u = file.utility;
  const a = file.account;
  const service = file.settings.service.toLowerCase();
  const recent = account.bills.filter((x) => x.index <= b.index).slice(-6).reverse();
  const stateOf = (s: string) => (s === "paid" ? t.statePaid : s === "overdue" ? t.stateOverdue : t.stateDue);
  const lastYearMonth = fmt.month(`${Number(b.bill.id.slice(0, 4)) - 1}${b.bill.id.slice(4)}`);

  const header = (
    <PageHeader style={{ padding: [0, 0, 12], border: { bottom: `1px solid ${INK}` } }}>
      <Row style={{ alignItems: "center" }}>
        <Column>
          <Letterhead letters={u.monogram} accent={accent} name={u.name} sub={`${file.settings.service} · ${fill(t.yourBill, { service })}`} size={30} nameSize={13} />
        </Column>
        <Column style={{ width: 220 }}>
          {u.address.map((l) => (
            <Text key={l} style={{ fontSize: 8, color: MUTED, textAlign: "right", lineHeight: 1.4 }}>
              {l}
            </Text>
          ))}
          <Text style={{ fontSize: 8, color: MUTED, textAlign: "right", lineHeight: 1.4 }}>{`${u.phone} · ${u.website}`}</Text>
        </Column>
      </Row>
    </PageHeader>
  );
  const footer = (
    <PageFooter style={{ padding: [8, 0, 0], border: { top: hair } }}>
      <Row>
        <Text style={{ fontSize: 7, color: MUTED }}>{`${u.legalName} · ${u.registration}`}</Text>
        <Column style={{ width: 90 }}>
          <Text style={{ fontSize: 7, color: MUTED, textAlign: "right" }}>
            {t.page} <PageNumber /> {t.of} <PageNumber total />
          </Text>
        </Column>
      </Row>
    </PageFooter>
  );

  return (
    <Document theme={theme} size="A4" margin={[30, 38, 30, 38]} lang={lang} title={`${fill(t.yourBill, { service })} · ${month} · ${b.reference}`}>
      {header}
      <Column style={{ gap: 15 }}>
        <Row style={{ gap: 24, padding: [6, 0, 0] }}>
          <Column style={{ gap: 3 }}>
            <Text style={{ fontSize: 11, fontWeight: 600 }}>{a.holder}</Text>
            {a.supplyAddress.map((l) => (
              <Text key={l} style={{ fontSize: 10 }}>
                {l}
              </Text>
            ))}
          </Column>
          <Column style={{ width: 250 }}>
            <Table style={{ fontSize: 8.5 }}>
              {[
                [t.accountNumber, a.number],
                [t.billNumber, b.reference],
                [t.period, fmt.range(b.bill.start, b.bill.end)],
                [t.issued, fmt.date(b.bill.issueDate)],
                [t.dueDate, fmt.date(b.bill.dueDate)],
              ].map(([k, v]) => (
                <TableRow key={k}>
                  <TableCell style={{ padding: [2.5, 0], color: MUTED }}>{k}</TableCell>
                  <TableCell style={{ padding: [2.5, 0], fontFamily: MONO, textAlign: "right" }}>{v}</TableCell>
                </TableRow>
              ))}
            </Table>
          </Column>
        </Row>

        <Row style={{ backgroundColor: look.soft, padding: 16, gap: 18, alignItems: "center", border: { left: `5px solid ${look.bg}` } }}>
          <Column style={{ gap: 8 }}>
            <Column style={{ width: 92 }}>
              <Badge text={badge} background={look.bg} color={look.fg} size={8.5} />
            </Column>
            <Heading level={1} style={{ fontSize: 17, lineHeight: 1.25 }}>
              {headline}
            </Heading>
            {note ? <Text style={{ fontSize: 8.5, lineHeight: 1.45 }}>{note}</Text> : null}
          </Column>
          <Column style={{ width: 210, gap: 2 }}>
            <Text style={{ ...LABEL, fontSize: 7.5, textAlign: "right" }}>{figureLabel}</Text>
            <Text style={{ fontFamily: MONO, fontSize: fitMono(fmt.money(figure), 210, 30), fontWeight: 500, letterSpacing: -1, textAlign: "right", color: b.state === "overdue" ? look.bg : INK }}>{fmt.money(figure)}</Text>
            <Text style={{ fontSize: 8.5, fontWeight: 600, textAlign: "right", color: b.state === "due" ? (look.bg === INK ? MUTED : look.bg) : look.bg }}>{b.state === "paid" ? when : `${fmt.date(b.bill.dueDate)} · ${when}`}</Text>
          </Column>
        </Row>

        <Row style={{ gap: 22 }}>
          <Column style={{ gap: 8, width: 300 }}>
            <Heading level={2} style={{ fontSize: 8, padding: [0, 0, 2] }}>
              {`${t.charges} · ${fmt.range(b.bill.start, b.bill.end)}`}
            </Heading>
            <ChargesTable b={b} fmt={fmt} size={8.5} />
            {b.bill.message ? <Text style={{ fontSize: 8, color: MUTED, lineHeight: 1.5, padding: [6, 0, 0] }}>{b.bill.message}</Text> : null}
          </Column>
          <Column style={{ gap: 10 }}>
            <Heading level={2} style={{ fontSize: 8, padding: [0, 0, 2] }}>
              {t.usage}
            </Heading>
            <Row style={{ gap: 10, width: 176 }}>
              <Fact label={t.usedThisPeriod} value={fmt.units(b.used)} size={12} mono labelSize={6.5} />
              <Fact label={t.dailyAverage} value={fmt.units(b.used / b.days, 1)} size={12} mono labelSize={6.5} />
            </Row>
            <UsageChart history={history} current={b.bill.id} width={176} height={92} accent={accent} labels={(x) => fmt.monthShort(x.bill.id).slice(0, 1)} />
            <Text style={{ fontSize: 7.5, color: MUTED, lineHeight: 1.45 }}>{`${t.last12}. ${t.lastYearMark}: ${b.lastYear ? fmt.units(b.lastYear) : "–"}.`}</Text>
            {vsLast !== null ? <Text style={{ fontSize: 8.5, fontWeight: 600 }}>{`${(Math.abs(vsLast) < 0.005 ? fill(t.sameAs, { month: lastYearMonth }) : fill(t.vsLastYear, { pct: fmt.pct(Math.abs(vsLast)), direction: vsLast < 0 ? t.less : t.more, month: lastYearMonth }))}.`}</Text> : null}
            <Column style={{ gap: 5, padding: [6, 0, 0] }}>
              <Text style={{ ...LABEL, fontSize: 6.5 }}>{`${t.meter} ${a.meter.serial}`}</Text>
              {b.registers.map((r) => (
                <Row key={r.code} style={{ gap: 8, alignItems: "center" }}>
                  <Column style={{ width: 92 }}>
                    <Register value={fmt.reading(r.current)} size={10} />
                  </Column>
                  <Text style={{ fontSize: 7.5, color: MUTED }}>{r.label}</Text>
                </Row>
              ))}
            </Column>
          </Column>
        </Row>
        <Column style={{ gap: 6 }}>
          <Heading level={2} style={{ fontSize: 8 }}>
            {`${t.readings} · ${a.meter.type} · ${a.meter.serial}`}
          </Heading>
          <ReadingsTable b={b} fmt={fmt} size={9} />
          {b.estimated ? <Text style={{ fontSize: 8, color: "#8F5400", fontWeight: 600 }}>{t.estimateNote}</Text> : null}
        </Column>
        <Row style={{ gap: 24 }}>
          <Column style={{ gap: 8, width: 290 }}>
            <Heading level={2} style={{ fontSize: 8 }}>
              {t.history}
            </Heading>
            <Table style={{ fontSize: 8.5 }}>
              <TableRow header>
                {[t.month, t.used, t.billed, t.status].map((h, i) => (
                  <TableCell key={h} style={{ ...LABEL, fontSize: 6.5, padding: [0, 0, 5], textAlign: i ? "right" : "left", width: i ? 62 : undefined, border: { bottom: `1px solid ${INK}` } }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
              {recent.map((x) => (
                <TableRow key={x.bill.id}>
                  <TableCell style={{ padding: [3.5, 0], fontWeight: x === b ? 700 : 400, border: { bottom: hair } }}>{fmt.monthYear(x.bill.id)}</TableCell>
                  <TableCell style={{ padding: [3.5, 0], fontFamily: MONO, textAlign: "right", border: { bottom: hair } }}>{fmt.units(x.used)}</TableCell>
                  <TableCell style={{ padding: [3.5, 0], fontFamily: MONO, textAlign: "right", border: { bottom: hair } }}>{fmt.amount(x.charges)}</TableCell>
                  <TableCell style={{ padding: [3.5, 0], textAlign: "right", fontWeight: 600, color: STATE[x.state].bg, border: { bottom: hair } }}>{stateOf(x.state)}</TableCell>
                </TableRow>
              ))}
            </Table>
          </Column>
          <Column style={{ gap: 10 }}>
            <Heading level={2} style={{ fontSize: 8 }}>
              {t.tariff}
            </Heading>
            <Text style={{ fontSize: 9, fontWeight: 600 }}>{file.tariff.name}</Text>
            {b.lines
              .filter((l) => l.rate && l.kind !== "adjustment")
              .map((l) => (
                <Row key={l.label} style={{ gap: 6 }}>
                  <Text style={{ fontSize: 8, color: MUTED }}>{l.label}</Text>
                  <Column style={{ width: 70 }}>
                    <Text style={{ fontSize: 8, fontFamily: MONO, textAlign: "right" }}>{l.rate}</Text>
                  </Column>
                </Row>
              ))}
            <Heading level={2} style={{ fontSize: 8, padding: [8, 0, 0] }}>
              {t.howToPay}
            </Heading>
            <Fact label={t.payOnline} value={u.payUrl.replace(/^https:\/\//, "")} size={9} labelSize={6.5} />
            <Fact label={t.payPhone} value={u.phone} size={9} labelSize={6.5} />
            <Fact label={t.account} value={a.payment.detail} size={9} labelSize={6.5} />
            <Text style={{ fontSize: 8, color: MUTED, lineHeight: 1.45 }}>{fill(t.questions, { phone: u.phone, email: u.email })}</Text>
          </Column>
        </Row>

        <Column style={{ gap: 10, padding: [14, 0, 0], border: { top: `1px dashed ${INK}` } }}>
          <Row style={{ alignItems: "center" }}>
            <Text style={{ ...LABEL, fontSize: 7.5, color: INK }}>{t.paymentSlip}</Text>
            <Column style={{ width: 200 }}>
              <Text style={{ fontSize: 7.5, color: MUTED, textAlign: "right" }}>{u.name}</Text>
            </Column>
          </Row>
          <Row style={{ gap: 16, backgroundColor: WASH, padding: 14 }}>
            <Fact label={t.accountNumber} value={a.number} size={10} mono labelSize={6.5} />
            <Fact label={t.reference} value={b.reference} size={10} mono labelSize={6.5} />
            <Fact label={t.dueDate} value={fmt.date(b.bill.dueDate)} size={10} labelSize={6.5} />
            <Column style={{ width: 120, gap: 3 }}>
              <Text style={{ ...LABEL, fontSize: 6.5, textAlign: "right" }}>{b.state === "paid" ? t.amountPaid : t.amountDue}</Text>
              <Text style={{ fontFamily: MONO, fontSize: 14, fontWeight: 500, textAlign: "right" }}>{fmt.money(b.state === "paid" ? b.paid : b.outstanding)}</Text>
            </Column>
          </Row>
        </Column>
      </Column>
      {footer}
    </Document>
  );
}
