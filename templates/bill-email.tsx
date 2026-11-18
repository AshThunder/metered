/**
 * Metered: the bill email.
 *
 * One template for the three messages a billing system sends about a bill: "your bill is ready"
 * (due), "we've received your payment" (paid) and "your bill is overdue". The state is worked out
 * from the file, never passed in by hand: the amount, the due date and what to do are above the
 * fold, in the state's own colour; then the reading, this bill's use against the last six bills,
 * the charges and the balance from the last bill.
 *
 * Email-safe by construction: no Svg (the usage bars are boxes), no images (the mark and the meter
 * register are boxes of text), every Row's columns sized for classic Outlook, and a plain-text twin.
 */
import { Button, Column, Divider, Email, Heading, Row, Section, Text } from "@hyper-elements/react";
import { context, type TemplateProps } from "../src/context";
import { Badge, ChargesTable, Fact, LABEL, Letterhead, Register, UsageRows, fitMono } from "../src/parts";
import { MONO, MUTED } from "../src/theme";

export const meta = {
  title: "Metered bill email",
  description: "A utility bill email in its real state (due, paid or overdue): amount and date first, the reading, use against the last six bills, and the charges.",
  root: "Email",
};

export default function BillEmail(props: TemplateProps) {
  const { file, b, fmt, theme, accent, lang, look, badge, when, headline, note, month, figure, figureLabel, history, vsLast } = context(props);
  const { t, fill } = fmt;
  const u = file.utility;
  const a = file.account;
  const service = file.settings.service.toLowerCase();
  const preview = b.state === "paid" ? fill(t.previewPaid, { month, service }) : b.state === "overdue" ? fill(t.previewOverdue, { month, service }) : fill(t.preview, { month, service, used: fmt.units(b.used), date: fmt.date(b.bill.dueDate) });
  const cta = b.state === "paid" ? t.viewReceipt : fill(t.payNow, { amount: fmt.money(b.outstanding) });
  const main = b.registers[0];
  return (
    <Email theme={theme} width={600} lang={lang} title={`${fill(t.yourBill, { service })} · ${month}`} previewText={preview} style={{ gap: 0 }}>
      <Section style={{ padding: [28, 24, 18], mobile: { padding: [20, 16, 14] } }}>
        <Row style={{ alignItems: "center" }}>
          <Column style={{ width: 380 }}>
            <Letterhead letters={u.monogram} accent={accent} name={u.name} sub={`${file.settings.service} · ${t.account} ${a.number}`} size={36} nameSize={16} />
          </Column>
          <Column style={{ width: 172 }}>
            <Row style={{ justifyContent: "end" }}>
              <Column style={{ width: 120 }}>
                <Badge text={badge} background={look.bg} color={look.fg} size={11} />
              </Column>
            </Row>
          </Column>
        </Row>
      </Section>
      <Section style={{ padding: [0, 24], mobile: { padding: [0, 0] } }}>
        <Column style={{ backgroundColor: "#FFFFFF", gap: 0, border: { top: `4px solid ${look.bg}` } }}>
          <Column style={{ padding: [28, 32, 24], gap: 18, mobile: { padding: [22, 18, 18] } }}>
            <Text style={{ fontSize: 15 }}>{fill(t.greeting, { name: a.salutation })}</Text>
            <Heading level={1} style={{ fontSize: 26, mobile: { fontSize: 22 } }}>
              {headline}
            </Heading>
            <Row stackOnMobile={false} style={{ gap: 20 }}>
              <Column style={{ width: 260, gap: 4 }}>
                <Text style={{ ...LABEL }}>{figureLabel}</Text>
                <Text style={{ fontFamily: MONO, fontSize: fitMono(fmt.money(figure), 260, 40), lineHeight: 1.1, fontWeight: 500, letterSpacing: -1, color: b.state === "overdue" ? look.bg : "#121519", mobile: { fontSize: 32 } }}>{fmt.money(figure)}</Text>
              </Column>
              <Column style={{ width: 208, gap: 4 }}>
                <Text style={{ ...LABEL }}>{b.state === "paid" ? t.status : t.dueDate}</Text>
                <Text style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>{b.state === "paid" ? when : fmt.date(b.bill.dueDate)}</Text>
                {b.state !== "paid" ? <Text style={{ fontSize: 13, color: look.bg === "#121519" ? MUTED : look.bg, fontWeight: 600 }}>{when}</Text> : null}
              </Column>
            </Row>
            {note ? (
              <Column style={{ backgroundColor: look.soft, padding: [14, 16] }}>
                <Text style={{ fontSize: 14, lineHeight: 1.5 }}>{note}</Text>
              </Column>
            ) : null}
            <Row stackOnMobile={false}>
              <Column style={{ width: 300 }}>
                <Button href={b.url} style={{ backgroundColor: b.state === "paid" ? "#121519" : look.bg === "#121519" ? accent : look.bg, color: "#FFFFFF" }}>
                  {cta}
                </Button>
              </Column>
              <Column style={{ width: 188 }} />
            </Row>
          </Column>
          <Divider />
          <Column style={{ padding: [22, 32], gap: 16, mobile: { padding: [18, 18] } }}>
            <Heading level={2}>{t.usage}</Heading>
            <Row style={{ gap: 20 }}>
              <Column style={{ width: 160 }}>
                <Fact label={t.usedThisPeriod} value={fmt.units(b.used)} size={20} mono />
              </Column>
              <Column style={{ width: 140 }}>
                <Fact label={t.dailyAverage} value={fmt.units(b.used / b.days, 1)} size={20} mono />
              </Column>
              <Column style={{ width: 148 }}>
                <Fact label={t.sameMonthLastYear} value={b.lastYear ? fmt.units(b.lastYear) : "–"} size={20} mono />
              </Column>
            </Row>
            {vsLast !== null ? <Text style={{ fontSize: 14, color: MUTED }}>{fill(t.vsLastYear, { pct: fmt.pct(Math.abs(vsLast)), direction: vsLast < 0 ? t.less : t.more, month: fmt.month(`${Number(b.bill.id.slice(0, 4)) - 1}${b.bill.id.slice(4)}`) })}.</Text> : null}
            <UsageRows history={history.slice(-6)} current={b.bill.id} fmt={fmt} accent={accent} width={300} size={13} />
            <Column style={{ gap: 8, padding: [6, 0, 0] }}>
              <Text style={{ ...LABEL }}>{`${t.meter} ${a.meter.serial} · ${main.label}`}</Text>
              <Register value={fmt.reading(main.current)} size={18} />
            </Column>
          </Column>
          <Divider />
          <Column style={{ padding: [22, 32, 28], gap: 14, mobile: { padding: [18, 18, 22] } }}>
            <Heading level={2}>{`${t.charges} · ${fmt.range(b.bill.start, b.bill.end)}`}</Heading>
            <ChargesTable b={b} fmt={fmt} size={14} detail={false} />
            {b.bill.message ? <Text style={{ fontSize: 14, color: MUTED, lineHeight: 1.55 }}>{b.bill.message}</Text> : null}
          </Column>
        </Column>
      </Section>
      <Section style={{ padding: [20, 24, 32], mobile: { padding: [18, 16, 28] } }}>
        <Column style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, color: MUTED }}>{fill(t.questions, { phone: u.phone, email: u.email })}</Text>
          <Text style={{ fontSize: 12, color: MUTED }}>{`${u.legalName}, ${u.address.join(", ")}. ${u.registration}`}</Text>
        </Column>
      </Section>
    </Email>
  );
}
