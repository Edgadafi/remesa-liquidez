# SECURITY.md — Blindaje por capas del stack x402 / Stellar

> En un protocolo donde el pago es la autenticación, la seguridad es la
> funcionalidad. Este documento mapea el plan de blindaje por capas a lo que
> este repo implementa, qué es responsabilidad de terceros (facilitador
> OpenZeppelin Channels) y qué queda como follow-up explícito.

Arquitectura relevante: el backend TIA (`backend/`) es un **resource server**
x402 — NO opera su propio facilitador. La verificación y el settlement los
hace OpenZeppelin Channels ([channels.openzeppelin.com](https://channels.openzeppelin.com));
`x402Serve()` (SDK nirium → `@x402/express`) verifica y settlea **antes** de
que el handler responda. El agente cliente de ejemplo vive en
`examples/agent-client/`.

---

## Capa 1 — Claves y secretos

| Regla | Estado |
|---|---|
| Ninguna clave privada en el repo | ✅ `.env` en `.gitignore`; `.env.example` solo documenta nombres. `STELLAR_TESTNET_SECRET` es solo local (smoke) — **nunca** en Vercel. |
| `STELLAR_PAY_TO` es una cuenta **receive-only** | ✅ El backend no tiene ninguna `S...` de Stellar: solo conoce la pública que cobra. Comprometer el server NO da acceso a fondos. |
| Claves separadas testnet/mainnet | ✅ Documentado en `SPEC.md` y `docs/nirium-x402-integration.md`: la API key del facilitador es **por red** y el `G...` de testnet no cobra en pubnet. |
| Secretos server-side jamás `NEXT_PUBLIC_` | ✅ Regla en `.env.example` + README. |
| TLS extremo a extremo | ✅ Vercel termina TLS; `PUBLIC_BASE_URL` fuerza `https://` en el `resource.url` del 402 (`middleware/publicOrigin.ts`). |
| Gestor de secretos en producción | ✅ Vercel env vars (Production scope). Si se migra a infra propia: AWS Secrets Manager / Vault. |

**Regla operativa:** si una clave con fondos toca un chat, un log o un
commit, se rota — no se "limpia".

## Capa 2 — Contrato (Soroban `contracts/remesa-tia-stellar`)

Inventario de autorización (verificado en `src/lib.rs`):

| Función | Mueve fondos | Autorización |
|---|---|---|
| `initialize_reservation` | Sí (lock USDC) | `sender.require_auth()` ✅ |
| `mark_verified` | No | `sender.require_auth()` + check `reservation.sender == sender` ✅ |
| `validate_cashout` | Sí (split 99.75/0.25) | `merchant.require_auth()` + whitelist `Merchant(addr)` ✅ |
| `cancel_reservation` | Sí (refund) | `caller.require_auth()` + check sender/receiver ✅ |
| `register_merchant` | No (gatekeeping) | `admin.require_auth()` ✅ |

Además: aritmética con `checked_mul`/`checked_div`/`checked_sub`, flag
`settled` contra doble cashout, y montos `<= 0` rechazados.

**Checklist pre-upgrade (obligatorio antes de cada deploy del contrato):**

1. `cargo test` (tests de fee split, doble settle, merchant no registrado).
2. Análisis estático: [Scout](https://github.com/CoinFabrik/scout-soroban) y
   Soroban Guard sobre el diff del contrato.
3. Cambios grandes (nueva función que mueva fondos, upgrade de storage):
   aplicar al [Soroban Security Audit Bank](https://stellar.org/foundation/audit-bank)
   de la SDF antes de mainnet; verificación formal (Certora Sunbeam) si el
   cambio toca el split de fondos.
4. Re-verificar el inventario de `require_auth()` de arriba y actualizarlo.

## Capa 3 — Facilitador (OpenZeppelin Channels + mitigaciones locales)

El facilitador es un tercero: no controlamos su código. Lo que sí controlamos
es **cuánto daño puede hacer un facilitador (o un cliente) malicioso o con
bugs**, y las mitigaciones locales contra los vectores conocidos (free
shopping, replay):

| Vector | Mitigación en este repo |
|---|---|
| **Free shopping / replay** (misma prueba de pago en N requests concurrentes) | `middleware/paymentGuard.ts`: el sha256 del `X-PAYMENT` se consume **en el primer uso** con `SET NX` atómico (Upstash durable — resiste reinicios; memoria por instancia solo en dev). Requests 2..N → `409 payment_replayed` sin tocar `/verify` ni `/settle`. Defensa secundaria: los sequence numbers de Stellar impiden re-settlear la misma tx firmada. |
| **DoS por payloads de pago gigantes** | Cap de 8 KB al header `X-PAYMENT` y rechazo de headers duplicados, antes de cualquier parseo. |
| **Asset theft vía metadata del cliente** | El vector ERC-6492 (`factoryCalldata`) es de EVM; en Stellar el cliente firma auth entries de un `transfer` SAC concreto. Aun así: el backend no reenvía **ningún** campo del cliente al facilitador — `x402Serve` construye los requirements desde la config del server (`payTo`, precio, red), nunca desde el request. |
| **Blast radius de una clave del facilitador comprometida** | El facilitador patrocina fees pero el `payTo` es nuestro y es receive-only. El watcher de Capa 6 detecta patrones anómalos on-chain. |
| **Binding pago↔request** | El scheme `exact` de `@x402/stellar` liga el pago a los requirements del recurso (asset, monto, `payTo`, red) y el server re-verifica con el facilitador **en el mismo request** que sirve el recurso; el replay guard local impide aplicar la misma prueba a un segundo request. |

## Capa 4 — Servidor de recursos (`backend/`, Express en Vercel)

| Recomendación | Implementación |
|---|---|
| Rate limiting sliding-window | `middleware/rateLimit.ts` — ventana deslizante real por IP (ZSET en Upstash, durable entre invocaciones). `/premium` + `/v1`: `RATE_LIMIT_MAX` (default 30/min). `/api/tia` + `/api/lidia`: `RATE_LIMIT_NOTIFY_MAX` (default 60/min). Fail-open con warning si el store cae (disponibilidad; el pago/Bearer sigue aplicando). |
| Validación server-side de todo parámetro | `zod` en todas las superficies: `TiaNotifySchema` (notify), `BridgeQuoteQuery` (bridge-quote: EVM `0x…`, Solana base58, monto entero acotado, chain enum), `/v1/route` (rango 1–50 000), alertas (`threshold`/`direction`/`webhookUrl` anti-SSRF — ver `services/alerts.ts`). |
| Límites de body | 100 KB global; 12 MB solo en notify (audioBase64 TTS). Errores del body-parser conservan su status (413/400) sin stack. |
| Server Actions | N/A — el proyecto `web/` no usa `"use server"`; sus API routes son Next.js route handlers con validación propia. |
| No filtrar secretos en logs | El error handler loguea `message + stack`, nunca el objeto entero (los errores de fetch/SDK arrastran el request y con él `X-PAYMENT`/`Authorization`). El replay guard loguea solo un prefijo del sha256, jamás el header. `x-powered-by` deshabilitado; `X-Content-Type-Options: nosniff`. |
| Bind paid request ↔ recurso | Replay guard single-use + el scheme exact liga los terms al recurso del 402 (ver Capa 3). |

## Capa 5 — Agente cliente (`examples/agent-client/`)

| Recomendación | Implementación |
|---|---|
| Allowlist de recipients | `EXPECTED_PAY_TO` es **obligatoria** para pagar: una `PaymentPolicy` del SDK filtra cualquier term cuyo `payTo` no esté en la allowlist ANTES de firmar. Un 402 envenenado (DNS/server comprometido) no se paga. |
| Red fijada | El scheme se registra solo para `STELLAR_NETWORK` (default `stellar:pubnet`); terms de otra red nunca matchean. |
| Límites de sesión / gasto | `MAX_PRICE_USDC` (default $0.50 por pago) vía `SpendControls` del SDK — se evalúa antes de cualquier firma. El SDK además trae cap default de $1 si no se configura nada. |
| Prompt injection | Documentado en el README del ejemplo: si un LLM puede escribir `TIA_API_BASE`, `EXPECTED_PAY_TO` o `MAX_PRICE_USDC`, todos los guards caen. Esas vars se fijan fuera del loop del LLM. |
| Un solo request (sin ventana probe/pago) | El cliente firma los terms del mismo 402 que recibe el wrapped fetch — no hay segunda petición donde hacer bait-and-switch. |

## Capa 6 — Monitoreo y respuesta

| Recomendación | Implementación |
|---|---|
| Alertas on-chain | `backend/scripts/payto-watch.ts` (`npm run watch:payto`): vigila el `payTo` vía Horizon y alerta sobre (a) **cualquier salida de fondos** — la cuenta es receive-only, una salida = clave comprometida; (b) entradas > `WATCH_MAX_USDC` (default 5 — las llamadas legítimas son centavos); (c) assets ≠ USDC; (d) frecuencia anómala. Webhook opcional https-only con las mismas reglas anti-SSRF de las alertas FX. |
| Rate limiting también fuera del server | El facilitador OZ aplica el suyo propio; el nuestro corre en el edge del resource server (Capa 4). |
| Audit log tamper-evident | Parcial: las decisiones del agente TIA se atestan on-chain vía Prova (`services/prova.ts`, fail-open en devnet). Follow-up: extender attestation a las decisiones x402 (verify/settle/reject) cuando Prova esté activo en producción. |
| Respuesta a incidentes | Salida de fondos detectada → rotar `X402_FACILITATOR_API_KEY`, apagar `NIRIUM_X402_ENABLED`, y auditar el historial de la cuenta en [stellar.expert](https://stellar.expert). El kill-switch es una env var: no requiere deploy. |

---

## Checklist de blindaje — estado

| # | Prioridad | Item | Estado |
|---|---|---|---|
| 1 | Alta | Clave privada del facilitador en gestor de secretos, nunca en código | ✅ No existe clave de facilitador propia; `X402_FACILITATOR_API_KEY` y todo secreto viven en Vercel env / `.env` local ignorado |
| 2 | Alta | Nonce consumido en la primera verificación, store durable | ✅ `paymentReplayGuard` — SET NX en Upstash al primer uso del `X-PAYMENT` |
| 3 | Alta | Re-verificación justo antes del settlement | ✅ `x402Serve` verifica y settlea con el facilitador dentro del mismo request que sirve el recurso; nada se sirve con una verificación vieja |
| 4 | Alta | Rate limiting sliding-window en server | ✅ `rateLimit.ts` en `/premium`, `/v1`, `/api/tia`, `/api/lidia` (el facilitador OZ mantiene el suyo) |
| 5 | Alta | Validación server-side de todos los parámetros | ✅ zod en notify, bridge-quote, route, alertas |
| 6 | Media | `require_auth()` en toda función del contrato que mueva fondos | ✅ Verificado — inventario en Capa 2 |
| 7 | Media | Auditoría Scout / Soroban Guard antes de cada upgrade | 📋 Checklist pre-upgrade documentado en Capa 2 (correr en cada cambio del contrato) |
| 8 | Media | Allowlist de `payTo` en el agente cliente | ✅ `EXPECTED_PAY_TO` obligatoria + policy del SDK |
| 9 | Media | Excluir headers de pago de logs | ✅ Error handler sin objeto completo; hashes truncados; sin headers en analytics |
| 10 | Media | Watcher on-chain con alertas | ✅ `npm run watch:payto` — operarlo es follow-up de infra (Render worker o cron) |

**Follow-ups explícitos (no incluidos en este blindaje):**

- Ownership challenge del webhook de alertas FX antes de subir cuotas (ya
  trackeado en `SPEC.md`).
- Attestation Prova de decisiones x402 en producción (audit log tamper-evident
  completo).
- Operar `watch:payto` como proceso permanente + alerting (PagerDuty/Telegram).
- Auditoría formal del contrato Soroban antes de volumen real en mainnet
  (Audit Bank de la SDF).

## Reportar una vulnerabilidad

Abre un issue con el título `[security]` **sin detalles del exploit** y un
medio de contacto; o escríbenos por el canal privado del equipo. No publiques
PoCs antes de que confirmemos un fix.
