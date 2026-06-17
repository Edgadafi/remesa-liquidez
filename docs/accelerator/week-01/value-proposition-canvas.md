# Value Proposition Canvas — Remesa TIA

> Plantilla Strategyzer v2.1 — Bridge Dev3pack · Semana 1 · Validar con Laura (18 jun)

## Customer Segment

**Remitente en EE.UU./extranjero** que envía dinero a familia en México.  
**Receptor en México** sin cuenta bancaria o con preferencia por efectivo.  
**Comercio aliado** que liquida el cashout con reglas claras.

---

## Customer Profile

### Customer Jobs (tareas que intentan completar)

1. Enviar dinero a familia de forma rápida y confiable.
2. Confirmar que el receptor puede retirar sin fricción.
3. Retirar efectivo cerca de casa sin app bancaria.
4. (Comercio) Liquidar remesas con fee predecible y sin chargebacks opacos.

### Pains (frustraciones, riesgos, obstáculos)

| Pain | Evidencia / hipótesis |
|------|------------------------|
| Comisiones 5–8% (Western Union, etc.) | Pain #1 en entrevistas LATAM |
| Demoras 1–3 días | Receptor espera sin visibilidad |
| Receptor sin cuenta bancaria | ~40% adultos MX underbanked (hipótesis) |
| UX crypto intimidante | Sender evita wallets |
| Desconfianza en intermediarios | "¿Llegó mi dinero?" |
| Comercio no sabe si puede pagar | Sin reglas públicas de liquidez |

### Gains (resultados deseados)

| Gain | Cómo lo mide el usuario |
|------|-------------------------|
| Confirmación en minutos | Audio TIA + WhatsApp |
| Fee bajo y visible | 0.25% on-chain en Solscan |
| Sin app para receptor | Solo WhatsApp |
| Retiro en tienda conocida | Comercio aliado |
| Reglas auditables | Contrato Anchor público |

---

## Value Proposition

### Products & Services

- Contrato **Anchor** `remesa_liquidez` (escrow por turnos, devnet)
- Agente **TIA** — notificaciones voz + WhatsApp
- **Solana Actions / Blinks** — verify + cashout desde wallet
- **Mobile Wallet Adapter** — sender firma desde Android
- **LI.FI** — bridge USDC cross-chain (Arbitrum/Base/Polygon → Solana)
- **World ID** — verificación identidad receptor (roadmap Sem 2)

### Pain Relievers (cómo aliviamos pains)

| Pain | Pain Reliever |
|------|---------------|
| Comisiones altas | Fee protocolo 0.25% on-chain vs 5–8% tradicional |
| Demoras | Settlement Solana ~400ms; notificación TIA inmediata |
| Sin banco receptor | Cashout en comercio + WhatsApp |
| UX crypto | MWA abre wallet nativa; Blinks para comercio |
| Desconfianza | Estado `TurnReservation` verificable en explorer |

### Gain Creators (cómo creamos gains)

| Gain | Gain Creator |
|------|--------------|
| Confirmación rápida | Audio ElevenLabs *"Soy TIA, tu remesa está lista"* |
| Fee transparente | Split payout/tesoro en `validate_cashout` |
| Sin app receptor | Bot WhatsApp TIA |
| Cross-border funding | LI.FI quote en landing |

---

## Fit Statement (1 frase)

**Para remitentes US→MX y receptores sin banco**, Remesa TIA es una **remesa on-chain con agente de voz** que **reduce comisiones y elimina la app del receptor**, a diferencia de Western Union / apps bancarias, porque **las reglas viven en Solana y TIA notifica por WhatsApp**.

---

## Hipótesis a validar (Laura — 18 jun)

1. El receptor prefiere **WhatsApp + voz** sobre SMS o email.
2. El sender pagaría **≤1% fee** vs 5–8% actual.
3. Comercios aceptarían cashout Blink si el fee es **≤0.5%** para ellos.
4. World ID reduce fraude sin bloquear adopción.

## Métricas de validación (Semana 1–2)

- 3 entrevistas completadas (sender, receptor, comercio)
- 1 demo E2E con usuario real
- NPS preliminar post-demo (escala 1–10)
