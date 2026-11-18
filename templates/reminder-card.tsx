/**
 * Metered: the reminder card, 1200 by 630.
 *
 * The picture a billing system sends where an email isn't read: a WhatsApp or SMS message, a push
 * notification, an in-app banner, a chat with a support bot. One card per state, worked out from
 * the file: "due in 7 days", "paid, thank you", "14 days overdue". The state is the panel's colour
 * and the largest words on it; the amount and the date are next; then where to pay.
 */
import { Canvas, Column, Row, Text } from "@hyper-elements/react";
import { context, type TemplateProps } from "../src/context";
import { Badge, LABEL, Letterhead, UsageChart, fitMono } from "../src/parts";
import { INK, MONO, MUTED } from "../src/theme";

export const meta = {
  title: "Metered reminder card",
  description: "A 1200 by 630 card for chat, SMS or push, in the bill's state: due soon, paid or overdue, with the amount, the date and where to pay.",
  root: "Canvas",
};

const W = 1200;
const H = 630;

export default function ReminderCard(props: TemplateProps) {
  const { file, b, fmt, theme, accent, lang, look, badge, when, month, figure, figureLabel, history } = context(props);
  const { t, fill } = fmt;
  const u = file.utility;
  const big = b.state === "paid" ? t.paidThanks : when;
  const panel = W - 700;
  return (
    <Canvas theme={theme} width={W} height={H} lang={lang} title={`${badge} · ${u.name} · ${month}`} style={{ padding: 0, fontFamily: "Inter" }}>
      <Row style={{ width: W, height: H, alignItems: "stretch" }}>
        <Column style={{ width: 700, height: H, backgroundColor: "#FFFFFF", padding: [56, 60], justifyContent: "space-between" }}>
          <Letterhead letters={u.monogram} accent={accent} name={u.name} sub={`${file.settings.service} · ${t.account} ${file.account.number}`} size={56} nameSize={26} width={580} />
          <Column style={{ gap: 10 }}>
            <Text style={{ ...LABEL, fontSize: 20, letterSpacing: 2 }}>{`${fill(t.yourBill, { service: file.settings.service.toLowerCase() })} · ${month}`}</Text>
            <Text style={{ fontFamily: MONO, fontSize: fitMono(fmt.money(figure), 580, 112), lineHeight: 1, letterSpacing: -3, fontWeight: 500, color: b.state === "overdue" ? look.bg : INK }}>{fmt.money(figure)}</Text>
            <Text style={{ fontSize: 24, color: MUTED }}>{b.state === "paid" ? figureLabel : `${t.dueDate} ${fmt.date(b.bill.dueDate)}`}</Text>
          </Column>
          <Row style={{ gap: 28, alignItems: "end" }}>
            <Column style={{ gap: 6 }}>
              <Text style={{ ...LABEL, fontSize: 15 }}>{b.state === "paid" ? t.reference : t.payOnline}</Text>
              <Text style={{ fontSize: 22, fontWeight: b.state === "paid" ? 500 : 600, fontFamily: b.state === "paid" ? MONO : undefined }}>{b.state === "paid" ? b.reference : u.website}</Text>
            </Column>
            <Column style={{ width: 230, gap: 6 }}>
              <Text style={{ ...LABEL, fontSize: 15, textAlign: "right" }}>{t.usedThisPeriod}</Text>
              <Text style={{ fontFamily: MONO, fontSize: 22, fontWeight: 500, textAlign: "right" }}>{fmt.units(b.used)}</Text>
            </Column>
          </Row>
        </Column>
        <Column style={{ width: panel, height: H, backgroundColor: look.bg, padding: [56, 52], justifyContent: "space-between" }}>
          <Row style={{ justifyContent: "end" }}>
            <Column style={{ width: 210 }}>
              <Badge text={badge} background="#FFFFFF" color={look.bg} size={20} />
            </Column>
          </Row>
          <Text style={{ fontSize: 64, lineHeight: 1.05, fontWeight: 700, letterSpacing: -1.5, color: look.fg }}>{big}</Text>
          <UsageChart history={history} current={b.bill.id} width={panel - 104} height={120} accent="#FFFFFF" muted="rgba(255,255,255,0.35)" tick={null} base="#FFFFFF" />
        </Column>
      </Row>
    </Canvas>
  );
}
