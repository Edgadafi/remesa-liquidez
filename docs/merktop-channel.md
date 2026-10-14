# Canal Merktop — guía de integración

Cupo de prueba sobre la API de valor de TIA: **100 llamadas sin pago**, **30 días**, **20 por agente**. Cubre `GET /v1/quote`, `GET /v1/route` y `POST /v1/alert`. Agotado el cupo, vencido el plazo o con credenciales incompletas, la misma URL responde **402** y se cobra por [x402](https://github.com/coinbase/x402) en USDC sobre Stellar ($0.10 quote, $0.25 route, $0.10 alert). No hay otra tarifa ni otro `payTo` durante el trial: el cupo solo salta el cobro cuando la llamada está concedida.

Esta guía es para el equipo de Merktop. La llave del canal **no está aquí** — se entrega por un canal seguro, aparte de este documento.

## 1. Qué necesitan antes de la primera llamada

| Pieza | De dónde sale |
|---|---|
| URL base | Testnet primero (el deploy de `remesa-tia-testnet`, se los pasamos al activar). Producción (`https://remesa-tia-backend.vercel.app`) solo cuando confirmemos el corte. |
| `X-TIA-Channel-Key` | La llave en claro que les entregamos. En el header va **la llave**, no su hash. Guárdenla como secreto (env / secret manager). No la commiteen ni la escriban en logs. |
| `X-TIA-Agent` | La cuenta pública Stellar del agente que llama: `G…`, 56 caracteres, checksum StrKey válido. Una dirección **estable por agente**. Una dirección de contrato (`C…`) no sirve. |

El tope de 20 es por dirección. Rotar direcciones no alarga el trial: el tope del canal (100) sigue aplicando.

## 2. Llamar dentro del cupo

Los dos headers van en cada request. CORS ya permite `X-TIA-Channel-Key` y `X-TIA-Agent`, y expone `X-TIA-Free-Remaining` para leerlo desde un browser.

```bash
BASE="${TIA_API_BASE:?set the testnet base URL}"
KEY="${TIA_CHANNEL_KEY:?}"
AGENT="${TIA_AGENT:?}"   # G…

# Cotización USD/MXN (spread, bid/ask, volumen 24h)
curl -sS -D - "$BASE/v1/quote" \
  -H "X-TIA-Channel-Key: $KEY" \
  -H "X-TIA-Agent: $AGENT"

# Mejor ruta USD→MXN. amount es obligatorio (1–50000 USD).
curl -sS -D - "$BASE/v1/route?amount=100" \
  -H "X-TIA-Channel-Key: $KEY" \
  -H "X-TIA-Agent: $AGENT"

# Alerta de umbral. webhookUrl https público (sin IPs privadas ni metadata).
curl -sS -D - -X POST "$BASE/v1/alert" \
  -H "Content-Type: application/json" \
  -H "X-TIA-Channel-Key: $KEY" \
  -H "X-TIA-Agent: $AGENT" \
  -d '{"webhookUrl":"https://example.com/hook","threshold":18.5,"direction":"below"}'
```

**Llamada concedida:** HTTP 200 (201 en el alta de alerta) **y** el header `X-TIA-Free-Remaining`. Ese número es el mínimo entre lo que le queda al canal y lo que le queda a ese agente, **después** de esta llamada. `0` significa que esta llamada gastó el último lugar (del agente o del canal): la siguiente será de pago.

Cuerpo de `/v1/quote` (200). Los números son ilustrativos; `generatedAt` es el timestamp de la cotización:

```json
{
  "ok": true,
  "apiVersion": "1",
  "pair": "USD/MXN",
  "rate": 18.42,
  "bid": 18.4,
  "ask": 18.44,
  "spread": 0.04,
  "spreadPct": 0.22,
  "volume24hUsd": 1200000,
  "vwap24h": 18.41,
  "high24h": 18.55,
  "low24h": 18.3,
  "source": "bitso",
  "isLive": true,
  "generatedAt": "2026-10-12T23:00:00.000Z"
}
```

`/v1/route` devuelve `options` (3 rutas, cada una con `route`, `mxnOut`, `effectiveRate`, `totalCostUsd`, `etaMinutes`, `assumptions`) y `best`. `POST /v1/alert` devuelve 201 con `alertId`.

## 3. El 402 es uniforme — y puede cobrarse solo

Estas situaciones responden **el mismo 402**, con el mismo cuerpo de pago x402 y **sin** `X-TIA-Free-Remaining`:

- sin llave, o llave incorrecta
- sin `X-TIA-Agent`, o una dirección con checksum inválido
- plazo de 30 días vencido
- cupo del agente (20) o del canal (100) agotado

Es a propósito. Un 400 distinto para "agente inválido" le diría a cualquiera, gratis, si una llave candidata es la buena. El detalle no viaja en la respuesta.

Consecuencia práctica: un cliente que **paga el 402 automáticamente** (por ejemplo `wrapFetchWithPayment` de `@x402/fetch`) va a pagar $0.10–$0.25 por llamada si hay un typo en la dirección, si falta un header, o si el cupo ya se acabó. El trial no se detiene con un error: degrada a cobro.

Durante el trial, dos reglas en el cliente:

1. **No adjunten pago automático**, o pongan el tope de gasto en **$0** (`MAX_PRICE_USDC=0` o el equivalente de su SDK). Un 402 debe ser un error visible, no una transacción.
2. Traten como concedida solo la respuesta que trae `X-TIA-Free-Remaining`. Un 200 sin ese header no es una llamada del cupo.

Cuando decidan seguir pagando, fijen el `payTo` que aparece en el header `payment-required` del 402 como allowlist (no firmen un `payTo` distinto) y suban el tope al precio de la ruta. Los términos del 402 son la fuente de verdad del precio, la red (`stellar:testnet` en el trial, `stellar:pubnet` en producción) y la cuenta que cobra.

## 4. Diagnosticar sin adivinar

`GET /v1/channel/merktop/usage` usa la misma llave y **no consume cupo**. Sin llave o con llave incorrecta responde **401** — esa es la prueba de la llave, no las rutas de datos.

```bash
# Llave ok + saldo del canal
curl -sS "$BASE/v1/channel/merktop/usage" \
  -H "X-TIA-Channel-Key: $KEY"

# Saldo de un agente. Dirección malformada → 400 (aquí sí: la llave ya entró).
curl -sS "$BASE/v1/channel/merktop/usage?agent=$AGENT" \
  -H "X-TIA-Channel-Key: $KEY"

# Bitácora de las llamadas concedidas (fecha, endpoint, agente, sha256 del cuerpo).
curl -sS "$BASE/v1/channel/merktop/usage?report=1" \
  -H "X-TIA-Channel-Key: $KEY"
```

Respuesta (200):

```json
{
  "ok": true,
  "channel": "merktop",
  "expiresAt": "2026-11-11T00:00:00.000Z",
  "expired": false,
  "total": { "limit": 100, "used": 3, "remaining": 97 },
  "perAgentLimit": 20,
  "store": "upstash",
  "agent": { "address": "G…", "limit": 20, "used": 2, "remaining": 18 }
}
```

Con eso se separan los tres casos que el 402 mezcla:

| Síntoma | Qué revisar |
|---|---|
| `usage` → 401 | La llave no es la que está activa en ese deploy. |
| `usage` → 200 y `?agent=` → 400 | La dirección `G…` no pasa StrKey. Corrijan el header; no reintenten en `/v1/quote`. |
| `usage` → 200, `expired: true` o `remaining: 0` | El trial terminó. Lo que sigue es x402. |
| `usage` dice que hay cupo, pero `/v1/quote` da 402 | Falta `X-TIA-Agent` en **esa** llamada, o no es la misma dirección. |

## 5. Qué gasta un lugar del cupo

El lugar se descuenta al conceder la llamada, no al parsear el resultado.

- **200 y 201** consumen un lugar. Es el caso normal.
- **4xx del handler también consumen.** `GET /v1/route` sin `amount`, un `amount` fuera de rango, o un `POST /v1/alert` con body inválido responden 400 **después** de conceder el cupo. Validan localmente antes de llamar: dirección StrKey, `amount` entre 1 y 50000, `threshold` entre 0 y 1000, `direction` `above` o `below`, `webhookUrl` https público.
- **5xx no consume.** Si nosotros fallamos, el incremento se revierte. Pueden reintentar esa llamada.
- Sigue aplicando el rate limit de la API: **30 requests/minuto por IP** en `/v1`, cupo gratis incluido. Excederlo es 429 y no es un problema de la llave.

## 6. Checklist de la primera sesión

1. `usage` sin agente → 200, y anoten `expiresAt`.
2. `usage?agent=$AGENT` → 200 con `remaining: 20` (un 400 aquí es la dirección, no la llave).
3. `GET /v1/quote` con ambos headers → 200 **y** `X-TIA-Free-Remaining`.
4. Confirmen que su cliente, ante un 402, **no firma ni paga** mientras dure el trial.
5. Guarden la llave fuera del repo y fuera de los logs de su agente.
