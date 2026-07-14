# Primera Milla — 10 Propuestas de On-Ramp USDC

> Atacar la debilidad #1 del [battle map](./competitive-battle-map.md): el sender necesita Phantom + USDC + SOL antes del primer Blink.  
> Criterio: **menor fricción posible** para migrante no nativo en crypto.  
> Prioridad Bridge: propuestas **1–4** (implementables en semanas).

---

## Resumen ejecutivo

| # | Propuesta | Fricción | Time-to-fund | Bridge |
|---|-----------|----------|--------------|--------|
| 1 | Blink "Fondear wallet" (MoonPay/Phantom fiat) | Baja | 3–5 min | Sem 2 |
| 2 | LI.FI one-tap (USDC en Coinbase/Base) | Media-baja | 2 min | Sem 2 *(API live)* |
| 3 | Concierge TIA WhatsApp — primer envío guiado | Muy baja percibida | 15 min call | Sem 1–2 |
| 4 | Subsidio $20 USDC beta (Bridge cohort) | Cero | Instant | Sem 2 |
| 5 | Alianza Bitso / exchange LATAM (compra USDC) | Media | 10 min | Q3 |
| 6 | Cash → USDC en retail (OXXO-style partner) | Baja UX | 30 min | Q3+ |
| 7 | Employer / payroll USDC (diaspora) | Cero recurrente | N/A | Q4 |
| 8 | Remesa inversa — familia MX fondea, sender opera | Media | 1 día | Pilot |
| 9 | Latino CU / community org — workshop + fund | Baja confianza | 1 evento | Sem 3–4 |
| 10 | Stripe → Circle → Solana (TIA backend mint) | Baja | 5 min | Post-MVP |

---

## 1. Blink "Fondear mi wallet" (Phantom + MoonPay)

**Flujo:** Landing → botón *"Primera vez? Fondea USDC"* → deep link Phantom `buy` / MoonPay widget → regresa a Sender App → Blink reserva.

**Alianza:** Phantom fiat on-ramp (ya integrado en app) · MoonPay · Coinbase Pay.

**Onboarding copy (español):**
> *Paso 1: Abre Phantom (te lo instalamos en 2 min). Paso 2: Compra $50 USDC con tarjeta. Paso 3: Toca el link de remesa.*

**Por qué gana:** Sender nunca "aprende DeFi" — solo compra dólares digitales como en Cash App.

**Build:** link externo + checklist UI en `SenderApp` · no custodia TIA.

---

## 2. LI.FI "Ya tengo USDC en otra app" (one-tap bridge)

**Flujo:** Sender tiene USDC en Coinbase Wallet / Base / Arbitrum → `GET /api/bridge/quote` *(live)* → UI muestra *"Trae tu USDC a Solana en 1 tap"* → bridge → reserva.

**Alianza:** LI.FI (integrado en repo).

**Onboarding copy:**
> *¿Tienes USDC en Coinbase o otra wallet? No muevas banco — nosotros lo pasamos a Solana por ti.*

**Por qué gana:** Captura senders que **ya** están en crypto pero no en Solana — fricción menor que fiat.

**Build:** Sem 2 — widget mínimo encima de quote API existente (SPEC: UI = Post-MVP unless 3-day box).

---

## 3. Concierge TIA — primer envío en videollamada (Do Things That Don't Scale)

**Flujo:** Beta user agenda 15 min → TIA (humano + bot) guía: instalar Phantom devnet/mainnet → faucet o transfer asistida → primera reserva en screenshare → WhatsApp familia.

**Alianza:** Bridge cohort como concierges · WhatsApp Business.

**Onboarding copy:**
> *Tu primera remesa la hacemos juntos por WhatsApp. 15 minutos. Sin jerga.*

**Por qué gana:** Elimina miedo; construye confianza que WU compra con marca. **YC clásico.**

**Build:** cero código — script + [beta-users-tracker.md](./week-02/beta-users-tracker.md).

---

## 4. Subsidio "First $20 USDC" — Bridge beta fund

**Flujo:** Sender verificado (1 entrevista Laura) → TIA envía $20 USDC + 0.01 SOL a su Phantom → primera remesa real subsidizada.

**Alianza:** Founder wallet devnet/mainnet-beta · Dev3pack marketing budget.

**Onboarding copy:**
> *Primera remesa gratis — te fondeamos la wallet para probar. Tú mandas $10 a tu familia; nosotros pagamos el gas.*

