# Etherfuse Integration — TIA Route Comparison

TIA includes Etherfuse as a quoted route for USD→MXN transfers, using **REAL quotes** from the Etherfuse v2 API.

## Overview

- **Route**: USDC on Stellar → MXN offramp (SPEI bank transfer)
- **Mode**: QUOTE-ONLY. TIA compares routes; it **never** creates orders or moves money.
- **Environment**: Sandbox by default (`https://api.sand.etherfuse.com`), configurable to production.
- **Docs**: [https://docs.etherfuse.com/v2/quickstart](https://docs.etherfuse.com/v2/quickstart)
- **OpenAPI**: [https://api.etherfuse.com/openapi-v2.json](https://api.etherfuse.com/openapi-v2.json)

## Requirements

To get **real quotes** from Etherfuse (not just "Cotización no disponible"):

### 1. API Key

- Create a business account at [sandbox.etherfuse.com](https://sandbox.etherfuse.com) (sandbox) or [app.etherfuse.com](https://app.etherfuse.com) (production)
- Complete KYB (sandbox: self-approve with the "Approve KYB" button on the KYB page)
- Navigate to **Account → Manage Accounts → API Keys**
- Create an API key (format: `api_sand:key_id:org_id` for sandbox, `api_prod:key_id:org_id` for production)
- **Important**: Do NOT use a `Bearer` prefix when setting the header. The header value is the raw API key.

**Note on USDC Assets**: The integration automatically selects the correct USDC asset based on the environment:
- **Sandbox**: `USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`
- **Production**: `USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`

You can override this by setting `ETHERFUSE_USDC_ASSET` if needed.

### 2. Payment Accounts

Etherfuse quotes require **registered payment accounts** on both ends:

#### Source: USDC Wallet on Stellar

```bash
curl -X POST https://api.sand.etherfuse.com/organization/{organizationId}/payment_account \
  -H "Authorization: {your_api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "wallet",
    "label": "USDC Stellar Wallet",
    "accountDetails": {
      "kind": "address",
      "address": "{your_stellar_address}",
      "chain": "stellar"
    }
  }'
```

Save the returned `id` as `ETHERFUSE_SOURCE_ACCOUNT_ID`.

#### Destination: MXN Bank Account (SPEI)

```bash
curl -X POST https://api.sand.etherfuse.com/organization/{organizationId}/payment_account \
  -H "Authorization: {your_api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "bank",
    "label": "MXN SPEI Account",
    "country": "MX",
    "currency": "MXN",
    "accountDetails": {
      "kind": "clabe",
      "clabe": "012180000000000002"
    }
  }'
```

Save the returned `id` as `ETHERFUSE_DEST_ACCOUNT_ID`.

If the response is `422 registration-info-required`, add the fields listed in `missing` under `registrationInfo` and retry.

#### Organization ID

```bash
curl https://api.sand.etherfuse.com/me \
  -H "Authorization: {your_api_key}"
```

Save the `id` from the response as `ETHERFUSE_ORG_ID`.

### 3. Environment Variables

Add to `.env` (never commit this file):

```bash
# Etherfuse API key (sandbox or production)
ETHERFUSE_API_KEY=api_sand:your_key_id:your_org_id

# API base URL (sandbox by default)
ETHERFUSE_API_BASE=https://api.sand.etherfuse.com

# Optional: USDC asset override (defaults to sandbox/mainnet based on API_BASE)
# Sandbox: USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
# Mainnet: USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
ETHERFUSE_USDC_ASSET=

# Payment account IDs (from steps above)
ETHERFUSE_SOURCE_ACCOUNT_ID=00000000-0000-0000-0000-000000000001
ETHERFUSE_DEST_ACCOUNT_ID=00000000-0000-0000-0000-000000000002
ETHERFUSE_ORG_ID=00000000-0000-0000-0000-000000000003
```

Also add these to the Vercel project environment variables:
- Project: `tia-stellar` (or the backend project name)
- Navigate to **Settings → Environment Variables**
- Add each variable for Production/Preview/Development as needed

## Behavior

### With Valid Setup (API Key + Payment Accounts)

The route appears with a **real quote**:

```json
{
  "route": "etherfuse_offramp",
  "label": "Etherfuse USDC→MXN (sandbox)",
  "mxnOut": 1823.45,
  "effectiveRate": 18.2345,
  "totalCostUsd": 1.23,
  "totalCostPct": 1.23,
  "etaMinutes": 30,
  "assumptions": [
    "Cotización real API Etherfuse v2 (sandbox)",
    "Fee 123 bps (~1.23%)",
    "USDC on Stellar → SPEI MXN",
    "Vence en 2 min (2026-11-27T12:34:56.789Z)"
  ],
  "environment": "sandbox"
}
```

### Without API Key

```json
{
  "route": "etherfuse_offramp",
  "label": "Etherfuse USDC→MXN offramp",
  "mxnOut": 0,
  "totalCostUsd": 0,
  "totalCostPct": 0,
  "etaMinutes": 30,
  "assumptions": [
    "Cotización no disponible (ETHERFUSE_API_KEY no configurada)"
  ],
  "unavailable": true
}
```

### With API Key But No Payment Accounts

```json
{
  "assumptions": [
    "Cotización no disponible (cuentas no configuradas)"
  ],
  "unavailable": true
}
```

### On Network Error or API Failure

```json
{
  "assumptions": [
    "Cotización no disponible (error de red)"
  ],
  "unavailable": true
}
```

Unavailable routes are **excluded from the "Menor costo estimado" badge** calculation.

## Production Setup

1. Complete KYB on [app.etherfuse.com](https://app.etherfuse.com) (requires real business verification)
2. Create a production API key (format: `api_prod:key_id:org_id`)
3. Register production payment accounts (real USDC wallet + real MXN bank account)
4. Update environment variables:
   ```bash
   ETHERFUSE_API_KEY=api_prod:your_key_id:your_org_id
   ETHERFUSE_API_BASE=https://api.etherfuse.com
   ETHERFUSE_SOURCE_ACCOUNT_ID={production_wallet_id}
   ETHERFUSE_DEST_ACCOUNT_ID={production_bank_id}
   ETHERFUSE_ORG_ID={production_org_id}
   ```

The route label changes to `"Etherfuse USDC→MXN offramp"` (without "sandbox") when using the production URL.

## Safety

- **Quote-only**: The integration calls only `POST /organization/{organizationId}/quote`. It never calls `POST /organization/{organizationId}/order` or any other write endpoint.
- **No secrets in logs**: API keys are never logged or exposed in responses.
- **Timeout**: Requests timeout after 5 seconds to avoid blocking the `/v1/route` endpoint.
- **Graceful degradation**: If Etherfuse is unavailable, the route shows as unavailable and the other three routes still work.

## Testing

Run the test suite:

```bash
cd backend
npm test -- --test-name-pattern="etherfuse|routeEstimator"
```

All tests mock the Etherfuse API and validate:
- Missing API key behavior
- Environment detection (sandbox vs. production)
- Quote parsing and error handling
- Route unavailability logic
- Best route calculation excludes unavailable routes

## Support

For issues with the Etherfuse API:
- Docs: [https://docs.etherfuse.com/v2/index.md](https://docs.etherfuse.com/v2/index.md)
- OpenAPI: [https://api.etherfuse.com/openapi-v2.json](https://api.etherfuse.com/openapi-v2.json)
- Support: Contact Etherfuse support via their dashboard

For issues with the TIA integration:
- Check this file first
- Verify env vars in Vercel dashboard
- Check backend logs for `[etherfuse]` warnings
