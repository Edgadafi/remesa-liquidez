# Deploy guide — Remesa+liquidezIA

## Local validator (already working)

```bash
anchor build
anchor test
```

12+ integration tests pass on `solana-test-validator`.

## Devnet

### 1. Wallet + funding

```bash
solana config set --url devnet
solana address                   # current address
solana balance
```

You need ~5 SOL on devnet for the program deploy (~400 KB binary).
The CLI airdrop is heavily rate-limited; use the web faucet:
https://faucet.solana.com
(paste the address from `solana address`).

### 2. Build + deploy

```bash
anchor build
anchor deploy --provider.cluster devnet
```

If the deploy fails halfway, recover the buffer rent and retry:

```bash
solana program close --buffers --keypair ~/.config/solana/id.json
```

### 3. Bootstrap protocol Config (one-shot)

```bash
anchor migrate --provider.cluster devnet
```

This runs [`migrations/deploy.ts`](migrations/deploy.ts): idempotent `initialize_config`
(first deploy only).

### 4. Whitelist merchants (admin payer)

Every merchant pubkey that will sign `validate_cashout` / Blinks **must** be
registered via `register_merchant`.

**Explicit pubkeys (e.g. wallets de Phantom ya creados):**

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com \
MERCHANT_PUBKEYS='Pubkey1Base58,Pubkey2Base58' \
yarn register-merchants:devnet
```

**Demo (genera 3 keypairs nuevas):** sin `MERCHANT_PUBKEYS` el script escribe los
secrets en `scripts/.merchants-demo-devnet.json` (gitignored) y registra esas 3 pubkeys
on-chain. Luego `solana airdrop` a cada una para que puedan firmar en devnet.

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com yarn register-merchants:devnet
```

Re-running the script **no duplica** cuentas: omite merchants ya whitelisteados.

### 5. E2E on-chain demo (CLI, devnet)

Con `scripts/.merchants-demo-devnet.json` y tus merchants financiadas con SOL:

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com yarn e2e:devnet
```

Crea mint SPL nuevo, ATA, `initialize_reservation` → `mark_verified` →
`validate_cashout` y verifica fee 25 bps (net=fee deducted). Opcional:
`MERCHANT_INDEX=1`, `AMOUNT_RAW`, `EXPIRY_SECONDS`.

## Web (Next.js / Vercel)

### Repo layout

- Artefactos Anchor viven también en **`web/idl/remesa_liquidez.json`** y
  **`web/types/remesa_liquidez.ts`** (actualizados con el script `sync`; **committed** para que Vercel no dependa de Rust).
- **Root Directory en Vercel:** `web` (importante).

### Un solo comando estable (mono-repo → build como Vercel)

Desde la raíz del proyecto:

```bash
npm run web:build:vercel
```

Equivalente interno:

1. `anchor build`
2. `node web/scripts/sync-anchor-artifacts.cjs` copia IDL/types a `web/`.
3. `cd web && npm run vercel-build` → sincroniza otra vez (no-op si ya iguales) + `next build`.

Solo `web/` (sin Anchor en esta máquina):

```bash
cd web && npm run vercel-build
```

(usará los ficheros ya presentes en `web/idl` y `web/types` si `../target` no existe.)

### Deploy en la UI de Vercel

1. Importar repo → **Framework Preset:** Next.js.
2. **Root Directory:** `web`.
3. **Build Command:** *(dejar el default o)* `npm run vercel-build` (ya coincide con [`web/vercel.json`](web/vercel.json)).
4. **Install Command:** `npm install`.

### Variables de entorno en Vercel

```
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=<tu RPC devnet HTTPS>
NEXT_PUBLIC_BLINK_ICON_URL=https://...
```

(Optional) `PROGRAM_ID` no hace falta: el programa ID viene en el IDL.

### Endpoints expuestos

| Path                         | Purpose                                          |
|------------------------------|--------------------------------------------------|
| `GET /actions.json`          | Dial.to discovery (registers Action URL paths)   |
| `GET /api/actions/cashout`   | Blink metadata for the merchant cash-out         |
| `POST /api/actions/cashout`  | Builds the merchant-signed `validate_cashout` tx |
| `GET /api/actions/verify`    | Blink metadata for the sender's verify-step      |
| `POST /api/actions/verify`   | Builds the sender-signed `mark_verified` tx      |

### Testing the Blink

Once deployed at `https://<your-domain>`:

1. Open `https://dial.to/?action=solana-action:https://<your-domain>/api/actions/verify?receiver=<receiverPubkey>`
2. Connect a wallet that holds the `sender` pubkey of the reservation.
3. Sign — `is_verified` flips on-chain.
4. Open `https://dial.to/?action=solana-action:https://<your-domain>/api/actions/cashout?pda=<reservationPda>`
5. Connect a whitelisted merchant wallet. Sign. Tokens flow.

## Smoke test sequence (devnet)

```
1. anchor deploy
2. initialize_config (admin = your wallet)
3. register_merchant (merchant_a, merchant_b, ...)
4. mint a fake "MXNe" SPL token (decimals = 6) — use spl-token CLI
5. initialize_reservation { sender, receiver, mint, amount=100 MXNe, expiry=24h }
6. mark_verified  (sender signs — Blink #1)
7. validate_cashout (merchant signs — Blink #2)
8. Verify: merchantATA gained 99.75, treasury vault gained 0.25
9. withdraw_treasury (admin → multisig destination ATA)
```
