/**
 * Generates pitch-deck-tia-dev3pack.pptx from Brand Kit tokens.
 * Run: node docs/accelerator/week-04/generate-pitch-pptx.mjs
 */
import PptxGenJS from "pptxgenjs";
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "pitch-deck-tia-dev3pack.pptx");

const C = {
  forest: "0F2318",
  institution: "1A4A2E",
  cream: "F5F0E8",
  mutedGreen: "7AAE8A",
  calor: "C9A84C",
  grove: "2A6A3E",
};

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "TIA / Remesa Liquidez";
pptx.title = "TIA — Pitch Deck (Dev3pack)";
pptx.subject = "Bridge Dev3pack · July 2026";

function slideBase(slide, slideNum) {
  slide.background = { color: C.forest };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.08,
    h: "100%",
    fill: { color: C.calor },
  });
  slide.addText(String(slideNum).padStart(2, "0"), {
    x: 9.1,
    y: 5.0,
    w: 0.5,
    h: 0.3,
    fontFace: "Arial",
    fontSize: 10,
    color: C.mutedGreen,
    align: "right",
  });
}

function addHeadline(slide, text, y = 0.55) {
  slide.addText(text, {
    x: 0.55,
    y,
    w: 8.8,
    h: 0.9,
    fontFace: "Georgia",
    fontSize: 28,
    bold: true,
    color: C.cream,
    valign: "top",
  });
}

function addSub(slide, text, y = 1.35) {
  slide.addText(text, {
    x: 0.55,
    y,
    w: 8.8,
    h: 0.45,
    fontFace: "Arial",
    fontSize: 14,
    color: C.mutedGreen,
  });
}

function addBullets(slide, items, y = 1.95) {
  const rows = items.map((row) => {
    if (typeof row === "string") {
      return { text: row, options: { bullet: true, color: C.mutedGreen, fontSize: 13 } };
    }
    const [label, value] = row;
    return {
      text: [
        { text: `${label}: `, options: { bold: true, color: C.cream, fontSize: 13 } },
        { text: value, options: { color: C.mutedGreen, fontSize: 13 } },
      ],
      options: { bullet: true },
    };
  });
  slide.addText(rows, {
    x: 0.55,
    y,
    w: 8.8,
    h: 3.5,
    fontFace: "Arial",
    valign: "top",
    paraSpaceAfter: 8,
  });
}

function addTable(slide, headers, rows, y = 1.85) {
  const data = [
    headers.map((h) => ({
      text: h,
      options: { bold: true, color: C.cream, fill: { color: C.institution }, fontSize: 11 },
    })),
    ...rows.map((row) =>
      row.map((cell, i) => ({
        text: cell,
        options: {
          color: i === 0 ? C.cream : C.mutedGreen,
          fill: { color: C.forest },
          fontSize: 11,
          bold: i === 0,
        },
      }))
    ),
  ];
  slide.addTable(data, {
    x: 0.55,
    y,
    w: 8.8,
    colW: [2.8, 2.5, 3.5],
    border: { type: "solid", color: C.grove, pt: 0.5 },
    fontFace: "Arial",
  });
}

function addFooter(slide, text) {
  slide.addText(text, {
    x: 0.55,
    y: 5.15,
    w: 8.8,
    h: 0.25,
    fontFace: "Arial",
    fontSize: 9,
    color: C.mutedGreen,
    italic: true,
  });
}

function addPills(slide, labels, y = 4.85) {
  let x = 0.55;
  labels.forEach((label) => {
    const w = 0.15 + label.length * 0.09;
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w,
      h: 0.28,
      fill: { color: C.institution },
      line: { color: C.grove, width: 0.5 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w: 0.04,
      h: 0.28,
      fill: { color: C.calor },
    });
    slide.addText(label, {
      x: x + 0.12,
      y: y + 0.04,
      w: w - 0.15,
      h: 0.2,
      fontFace: "Arial",
      fontSize: 10,
      color: C.cream,
    });
    x += w + 0.15;
  });
}

// Slide 1 — Cover
{
  const s = pptx.addSlide();
  slideBase(s, 1);
  s.addText("TIA", {
    x: 0.55,
    y: 1.6,
    w: 8,
    h: 1.2,
    fontFace: "Georgia",
    fontSize: 72,
    bold: true,
    color: C.cream,
  });
  s.addText("Send dollars. Cash out at your corner store.", {
    x: 0.55,
    y: 2.85,
    w: 8.5,
    h: 0.7,
    fontFace: "Georgia",
    fontSize: 26,
    bold: true,
    color: C.cream,
  });
  s.addShape(pptx.ShapeType.rect, {
    x: 0.55,
    y: 3.65,
    w: 2.2,
    h: 0.06,
    fill: { color: C.calor },
  });
  addSub(s, "Agentic US→MX remittances · WhatsApp for family · 2.25% all-in · 0.25% on-chain", 3.85);
  addPills(s, ["WhatsApp", "Solana", "Bridge Dev3pack"], 4.75);
}

