/**
 * Metered: the online bill.
 *
 * What the email's button opens, and what the customer's account page shows: the bill in its
 * state with the amount and what to do first, then why it is that amount. A year of use as a
 * chart with the same month last year marked, the charges line by line, the meter readings with
 * how each was taken, the last twelve bills and how to pay. Mostly read on phones, so the wide
 * tables and the chart have phone copies (a table cell's width can't change on a phone).
 */
import { Button, Column, Divider, Grid, Heading, Page, Row, Section, Table, TableCell, TableRow, Text, token } from "@hyper-elements/react";
import { context, type TemplateProps } from "../src/context";
import { Badge, ChargesTable, Fact, LABEL, Letterhead, Register, UsageChart, fitMono, hair } from "../src/parts";
import { INK, MONO, MUTED, STATE } from "../src/theme";

export const meta = {
  title: "Metered online bill",
  description: "The bill as a responsive page: state, amount and pay button first, a year of use as a chart, charges, readings, history and how to pay.",
  root: "Page",
};

const FONTS = [
  { family: "Inter", src: "https://cdn.jsdelivr.net/fontsource/fonts/inter:vf@latest/latin-wght-normal.woff2", format: "woff2", weight: "100 900" },
  { family: "IBM Plex Mono", src: "https://cdn.jsdelivr.net/fontsource/fonts/ibm-plex-mono@latest/latin-400-normal.woff2", format: "woff2", weight: 400 },
  { family: "IBM Plex Mono", src: "https://cdn.jsdelivr.net/fontsource/fonts/ibm-plex-mono@latest/latin-500-normal.woff2", format: "woff2", weight: 500 },
] as const;

