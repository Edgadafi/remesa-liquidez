/**
 * Generates figma-slides/*.svg (1280×720) with Brand Kit tokens.
 * Run: node docs/accelerator/week-04/generate-figma-slides.mjs
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "figma-slides");
mkdirSync(OUT_DIR, { recursive: true });

const W = 1280;
const H = 720;
const C = {
  forest: "#0F2318",
  institution: "#1A4A2E",
  cream: "#F5F0E8",
  muted: "#7AAE8A",
  calor: "#C9A84C",
  grove: "#2A6A3E",
};

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrap(text, maxChars = 42) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function slideSvg({ id, label, headline, sub, rows, headers, footer, pills, cover }) {
  const padL = 64;
  const padT = 48;
  let y = padT;

  let body = "";

  // Left accent bar
  body += `<rect x="0" y="0" width="6" height="${H}" fill="${C.calor}"/>`;

  // Grid overlay 5%
  body += `<g opacity="0.05">
    <defs><pattern id="grid-${id}" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="${C.grove}" stroke-width="1"/>
    </pattern></defs>
    <rect width="${W}" height="${H}" fill="url(#grid-${id})"/>
  </g>`;

  if (cover) {
    body += `<text x="${padL}" y="200" font-family="Georgia, serif" font-size="96" font-weight="700" fill="${C.cream}">TIA</text>`;
    body += `<rect x="${padL}" y="230" width="88" height="5" fill="${C.calor}"/>`;
    const hl = wrap(headline, 36);
    hl.forEach((ln, i) => {
      body += `<text x="${padL}" y="${290 + i * 38}" font-family="Georgia, serif" font-size="28" font-weight="700" fill="${C.cream}">${esc(ln)}</text>`;
    });
    if (sub) {
      body += `<text x="${padL}" y="400" font-family="system-ui, sans-serif" font-size="16" fill="${C.muted}">${esc(sub)}</text>`;
    }
    if (pills?.length) {
      let px = padL;
      pills.forEach((p) => {
        const pw = 24 + p.length * 9;
        body += `<rect x="${px}" y="460" width="${pw}" height="32" fill="${C.institution}" stroke="${C.grove}" stroke-width="1"/>`;
        body += `<rect x="${px}" y="460" width="4" height="32" fill="${C.calor}"/>`;
        body += `<text x="${px + 14}" y="482" font-family="system-ui" font-size="12" fill="${C.cream}">${esc(p)}</text>`;
        px += pw + 12;
      });
    }
  } else {
    if (label) {
      body += `<text x="${padL}" y="${y + 14}" font-family="system-ui" font-size="11" letter-spacing="3" fill="${C.calor}">${esc(label.toUpperCase())}</text>`;
      y += 36;
    }
    const hl = wrap(headline, 38);
    hl.forEach((ln, i) => {
      body += `<text x="${padL}" y="${y + 28 + i * 36}" font-family="Georgia, serif" font-size="30" font-weight="700" fill="${C.cream}">${esc(ln)}</text>`;
    });
    y += 28 + hl.length * 36 + 8;
    if (sub) {
      body += `<text x="${padL}" y="${y + 16}" font-family="system-ui" font-size="14" font-style="italic" fill="${C.muted}">${esc(sub)}</text>`;
      y += 36;
    }

    if (headers && rows?.length) {
      const colCount = headers.length;
      const tableW = W - padL - 56;
      const colW = tableW / colCount;
      const rowH = 44;
      let ty = y + 20;

      headers.forEach((h, ci) => {
        body += `<rect x="${padL + ci * colW}" y="${ty}" width="${colW}" height="${rowH}" fill="${C.institution}" stroke="${C.grove}" stroke-width="0.5"/>`;
        body += `<text x="${padL + ci * colW + 12}" y="${ty + 28}" font-family="system-ui" font-size="12" font-weight="600" fill="${C.cream}">${esc(h)}</text>`;
      });
      ty += rowH;

      rows.forEach((row) => {
        row.forEach((cell, ci) => {
          const fill = ci === 0 ? C.cream : C.muted;
          const weight = ci === 0 ? "500" : "400";
          body += `<rect x="${padL + ci * colW}" y="${ty}" width="${colW}" height="${rowH}" fill="${C.forest}" stroke="${C.grove}" stroke-width="0.5"/>`;
          const clipped = esc(String(cell)).slice(0, 52);
          body += `<text x="${padL + ci * colW + 12}" y="${ty + 28}" font-family="system-ui" font-size="11" font-weight="${weight}" fill="${fill}">${clipped}</text>`;
        });
        ty += rowH;
      });
      y = ty;
    }

    if (footer) {
      body += `<text x="${padL}" y="${H - 48}" font-family="system-ui" font-size="11" font-style="italic" fill="${C.muted}">${esc(footer)}</text>`;
    }

    if (pills?.length) {
      let px = padL;
      pills.forEach((p) => {
        const pw = 24 + p.length * 9;
        body += `<rect x="${px}" y="${H - 100}" width="${pw}" height="32" fill="${C.institution}" stroke="${C.grove}" stroke-width="1"/>`;
        body += `<rect x="${px}" y="${H - 100}" width="4" height="32" fill="${C.calor}"/>`;
        body += `<text x="${px + 14}" y="${H - 78}" font-family="system-ui" font-size="12" fill="${C.cream}">${esc(p)}</text>`;
        px += pw + 12;
      });
    }
  }

  // Slide number
  body += `<text x="${W - 48}" y="${H - 28}" font-family="system-ui" font-size="11" fill="${C.muted}" text-anchor="end">${esc(id)}</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${C.forest}"/>
  ${body}
</svg>`;
}

const slides = [
  {
    file: "01-cover.svg",
    id: "01 / 10",
    cover: true,
    headline: "Send dollars. Cash out at your corner store.",
    sub: "Agentic US→MX remittances · WhatsApp · 2.25% all-in · 0.25% on-chain",
    pills: ["WhatsApp", "Solana", "Bridge Dev3pack"],
  },
  {
    file: "02-problem.svg",
    id: "02 / 10",
    label: "Problem",
    headline: "Staying stuck costs families 7% and hours — every month.",
    sub: "Senders to Mexico cannot automate instant, recurring transfers.",
    headers: ["Pain", "Cost"],
    rows: [
      ["TradFi friction", "Hidden fees up to 7%"],
      ["Slow settlement", "Hours waiting per transaction"],
      ["No recurrence", "Manual run every payday"],
      ["Receiver excluded", "No bank, no app — needs cash"],
    ],
  },
  {
    file: "03-proof.svg",
    id: "03 / 10",
    label: "Proof",
    headline: "The world already documents this pain.",
    headers: ["Evidence", "Source"],
    rows: [
      ["US→MX corridor", "~$60B+/year — World Bank"],
      ["Avg fee LATAM", "~6% — Remittance Prices"],
      ["Underbanked MX", "~40% (validate Laura)"],
      ["Customer story", "$500/2wk — $35 lost, 3 days wait"],
    ],
    footer: "Fee compare: WU ~7% vs TIA 2.25% all-in on $200",
  },
  {
    file: "04-solution.svg",
    id: "04 / 10",
    label: "Solution",
    headline: "On-chain settlement → physical cash-out via WhatsApp.",
    headers: ["Outcome", "Mechanism"],
    rows: [
      ["Instant send + notify", "USDC escrow → TIA agent → WhatsApp"],
      ["Cash in hand", "ATM (urban) / tiendita (rural)"],
      ["No app for receiver", "Native WhatsApp only"],
    ],
    footer: "Visual: hybrid-routing diagram · WhatsApp + Solscan",
  },
  {
    file: "05-opportunity.svg",
    id: "05 / 10",
    label: "Opportunity",
    headline: "$60B corridor — beachhead: crypto senders + WhatsApp receivers.",
    headers: ["Layer", "Number", "Source"],
    rows: [
      ["TAM", "US→MX ~$60B/yr", "World Bank"],
      ["SAM", "Senders $50–500/mo", "Bridge interviews"],
      ["Beachhead", "10 users → merchant + ATM", "Q3 2026"],
    ],
  },
  {
    file: "06-built-to-test.svg",
    id: "06 / 12",
    label: "Built to test",
    headline: "Product on devnet — ready to run the experiment.",
    sub: "No production pilots yet — devnet play-money only.",
    headers: ["What exists", "Status", "Date"],
    rows: [
      ["E2E flow", "reserve → WhatsApp → cashout", "Jul 2026"],
      ["Live demo", "web-coral-pi-66.vercel.app", "Devnet"],
      ["Hackathon MX", "3rd place", "May 2026"],
      ["Bridge LATAM", "#43 / 194", "Jun 2026"],
    ],
  },
  {
    file: "07-validation-plan.svg",
    id: "07 / 12",
    label: "Validation plan",
    headline: "How we recruit 10 users in 30 days.",
    headers: ["Channel", "How", "Target"],
    rows: [
      ["Bridge / Dev3pack", "Warm intros US senders", "6 senders"],
      ["Laura network", "WhatsApp receivers CDMX", "6 receivers"],
      ["Founder onboarding", "15-min screenshare", "Guided W1–W2"],
      ["1 tiendita", "In-person pilot agreement", "1 merchant"],
    ],
    footer: "Segment: crypto sender + family who needs cash",
  },
  {
    file: "08-success-learning.svg",
    id: "08 / 12",
    label: "Success & learning",
    headline: "Clear go/no-go before mainnet.",
    headers: ["Week", "Target", "What we learn"],
    rows: [
      ["W1", "3 senders", "Devnet flow with help?"],
      ["W2", "5 · 1 merchant", "Tiendita trusts Blink UX?"],
      ["W3", "8 self-serve", "Funnel break without founder?"],
      ["W4", "10 · retention", "Second send without push?"],
    ],
    footer: "Metrics: ≥50% completion · ≥90% WhatsApp · NPS ≥7 · ≥2 repeat",
  },
  {
    file: "09-partners.svg",
    id: "09 / 12",
    label: "Partners",
    headline: "Borrowed credibility — labelled honestly.",
    headers: ["Partner", "Status", "Function"],
    rows: [
      ["Dev3pack / Bridge", "Live", "GTM, legal, mentors"],
      ["Solana devnet", "Live", "Escrow + Blinks"],
      ["WhatsApp bot", "Live", "Receiver notifications"],
      ["ATM CDMX", "In discussion", "Urban cash-out"],
      ["Tiendita pilot", "In discussion", "Rural cash-out"],
      ["Bitso on-ramp", "Exploring", "First-mile USDC"],
    ],
  },
  {
    file: "10-business-model.svg",
    id: "10 / 12",
    label: "Business model",
    headline: "2.25% all-in · 0.25% protocol on-chain.",
    headers: ["Layer", "Rate / mechanism"],
    rows: [
      ["All-in (pilot)", "2.25% · ~65% below TradFi"],
      ["Protocol (TIA)", "0.25% on-chain · Solscan"],
      ["Partner rails", "~2.0% on-ramp + last-mile"],
      ["TIA revenue scale", "0.25% → 0.35% + ATM rev-share"],
    ],
    footer: "$200: TradFi ~$14 vs TIA $4.50 all-in · treasury $0.50",
  },
  {
    file: "11-team.svg",
    id: "11 / 12",
    label: "Team",
    headline: "At pre-seed, team is the product.",
    headers: ["Name", "Role", "Proof line"],
    rows: [
      ["[Founder]", "CEO / Product", "Built E2E devnet + TIA agent"],
      ["[Co-founder]", "[if applicable]", "Anchor + Solana Actions"],
      ["Mentors", "Bridge cohort", "Leopold, Yarden, Sylvain"],
    ],
    pills: ["Dev3pack", "Hackathon MX", "Solana"],
  },
  {
    file: "12-ask.svg",
    id: "12 / 12",
    label: "Ask",
    headline: "The ask — readable without context.",
    headers: ["Field", "Draft"],
    rows: [
      ["Amount", "$X pre-seed"],
      ["Instrument", "SAFE / equity"],
      ["Valuation", "$X cap"],
      ["Milestones", "30-day validation · mainnet-beta · hybrid CDMX"],
      ["Contact", "founder@ / @remesatia"],
    ],
    footer: "Use of funds: 40% eng · 30% ops · 20% legal · 10% GTM",
  },
];

slides.forEach((s) => {
  const path = join(OUT_DIR, s.file);
  writeFileSync(path, slideSvg(s));
  console.log(`Wrote ${path}`);
});

console.log(`Done — ${slides.length} SVG slides in figma-slides/`);
