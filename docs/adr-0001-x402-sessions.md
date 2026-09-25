# ADR-0001 — x402-sessions: pago por sesión (deposita una vez, liquida N veces)

**Estado:** spike en testnet aprobado · mainnet **bloqueado** pendiente de decisión
**Fecha:** 16 sep 2026
**Contexto:** Paso 2 del playbook de pagos. Hoy `/premium/*` cobra con el scheme
`exact` de x402 — una tx on-chain por request vía el facilitador OpenZeppelin
(mainnet). El objetivo es que un agente haga **una** aprobación de USDC (ej. $5)
y cada llamada posterior se liquide con `transfer_from`, sin firmar por request.

## Auditoría — qué existe y qué falta (16 sep 2026)

| Pieza | Soporte sesiones | Evidencia |
|---|---|---|
| Repo (`backend/`, `scripts/`) | ❌ ninguno | solo `x402Serve` exact |
| `nirium` 0.11.0 → 0.14.1 | ❌ `X402ServeConfig` sin schemes extra; solo cliente MPP Charge | `dist/index.d.ts` |
| `@x402/stellar` 2.25–2.26 | ❌ exporta solo `ExactStellarScheme` | `dist/esm/index.d.mts` |
| `@x402/core` 2.25 | ⚠️ plumbing genérico (`upfront`/`escrow` flows, `channelId`) sin scheme Stellar | `chunk-RAWLCYSQ.mjs` |
| Facilitador OZ Channels (nuestro, mainnet) | ❌ solo `exact` | skill x402.md; `/supported` |
| **`x402-sessions@0.2.0`** (npm, comunidad) | ✅ cliente + `SessionStellarScheme` server | peers: stellar-sdk `^14\|\|^15`, `@x402/core ^2.8` — compatibles |
| **`x402-session-facilitator`** (referencia) | ✅ `/supported /verify /settle /sessions` + SAC `transfer_from` | Express 4 + sqlite; ~500 LOC |
| `@stellar/mpp` + `mppx` (MPP Session) | ✅ canal de pago off-chain | requiere desplegar contrato de canal + `express@>=5` (backend usa 4) |

**Madurez de `x402-sessions`:** proyecto de un autor, v0.2.0 (abr 2026), 0 stars,
y su facilitador público de testnet (`courteous-emotion-production.up.railway.app`)
responde **502** hoy. El SDK es pequeño (~370 LOC) y legible, pero nada de esto
está listo para custodiar flujo real sin revisión.

## Decisión

1. **Spike en testnet** con `x402-sessions` + facilitador de referencia
   **auto-hosteado** (el público está caído): `scripts/x402-session-smoke.ts`.
   No toca el backend de producción; el path `exact` + OZ sigue intacto.
2. **Mainnet: NO por ahora.** Requiere operar nuestro propio facilitador de
   sesiones (key caliente `spender` con permiso de gasto sobre allowances de
   usuarios) — decisión de custodia/compliance explícita, no un cambio de env.
3. **No se despliega ningún contrato** — en ninguna red. El mecanismo usa el
   SAC de USDC ya desplegado (`approve`/`transfer_from` de SEP-41); la única
   pieza nueva es un servicio HTTP.

## Diseño mínimo (cuando se apruebe mainnet)

**Apertura de sesión** — el cliente firma UNA tx: `approve(user, spender=facilitador,
cap, expiration_ledger)` sobre el SAC de USDC pubnet (`CCW67…MI75`) y registra el
hash en `POST /sessions` del facilitador; recibe `sessionId`. Los fondos **no**
salen de la wallet del usuario — la "custodia" es una allowance con cap y expiry
que el propio SAC hace cumplir on-chain. Defaults propuestos (ajustables por env):
**cap $5 USDC, expiry 1 h** (~720 ledgers de 5 s).

**Consumo por request** — `GET /premium/*` responde 402 con un `accepts` adicional
`scheme: "session"`; el cliente reintenta con `PAYMENT-SIGNATURE: base64({sessionId})`.
El resource server llama `/verify` y `/settle` del facilitador de sesiones; el
settle debita sqlite de forma atómica y ejecuta
`transfer_from(spender, user, payTo, amount)` on-chain. `payTo` queda fijado al
crear la sesión (nuestro `STELLAR_PAY_TO`) — un `sessionId` robado no puede
redirigir fondos a otra cuenta.

**Cliente vs exact actual** — mismo protocolo x402 v2 (headers `payment-required` /
`PAYMENT-SIGNATURE`); solo cambia el contenido del payload (`{sessionId}` en vez de
una tx firmada). Un server puede anunciar ambos schemes en `accepts` y el cliente
elige; los clientes exact existentes no se rompen.

**Fallos:**
- *Saldo/cap insuficiente* — el facilitador rechaza el settle (cap sqlite) y el
  SAC rechaza `transfer_from` si la allowance ya no alcanza. Respuesta 402 de nuevo.
- *Sesión expirada* — `expiration_ledger` la mata on-chain; el facilitador también
  la rechaza por ledger actual. Cliente debe reabrir sesión.
- *Replay / robo de sessionId* — el debit sqlite es atómico (no double-spend) y el
  destino está fijado; el riesgo residual es que un tercero con el `sessionId`
  gaste el cap del usuario **en nuestro API** (denial-of-wallet acotado al cap).
  Mitigación futura: ligar sesión a una firma de cliente por request (session key).
- *Gap sqlite/on-chain* — si el `transfer_from` falla tras el debit (p. ej. el
  usuario revocó la allowance), el contador queda debitado sin cobro; la v1 de la
  referencia lo documenta como known-issue. Para producción: rollback compensatorio
  + store durable (no sqlite local en Vercel — las functions no comparten disco).

## Opciones evaluadas

| Opción | Pros | Contras |
|---|---|---|
| **A. `x402-sessions` + facilitador propio** *(elegida para spike)* | Sin contrato nuevo; encaja en x402 v2 y `@x402/core` ya presente; SDK diminuto y auditable | Proyecto inmaduro; operar key caliente spender; store durable pendiente |
| B. MPP Session (`@stellar/mpp`) | Sin facilitador de terceros; librería oficial Stellar | Desplegar contrato de canal (prohibido sin aprobación); `express@>=5` vs backend 4; commitment keys nuevas |
| C. Esperar soporte upstream (OZ / `@x402/stellar`) | Cero ops nuestras | Sin fecha; OZ hoy solo `exact` |

## Roadmap

1. ✅ Spike testnet (`npm run x402:session-smoke` — ver SPEC.md).
2. Store durable para el facilitador (Postgres/Turso) + rollback compensatorio.
3. Decisión de producto: ¿operamos facilitador de sesiones en mainnet? (custodia
   de spender key, límites `MAX_PER_CALL`, monitoreo). **Bloqueante.**
4. Integración backend detrás de `NIRIUM_X402_SESSIONS_ENABLED` (fail-closed):
   `paymentMiddlewareFromConfig` con `ExactStellarScheme` + `SessionStellarScheme`
   y dos facilitadores — exact sigue en OZ, session en el nuestro.
5. Testnet E2E contra `/premium/fx` real → recién entonces pubnet.