// Slide 2 — Problem
{
  const s = pptx.addSlide();
  slideBase(s, 2);
  addHeadline(s, "Staying stuck costs families 7% and hours — every month.");
  addSub(s, "Senders to Mexico cannot automate instant, recurring transfers.");
  addTable(
    s,
    ["Pain", "Cost"],
    [
      ["TradFi friction", "Hidden fees up to 7% of capital"],
      ["Slow settlement", "Hours waiting per transaction"],
      ["No recurrence", "Manual run every payday"],
      ["Receiver excluded", "No bank, no app — needs cash"],
    ]
  );
}

// Slide 3 — Proof
{
  const s = pptx.addSlide();
  slideBase(s, 3);
  addHeadline(s, "The world already documents this pain.");
  addTable(
    s,
    ["Evidence", "Source"],
    [
      ["US→MX remittance corridor", "~$60B+/year — World Bank / BBB"],
      ["Average remittance fee LATAM", "~6% — Remittance Prices Worldwide"],
      ["Underbanked adults Mexico", "~40% without full banking (validate)"],
      ["Customer story", '"I send $500 every two weeks — $35 disappears and my mom waits three days."'],
    ]
  );
  addFooter(s, "Screenshot: WU ~7% vs TIA 2.25% all-in ($4.50 on $200) · 0.25% on Solscan");
}

// Slide 4 — Solution
{
  const s = pptx.addSlide();
  slideBase(s, 4);
  addHeadline(s, "On-chain settlement → physical cash-out via WhatsApp.");
  addTable(
    s,
    ["Outcome", "Mechanism"],
    [
      ["Instant send + notify", "USDC escrow → TIA agent → WhatsApp"],
      ["Cash in hand", "Hybrid rail: ATM (urban) / tiendita (rural)"],
      ["No app for receiver", "Native WhatsApp only"],
    ]
  );
  addFooter(s, "Visual: hybrid-routing diagram · Demo: WhatsApp + Solscan side-by-side");
}

// Slide 5 — Opportunity
{
  const s = pptx.addSlide();
  slideBase(s, 5);
  addHeadline(s, "$60B corridor — beachhead: crypto-curious senders + WhatsApp receivers.");
  addTable(
    s,
    ["Layer", "Number", "Source"],
    [
      ["TAM", "US→MX remittances ~$60B/yr", "World Bank"],
      ["SAM", "Diaspora senders $50–500/mo digitally", "Bridge interviews"],
      ["Beachhead", "10 pilot users → 1 CDMX merchant + 1 ATM", "Q3 2026 plan"],
    ]
  );
}

// Slide 6 — Built to test
{
  const s = pptx.addSlide();
  slideBase(s, 6);
  addHeadline(s, "Product on devnet — ready to run the experiment.");
  addSub(s, "No production pilots yet — devnet play-money only.");
  addTable(
    s,
    ["What exists", "Status", "Date"],
    [
      ["E2E flow built", "reserve → verify → WhatsApp → cashout", "Devnet · Jul 2026"],
      ["Live demo", "web-coral-pi-66.vercel.app", "Devnet"],
      ["Hackathon MX", "3rd place", "May 2026"],
      ["Bridge LATAM rank", "#43 / 194", "Jun 2026"],
    ]
  );
  addFooter(s, "Screenshot: Sender App + merchant cashout UI (product proof, not user proof)");
}

// Slide 7 — Validation plan
{
  const s = pptx.addSlide();
  slideBase(s, 7);
  addHeadline(s, "How we recruit 10 users in 30 days — not that we already have them.");
  addTable(
    s,
    ["Channel", "How we recruit", "Target"],
    [
      ["Bridge / Dev3pack", "Warm intros — US senders $50–200/mo to MX", "6 senders"],
      ["Laura network", "CDMX receivers — WhatsApp-first, no wallet", "6 receivers"],
      ["Founder onboarding", "15-min screenshare · devnet · joint first tx", "Guided W1–W2"],
      ["1 tiendita CDMX/GDL", "In-person visit · simple pilot agreement", "1 merchant"],
    ]
  );
  addFooter(s, "Segment: crypto-curious sender + family receiver who needs cash");
}

// Slide 8 — Success metrics & learning
{
  const s = pptx.addSlide();
  slideBase(s, 8);
  addHeadline(s, "Clear go/no-go before mainnet.");
  addSub(s, "Success metrics (30-day pilot):");
  addBullets(
    s,
    [
      "Completion rate (reserva → cashout): ≥50%",
      "WhatsApp delivery: ≥90%",
      "NPS receiver: ≥7",
      "Repeat intent (30d): ≥2 users ask to send again",
    ],
    1.75
  );
  addSub(s, "Learning timeline:", 3.05);
  addTable(
    s,
    ["Week", "Users", "What we learn"],
    [
      ["W1", "3 senders", "Can sender finish devnet flow with founder help?"],
      ["W2", "5 · 1 merchant", "Does tiendita cashier trust Blink cashout UX?"],
      ["W3", "8 self-serve", "Where does funnel break without screenshare?"],
      ["W4", "10 · retention", "Will anyone send twice without a push?"],
    ],
    3.35
  );
  addFooter(s, "Go/no-go: ≥5 repeat intent · merchant continues · legal path clear");
}