export default function BillPage(props: TemplateProps & { pdfHref?: string }) {
  const { file, account, b, fmt, theme, accent, lang, look, badge, when, headline, note, month, figure, figureLabel, history, vsLast } = context(props);
  const { t, fill } = fmt;
  const u = file.utility;
  const a = file.account;
  const service = file.settings.service.toLowerCase();
  const pdfHref = props.pdfHref ?? "bill.pdf";
  const kinds = { actual: t.actual, estimated: t.estimated, customer: t.customer } as const;
  const chartLabel = (x: (typeof history)[number]) => fmt.monthShort(x.bill.id);
  const cta = b.state === "paid" ? null : fill(t.payNow, { amount: fmt.money(b.outstanding) });
  const lastYearMonth = fmt.month(`${Number(b.bill.id.slice(0, 4)) - 1}${b.bill.id.slice(4)}`);
  const recent = account.bills.filter((x) => x.index <= b.index).slice(-12).reverse();
  const stateOf = (x: (typeof recent)[number]) => (x.state === "paid" ? t.statePaid : x.state === "overdue" ? t.stateOverdue : t.stateDue);
  const card = { backgroundColor: token("colors.card"), padding: 28, gap: 18, border: { width: 1, style: "solid", color: token("colors.border") }, mobile: { padding: 18 } } as const;

  return (
    <Page theme={theme} width={1040} lang={lang} title={`${fill(t.yourBill, { service })} · ${month} · ${u.name}`} description={headline} fonts={[...FONTS]} style={{ gap: 0 }}>
      <Section style={{ backgroundColor: token("colors.card"), padding: [18, 32], border: { bottom: { width: 1, style: "solid", color: token("colors.border") } }, mobile: { padding: [14, 16] } }}>
        <Row stackOnMobile={false} style={{ alignItems: "center", gap: 16 }}>
          <Column>
            <Letterhead letters={u.monogram} accent={accent} name={u.name} sub={`${file.settings.service} · ${t.account} ${a.number}`} size={36} nameSize={16} />
          </Column>
          <Column style={{ width: 240, alignItems: "end" }} hidden={{ mobile: true }}>
            <Text style={{ fontSize: 13, color: MUTED, textAlign: "right" }}>{a.holder}</Text>
            <Text style={{ fontSize: 13, color: MUTED, textAlign: "right" }}>{a.supplyAddress.join(", ")}</Text>
          </Column>
        </Row>
      </Section>

      <Section style={{ padding: [32, 32, 0], mobile: { padding: [18, 12, 0] } }}>
        <Column style={{ backgroundColor: token("colors.card"), border: { top: { width: 6, style: "solid", color: look.bg } } }}>
          <Row style={{ padding: [28, 32], gap: 32, alignItems: "end", mobile: { padding: [20, 18], gap: 18 } }}>
            <Column style={{ gap: 14 }}>
              <Row stackOnMobile={false} style={{ gap: 12, alignItems: "center" }}>
                <Column style={{ width: 128 }}>
                  <Badge text={badge} background={look.bg} color={look.fg} size={12} />
                </Column>
                <Column>
                  <Text style={{ fontSize: 14, color: MUTED }}>{`${t.bill} ${b.reference} · ${fmt.range(b.bill.start, b.bill.end)}`}</Text>
                </Column>
              </Row>
              <Heading level={1} style={{ fontSize: 32, mobile: { fontSize: 24 } }}>
                {headline}
              </Heading>
              {note ? <Text style={{ fontSize: 15, color: MUTED, lineHeight: 1.55 }}>{note}</Text> : null}
            </Column>
            <Column style={{ width: 300, gap: 14, mobile: { width: "100%" } }}>
              <Column style={{ gap: 2 }}>
                <Text style={{ ...LABEL }}>{figureLabel}</Text>
                <Text style={{ fontFamily: MONO, fontSize: fitMono(fmt.money(figure), 300, 48), lineHeight: 1.05, fontWeight: 500, letterSpacing: -1.5, color: b.state === "overdue" ? look.bg : INK, mobile: { fontSize: 40 } }}>{fmt.money(figure)}</Text>
                <Text style={{ fontSize: 14, fontWeight: 600, color: b.state === "paid" ? STATE.paid.bg : look.bg === INK ? MUTED : look.bg }}>{b.state === "paid" ? when : `${t.dueDate} ${fmt.date(b.bill.dueDate)} · ${when}`}</Text>
              </Column>
              {cta ? (
                <Button href={b.url} style={{ backgroundColor: look.bg === INK ? accent : look.bg, color: "#FFFFFF", width: "100%" }}>
                  {cta}
                </Button>
              ) : null}
              <Button href={pdfHref} style={{ backgroundColor: "transparent", color: INK, border: { width: 1, style: "solid", color: INK }, width: "100%", hover: { backgroundColor: token("colors.wash") } }}>
                {`PDF · ${t.bill} ${b.reference}`}
              </Button>
            </Column>
          </Row>
        </Column>
      </Section>

      <Section style={{ padding: [24, 32, 0], mobile: { padding: [14, 12, 0] } }}>
        <Grid columns={2} stackOnMobile style={{ gap: 24, rowGap: 14 }}>
          <Column style={{ ...card }}>
            <Heading level={2}>{t.usage}</Heading>
            <Grid columns={3} style={{ gap: 16 }}>
              <Fact label={t.usedThisPeriod} value={fmt.units(b.used)} size={20} mono />
              <Fact label={t.dailyAverage} value={fmt.units(b.used / b.days, 1)} size={20} mono />
              <Fact label={t.sameMonthLastYear} value={b.lastYear ? fmt.units(b.lastYear) : "–"} size={20} mono />
            </Grid>
            <Column hidden={{ mobile: true }}>
              <UsageChart history={history} current={b.bill.id} width={412} height={150} accent={accent} labels={chartLabel} />
            </Column>
            <Column hidden={{ desktop: true }}>
              <UsageChart history={history} current={b.bill.id} width={316} height={130} accent={accent} labels={(x) => fmt.monthShort(x.bill.id).slice(0, 1)} />
            </Column>
            <Row stackOnMobile={false} style={{ gap: 18, alignItems: "center" }}>
              <Column style={{ width: 150 }}>
                <Row stackOnMobile={false} style={{ gap: 8, alignItems: "center" }}>
                  <Column style={{ width: 14, height: 10, backgroundColor: accent }} />
                  <Text style={{ fontSize: 12, color: MUTED }}>{month}</Text>
                </Row>
              </Column>
              <Column>
                <Row stackOnMobile={false} style={{ gap: 8, alignItems: "center" }}>
                  <Column style={{ width: 14, height: 3, backgroundColor: INK }} />
                  <Text style={{ fontSize: 12, color: MUTED }}>{t.lastYearMark}</Text>
                </Row>
              </Column>
            </Row>
            {vsLast !== null ? <Text style={{ fontSize: 14 }}>{`${(Math.abs(vsLast) < 0.005 ? fill(t.sameAs, { month: lastYearMonth }) : fill(t.vsLastYear, { pct: fmt.pct(Math.abs(vsLast)), direction: vsLast < 0 ? t.less : t.more, month: lastYearMonth }))}.`}</Text> : null}
          </Column>

          <Column style={{ ...card }}>
            <Heading level={2}>{t.readings}</Heading>
            <Text style={{ fontSize: 13, color: MUTED }}>{`${a.meter.type} · ${t.meter} ${a.meter.serial}`}</Text>
            {b.registers.map((r) => (
              <Row key={r.code} stackOnMobile={false} style={{ gap: 14, alignItems: "center", padding: [10, 0], border: { bottom: { width: 1, style: "solid", color: token("colors.border") } } }}>
                <Column style={{ gap: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: 600 }}>{r.label}</Text>
                  <Register value={fmt.reading(r.current)} size={20} />
                </Column>
                <Column style={{ width: 130, gap: 2 }}>
                  <Text style={{ fontFamily: MONO, fontSize: 16, fontWeight: 500, textAlign: "right" }}>{fmt.units(r.used)}</Text>
                  <Text style={{ fontSize: 12, color: r.kind === "estimated" ? "#8F5400" : MUTED, fontWeight: r.kind === "estimated" ? 600 : 400, textAlign: "right" }}>{`${fmt.short(r.date)} · ${kinds[r.kind]}`}</Text>
                  <Text style={{ fontSize: 12, color: MUTED, textAlign: "right" }}>{`${t.previous} ${fmt.reading(r.previous)}`}</Text>
                </Column>
              </Row>
            ))}
            {b.estimated ? <Text style={{ fontSize: 13, color: "#8F5400" }}>{t.estimateNote}</Text> : null}
            <Text style={{ fontSize: 13, color: MUTED }}>{`${t.tariff}: ${file.tariff.name}`}</Text>
          </Column>
        </Grid>
      </Section>

      <Section style={{ padding: [24, 32, 0], mobile: { padding: [14, 12, 0] } }}>
        <Column style={{ ...card }}>
          <Heading level={2}>{`${t.charges} · ${fmt.range(b.bill.start, b.bill.end)}`}</Heading>
          <Column hidden={{ mobile: true }}>
            <ChargesTable b={b} fmt={fmt} size={15} />
          </Column>
          <Column hidden={{ desktop: true }}>
            <ChargesTable b={b} fmt={fmt} size={14} detail={false} />
          </Column>
          {b.bill.message ? <Text style={{ fontSize: 14, color: MUTED, lineHeight: 1.55 }}>{b.bill.message}</Text> : null}
        </Column>
      </Section>

      <Section style={{ padding: [24, 32, 0], mobile: { padding: [14, 12, 0] } }}>
        <Grid columns={2} stackOnMobile style={{ gap: 24, rowGap: 14 }}>
          <Column style={{ ...card }}>
            <Heading level={2}>{t.history}</Heading>
            <Table style={{ fontSize: 14 }}>
              <TableRow header>
                {[t.month, t.used, t.billed, t.status].map((h, i) => (
                  <TableCell key={h} style={{ ...LABEL, padding: [0, 0, 8], textAlign: i ? "right" : "left", width: i ? 80 : undefined, border: { bottom: `1px solid ${INK}` } }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
              {recent.map((x) => (
                <TableRow key={x.bill.id}>
                  <TableCell style={{ padding: [7, 0], fontWeight: x === b ? 700 : 400, border: { bottom: hair } }}>{fmt.monthYear(x.bill.id)}</TableCell>
                  <TableCell style={{ padding: [7, 0], fontFamily: MONO, textAlign: "right", border: { bottom: hair } }}>{fmt.units(x.used)}</TableCell>
                  <TableCell style={{ padding: [7, 0], fontFamily: MONO, textAlign: "right", border: { bottom: hair } }}>{fmt.amount(x.charges)}</TableCell>
                  <TableCell style={{ padding: [7, 0], textAlign: "right", fontWeight: 600, color: STATE[x.state].bg, border: { bottom: hair } }}>{stateOf(x)}</TableCell>
                </TableRow>
              ))}
            </Table>
          </Column>
          <Column style={{ ...card }}>
            <Heading level={2}>{t.howToPay}</Heading>
            <Fact label={t.payOnline} value={u.payUrl.replace(/^https:\/\//, "")} size={15} />
            <Fact label={t.payPhone} value={u.phone} size={15} />
            <Fact label={t.account} value={a.payment.detail} size={15} />
            <Fact label={t.reference} value={b.reference} size={15} mono />
            <Divider />
            <Fact label={t.supplyAddress} value={a.supplyAddress.join(", ")} size={14} />
            <Text style={{ fontSize: 13, color: MUTED }}>{fill(t.questions, { phone: u.phone, email: u.email })}</Text>
          </Column>
        </Grid>
      </Section>

      <Section style={{ padding: [24, 32, 40], mobile: { padding: [18, 16, 32] } }}>
        <Text style={{ fontSize: 12, color: MUTED }}>{`${u.legalName}, ${u.address.join(", ")}. ${u.registration}`}</Text>
      </Section>
    </Page>
  );
}
