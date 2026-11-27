# Changelog — Remesa LiquidezIA

## [v1.0.0] — 2026-11-27

### Qué es v1.0.0

Primera release pública de **TIA** (Remesa LiquidezIA): capa de inteligencia para fintechs del corredor EE. UU.–México. TIA compara rutas USD→MXN, entrega cotizaciones verificables y emite recibos firmados anclados en IPFS. **No ejecuta pagos, no custodia fondos de terceros ni sustituye un SPEI.**

### Live en mainnet

#### API x402 pagada en USDC (Stellar `pubnet`)

- **Host:** [https://x402.holatia.app](https://x402.holatia.app)
- **Protocolo:** x402 `exact` sobre Stellar mainnet — pagos automáticos en USDC por llamada (fees de red sponsoreados por el facilitador OpenZeppelin)
- **Endpoints:**
  - `GET /v1/quote` — USD/MXN de Bitso (last, bid, ask, spread, volume 24h, vwap) — **$0.10 USDC**
  - `GET /v1/route?amount=USD` — comparación de rutas con costos publicados por opción (Bitso spot, USDC via Stellar, wire SPEI) — **$0.25 USDC**
  - `POST /v1/alert` — alertas de umbral con webhook (infraestructura de persistencia en desarrollo, no usar aún) — **$0.10 USDC**
  - `GET /health` — discovery de endpoints y precios — **gratis**
- **Replay protection:** 409 Conflict si se reintenta un pago ya confirmado
- **Primera transacción mainnet verificable:** [b5fc310f…5695e0d](https://stellar.expert/explorer/public/tx/b5fc310f086d3e4e170384fec0ccd1485c9b348559a12f61aa1ec9f2b5695e0d)

#### Recibos verificables (IPFS / Nirium Audit Trail)

- **Función `register_receipt`** (Nirium SDK) — cada cotización `/v1/quote` y `/v1/route` genera un recibo firmado (ed25519) anclado en IPFS
- **Endpoint de verificación:** `GET /v1/receipt/:cid` — gratis, sin cobro x402
- **Qué se guarda:** solo cotización, timestamp, requestId — **sin PII, sin hashes de pago, sin anclaje on-chain**
- **Red:** testnet en este release; primer recibo mainnet en infraestructura de despliegue

#### Sitio público

- **URL:** [https://stellar.holatia.app](https://stellar.holatia.app)
- **Funcionalidad:** demo interactiva de comparación de rutas USD→MXN con recibo IPFS en vivo
- **Despliegue:** Vercel, producción

### Sandbox / testnet

#### Integración Etherfuse (sandbox únicamente)

- **Cotización de referencia:** 100 USDC → 1,959.26 MXN
- **Costo total:** 0.17%
- **Estado:** integrado en el modelo de estimación de `/v1/route`, **sandbox únicamente — no ejecuta órdenes reales**

#### Escrow Soroban (Stellar testnet)

- **Contrato:** `contracts/remesa-tia-stellar/` (Rust, soroban-sdk `22.0.0`)
- **Funciones principales:**
  - `settle_with_receipt` — cierre de escrow con verificación de recibo IPFS
  - `open_dispute` — apertura de disputa por el receptor
  - `resolve_dispute` — resolución admin/arbitraje
- **Estado:** PR [#43](https://github.com/Edgadafi/remesa-liquidez/pull/43) pendiente de merge
- **Red:** Stellar testnet — **no usar en mainnet con fondos de terceros** (ver sección Seguridad)

### Documentación

- **Guía para agentes:** [docs/agents/README.md](docs/agents/README.md) — integración x402 desde TypeScript, ejemplo ejecutable en [examples/agent-client/](examples/agent-client/)
- **OpenAPI:** [docs/tia-openapi.yaml](docs/tia-openapi.yaml) — especificación completa del contrato HTTP
- **SECURITY.md:** blindaje por capas del rail x402, fallas conocidas del escrow Soroban mainnet

### Piloto de calibración (30 días, 3 cupos de founder)

- **Meta:** 3 fintechs del corredor EE. UU.–México en un piloto de calibración de 30 días (cierre Q4 2026)
- **Durante el piloto:** condiciones comerciales acordadas con cada fintech
- **Fuera del piloto:** cobro por llamada vía x402
- **Solicitudes:** [https://stellar.holatia.app](https://stellar.holatia.app)

### Seguridad y limitaciones

#### Escrow Soroban (PoC únicamente)

El escrow desplegado en Stellar mainnet (`CBCWBOZBCKJ4FSCMQ2OJUI3UDDNT7QSPURTSAELKESPY6D7DUA22M5MP`, versión `v0_b2`) tiene fallas conocidas reportadas por **KupiaSec**:

- Cualquier comercio registrado podía cobrar una reserva verificada
- El remitente podía marcar como verificada su propia reserva
- El cobro no exigía la firma de quien recibe el efectivo
- No había forma de dar de baja a un comercio
- El identificador de la reserva lo elegía el primero que llegara
- Las entradas persistentes no extendían su TTL

**Este contrato no es actualizable.** El arreglo está en este repositorio (`version()` `v0_c2`) y requiere un despliegue nuevo. **No usar `CBCWBOZBCKJ4FSCMQ2OJUI3UDDNT7QSPURTSAELKESPY6D7DUA22M5MP` con fondos de terceros.**

Crédito del reporte: KupiaSec.

#### TIA no custodia fondos

TIA es un prototipo de inteligencia y trazabilidad. **No ejecuta remesas, no custodia fondos de terceros ni sustituye un SPEI.** Cero clientes de pago en este release.

### Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js 24 · Express · Vercel Functions |
| Contrato Stellar | Rust · soroban-sdk `22.0.0` |
| Frontend | HTML/CSS/JS · Vercel |
| Pagos x402 | @x402/stellar `2.28.0` · facilitador OpenZeppelin |
| Recibos | Nirium SDK `0.16.0` · IPFS (Pinata gateway) |
| FX de referencia | Bitso API (libro `usd_mxn`) |
| Red | Stellar mainnet (`pubnet`) para x402 · testnet para escrow |

### Créditos

- **Ship It (hackathon final BAF Builders Elite × Stellar)** — entregable de esta release
- **KupiaSec** — auditoría del escrow Soroban, reporte de fallas conocidas

---

## Próximos pasos post-v1.0.0 (roadmap fuera de scope de esta release)

- Merge de PR [#43](https://github.com/Edgadafi/remesa-liquidez/pull/43) (escrow Soroban con arreglos)
- Primer recibo anclado en mainnet Nirium
- Etherfuse sandbox → piloto real (si se cierra un slot de founder)
- Infraestructura de persistencia para `POST /v1/alert`

---

**Fecha de publicación:** 27 de noviembre de 2026  
**Autor:** Edgadafi (Edgar)  
**Licencia:** [MIT](LICENSE)
