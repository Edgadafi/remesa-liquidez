# E2E Transactions — Documentación

Meta Sem 3: **3 txs E2E** sender → verify → WhatsApp → cashout.

## Template por tx

| Campo | Tx 1 | Tx 2 | Tx 3 |
|-------|------|------|------|
| Fecha | | | |
| Sender wallet | | | |
| Monto USDC | | | |
| Receiver WA | | | |
| `initialize_reservation` sig | | | |
| `mark_verified` sig | | | |
| WhatsApp TIA sent | | | |
| `validate_cashout` sig | | | |
| Merchant wallet | | | |
| Beta user (Y/N) | | | |
| Notas | | | |

## Tx 0 — Referencia fundador (e2e script)

Generar con:

```bash
npm run e2e:devnet
```

Pegar signatures del output aquí:

| Paso | Signature |
|------|-----------|
| initialize_reservation | _pending_ |
| mark_verified | _pending_ |
| validate_cashout | _pending_ |

## Links útiles

- Program: https://solscan.io/account/Fprb6jTLfjXfZ6yuWzS7LVXxwVvPbPgPZiEqDEL9bRfj?cluster=devnet
- Status page: https://web-coral-pi-66.vercel.app/status
- Merchant UI: https://web-coral-pi-66.vercel.app/merchant

## Criterio "E2E completa"

1. Reserva activa on-chain
2. `is_verified = true`
3. WhatsApp texto entregado (o JSON `messageSent: true`)
4. Cashout con split fee visible en Solscan
