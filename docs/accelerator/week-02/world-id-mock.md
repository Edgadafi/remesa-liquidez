# World ID — Staging / Mock (Semana 2)

**Decisión MVP:** World ID producción está OUT of scope Bridge. Usar mock documentado hasta entrevistas exijan prod.

## Estado actual

- On-chain: `mark_verified` lo firma el **sender** (no World ID proof en devnet)
- Copy cashout Blink menciona World ID — es placeholder UX
- Gate real: `reservation.isVerified` después de `mark_verified`

## Mock para demos

1. Sender conecta wallet → crea reserva
2. Sender pulsa "Aprobar Identidad" (`mark_verified`)
3. Narrar en demo: *"Aquí el receptor completaría World ID; en MVP el sender aprueba tras verificar documento offline"*

## Si Laura/Tochukwu piden World ID real (Sem 2+)

- Integrar [World ID Mini App](https://docs.worldcoin.org/) en staging
- Flujo: receptor escanea QR → proof → backend llama `mark_verified` con delegate
- **Cut order:** solo si ≥2 entrevistas lo piden como *problema* (confianza/fraude)

## Env vars (futuro)

```
WORLD_APP_ID=
WORLD_ACTION=
```

Actualizar [mvp-spec-bridge.md](../mvp-spec-bridge.md) si cambia decisión.
