# holatia.app — Executive Summary

Inteligencia financiera, decisión y trazabilidad verificable para agentes y pagos cross-border.

## 1. Visión general

TIA es la capa de infraestructura que permite a agentes de pago autónomos, fintechs y dApps operar en el corredor de remesas Estados Unidos–México **[TODO: cifra anual + fuente]** con datos reales, decisiones informadas y recibos verificables. A través de la API TIA sobre Stellar mainnet y el protocolo HTTP 402 (x402), los sistemas autónomos cotizan, comparan rutas y dejan recibos auditables, con acceso pay-per-use en USDC y sin suscripciones.

> Placeholder de mercado: sustituir `[TODO: cifra anual + fuente]` antes de publicar. Candidata documentada (no fijada): ~USD 62.5B EE.UU.→México en 2024 (96.6% del total recibido por México), [BBVA Research](https://www.bbvaresearch.com/en/publicaciones/mexico-record-in-remittances-64745-million-dollars-in-2024-and-dark-spots-for-2025/). Confirmar el número y la atribución al citar.

## 2. Lo que vendemos: el cerebro transaccional para agentes

TIA no vende solo una cotización. Le da a un agente de pagos en Stellar cuatro pasos en tiempo real:

**Cotizar ➜ Comparar rutas ➜ Decidir ➜ Recibo verificable**

| Paso | Qué entrega |
|------|-------------|
| **Cotizar** | Tipo de cambio USD/MXN en vivo (Bitso), con bid, ask, spread y volumen de 24 h. |
| **Comparar rutas** | Costos y tiempos entre rieles y off-ramps. |
| **Decidir** | Señales de umbral para saber cuándo ejecutar. |
| **Recibo verificable** | La huella de la cotización queda anclada para comprobar después qué precio se obtuvo y cuándo. |

Todo con llamadas simples a la API, liquidadas al instante en USDC vía x402.

## 3. Hito reciente: recibos verificables en Stellar mainnet (18 oct 2026)

- **Primer recibo en producción:** una cotización real pagada con **0.10 USDC** (USD/MXN 18.484, fuente Bitso). El hash de la respuesta quedó anclado en IPFS con el Audit Trail de Nirium y firmado con ed25519.
  - **Hash (verificación):** `0f60f3cee44ed7c0e1ca72f75acfdb7f7ff063e9f6598a1952da848c66325e11`
  - **CID:** `QmVWZM1i9qusiTfNAT9QdSFYJNEwQUXtnWuSkrCqRAnGEu`
  - **Anclado:** `2026-10-18T22:46:41.076Z` · tag `tia-quote` · red `stellar:pubnet`
  - **Verificar:** [GET /v1/audit/&lt;hash&gt;](https://x402.holatia.app/v1/audit/0f60f3cee44ed7c0e1ca72f75acfdb7f7ff063e9f6598a1952da848c66325e11) (el path espera el hash sha-256 de 64 hex, **no** el CID)
  - **Documento en IPFS:** [gateway Pinata](https://gateway.pinata.cloud/ipfs/QmVWZM1i9qusiTfNAT9QdSFYJNEwQUXtnWuSkrCqRAnGEu)
- **Privacidad por diseño:** el recibo no guarda datos personales del usuario ni el `txHash` del pagador; solo la huella de la cotización (y la firma ed25519 del agente de auditoría `tia-api`).
- **Por qué importa:** cuando un agente cotiza una remesa, el usuario o la entidad regulada necesita comprobar qué precio recibió y en qué momento. Cada respuesta pagada puede devolver un hash único (`X-TIA-Audit-Hash`) que cualquiera verifica en `/v1/audit/<hash>`.
- **Avances desde GOYA HACK:** carta de intención firmada con Puls3, spec OpenAPI y licencia MIT publicadas, y 2 PRs de contribución al protocolo Nirium.

## 4. La solución por tipo de cliente

| Cliente | Dolor | Solución |
|---------|-------|----------|
| **Builders y agentes de IA** | Los agentes no tienen tarjeta ni acceso a APIs bancarias. | Pago por consulta en USDC vía x402, sin cuentas. |
| **Fintechs y wallets cross-border** | Spreads FX opacos y rieles difíciles de integrar. | Cotización en vivo y un comparador de rutas por costo y tiempo. |
| **Auditores y compliance** | No se puede verificar después qué tasa obtuvo un agente. | Recibos públicos en `/v1/audit/<hash>`, anclados en IPFS y firmados con ed25519. |

## 5. API TIA: servicios x402 (Stellar mainnet, x402.holatia.app)

| Endpoint | Precio | Qué hace |
|----------|--------|----------|
| `GET /v1/quote` | 0.10 USDC | Cotización USD/MXN en vivo; responde con `X-TIA-Audit-Hash` cuando el audit trail está activo. |
| `GET /v1/route` | 0.25 USDC | Comparación de rutas y rieles por costo y tiempo. |
| `POST /v1/alert` | 0.10 USDC | Alerta de umbral cambiario con señal de decisión. |
| `GET /v1/audit/<hash>` | gratis | Verifica el CID, la hora del anclaje y el statement de firma de una cotización previa. |

## 6. Hoja de ruta

1. **Fase 1 (actual):** Stellar mainnet, x402 y recibos verificables. Adopción por builders, agentes en hubs como Puls3 y proyectos del ecosistema Stellar.
2. **Fase 2:** reinvertir el flujo de caja de la API en infraestructura RPC y programas en Solana mainnet.
3. **Fase 3:** escalar en el corredor EE.UU.–México como estándar de inteligencia FX, ruteo de liquidez y auditoría para plataformas B2B y remitentes.

## Enlaces y contacto

| | |
|--|--|
| Sitio | [stellar.holatia.app](https://stellar.holatia.app/) |
| API | [https://x402.holatia.app/v1/quote](https://x402.holatia.app/v1/quote) |
| Verificación (ejemplo) | [https://x402.holatia.app/v1/audit/0f60f3cee44ed7c0e1ca72f75acfdb7f7ff063e9f6598a1952da848c66325e11](https://x402.holatia.app/v1/audit/0f60f3cee44ed7c0e1ca72f75acfdb7f7ff063e9f6598a1952da848c66325e11) |
| Partnerships | [remesatia@gmail.com](mailto:remesatia@gmail.com) |
| Fundador | Edgar Ramírez Flores ([@Edgadafi](https://github.com/Edgadafi)) |
