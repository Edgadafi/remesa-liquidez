# MVP Spec — Bridge Dev3pack

**Proyecto:** Remesa TIA  
**Deadline duro:** 9 jul 2026  
**Framework:** YC Startup School + Bridge calendar  
**Checklist operativo:** [SPEC.md](../../SPEC.md) (raíz del repo — immutable)

---

## IN scope (no negociable)

| # | Feature | Owner | Semana |
|---|---------|-------|--------|
| 1 | Sender reserva USDC (`initialize_reservation`) vía MWA | Build | Done |
| 2 | Sender aprueba (`mark_verified`) | Build | Done |
| 3 | TIA notifica WhatsApp (texto mínimo) | Build | 1 |
| 4 | Comercio cashout (`validate_cashout` Blink) | Build | 3 |
| 5 | 3 entrevistas usuario + notas | FMF | 1 |
| 6 | VPC + founder story | FMF | 1 |
| 7 | Positioning + messaging house | GTM | 2 |
| 8 | 5 beta users contactados, 1 reserva real | GTM | 2 |
| 9 | Merchant UI + 3 txs E2E documentadas | Ops | 3 |
| 10 | Legal checklist + ops runbook | Ops | 3 |
| 11 | Pitch deck + landing v2 + piloto 10 users | Pitch | 4 |

---

## OUT scope (cortar sin culpa)

- Mainnet / auditoría formal contrato
- Pricing engine / suscripciones (remesa-blink)
- cNFT, Etherfuse off-ramp
- LI.FI UI completa (API quote OK)
- Audio PTT WhatsApp (Sem 2+ solo si entrevistas lo exigen)
- Multi-corredor / multi-país
- Press / launch mediático

---

## Cut order (si retraso)

1. LI.FI UI, World ID prod → mock documentado
2. Audio PTT → solo texto TIA
3. Merchant UI fancy → Dial.to manual
4. **Nunca cortar:** WhatsApp + flujo E2E + entrevistas

---

## Cambios al spec (log)

| Fecha | Cambio | Razón (problema usuario) | Aprobado por |
|-------|--------|--------------------------|--------------|
| 16 jun | Spec inicial | Kick Off Bridge | Fundador |
| | | | |
| | | | |

> Solo agregar filas si Laura/Tochukwu validan un **problema**, no un feature suelto.

---

## Definición de done (9 jul)

- [ ] Usuario no-técnico entiende valor en <2 min
- [ ] ≥1 beta user intentó reserva real
- [ ] Flujo sender → TIA WhatsApp → cashout demo sin "imagine que..."
- [ ] OUT scope respetado
- [ ] ≥1 decisión de producto cambió por entrevistas
