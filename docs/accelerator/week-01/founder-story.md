# Founder Story — Remesa TIA

> 1-pager para Matute · Founder Market Fit & Storytelling · 17 jun

---

## Hook (30 segundos)

*"En LATAM, enviar $100 a tu familia cuesta $7 y tarda días. Nosotros lo hacimos en 400 milisegundos, con una voz que dice 'tu dinero está listo' — y el receptor ni siquiera necesita una app."*

---

## Origen

Remesa TIA nació en el hackathon Dev3pack México. El equipo vio el mismo patrón una y otra vez: remitentes con USDC en Solana, familiares en México que cobran en efectivo en tienditas, y un intermediario que se queda con el 7%.

**3er lugar en México** nos abrió las puertas a Bridge Dev3pack. Hoy estamos **#43 de 194 proyectos LATAM** — y esta aceleradora es donde convertimos el MVP en producto.

---

## Problema

1. **Sin automatización** — senders no pueden programar remesas recurrentes instantáneas (TradFi).
2. **Hasta 7% de capital** — comisiones ocultas, no verificables.
3. **Horas por txn** — settlement lento + filas + confirmación manual cada quincena.
4. **Last-mile roto** — receptor sin banco; liquidez física impredecible.

Ver [blueprint-remesatia.md](../blueprint-remesatia.md)

---

## Solución: TIA + Solana (modelo híbrido)

TIA no elige entre tiendita o cajero — **enruta al mejor punto de liquidez física**:

| Contexto | Rail | Receptor |
|----------|------|----------|
| Urbano / tiendita sin float | ATM aliado (retiro sin tarjeta) | WhatsApp + código cajero |
| Rural / comunidad aislada | Tiendita local | WhatsApp + Blink comercio |

| Actor | Experiencia |
|-------|-------------|
| **Sender** | Conecta wallet (MWA), bloquea USDC en escrow Anchor |
| **TIA** | Agente de routing + WhatsApp — instrucciones según rail |
| **Receptor** | Mensaje claro: dónde ir, cuánto cobrar, sin app |
| **Comercio / ATM** | Settlement on-chain · reglas públicas |

Todo auditable on-chain. **Capa agéntica de liquidez transfronteriza**, no solo app de remesas.

Ver [hybrid-routing-model.md](../week-02/hybrid-routing-model.md)

---

## Por qué ahora

- **Solana** — fees bajos, finalidad rápida, Actions/Blinks nativos.
- **MWA** — 75% Android en LATAM; wallet nativa sin extensiones.
- **ElevenLabs + WhatsApp** — canal que la familia ya usa.
- **World ID** — verificación sin KYC tradicional (Sem 2).

---

## Tracción

- Programa Anchor desplegado en devnet
- Demo live: [web-coral-pi-66.vercel.app](https://web-coral-pi-66.vercel.app)
- Flujo E2E: reserva → verify → notify TIA → cashout Blink
- 3er lugar hackathon México · Top 43 LATAM Bridge

---

## Visión

Ser la capa de **remesas por precisión** en LATAM: no adivinar up/down, poner el número correcto — y que TIA te avise cuando tu dinero está listo para retirar.

---

## Ask (para networking en Bridge)

- 3 entrevistas con remitentes US→MX esta semana
- 1 comercio piloto en CDMX/Guadalajara para cashout devnet
- Intro a Solene / mentores World ID y GTM
