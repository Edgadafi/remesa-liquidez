# Competitive Battle Map — Remesa TIA

> US → MX · @remesatia · Bridge Dev3pack  
> Incumbents (WU, bancos) · FinTechs (Remitly, Wise) · Status quo · Crypto-native

**Estado honesto:** items marcados *(live)* vs *(roadmap)* vs *(narrative Q3)*.

---

## Landscape

| Actor | Modelo | Fortaleza | Debilidad vs TIA |
|-------|--------|-----------|------------------|
| **Western Union / MoneyGram** | Ventanilla + agentes | Confianza, efectivo everywhere | 7% fee, lento, opaco |
| **Bancos / corresponsales** | SPEI / wire | Regulado, CLABE | Onboarding pesado, horarios |
| **Remitly / Wise** | App + ACH/SWIFT | UX digital, marca | Walled garden, rieles lentos, app obligatoria |
| **Status quo** | Efectivo en mano al viajar | Cero fricción digital | Riesgo, sin recurrencia |
| **Remesa TIA** | Blink + escrow + TIA agent | Headless, composable, on-chain | Primera milla crypto, brand nuevo |

---

## 🟢 DÓNDE GANAS (Your Edge)

### 1. Distribución "Headless" — Solana Blinks *(live)*

No obligas a descargar app de 100MB, 10 pantallas de KYC bancario tradicional, ni crear cuenta en walled garden.

| Incumbent | Remesa TIA |
|-----------|------------|
| App store → signup → link bank | **Link en feed, WhatsApp, Discord, Tweet → Blink ejecutable** |
| Terminal fija (WU) | URL = terminal de remesa |

**Proof:** `GET /api/actions/verify` · `GET /api/actions/cashout` · Dial.to · `/remesa/**`

### 2. Ejecución y liquidación atómica *(partial live / roadmap)*

| Capa | Hoy | Roadmap |
|------|-----|---------|
| Escrow USDC on-chain | ✅ ~400ms devnet | mainnet-beta |
| Cross-chain funding | ✅ LI.FI API quote | UI + execute |
| USDC → MXN fiat rail | — | Etherfuse → SPEI *(Post-MVP)* |

FinTechs **simulan** velocidad; por detrás ACH/SWIFT tarda días. Tú liquidas settlement on-chain en segundos **reales**; fiat last-mile vía SPEI/híbrido es extensión.

### 3. Automatización sin permiso — Keeper *(roadmap Q3)*

Keeper ejecuta pagos recurrentes on-chain **24/7/365** — sin cámaras de compensación L–V 9–5.

**Bridge:** narrar en pitch; MVP = single send. Ver [blueprint-remesatia.md](./blueprint-remesatia.md).

### 4. UX asíncrona vía WhatsApp *(live)*

Receptor no entiende blockchain. Recibe:

> *"Recibiste el equivalente a $1,000 MXN de tu hijo. Retira en [tiendita / cajero]."*

TIA + Blink link en mensaje. Sin app receptor.

### 5. Hybrid last-mile *(narrative + tiendita live)*

**Contra argumento "solo digital→digital":** modelo híbrido enruta ATM (urbano) + tiendita (rural). Ver [hybrid-routing-model.md](./week-02/hybrid-routing-model.md).

Incumbents ganan en OXXO puro **hoy**; TIA ataca con **dos rails** + WhatsApp, no solo SPEI→CLABE.

---

## 🔴 DÓNDE PIERDES (Vulnerabilities)

### 1. Primera milla (Sender on-ramp) — **CRÍTICO**

Blink requiere wallet (Phantom) + USDC + SOL. Para migrante no-crypto = fricción monumental vs ventanilla WU.

**Mitigación:** [first-mile-onramp-proposals.md](./first-mile-onramp-proposals.md) — 10 propuestas.

### 2. Última milla física (cash payouts) — **PARCIAL**

Familia sin CLABE / sin banca: WU/OXXO red densa **hoy**.

**Mitigación:** híbrido tiendita + ATM cardless; piloto comercio + partner ATM Q3. No prometer cobertura nacional en Bridge.

### 3. Confianza institucional (brand) — **MARKETING**

WU = décadas. Tú = founder + MVP devnet.

**Mitigación:** Solscan auditable, Bridge cred, entrevistas Laura, beta social proof, **no press launch** hasta txs reales.

---

## 🔥 UNFAIR ADVANTAGE (No copiable)

### Componibilidad UI en cualquier superficie de internet

> Un banco o Remitly **nunca** convertirá un Tweet, post de foro o canal Discord en terminal de remesas ejecutable. Están atrapados en walled gardens.

**Remesa TIA:** Solana Actions + Blinks = **primitiva de internet**. Infra financiera comprimida en una URL. Incumbent tendría que reconstruir stack + modelo de negocio.

**Pitch line:**
> *"Remitly needs you in their app. We need you to click a link."*

---

## Matriz 2×2 (simplicidad vs cobertura física)

```
                    Alta cobertura efectivo MX
                            ↑
         Western Union ●    |    ● Remesa TIA (target)
                            |      (hybrid + WhatsApp)
    ────────────────────────┼───────────────────────→
    Baja simplicidad        |        Alta simplicidad
    (app/KYC pesado)        |        (headless Blink)
                            |
         Remitly ●          |    ● Wise (digital only)
                            ↓
                    Baja cobertura efectivo rural
```

**Beachhead:** senders crypto-curiosos + familias WhatsApp + 1 comercio/ATM piloto → expandir rails.

---

## Qué decir en Bridge por sesión

| Mentor | Enfatizar | Evitar |
|--------|-----------|--------|
| GTM / Leopold | Unfair advantage Blinks + memory test | "Somos el Uber de remesas" |
| Tochukwu | Primera milla plan (10 propuestas) | Prometer OXXO nacional |
| Yarden | SPEI/Etherfuse = roadmap regulado | Mainnet sin checklist |
| Ivan | Moat = composability + keeper | TAM slide sin traction |

---

## Links

- [blueprint-remesatia.md](./blueprint-remesatia.md)
- [hybrid-routing-model.md](./week-02/hybrid-routing-model.md)
- [first-mile-onramp-proposals.md](./first-mile-onramp-proposals.md)
