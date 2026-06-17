# Legal Checklist — Remesas / Crypto MX-US

> Yarden · 1 jul · Bridge Dev3pack  
> **Nota:** Devnet MVP ≠ producto regulado. Este checklist prepara mainnet/piloto.

## Estado actual (MVP Bridge)

| Área | Devnet MVP | Pre-mainnet |
|------|------------|-------------|
| Licencia remesas US | N/A (no real money) | MSB / state licenses |
| Licencia MX (CNBV/ITF) | N/A | Asesoría local |
| KYC sender | Wallet only | CIP según volumen |
| KYC receptor | WhatsApp + World ID mock | ID verification policy |
| AML monitoring | Manual | Transaction monitoring vendor |
| Consumer disclosures | Landing copy | Terms + fee schedule |
| Data privacy | WhatsApp opt-in | Privacy policy MX/US |

## Preguntas para Yarden

1. ¿Stablecoin USDC en devnet califica como "remesa" bajo definición MX?
2. ¿Comercio como agente de pago requiere registro separado?
3. ¿World ID / proof-of-personhood suficiente para receptor underbanked?
4. ¿Estructura legal recomendada: US entity + MX SPV?
5. ¿Timeline realista licencia vs sandbox fintech?

## Atajo YC (industria regulada)

Mientras legal madura:
- Website + demo + conversaciones (Laura/Tochukwu)
- **No** prometer mainnet en landing
- Documentar fee y fuentes de verdad on-chain
- Limitar montos piloto post-Bridge

## Fuentes de verificación (scalar-style, futuro)

| Campo | Spec futuro |
|-------|-------------|
| Fuente | BLS / Fed / on-chain oracle |
| Timestamp | 08:30 ET + TZ explícito |
| Revisiones | 3 business days |
| Fallback | Delay >24h → cancel policy |

## Acciones post-sesión

- [ ] Respuestas Yarden → fila en decision log
- [ ] Actualizar landing disclaimer si aplica
- [ ] Go/no-go piloto 10 usuarios (Sem 4)
