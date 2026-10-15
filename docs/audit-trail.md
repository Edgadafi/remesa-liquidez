# Audit trail de TIA (testnet)

Cada respuesta exitosa de `GET /v1/quote`, `GET /v1/route` y `POST /v1/alert` puede anclar en Nirium **solo un hash**. El servidor no manda IP, `X-TIA-Agent`, cuentas de pagadores, `webhookUrl`, `txHash` ni el body. Viene apagado: `AUDIT_ENABLED` tiene que ser `true`.

El nodo de testnet es `https://nirium-agent.fly.dev`. La red la decide ese nodo; TIA no manda un campo `network`. Si `AUDIT_URL` dice `mainnet` y `STELLAR_NETWORK` no es `mainnet`/`pubnet` (o al revés), el anclaje se desactiva.

## Qué se hashea

El header `X-TIA-Audit-Hash` es `sha-256:<hex>` del JSON canónico (llaves ordenadas, sin espacios) de este sobre:

```json
{
  "v": "tia-audit-v1",
  "endpoint": "GET /v1/quote",
  "status": 200,
  "generatedAt": "<body.generatedAt o la hora del servidor>",
  "source": "<body.source, si viene>",
  "network": "stellar:testnet",
  "bodySha256": "<sha256 del body de la respuesta>",
  "mode": "paid"
}
```

`mode` es `free` cuando la llamada salió del cupo Merktop (`res.locals.merktopFree`).

`bodySha256` cubre el body JSON de la respuesta. En quote y route es el body completo (datos de mercado; el `amount` de route queda adentro del hash, no como campo suelto). En `POST /v1/alert` se quita `webhookUrl` antes de hashear. El hash no se puede revertir en la práctica, pero un valor de baja entropía (por ejemplo `amount=100`) sí se puede adivinar: por eso el sobre incluye `generatedAt` y el hash del body completo, con la tasa en vivo, y no campos sueltos.

El POST al nodo es uno por llamada, a `${AUDIT_URL}/api/audit/log`:

```json
{ "hash": "sha-256:<hex>", "tag": "tia-quote", "agent": { "key": "G…", "signature": "<base64>", "id": "tia-api" } }
```

No va `txHash` ni `record`. La firma es ed25519 sobre el texto utf8 `nirium-audit-v1:<hex>`, con `<hex>` en minúsculas y **sin** el prefijo `sha-256:`. `AUDIT_SIGNER_SECRET` es una cuenta nueva, solo para firmar. Si esa cuenta es la misma que `STELLAR_PAY_TO`, la auditoría no arranca.

## Cómo lo verifica un cliente

1. Recalcular `bodySha256` con el body recibido (en alertas, sin `webhookUrl`) y armar el mismo sobre.
2. Comparar `sha-256:` + sha256 del sobre con `X-TIA-Audit-Hash`.
3. `GET /v1/audit/<hash>` (acepta el hex pelado o con prefijo). No se cobra y no gasta cupo Merktop. Responde `cid`, `gatewayUrl`, `anchoredAt`, `attestedBy` y `signatureStatement` (`nirium-audit-v1:<hex>`). Si todavía no está el CID, `404` con `status: "pending"` o `"unknown"`.
4. Bajar el documento de `gatewayUrl` (si no vino, `https://gateway.pinata.cloud/ipfs/<cid>`).
5. Comprobar `content_sha256 === <hex>` y que el documento no traiga `record` ni `txHash`.
6. Validar la firma:

```ts
Keypair.fromPublicKey(doc.agent.key).verify(
  Buffer.from("nirium-audit-v1:" + hex),
  Buffer.from(doc.agent.signature, "base64")
);
```

`npx nirium-cli verify <cid>` (nirium-cli ≤ 2.0.1) marca MISMATCH e INVALID en modo solo hash ([nirium#139](https://github.com/nirium-protocol/nirium/issues/139)). No lo uses como prueba hasta que se publique ese fix. El smoke `npm run smoke:audit -- --anchor` usa la verificación manual de arriba y se niega a correr si `AUDIT_URL` contiene `mainnet`.

## Rate limit

El nodo permite 20 anclajes por minuto por huella anónima (IP + User-Agent + Accept-Language + Accept-Encoding). Si se pasa, responde HTTP 429 con `{ "retryAfter": 60 }` (segundos). TIA no reintenta ese 429 en la misma llamada: guarda un backoff y descarta el anclaje. `X-RateLimit-Remaining: 0` también frena el siguiente. Además hay un tope propio, `AUDIT_MAX_PER_MIN` (default 15), por debajo del límite del nodo.

Los CID que sí se anclan quedan en el documento público del gateway y son permanentes. TIA guarda la relación hash → CID 90 días en Upstash (`audit:cid:<hex>`) para `GET /v1/audit/:hash`.
