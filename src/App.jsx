import { useState, useEffect } from "react";

// ── Palette ───────────────────────────────────────────────────────────────────
const COL_A = "#C47F00";
const COL_B = "#0077C2";
const BG    = "#F2F2F5";
const WHITE = "#FFFFFF";
const INK   = "#111111";
const INK2  = "#444444";
const INK3  = "#888888";
const LINE  = "#DDDDDD";
const RED   = "#CC2200";
const GREEN = "#007A3D";
const MONO  = "'Courier New', Courier, monospace";
const SERIF = "Georgia, 'Times New Roman', serif";
const UI    = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif";

// ── Responsive hook ───────────────────────────────────────────────────────────
function useMobile() {
  const [mobile, setMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
}

// ── ATO 2025–26 ───────────────────────────────────────────────────────────────
function itax(inc) {
  if (inc <= 18200)  return 0;
  if (inc <= 45000)  return (inc - 18200) * 0.19;
  if (inc <= 120000) return 5092  + (inc - 45000)  * 0.325;
  if (inc <= 180000) return 29467 + (inc - 120000) * 0.37;
  return 51667 + (inc - 180000) * 0.45;
}
function lito(inc) {
  if (inc <= 37500) return 700;
  if (inc <= 45000) return 700  - (inc - 37500) * 0.05;
  if (inc <= 66667) return 325  - (inc - 45000) * 0.015;
  return 0;
}
function medicare(inc, on) {
  if (!on) return 0;
  if (inc <= 26000) return 0;
  if (inc <= 32500) return Math.min((inc - 26000) * 0.1, inc * 0.02);
  return inc * 0.02;
}
function marginal(inc) {
  return inc > 180000 ? 45 : inc > 120000 ? 37 : inc > 45000 ? 32.5 : inc > 18200 ? 19 : 0;
}
function calcPay(gross, sac, medOn) {
  const s       = Number(sac) || 0;
  const taxable = Math.max(0, gross - s);
  const gTax    = itax(taxable);
  const l       = lito(taxable);
  const netTax  = Math.max(0, gTax - l);
  const med     = medicare(taxable, medOn);
  const totalDed = netTax + med;
  const netAnn   = taxable - totalDed;
  const taxNoSac   = Math.max(0, itax(gross) - lito(gross)) + medicare(gross, medOn);
  const taxSaving  = taxNoSac - totalDed;
  return {
    gross, sac: s, taxable, gTax, litoAmt: l, netTax, med, totalDed,
    netAnn, netWeekly: netAnn / 52, netDaily: netAnn / 260,
    effTaxRate: taxable > 0 ? (totalDed / taxable) * 100 : 0,
    margRate: marginal(taxable),
    superAnn: gross * 0.115,
    taxSaving, realSacCost: s - taxSaving,
  };
}
function calcTime(netAnn, contracted, commuteMin, wfhDays, overtime) {
  const onsite        = Math.max(0, 5 - Math.min(Number(wfhDays) || 0, 5));
  const commuteWeekly = ((Number(commuteMin) || 0) * 2 * onsite) / 60;
  const totalWeekly   = (Number(contracted) || 38) + commuteWeekly + (Number(overtime) || 0);
  const annHours      = totalWeekly * 52;
  return { commuteWeekly, totalWeekly, annHours,
    effHourly: annHours > 0 ? netAnn / annHours : 0 };
}
function calcCosts(t, f, c, d, o) {
  const weekly = [t, f, c, d, o].reduce((s, v) => s + (Number(v) || 0), 0);
  return { weekly, annual: weekly * 52 };
}
function derive(job, medOn) {
  const gross = parseFloat(job.salary);
  if (!gross || gross <= 0) return null;
  const pay   = calcPay(gross, job.sac, medOn);
  const time  = calcTime(pay.netAnn, job.hours, job.commute, job.wfh, job.overtime);
  const costs = calcCosts(job.transport, job.food, job.clothing, job.decomp, job.other);
  const trueAnn    = pay.netAnn - costs.annual;
  const trueHourly = time.annHours > 0 ? trueAnn / time.annHours : 0;
  return { ...pay, ...time, costs, trueAnn,
    trueWeekly: trueAnn / 52, trueDaily: trueAnn / 260, trueHourly };
}

// ── Formatters ────────────────────────────────────────────────────────────────
const $$ = (n, d = 0) =>
  `$${Math.abs(n).toLocaleString("en-AU", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const hh = n => `${(Number(n) || 0).toFixed(1)} hrs`;

// ── Shared UI ─────────────────────────────────────────────────────────────────
function SectionHead({ n, title, note }) {
  return (
    <div style={{ margin: "40px 0 20px", paddingBottom: 10, borderBottom: `2px solid ${INK}` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: MONO, fontSize: 12, color: INK3 }}>0{n}</span>
        <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 22, fontWeight: 700, color: INK }}>{title}</span>
        {note && <span style={{ fontSize: 12, color: INK3, fontFamily: UI }}>{note}</span>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, prefix, suffix, note, color, min, max, step = 1, placeholder }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
        textTransform: "uppercase", color: focused ? color : INK3,
        fontFamily: UI, marginBottom: 6, transition: "color 0.15s",
      }}>{label}</label>
      <div style={{ position: "relative" }}>
        {prefix && <span style={{
          position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
          fontSize: 18, fontWeight: 700, color: focused ? color : INK3,
          fontFamily: MONO, pointerEvents: "none", transition: "color 0.15s",
        }}>{prefix}</span>}
        <input
          type="number" value={value} min={min} max={max} step={step}
          placeholder={placeholder || "0"}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%", boxSizing: "border-box", background: WHITE,
            border: `2px solid ${focused ? color : LINE}`, borderRadius: 8,
            padding: `13px ${suffix ? "52px" : "14px"} 13px ${prefix ? "30px" : "14px"}`,
            fontSize: 20, fontWeight: 700, color: INK,
            fontFamily: MONO, outline: "none", transition: "border-color 0.15s",
            WebkitAppearance: "none",
          }}
        />
        {suffix && <span style={{
          position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
          fontSize: 12, color: INK3, fontFamily: UI, pointerEvents: "none",
        }}>{suffix}</span>}
      </div>
      {note && <div style={{ fontSize: 12, color: INK3, fontFamily: UI, marginTop: 5 }}>{note}</div>}
    </div>
  );
}

function NameInput({ value, onChange, color }) {
  return (
    <input
      value={value} onChange={e => onChange(e.target.value)}
      placeholder="Job name…"
      style={{
        background: "transparent", border: "none",
        borderBottom: `3px solid ${color}`, padding: "6px 0",
        width: "100%", boxSizing: "border-box",
        fontSize: 16, fontWeight: 700, color,
        fontFamily: UI, outline: "none", marginBottom: 16,
      }}
    />
  );
}

function SubHead({ name, color }) {
  return (
    <div style={{
      fontSize: 15, fontWeight: 700, color, fontFamily: UI,
      marginBottom: 14, paddingBottom: 8, borderBottom: `2px solid ${color}`,
    }}>{name || "—"}</div>
  );
}

// ── Result card ───────────────────────────────────────────────────────────────
function GroupLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.13em",
      textTransform: "uppercase", color: INK3,
      fontFamily: UI, marginTop: 18, marginBottom: 4,
    }}>{children}</div>
  );
}

function Row({ label, value, indent, bold, valueColor, dimNote }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "7px 0", borderBottom: `1px solid ${LINE}`,
      paddingLeft: indent ? 16 : 0,
    }}>
      <span style={{ fontSize: bold ? 14 : 13, fontFamily: UI, color: bold ? INK : INK2, fontWeight: bold ? 700 : 400 }}>
        {label}
        {dimNote && <span style={{ fontSize: 11, color: INK3, marginLeft: 6 }}>{dimNote}</span>}
      </span>
      <span style={{ fontSize: bold ? 15 : 13, fontWeight: bold ? 800 : 600, fontFamily: MONO, color: valueColor || (bold ? INK : INK2) }}>
        {value}
      </span>
    </div>
  );
}

function ResultCard({ job, data, color, medOn }) {
  if (!data) return (
    <div style={{
      background: WHITE, border: `2px dashed ${LINE}`, borderRadius: 12,
      padding: "40px 20px", display: "flex", alignItems: "center",
      justifyContent: "center", minHeight: 160,
    }}>
      <span style={{ fontSize: 14, color: INK3, fontFamily: UI }}>Enter salary above</span>
    </div>
  );

  const commuteLabel = `Commute (${job.commute || 0}m × 2 × ${5 - Math.min(Number(job.wfh) || 0, 5)}d)`;
  const hasCosts = data.costs.weekly > 0;

  return (
    <div style={{ background: WHITE, border: `2px solid ${color}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ background: color, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: WHITE, fontFamily: UI }}>{job.name || "—"}</span>
        <span style={{ fontSize: 13, color: `${WHITE}CC`, fontFamily: MONO }}>{$$(data.gross)} gross</span>
      </div>
      <div style={{ padding: "14px 16px" }}>

        <GroupLabel>Pre-Tax</GroupLabel>
        <Row label="Gross salary" value={$$(data.gross)} bold />
        {data.sac > 0 && <>
          <Row label="Salary sacrifice" value={`− ${$$(data.sac)}`} indent valueColor={RED} dimNote="pre-tax" />
          <Row label="Taxable income"   value={$$(data.taxable)} indent bold />
          <Row label="Real cost of sacrifice" value={$$(data.realSacCost)} indent valueColor={INK3}
            dimNote={`saves $${Math.round(data.taxSaving).toLocaleString()} tax`} />
        </>}
        <Row label="Super (11.5%)" value={`+ ${$$(data.superAnn)}`} valueColor={GREEN} dimNote="on top" />

        <GroupLabel>Tax Deductions</GroupLabel>
        <Row label="Gross income tax"     value={`− ${$$(data.gTax)}`}    valueColor={RED} />
        <Row label="LITO offset"          value={`+ ${$$(data.litoAmt)}`} valueColor={GREEN} indent dimNote="low income offset" />
        <Row label="Net income tax"       value={`− ${$$(data.netTax)}`}  valueColor={RED} bold />
        {medOn && <Row label="Medicare (2%)"      value={`− ${$$(data.med)}`}     valueColor={RED} />}
        <Row label="Total deductions"     value={`− ${$$(data.totalDed)}`} valueColor={RED} bold />
        <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0 2px", fontSize: 12, fontFamily: UI, color: INK3 }}>
          <span>Effective <strong style={{ color: INK2 }}>{data.effTaxRate.toFixed(1)}%</strong></span>
          <span>Marginal <strong style={{ color: INK2 }}>{data.margRate}%</strong></span>
        </div>

        <GroupLabel>Take Home</GroupLabel>
        <Row label="Annual"  value={$$(data.netAnn)}       bold valueColor={color} />
        <Row label="Weekly"  value={$$(data.netWeekly, 2)} bold valueColor={color} />
        <Row label="Daily"   value={$$(data.netDaily,  2)} bold valueColor={color} />

        <GroupLabel>Time / Week</GroupLabel>
        <Row label="Contracted"       value={hh(job.hours || 38)} />
        <Row label={commuteLabel}      value={hh(data.commuteWeekly)} />
        <Row label="Unpaid overtime"  value={hh(job.overtime || 0)} />
        <Row label="Total / week"     value={hh(data.totalWeekly)} bold />

        {hasCosts && <>
          <GroupLabel>Job Costs / Week</GroupLabel>
          {Number(job.transport) > 0 && <Row label="Transport"          value={`− ${$$(job.transport, 2)}`} valueColor={RED} />}
          {Number(job.food)      > 0 && <Row label="Food & coffee"       value={`− ${$$(job.food, 2)}`}      valueColor={RED} />}
          {Number(job.clothing)  > 0 && <Row label="Clothing / PPE"      value={`− ${$$(job.clothing, 2)}`}  valueColor={RED} />}
          {Number(job.decomp)    > 0 && <Row label="Decompression"       value={`− ${$$(job.decomp, 2)}`}    valueColor={RED} dimNote="YMOYL" />}
          {Number(job.other)     > 0 && <Row label="Other"               value={`− ${$$(job.other, 2)}`}     valueColor={RED} />}
          <Row label="Total costs / wk"   value={`− ${$$(data.costs.weekly, 2)}`} valueColor={RED} bold />
        </>}

        {/* Dual hero rates */}
        <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
          {[
            { label: "True Hourly Rate", sub: "after tax, time & costs", val: $$(data.trueHourly, 2), primary: true },
            { label: "Effective Rate",   sub: "after tax & time only",   val: $$(data.effHourly, 2),  primary: false },
          ].map(({ label, sub, val, primary }) => (
            <div key={label} style={{
              flex: 1, background: primary ? WHITE : BG,
              border: `2px solid ${primary ? color : LINE}`,
              borderRadius: 10, padding: "14px 10px", textAlign: "center",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: INK3, fontFamily: UI, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: primary ? 34 : 26, fontWeight: 700, color: primary ? color : INK3, fontFamily: SERIF, fontStyle: "italic", lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 11, color: INK3, fontFamily: UI, marginTop: 5 }}>{sub}</div>
            </div>
          ))}
        </div>

        {hasCosts && (
          <div style={{ marginTop: 10, padding: "8px 12px", background: BG, borderRadius: 8, fontSize: 12, color: INK2, fontFamily: UI }}>
            Working costs <strong style={{ color: RED, fontFamily: MONO }}>{$$(data.costs.weekly, 0)}/wk</strong> ({$$(data.costs.annual)}/yr) · reduces hourly by <strong style={{ color: RED, fontFamily: MONO }}>{$$(data.effHourly - data.trueHourly, 2)}/hr</strong>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Comparison table ──────────────────────────────────────────────────────────
function CompareTable({ results, jobs, mobile }) {
  const [a, b] = results;
  if (!a || !b) return null;

  const nameA = jobs[0].name || "Job A";
  const nameB = jobs[1].name || "Job B";

  const diffColor = (diff) => {
    if (Math.abs(diff) < 0.005) return INK3;
    return diff > 0 ? COL_B : COL_A;
  };
  const diffLabel = (diff, unit = "") => {
    if (Math.abs(diff) < 0.005) return "—";
    const sign = diff > 0 ? "+" : "−";
    return `${sign}${$$(Math.abs(diff), unit === "/hr" ? 2 : 0)}${unit}`;
  };

  const sections = [
    {
      heading: "Take Home (Post-Tax)",
      rows: [
        { label: "Annual",  a: $$(a.netAnn),       b: $$(b.netAnn),       diff: b.netAnn - a.netAnn },
        { label: "Weekly",  a: $$(a.netWeekly, 2),  b: $$(b.netWeekly, 2),  diff: b.netWeekly - a.netWeekly },
        { label: "Daily",   a: $$(a.netDaily,  2),  b: $$(b.netDaily,  2),  diff: b.netDaily - a.netDaily },
      ],
    },
    {
      heading: "After Job Costs",
      rows: [
        { label: "Job costs / yr", a: $$(a.costs.annual), b: $$(b.costs.annual), diff: a.costs.annual - b.costs.annual, invert: true },
        { label: "True annual",    a: $$(a.trueAnn),      b: $$(b.trueAnn),      diff: b.trueAnn - a.trueAnn },
        { label: "True weekly",    a: $$(a.trueWeekly, 2), b: $$(b.trueWeekly, 2), diff: b.trueWeekly - a.trueWeekly },
      ],
    },
    {
      heading: "Hourly Rate",
      rows: [
        { label: "Effective", a: $$(a.effHourly, 2),  b: $$(b.effHourly, 2),  diff: b.effHourly - a.effHourly,   unit: "/hr" },
        { label: "True",      a: $$(a.trueHourly, 2), b: $$(b.trueHourly, 2), diff: b.trueHourly - a.trueHourly, unit: "/hr" },
      ],
    },
  ];

  const colW = mobile ? "28%" : "26%";
  const labelW = mobile ? "44%" : "22%";

  return (
    <div style={{ background: WHITE, border: `2px solid ${LINE}`, borderRadius: 12, overflow: "hidden", marginTop: 28 }}>

      {/* Column headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `${labelW} ${colW} ${colW} ${colW}`,
        background: INK, padding: "12px 16px", gap: 4,
      }}>
        <div />
        {[{ name: nameA, color: COL_A }, { name: nameB, color: COL_B }, { name: "Difference", color: WHITE }].map(({ name, color }) => (
          <div key={name} style={{ fontSize: mobile ? 11 : 12, fontWeight: 700, color, fontFamily: UI, textAlign: "right" }}>
            {name}
          </div>
        ))}
      </div>

      {sections.map(({ heading, rows }) => (
        <div key={heading}>
          {/* Section subheader */}
          <div style={{
            background: BG, padding: "8px 16px",
            fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
            textTransform: "uppercase", color: INK3, fontFamily: UI,
          }}>{heading}</div>

          {rows.map(({ label, a: va, b: vb, diff, unit = "", invert }) => {
            const d = invert ? -diff : diff;
            return (
              <div key={label} style={{
                display: "grid",
                gridTemplateColumns: `${labelW} ${colW} ${colW} ${colW}`,
                padding: "9px 16px", borderBottom: `1px solid ${LINE}`,
                alignItems: "center", gap: 4,
              }}>
                <span style={{ fontSize: mobile ? 12 : 13, color: INK2, fontFamily: UI }}>{label}</span>
                <span style={{ fontSize: mobile ? 13 : 14, fontWeight: 700, color: COL_A, fontFamily: MONO, textAlign: "right" }}>{va}</span>
                <span style={{ fontSize: mobile ? 13 : 14, fontWeight: 700, color: COL_B, fontFamily: MONO, textAlign: "right" }}>{vb}</span>
                <span style={{ fontSize: mobile ? 13 : 14, fontWeight: 800, color: diffColor(d), fontFamily: MONO, textAlign: "right" }}>
                  {diffLabel(d, unit)}
                </span>
              </div>
            );
          })}
        </div>
      ))}

      {/* Footer note */}
      <div style={{ padding: "10px 16px", fontSize: 11, color: INK3, fontFamily: UI }}>
        Difference = {nameB} minus {nameA} · positive means {nameB} is better
      </div>
    </div>
  );
}

