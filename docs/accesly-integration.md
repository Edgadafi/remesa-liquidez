# Accesly integration — TIA Stellar rail

Onboarding Stellar vía [`@accesly/react`](https://www.npmjs.com/package/@accesly/react) + [`@accesly/core`](https://www.npmjs.com/package/@accesly/core). Solana sigue siendo el rail de revenue; Stellar beta está gated por env.

## Prerequisitos (bloqueante)

1. **Registrar app** en [dev.accesly.xyz](https://dev.accesly.xyz)
2. Obtener **`NEXT_PUBLIC_ACCESLY_APP_ID`**
3. Habilitar provider **Google** en el dashboard Accesly
4. Configurar **Callback URLs** en Cognito (vía dashboard redirect URIs):

```
https://web-coral-pi-66.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

5. Activar piloto Stellar en `.env`:

```bash
NEXT_PUBLIC_STELLAR_PILOT_ENABLED=true
NEXT_PUBLIC_ACCESLY_APP_ID=<tu-app-id>
NEXT_PUBLIC_ACCESLY_ENV=dev
npm run sync-env
```

## Flujo UI (Phase A)

1. Home → **Stellar (beta)** en chain picker
2. **Continuar con Google** (`AuthForm`)
3. Redirect → `/auth/callback` → `AuthCallback`
4. Contraseña de recuperación (8+ chars) → `CreateWalletFlow` (passkey + smart account)
5. Balance USDC testnet visible (`BalanceCard` / `useBalance`)

## Archivos clave

| Path | Rol |
|------|-----|
| `web/providers/AcceslyRoot.tsx` | `AcceslyProvider` + theme TIA |
| `web/app/auth/callback/page.tsx` | OAuth callback |
| `web/context/ChainContext.tsx` | Solana vs Stellar |
| `web/components/StellarSenderApp.tsx` | Auth + wallet + balance |
| `web/lib/stellar/remesa.ts` | Invoke specs Phase B |

## Test checklist

- [ ] Google login → callback → wallet creada
- [ ] Balance USDC visible en testnet
- [ ] Chain picker: Solana path intacto (devnet remesa)
- [ ] `/status` muestra fila Accesly Stellar
- [ ] (Phase B) `STELLAR_CONTRACT_ID` + invoke spec en `npm run e2e:stellar:testnet`

## Phase B — Soroban escrow

1. `cd contracts/remesa-tia-stellar && soroban contract build && deploy`
2. Set `STELLAR_CONTRACT_ID` + `NEXT_PUBLIC_STELLAR_CONTRACT_ID`
3. Firmar invokes con `useAccesly().tx.signRawXdr()` tras `wallet.unlockForSigning()`
4. Extender `notify/verified` con `chain: 'stellar'`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Provider error on mount | Verificar `NEXT_PUBLIC_ACCESLY_APP_ID` y Google habilitado |
| OAuth redirect mismatch | Callback URL exacta en dev.accesly.xyz |
| Stellar tab disabled | `NEXT_PUBLIC_STELLAR_PILOT_ENABLED=true` |
| Wallet exists on new device | Usar `RecoveryFlow` de `@accesly/react/kit` |

## Referencias

- [SDKAccesly GitHub](https://github.com/Accesly/SDKAccesly)
- [dual-chain-decision.md](./dual-chain-decision.md)
- Repo SCF precursor: [Stellar-Account-Abstraction-SDK](https://github.com/Hoblayerta/Stellar-Account-Abstraction-SDK)