// Slide 9 — Partners
{
  const s = pptx.addSlide();
  slideBase(s, 9);
  addHeadline(s, "Borrowed credibility — labelled honestly.");
  addTable(
    s,
    ["Partner", "Status", "Function"],
    [
      ["Dev3pack / Bridge", "Live", "GTM, legal, fundraising mentors"],
      ["Solana devnet program", "Live", "Escrow + Blinks"],
      ["WhatsApp (Baileys bot)", "Live", "Receiver notifications"],
      ["ATM partner CDMX", "In discussion", "Urban cash-out rail"],
      ["Tiendita pilot", "In discussion", "Rural cash-out rail"],
      ["Bitso / on-ramp", "Exploring", "First-mile USDC"],
    ]
  );
}

// Slide 10 — Business model
{
  const s = pptx.addSlide();
  slideBase(s, 10);
  addHeadline(s, "2.25% all-in to sender · 0.25% protocol on-chain.");
  addSub(s, "Sender pricing:");
  addTable(
    s,
    ["Layer", "Rate"],
    [
      ["All-in (pilot → Y1)", "2.25% · ~65% below TradFi ~6–7%"],
      ["Protocol (TIA treasury)", "0.25% · auditable on Solscan"],
      ["Partner rails", "~2.0% · on-ramp + ATM/tiendita"],
      ["Recurring (Keeper)", "1.49–1.75% at volume"],
    ],
    1.75
  );
  addSub(s, "Revenue to TIA:", 3.55);
  addTable(
    s,
    ["Stream", "Mechanism"],
    [
      ["Protocol fee", "0.25% → 0.35% at scale (on-chain)"],
      ["ATM rev-share", "~0.15% effective on urban volume"],
      ["Merchant SaaS", "$29–99/mo post-pilot"],
      ["B2B routing API", "0.10–0.20% partner GMV"],
    ],
    3.85
  );
  addFooter(s, "$200 send: TradFi ~$14 · TIA $4.50 all-in · treasury $0.50 · no hidden FX spread");
}

// Slide 11 — Team
{
  const s = pptx.addSlide();
  slideBase(s, 11);
  addHeadline(s, "At pre-seed, team is the product.");
  addTable(
    s,
    ["Name", "Role", "Proof line"],
    [
      ["[Founder]", "CEO / Product", "Built E2E devnet remittance + TIA agent"],
      ["[Co-founder]", "[if applicable]", "Anchor + Solana Actions in production"],
      ["Mentors", "Bridge cohort", "GTM (Leopold), legal (Yarden), ops (Sylvain)"],
    ]
  );
  addPills(s, ["Dev3pack", "Hackathon MX", "Solana"], 4.85);
}

// Slide 12 — Ask
{
  const s = pptx.addSlide();
  slideBase(s, 12);
  addHeadline(s, "The ask — readable without context.");
  addTable(
    s,
    ["Field", "Draft"],
    [
      ["Amount", "$X pre-seed (fill post-Bridge feedback)"],
      ["Instrument", "SAFE / equity"],
      ["Valuation", "$X cap"],
      ["Milestones (12 mo)", "30-day validation · mainnet-beta if go/no-go · hybrid CDMX"],
      ["Contact", "founder@ / @remesatia"],
    ]
  );
  addBullets(
    s,
    [
      "40% engineering (keeper, routing agent, mainnet)",
      "30% pilot ops (merchant + ATM onboarding)",
      "20% legal/compliance MX-US",
      "10% GTM (community events, first-mile)",
    ],
    4.35
  );
}

// Appendix slides A1–A6
const appendix = [
  ["A1", "Competition map", "competitive-battle-map.md"],
  ["A2", "Hybrid routing", "hybrid-routing-model.md"],
  ["A3", "First-mile on-ramp", "first-mile-onramp-proposals.md"],
  ["A4", "Tech architecture", "Anchor escrow · Blinks · TIA backend · devnet program ID"],
  ["A5", "Regulatory posture", "legal-checklist-yarden.md"],
  ["A6", "Roadmap Q3–Q4", "pilot-plan-10-users.md"],
];

appendix.forEach(([id, title, ref], i) => {
  const s = pptx.addSlide();
  slideBase(s, `A${i + 1}`);
  addHeadline(s, `Appendix ${id}: ${title}`);
  addSub(s, ref);
  addBullets(s, ["Off-slide backup — not presented in main 12-slide flow."], 2.2);
});

await pptx.writeFile({ fileName: OUT });
console.log(`Wrote ${OUT}`);