**Por qué gana:** Cero on-ramp friction en pilot; datos > economía del subsidio.

**Build:** script `airdrop-beta-sender.ts` · límite 10 users.

---

## 5. Alianza Bitso (o exchange LATAM) — "Compra USDC aquí"

**Flujo:** Blink pre-step redirige a Bitso / Binance LATAM → compra USDC → withdraw a Phantom Solana → Blink remesa.

**Alianza:** Bitso (MX market leader) · API withdraw Solana.

**Onboarding copy:**
> *Si ya usas Bitso, compra USDC y retira a Phantom — 2 pasos. TIA hace el resto.*

**Por qué gana:** Migrantes LATAM **conocen** Bitso más que Phantom.

**Build:** Q3 — deeplink + landing partner page.

---

## 6. Cash → USDC en retail (OXXO / 7-Eleven partner)

**Flujo:** Sender deposita efectivo USD/MXN en punto retail aliado → recibe USDC en Phantom vía partner (modelo Bitso cash).

**Alianza:** Bitso Cash · PagoFacil · retail chain pilot.

**Onboarding copy:**
> *Deposita en efectivo en [tienda]. Recibe USDC en tu celular. Envía remesa sin banco.*

**Por qué gana:** Paridad con WU ventanilla en **primera milla** — el migrante empieza con cash familiar.

**Build:** Q3+ · legal Yarden primero.

---

## 7. Employer payroll USDC (B2B2C diaspora)

**Flujo:** Empleador (construction, agriculture, hospitality) paga nómina parcial en USDC → wallet pre-instalada MWA → Blink remesa automática vía Keeper.

**Alianza:** staffing agencies · Latino chambers of commerce.

**Onboarding copy (B2B):**
> *Offer instant remittances as an employee benefit — zero WU fees for your team.*

**Por qué gana:** Elimina on-ramp **permanente** — wallet llega fondeada cada quincena.

**Build:** Q4 B2B · keeper recurring.

---

## 8. Remesa inversa — familia en MX fondea wallet del sender

**Flujo:** Familia con CLABE deposita MXN → partner convierte → USDC a wallet sender US → sender dispara Blink (modelo "pull" inicial).

**Alianza:** Fintech MX con SPEI inbound · Etherfuse.

**Onboarding copy:**
> *Tu mamá te manda $50 USDC para empezar — tú después le mandas $500.*

**Por qué gana:** Confianza familiar > KYC app extranjera; útil para primer ciclo.

**Build:** Pilot experimental · regulatory review.

---

## 9. Latino Credit Union / community org — "Remesa TIA night"

**Flujo:** Evento 2h en iglesia/CU → instalan Phantom → fund $10 community pool → envían remesa demo en vivo → familia recibe WhatsApp.

**Alianza:** LULAC chapters · local credit unions · Bridge Dev3pack LATAM network.

**Onboarding copy:**
> *Aprende a mandar remesas sin el 7% — taller gratis este sábado.*

**Por qué gana:** Confianza institucional **local** compite con WU brand; CAC bajo.

**Build:** Sem 3–4 GTM · slide deck + demo kit.

---

## 10. Stripe → Circle CCTP → Solana (TIA custodial hop)

**Flujo:** Sender paga con tarjeta débito US en landing → backend TIA acuña/envía USDC a Phantom via Circle · fee transparente · luego Blink.

**Alianza:** Stripe · Circle · compliance MSB path.

**Onboarding copy:**
> *Paga con tarjeta como en Amazon. TIA convierte a remesa al instante.*

**Por qué gana:** UX idéntica a Remitly — **sin** que user toque crypto UI en primer txn.

**Build:** Post-MVP · mayor carga legal/custodia · mayor impacto en primera milla.

---

## Recomendación Bridge (4 semanas)

```
Sem 1–2:  #3 Concierge + #4 Subsidio beta (tracción inmediata)
Sem 2:    #1 Phantom/MoonPay deep links en Sender App
Sem 2–3:  #2 LI.FI widget mínimo (si cabe en 3-day rule)
Sem 3–4:  #9 Community events + narrar #6/#10 en deck
```

**Métrica éxito primera milla:** % beta users que completan fund → first reserva en **<30 min** desde primer contacto.

---

## Integración SPEC

No agregar #10 al Bridge MVP sin aprobación Yarden. Propuestas 1–4 son compatibles con [SPEC.md](../../SPEC.md) como onboarding UX, no new protocol features.

Ver [competitive-battle-map.md](./competitive-battle-map.md)