// ── Verdict ───────────────────────────────────────────────────────────────────
function Verdict({ results, jobs }) {
  const [a, b] = results;
  if (!a || !b) return null;

  const trueHourlyDiff = b.trueHourly - a.trueHourly;
  const timeDiff       = b.totalWeekly - a.totalWeekly;
  const wi = trueHourlyDiff >= 0 ? 1 : 0;
  const wc = [COL_A, COL_B][wi];
  const wn = jobs[wi].name || ["Current Job", "New Offer"][wi];
  const sign = n => n > 0 ? "+" : "−";

  return (
    <div style={{ marginTop: 28, background: WHITE, border: `2px solid ${wc}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ background: wc, padding: "14px 18px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: `${WHITE}BB`, fontFamily: UI, marginBottom: 4 }}>
          06 — Verdict
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 22, fontWeight: 700, color: WHITE, lineHeight: 1.2 }}>
          {wn} pays more per hour of your life
        </div>
        <div style={{ fontSize: 13, color: `${WHITE}CC`, fontFamily: UI, marginTop: 4 }}>
          based on true hourly rate — after tax, time and job costs
        </div>
      </div>
      <div style={{ padding: "18px", display: "flex", flexWrap: "wrap", gap: "14px 32px" }}>
        {[
          { label: "True hourly gap",          val: `${sign(trueHourlyDiff)} ${$$(Math.abs(trueHourlyDiff), 2)}/hr`, color: wc },
          { label: "Weekly hrs difference",    val: `${sign(timeDiff)} ${Math.abs(timeDiff).toFixed(1)} hrs`,          color: timeDiff > 0 ? RED : timeDiff < 0 ? GREEN : INK3 },
          { label: `${jobs[0].name || "A"} true rate`, val: $$(a.trueHourly, 2), color: COL_A },
          { label: `${jobs[1].name || "B"} true rate`, val: $$(b.trueHourly, 2), color: COL_B },
        ].map(({ label, val, color }) => (
          <div key={label}>
            <div style={{ fontSize: 12, color: INK3, fontFamily: UI, marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: MONO }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
const INIT = [
  { name: "Current Job", salary: "167000", sac: "13500",
    hours: "38", commute: "60", wfh: "0", overtime: "0",
    transport: "", food: "", clothing: "", decomp: "", other: "" },
  { name: "New Offer",   salary: "",        sac: "",
    hours: "38", commute: "60", wfh: "0",  overtime: "0",
    transport: "", food: "", clothing: "", decomp: "", other: "" },
];

export default function App() {
  const [jobs, setJobs]   = useState(INIT);
  const [medOn, setMedOn] = useState(true);
  const mobile = useMobile();
  const results = jobs.map(j => derive(j, medOn));
  const upd = (i, key) => val => {
    const next = [...jobs]; next[i] = { ...next[i], [key]: val }; setJobs(next);
  };
  const C = [COL_A, COL_B];
  const grid2 = { display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 20 };

  return (
    <div style={{ minHeight: "100vh", background: BG, padding: mobile ? "24px 16px 80px" : "36px 24px 80px", maxWidth: 860, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.14em", color: INK3, textTransform: "uppercase", fontFamily: UI, marginBottom: 12 }}>
          Australia · FY 2025–26 · ATO
        </div>
        <h1 style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: mobile ? 26 : 36, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: INK, margin: "0 0 12px" }}>
          What's the job actually worth?
        </h1>
        <p style={{ fontFamily: UI, fontSize: 14, color: INK2, lineHeight: 1.6, maxWidth: 540, margin: 0 }}>
          Tax, commute, overtime and the hidden cost of working — find the job that pays more per hour of your life.
        </p>
      </div>

      {/* 01 Salary */}
      <SectionHead n={1} title="Salary" note="base package, excl. super" />
      <div style={grid2}>
        {[0, 1].map(i => (
          <div key={i}>
            <NameInput value={jobs[i].name} color={C[i]} onChange={upd(i, "name")} />
            <Field label="Annual salary package" value={jobs[i].salary} onChange={upd(i, "salary")} prefix="$" color={C[i]} placeholder="e.g. 150000" />
            <Field label="Salary sacrifice" value={jobs[i].sac} onChange={upd(i, "sac")} prefix="$" color={C[i]} placeholder="0" note="Reduces taxable income (novated lease, car, etc.)" />
          </div>
        ))}
      </div>

      {/* Medicare toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, padding: "12px 16px", background: WHITE, border: `1px solid ${LINE}`, borderRadius: 8 }}>
        <button onClick={() => setMedOn(v => !v)} style={{ width: 44, height: 24, borderRadius: 12, flexShrink: 0, background: medOn ? COL_A : LINE, border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
          <span style={{ position: "absolute", top: 3, left: medOn ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: WHITE, boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left 0.2s" }} />
        </button>
        <span style={{ fontSize: 13, color: INK2, fontFamily: UI }}>Include Medicare Levy (2%) — standard for most earners</span>
      </div>

      {/* 02 Time */}
      <SectionHead n={2} title="Time Commitment" note="how much of your life does each role take?" />
      <div style={grid2}>
        {[0, 1].map(i => (
          <div key={i}>
            <SubHead name={jobs[i].name} color={C[i]} />
            <Field label="Contracted hrs / week" value={jobs[i].hours}    onChange={upd(i, "hours")}    suffix="hrs"  color={C[i]} min={1} max={80} />
            <Field label="Commute each way"       value={jobs[i].commute}  onChange={upd(i, "commute")}  suffix="min"  color={C[i]} min={0} max={240} />
            <Field label="WFH days / week"        value={jobs[i].wfh}      onChange={upd(i, "wfh")}      suffix="days" color={C[i]} min={0} max={5} />
            <Field label="Unpaid overtime / week" value={jobs[i].overtime} onChange={upd(i, "overtime")} suffix="hrs"  color={C[i]} min={0} max={40} step={0.5} />
          </div>
        ))}
      </div>

      {/* 03 Job Costs */}
      <SectionHead n={3} title="Job Costs" note="weekly — what you spend because of this job" />
      <div style={grid2}>
        {[0, 1].map(i => (
          <div key={i}>
            <SubHead name={jobs[i].name} color={C[i]} />
            <Field label="Transport"              value={jobs[i].transport} onChange={upd(i, "transport")} prefix="$" color={C[i]} placeholder="0" note="Fuel, tolls, parking, PT per week" />
            <Field label="Food & coffee at work"  value={jobs[i].food}      onChange={upd(i, "food")}      prefix="$" color={C[i]} placeholder="0" note="Lunches, coffees you wouldn't buy at home" />
            <Field label="Work clothing & PPE"    value={jobs[i].clothing}  onChange={upd(i, "clothing")}  prefix="$" color={C[i]} placeholder="0" note="Weekly avg — divide annual spend by 52" />
            <Field label="Decompression spending" value={jobs[i].decomp}    onChange={upd(i, "decomp")}    prefix="$" color={C[i]} placeholder="0" note="Takeaway, drinks, retail therapy from work stress" />
            <Field label="Other"                  value={jobs[i].other}     onChange={upd(i, "other")}     prefix="$" color={C[i]} placeholder="0" />
          </div>
        ))}
      </div>

      {/* 04 Results */}
      <SectionHead n={4} title="The Real Picture" />
      <div style={grid2}>
        {[0, 1].map(i => (
          <ResultCard key={i} job={jobs[i]} data={results[i]} color={C[i]} medOn={medOn} />
        ))}
      </div>

      {/* 05 Comparison table */}
      <SectionHead n={5} title="Side by Side" note="direct pay comparison" />
      <CompareTable results={results} jobs={jobs} mobile={mobile} />

      {/* 06 Verdict */}
      <Verdict results={results} jobs={jobs} />

      {/* Footer */}
      <p style={{ marginTop: 36, fontSize: 11, color: INK3, fontFamily: UI, lineHeight: 1.7 }}>
        ATO 2025–26 brackets · LITO applied · Daily = net ÷ 260 · Effective hourly = net ÷ hrs × 52 · True hourly = (net − job costs) ÷ hrs × 52 · Super for reference only · Not financial advice.
      </p>
    </div>
  );
}
