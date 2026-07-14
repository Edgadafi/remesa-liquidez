# Pitch Deck — TIA (Dev3pack · 12-Slide + Validation)

> **Template:** [Dev3pack_S1_Verbal_Identity_Part_3.pdf](./reference/Dev3pack_S1_Verbal_Identity_Part_3.pdf) · Kerna / Leopold · July 2026  
> **Design:** [BRAND-KIT.md](../../brand/BRAND-KIT.md) — Forest `#0F2318` slides · Cream text · Calor accent  
> **Rule:** One message per slide · Investors read **Ask → Team → rest** first  
> **Inflection (Jul 2026):** Pre-pilot — show **validation plan**, not fake traction

## Archivos editables (listos)

| Archivo | Para qué |
|---------|----------|
| **[pitch-deck-tia-dev3pack.pptx](./pitch-deck-tia-dev3pack.pptx)** | Importar en **Google Slides** (Archivo → Importar diapositivas) |
| **[pitch-deck-tia-dev3pack.html](./pitch-deck-tia-dev3pack.html)** | Preview browser + export PDF (Ctrl+P) |
| **[figma-slides/](./figma-slides/)** | 10 SVG 1280×720 → arrastrar a **Figma** |
| **[DECK-IMPORT.md](./DECK-IMPORT.md)** | Guía paso a paso Slides / Figma |

Regenerar tras editar copy: `node docs/accelerator/week-04/generate-pitch-pptx.mjs`

---

## Investor sentence (verbal identity)

> **We help US→MX diaspora senders ($50–500/mo) who lose up to 7% per transfer and wait days while their underbanked family still has no clear path to physical cash, by settling remittances on-chain and routing payout to the nearest ATM or local tiendita with WhatsApp-only instructions for the receiver at 2.25% all-in (0.25% auditable protocol fee + partner rails)—still ~65% below TradFi—so they complete cross-border transfers in minutes with transparent unit economics and a repeatable last-mile rail we validate in a 30-day, 10-user pilot.**

**Fee shorthand for the room:** *2.25% all-in · 0.25% on-chain · vs ~6–7% TradFi*

---

## Conviction equation (Kerna)

**Conviction = Clarity × Credibility × Inevitability × Dream**

---

## Slide 1 — COVER

**Visual:** Logo horizontal dark on Forest · left accent Calor 5px

| Element | Copy |
|---------|------|
| **Name** | TIA |
| **Headline** | Send dollars. Cash out at your corner store. |
| **Sub** | Agentic US→MX remittances · WhatsApp for family · **2.25% all-in** · 0.25% on-chain |

**Why this works:** One sentence, no buzzword soup. Not "AI-powered RWA infrastructure."

**Pills (optional):** WhatsApp · Solana · Bridge Dev3pack

---

## Slide 2 — PROBLEM

**One message:** Senders to Mexico cannot automate instant, recurring transfers.

| Pain | Cost |
|------|------|
| TradFi friction | Hidden fees up to **7%** of capital |
| Slow settlement | **Hours** waiting per transaction |
| No recurrence | Manual run every payday |
| Receiver excluded | No bank, no app — needs **cash** |

**Headline on slide:**
> *Staying stuck costs families 7% and hours — every month.*

**Trap avoided:** Three vague problems → we state **one** purchase driver.

---

## Slide 3 — PROOF OF THE PROBLEM

**One message:** The world already documents this pain.

| Evidence | Source |
|----------|--------|
| US→MX remittance corridor | **~$60B+/year** (World Bank / BBB) |
| Average remittance fee LATAM | **~6%** (World Bank Remittance Prices Worldwide) |
| Underbanked adults Mexico | **~40%** adult population without full banking (hypothesis — validate Laura) |
| Customer story (1 line) | *"I send $500 every two weeks — $35 disappears and my mom waits three days."* |

**Screenshot slot:** Fee comparison WU ~7% vs TIA **2.25% all-in** (0.25% protocol on Solscan)

**Trap avoided:** Stats without sources — cite World Bank on slide footer.

---

## Slide 4 — SOLUTION

**One message:** TIA routes on-chain settlement to physical cash-out — ATM or tiendita — via WhatsApp.

| Outcome | Mechanism (one visual) |
|---------|------------------------|
| Instant send + notify | USDC escrow → TIA agent → WhatsApp |
| Cash in hand | Hybrid rail: **ATM** (urban) / **tiendita** (rural) |
| No app for receiver | Native WhatsApp only |

