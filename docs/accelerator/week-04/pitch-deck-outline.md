# Pitch Deck Outline — Remesa TIA

> Leopold · 7 jul · 10–12 slides · Screenshots reales obligatorios

## Slide 1 — Title

**Remesa TIA**  
*Remesas US→MX on-chain. Tu familia solo necesita WhatsApp.*

Logo · Bridge Dev3pack · #43 LATAM Dev3pack

## Slide 2 — Problem

- Senders **can't automate** instant, recurring US→MX transfers (TradFi)
- Hidden fees: **up to 7%** of capital per txn
- Slow settlement: **hours/days** waiting + manual runs every payday
- Receiver still needs physical cash-out — broken last-mile too

**Line:** *"Staying stuck costs families 7% and hours. Time to build better."*

## Slide 3 — Solution (Hybrid Routing)

**TIA = capa agéntica de liquidez transfronteriza**

| Contexto | Rail | Experiencia receptor |
|----------|------|----------------------|
| Urbano / baja liquidez tiendita | ATM aliado (retiro sin tarjeta) | WhatsApp + código cajero |
| Rural / comunidad aislada | Tiendita local | WhatsApp + Blink tiendita |

**Diagram:** [hybrid-routing-model.md](../week-02/hybrid-routing-model.md) mermaid

## Slide 4 — Mechanism (demo today)

1. Sender locks USDC in Anchor escrow (0.25% fee)
2. TIA routes + notifies via WhatsApp
3. **Live demo:** tiendita cashout (Blink) — rail B
4. **Narrate:** urban scenario → rail A (ATM) in pilot Q3

**Screenshot:** landing + WhatsApp + Solscan

## Slide 5 — Demo flow

**Screenshot:** Solscan tx + WhatsApp message side by side

## Slide 6 — Why now

- Solana Blinks + stablecoins = instant settlement before physical routing
- Cardless ATM networks in MX (urban rail)
- WhatsApp = zero app for receiver
- AI agents = liquidity-aware routing (TIA)

## Slide 7 — Market

- $60B+ US→MX remittance corridor
- Beachhead: crypto-curious senders, WhatsApp receivers

## Slide 10 — Business model (was slide 8 in 10-slide outline)

**Sender pricing**
- **2.25% all-in** (pilot → Year 1) · ~65% below TradFi ~6–7%
- **0.25% protocol** on-chain (Solscan) · ~2.0% partner rails
- Recurring (Keeper): 1.49–1.75% at volume

**Revenue to TIA**
- Protocol 0.25% → 0.35% at scale
- ATM rev-share ~0.15% effective
- Merchant SaaS $29–99/mo · B2B API 0.10–0.20% GMV

**Example:** $200 send — TradFi ~$14 · TIA $4.50 all-in · treasury $0.50

## Slide 9 — Traction (Bridge)

- 3rd place hackathon MX
- X beta users · Y E2E txs (fill from trackers)
- 3 user interviews → insight quote

## Slide 10 — Competition

| | WU | Remitly | Remesa TIA |
|-|----|---------|------------|
| Fee | 5–8% | ~2% | **2.25% all-in** (0.25% protocol) |
| Receiver UX | Bank/branch | Bank/app | WhatsApp |
| Physical rail | Branch only | Bank | **ATM + tiendita (hybrid)** |
| Routing | Fixed | Fixed | **TIA agent by liquidity + geo** |

## Slide 11 — Team

Founder + roles · Bridge mentors leveraged

## Slide 12 — Roadmap Q3

- 10-user pilot (tiendita rail — live)
- 1 ATM partner CDMX (urban pilot)
- 2 tienditas rural Oaxaca/GDL periurbano
- TIA auto-routing v1 (liquidity signals)
- World ID prod · mainnet eval post-legal

## Slide 13 — Ask

- Bridge completion → intro merchants / legal
- $X pre-seed for pilot (optional)
- **Not** asking press — learning launch only

## Anti-patterns (YC)

- No TAM slide without traction
- No "we're the Uber of remittances"
- Deck built **after** Sem 2–3 data, not before