**Visual:** Diagram from [hybrid-routing-model.md](../week-02/hybrid-routing-model.md)  
**Demo screenshot:** WhatsApp message + Solscan tx side-by-side

**Trap avoided:** Feature dump — no Keeper, Etherfuse, LI.FI on this slide.

---

## Slide 5 — OPPORTUNITY

**One message:** $60B corridor — beachhead is crypto-curious senders + WhatsApp receivers.

| Layer | Number | Source |
|-------|--------|--------|
| TAM | US→MX remittances ~$60B/yr | World Bank |
| SAM | Diaspora senders $50–500/mo digitally | Bridge interviews |
| **Beachhead** | Next: 10 pilot users · 1 CDMX merchant · 1 ATM partner | Q3 2026 |

**Trap avoided:** "We'll capture 1% of a trillion" — we name **one segment first**.

---

## Slide 6 — BUILT TO TEST

**One message:** Product exists on devnet — we're ready to run the experiment, not claiming pilots yet.

| What exists | Status | Date |
|-------------|--------|------|
| E2E flow built | reserve → verify → WhatsApp → cashout | Devnet · Jul 2026 |
| Live demo | web-coral-pi-66.vercel.app | Devnet |
| Hackathon MX | **3rd place** | May 2026 |
| Bridge LATAM rank | **#43 / 194** | Jun 2026 |

**Honest line on slide:** *No production pilots yet — devnet play-money only.*

**Screenshot:** Sender App + merchant cashout UI (product proof, not user proof)

**Trap avoided:** Inflating "beta users contacted" when there are zero completed pilot txs.

---

## Slide 7 — VALIDATION PLAN

**One message:** Here's exactly how we recruit 10 users in 30 days — not that we already have them.

| Channel | How we recruit | Target |
|---------|----------------|--------|
| Bridge / Dev3pack | Warm intros to US senders ($50–200/mo to MX) | 6 senders |
| Laura network | CDMX receivers — WhatsApp-first, no wallet | 6 receivers (overlap) |
| Founder onboarding | 15-min screenshare · devnet faucet · joint first tx | 100% guided W1–W2 |
| 1 tiendita CDMX/GDL | In-person visit · simple pilot agreement | 1 merchant signed |

**Segment:** Crypto-curious sender in US + family receiver who needs **cash**, not an app.

**Ref:** [pilot-plan-10-users.md](./pilot-plan-10-users.md)

**Trap avoided:** "We have 10 users" — say **how we'll get them**.

---

## Slide 8 — SUCCESS METRICS & LEARNING

**One message:** Clear go/no-go before mainnet — what success looks like and what each week teaches us.

### Success metrics (30-day pilot)

| Metric | Success threshold |
|--------|-------------------|
| Completion rate (reserva → cashout) | **≥50%** |
| WhatsApp delivery | **≥90%** |
| NPS receiver | **≥7** |
| Repeat intent (30d) | **≥2 users** ask to send again |

### Learning timeline — first 10 users

| Week | Cumulative | What we learn |
|------|------------|---------------|
| W1 | 3 senders | Can a crypto-curious sender finish devnet flow with founder help? |
| W2 | 5 users · 1 merchant | Does tiendita cashier trust Blink cashout UX? |
| W3 | 8 self-serve | Where does the funnel break without screenshare? |
| W4 | 10 · retention test | Will anyone send twice without a push from us? |

**Go/no-go mainnet prep:** ≥5 users want to repeat · merchant wants to continue · legal path clear (Yarden).

**Trap avoided:** Vanity metrics — tie every number to a **decision**.

---

## Slide 9 — PARTNERS

**One message:** Borrowed credibility — labelled honestly.

| Partner | Status | Function |
|---------|--------|----------|
| Dev3pack / Bridge | **Live** | GTM, legal, fundraising mentors |
| Solana devnet program | **Live** | Escrow + Blinks |
| WhatsApp (Baileys bot) | **Live** | Receiver notifications |
| ATM partner CDMX | **In discussion** | Urban cash-out rail |
| Tiendita pilot | **In discussion** | Rural cash-out rail |
| Bitso / on-ramp | **Exploring** | First-mile USDC ([proposals](../first-mile-onramp-proposals.md)) |

**Trap avoided:** Logo inflation — status labels mandatory.

---

## Slide 10 — BUSINESS MODEL

**One message:** Sender pays one transparent all-in fee — TIA captures protocol layer + partner rev-share at scale.

### Pricing (sender-facing)

| Layer | Rate | Notes |
|-------|------|-------|
| **All-in (pilot → Year 1)** | **2.25%** | Disclosed upfront · ~65% below TradFi ~6–7% |
| **Protocol fee (TIA treasury)** | **0.25%** | On-chain · auditable on Solscan |
| **Partner rails** | ~2.0% | First-mile on-ramp + ATM/tiendita last-mile |
| **Recurring (Keeper, future)** | 1.49–1.75% | Volume discount · retention lock-in |

**Example on $200 send:** TradFi ~$14 fee · TIA **$4.50 all-in** · protocol treasury **$0.50**

### Revenue to TIA

| Revenue | Mechanism |
|---------|-----------|
| **Protocol fee** | 0.25% today → 0.35% at scale (on-chain treasury) |
| **ATM rev-share** | ~0.15% effective on urban volume (pilot terms TBD) |
| **Merchant SaaS** | $29–99/mo float/subscription post-pilot |
| **Future B2B** | Routing API 0.10–0.20% partner GMV |

**Who pays:** Sender only · no hidden FX spread · all-in quoted before send.

**Trap avoided:** Quoting 0.25% as the customer price — always pair **all-in 2.25%** with **protocol 0.25%**.

---

## Slide 11 — TEAM

**One message:** At pre-seed, team is the product.

| Name | Role | Proof line |
|------|------|------------|
| _Founder_ | CEO / Product | Built E2E devnet remittance + TIA agent |
| _Co-founder / tech_ | _if applicable_ | Anchor + Solana Actions in production |
| **Mentors** | Bridge cohort | GTM (Leopold), legal (Yarden), ops (Sylvain) |

**Logos:** Dev3pack · Hackathon MX · Solana

**Trap avoided:** Hobbies — one **proof line** each. LinkedIn-ready.

---

## Slide 12 — ASK

**One message:** This slide must stand alone — investors read it first.

| Field | Draft |
|-------|-------|
| **Amount** | $X pre-seed (fill post-Bridge feedback) |
| **Instrument** | SAFE / equity |
| **Valuation** | $X cap |
| **Milestones (12 mo)** | 1) Run 30-day validation · 2) Mainnet-beta if go/no-go passes · 3) Hybrid ATM+tiendita CDMX |
| **Contact** | founder@ / @remesatia |

**Use of funds (specific):**
- 40% engineering (keeper, routing agent, mainnet)
- 30% pilot ops (merchant + ATM onboarding)
- 20% legal/compliance MX-US
- 10% GTM (community events, first-mile)

**Trap avoided:** "Engineering and growth" vagueness.

---

## Off-slides (appendix 11–15)

| # | Slide | Content ref |
|---|-------|-------------|
| A1 | Competition map | [competitive-battle-map.md](../competitive-battle-map.md) |
| A2 | Hybrid routing | [hybrid-routing-model.md](../week-02/hybrid-routing-model.md) |
| A3 | First-mile on-ramp | [first-mile-onramp-proposals.md](../first-mile-onramp-proposals.md) |
| A4 | Tech architecture | Anchor escrow · Blinks · TIA backend · devnet program ID |
| A5 | Regulatory posture | [legal-checklist-yarden.md](../week-03/legal-checklist-yarden.md) |
| A6 | Roadmap Q3–Q4 | [pilot-plan-10-users.md](./pilot-plan-10-users.md) |
| A7 | Product readiness (legacy traction) | Devnet demo · Hackathon · Bridge rank — dated proof only |

---

## Design spec per slide (Brand Kit)

```
Background:     #0F2318 (forest)
Headline:       Georgia bold, #F5F0E8 (cream)
Accent line:    #C9A84C (calor) — last line of headline or bottom border 6px
Body:           system-ui, #7AAE8A (muted-green)
Pills:          institution bg + calor left-bar
Logo:           horizontal dark variant
Grid:           5% opacity decorative
```

---

## Kerna checklist (before presenting)

- [ ] Warm intro > cold email
- [ ] Practised on tier-3 investors first
- [ ] Each slide = **one message** only
- [ ] Ask slide readable without context
- [ ] Team slide has proof lines, not hobbies
- [ ] Validation slide says **how** we recruit — not "we have pilots"
- [ ] Success metrics + learning timeline on slide 8
- [ ] Product readiness **dated** — no fake user counts
- [ ] Partner logos labelled live / signed / in discussion

---

## Related files

- [Dev3pack_S1_Verbal_Identity_Part_3.extracted.md](./reference/Dev3pack_S1_Verbal_Identity_Part_3.extracted.md) — full text extract
- [blueprint-remesatia.md](../blueprint-remesatia.md)
- [narrative-pyramid.md](../week-02/narrative-pyramid.md)
