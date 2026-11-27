# Despliegue y uso del contrato TIA en Stellar Mainnet

Este documento explica cómo desplegar el contrato de escrow `remesa-tia-stellar` en Stellar Mainnet y cómo invocar sus 5 funciones principales desde el frontend.

## Tabla de funciones principales

| Función | Qué hace | Pantalla/Componente | Archivo:Línea | Link TX |
|---------|----------|---------------------|---------------|---------|
| `set_merchant_status` | Activa o desactiva un comerciante en el sistema. Solo el admin puede llamarla. | Contrato TIA en mainnet | site/contrato.html:547 | [Por completar] |
| `initialize_reservation` | Crea una reserva bloqueando USDC en el contrato. El sender firma y paga la operación. | Contrato TIA en mainnet | site/contrato.html:567 | [Por completar] |
| `mark_verified` | Marca una reserva como verificada (KYC/compliance aprobado). Solo admin/verifier puede llamarla, y el caller NO puede ser el sender de la reserva. | Contrato TIA en mainnet | site/contrato.html:606 | [Por completar] |
| `validate_cashout` | Liquida una reserva verificada pagando al merchant (neto - 25 bps) y al treasury (25 bps). Requiere firma del merchant y del receiver. | Contrato TIA en mainnet | site/contrato.html:627 | [Por completar] |
| `open_dispute` | Abre una disputa en una reserva (en una segunda reserva para demo), congelándola. El sender, admin o verifier pueden llamarla. | Contrato TIA en mainnet | site/contrato.html:648 | [Por completar] |

**Nota:** `settle_with_receipt` está disponible como función extra (requiere recibo TIA registrado primero), pero NO se cuenta en las 5 principales para el hackathon.

## Requisitos previos

- **Stellar CLI** instalado y configurado: `brew install stellar/tap/stellar-cli` (macOS) o [instrucciones oficiales](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup)
- **Rust toolchain** con target `wasm32-unknown-unknown`: `rustup target add wasm32-unknown-unknown`
- **Identidad Stellar** configurada con fondos en mainnet: `stellar keys generate tu-identidad --network mainnet`
- **Fondos XLM** en la cuenta para pagar fees de deploy y configuración (~10-20 XLM)
- **Parámetros del constructor** (se pasan al deploy):
  - `--admin`: Dirección G... del administrador del contrato
  - `--token`: Dirección del USDC SAC en mainnet: `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75` (Circle USDC: `USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`)
  - `--treasury`: Dirección G... donde se enviarán los fees del 0.25%

## Pasos para desplegar en Mainnet

### 0. Configurar la red mainnet en Stellar CLI (si es necesario)

Si el CLI no tiene configurada la red mainnet o necesitas especificar un RPC personalizado:

```bash
stellar network add mainnet \
  --rpc-url https://mainnet.sorobanrpc.com \
  --network-passphrase "Public Global Stellar Network ; September 2015"
```

Verifica la configuración:

```bash
stellar network ls
```

### 1. Compilar el contrato

Desde la raíz del repositorio:

```bash
cd contracts/remesa-tia-stellar
stellar contract build
```

Esto genera el archivo WASM optimizado en `target/wasm32-unknown-unknown/release/remesa_tia_stellar.wasm`.

### 2. Desplegar el contrato CON constructor inline

**IMPORTANTE:** El constructor (`__constructor`) se ejecuta automáticamente al hacer deploy. NO se puede invocar después.

Reemplaza `<tu-identidad>`, `<G-WALLET1>` (admin y treasury, generalmente la misma wallet) con tus valores reales:

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/remesa_tia_stellar.wasm \
  --source tu-identidad \
  --network mainnet \
  -- \
  --admin <G-WALLET1> \
  --token CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75 \
  --treasury <G-WALLET1>
```

**Parámetros del constructor (después de `--`):**
- `--admin`: Dirección pública G... del admin (tu Wallet 1)
- `--token`: USDC SAC en mainnet = `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`
  - Corresponde a Circle USDC: `USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`
  - Verificado con: `stellar contract id asset --asset USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN --network mainnet`
- `--treasury`: Dirección G... que recibirá los fees del 0.25% (puede ser la misma que admin)

El comando devolverá el **Contract ID** (formato `C...`). **Guárdalo**, lo necesitarás para configurar el frontend.

### 3. Verificar el despliegue

Consulta la versión del contrato para confirmar que está corriendo:

```bash
stellar contract invoke \
  --id <CONTRACT-ID> \
  --source tu-identidad \
  --network mainnet \
  -- \
  version
```

Debe devolver: `"v0_d1"`

### 4. Configurar el frontend

**Opción A (rápida): Usar query param (sin commit)**

Después del deploy, simplemente abre la URL con el Contract ID:

```
https://stellar.holatia.app/contrato.html?contract=<CONTRACT-ID>
```

Reemplaza `<CONTRACT-ID>` con el ID que obtuviste en el paso 2. La página detectará el parámetro automáticamente.

**Opción B (permanente): Commitear el Contract ID**

Edita el archivo `site/contrato.html` línea ~12 y actualiza `CONFIG.contractId`:

```javascript
const CONFIG = {
  contractId: '<CONTRACT-ID>',  // ← Reemplaza con el Contract ID del paso 2
  usdcAddress: 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75',
  networkPassphrase: 'Public Global Stellar Network ; September 2015',
  rpcUrl: 'https://mainnet.sorobanrpc.com',
};
```

### 5. Desplegar el frontend en Vercel

**IMPORTANTE:** El sitio `stellar.holatia.app` está configurado para desplegar desde la rama `main` del repo, NO desde ramas de PR.

**Para que la página vaya a producción:**

1. Merge este PR (#43) a `main`:
   ```bash
   # Desde GitHub UI o con gh CLI:
   gh pr merge 43 --squash
   ```

2. Vercel detectará el merge a `main` y desplegará automáticamente

3. La página estará en:
   - **https://stellar.holatia.app/contrato.html**
   - O con query param: **https://stellar.holatia.app/contrato.html?contract=C...**

**Mientras tanto (para testing en PR):**

Si necesitas probar antes del merge, puedes:
- Usar el preview deploy de Vercel del PR (si está configurado)
- O abrir `site/contrato.html` localmente con `python -m http.server 8000` (desde el directorio `site/`)

## Uso del frontend

### Pre-requisitos para Edgar

- **2 wallets configuradas** (Varial/Freighter):
  - **Wallet 1** (admin, merchant, receiver): Usada para `set_merchant_status`, `mark_verified`, `validate_cashout`
  - **Wallet 2** (sender): Usada para `initialize_reservation` (dos veces, para dos reservas)
  - _Razón:_ `mark_verified` requiere que el caller ≠ sender de la reserva
- **Fondos**:
  - Wallet 1: ~5 XLM para fees + 0.10 USDC (opcional, para receiver)
  - Wallet 2: ~5 XLM para fees + 0.20 USDC (dos reservas de 0.10 USDC cada una)
  - **Total estimado:** ~10 XLM + 0.20 USDC (las dos reservas se crean desde wallet2)

### Flujo de prueba completo (5 funciones)

1. **Abrir la página:**
   - URL: `https://stellar.holatia.app/contrato.html?contract=<TU-CONTRACT-ID>`
   - Reemplaza `<TU-CONTRACT-ID>` con el Contract ID del deploy

2. **Conectar Wallet 1** (admin/merchant/receiver)

3. **Función 1: set_merchant_status**
   - Dirección: (pegar la dirección de Wallet 1)
   - Marcar "Activar"
   - Click "Ejecutar set_merchant_status"
   - Firmar en Varial/Freighter
   - **Copiar link de Stellar Expert** (1/5)

4. **Desconectar y conectar Wallet 2** (sender)

5. **Función 2: initialize_reservation (primera reserva)**
   - Receiver: (dirección de Wallet 1)
   - Merchant: (dirección de Wallet 1)
   - Monto: `0.10` USDC
   - Expiración: `3600` segundos (1 hora)
   - Click "Ejecutar initialize_reservation"
   - Firmar (bloquea 0.10 USDC)
   - Anotar el **reservation_id** (ID 0 si es la primera)
   - **Copiar link TX** (2/5)

6. **Desconectar y volver a conectar Wallet 1** (admin)

7. **Función 3: mark_verified (en la primera reserva)**
   - ID de reserva: `0` (o el ID del paso 5)
   - Click "Ejecutar mark_verified"
   - Firmar
   - **Copiar link TX** (3/5)

8. **Función 4: validate_cashout (liquida la primera reserva)**
   - ID de reserva: `0` (mismo ID)
   - Click "Ejecutar validate_cashout"
   - Firmar (libera USDC al merchant - fee 25 bps)
   - **Copiar link TX** (4/5)

9. **Desconectar y conectar Wallet 2** (sender)

10. **Crear segunda reserva con initialize_reservation**
    - Mismo flujo que paso 5
    - Anotar el **nuevo reservation_id** (ID 1)
    - NO copiar este link (no cuenta para las 5)

11. **Desconectar y conectar Wallet 1** (admin) o Wallet 2 (sender)

12. **Función 5: open_dispute (en la segunda reserva)**
    - ID de reserva: `1` (la segunda reserva)
    - Razón: `Prueba de disputa en hackathon`
    - Click "Ejecutar open_dispute"
    - Firmar
    - **Copiar link TX** (5/5)

**Resultado:** 5 links de Stellar Expert para las 5 funciones principales.

### (Opcional) Registrar un recibo TIA para settle_with_receipt

**IMPORTANTE:** `settle_with_receipt` NO está incluida en las 5 funciones principales del hackathon. Es una función extra que requiere setup adicional.

El contrato requiere que los recibos estén registrados con `register_receipt` antes de usarlos en `settle_with_receipt`.

**Problema:** El endpoint `/v1/route` es x402-paid (pago por llamada en USDC). Un `curl` simple devuelve `402 Payment Required`.

**Opciones:**

1. **Implementar cliente x402** que paga en USDC por la llamada (ver `backend/src/lib/receipt.ts`)
2. **Mock para testing:** Generar una firma ed25519 manualmente (requiere `TIA_RECEIPT_SECRET`)
3. **Skip settle_with_receipt:** Usa `validate_cashout` en su lugar (incluida en las 5 funciones)

**Si decides implementarlo:**

```bash
# 1. Obtener recibo del backend (requiere x402 payment)
# Ver https://github.com/aorumbayev/x402-pay para cliente de ejemplo

# 2. Invocar register_receipt desde CLI
stellar contract invoke \
  --id <CONTRACT-ID> \
  --source tu-identidad \
  --network mainnet \
  -- \
  register_receipt \
  --submitter <G-WALLET1> \
  --receipt_hash <HASH-HEX-64-CHARS> \
  --cid <IPFS-CID> \
  --signature <SIGNATURE-HEX-128-CHARS>

# 3. Luego usar en settle_with_receipt desde el frontend
```

## Funciones adicionales (documentación de referencia)

### cancel_reservation

Cancela una reserva NO verificada y devuelve el USDC al sender.

```bash
stellar contract invoke \
  --id <CONTRACT-ID> \
  --source tu-identidad \
  --network mainnet \
  -- \
  cancel_reservation \
  --caller <G-SENDER-O-RECEIVER> \
  --reservation_id <ID>
```

### refund_expired

Devuelve 100% del USDC al sender si la reserva está verificada, no liquidada y expirada.

```bash
stellar contract invoke \
  --id <CONTRACT-ID> \
  --source tu-identidad \
  --network mainnet \
  -- \
  refund_expired \
  --caller <G-SENDER-O-ADMIN> \
  --reservation_id <ID>
```

### resolve_dispute

Resuelve una disputa (solo admin). Libera fondos al merchant o devuelve al sender.

```bash
stellar contract invoke \
  --id <CONTRACT-ID> \
  --source tu-identidad \
  --network mainnet \
  -- \
  resolve_dispute \
  --reservation_id <ID> \
  --release_to_merchant true
```

### validate_cashout

Alternativa a `settle_with_receipt` sin requerir recibo. Requiere firma del merchant y receiver.

```bash
stellar contract invoke \
  --id <CONTRACT-ID> \
  --source tu-identidad \
  --network mainnet \
  -- \
  validate_cashout \
  --merchant <G-MERCHANT> \
  --reservation_id <ID>
```

## Resumen de costos estimados

- **XLM para fees:** ~10 XLM total (deploy + 7 invocaciones: 5 principales + 2 initialize extra)
  - Deploy con constructor: ~1-2 XLM
  - Cada invocación: ~0.3-0.5 XLM
- **USDC bloqueado:** 0.20 USDC total (dos reservas de 0.10 USDC cada una)
  - Primera reserva: se liquida con `validate_cashout`
  - Segunda reserva: se disputa con `open_dispute`
- **Fee del contrato:** 0.25% sobre el monto = 0.00025 USDC por reserva liquidada

## Troubleshooting

### Error: "Contract not found"
- Verifica que el Contract ID es correcto
- Confirma que estás en la red correcta (mainnet)

### Error: "Account not found" o "Insufficient balance"
- Asegúrate de que tu cuenta tiene fondos XLM
- Para mainnet, usa el [Stellar Laboratory](https://laboratory.stellar.org/) para verificar el saldo

### Error: "NotVerifier" en mark_verified
- El caller debe ser el admin o el verifier configurado
- El caller NO puede ser el mismo que el sender de la reserva

### Error: "NotMerchant" en initialize_reservation o validate_cashout
- El merchant debe estar activado con `set_merchant_status` primero
- Verifica que la dirección del merchant es correcta

### Error: "ReceiptNotFound" en settle_with_receipt
- El recibo debe estar registrado primero con `register_receipt`
- Verifica que el hash del recibo es correcto (64 caracteres hex)

## Recursos

- **Stellar Expert:** https://stellar.expert/explorer/public
- **Código fuente del contrato:** `contracts/remesa-tia-stellar/src/lib.rs`
- **Backend TIA (recibos):** https://x402.holatia.app
- **Documentación Stellar:** https://developers.stellar.org/docs/build/smart-contracts
- **Documentación Soroban CLI:** https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup

## Notas de seguridad

- **NO** compartas tu `TIA_RECEIPT_SECRET` ni las claves privadas de tus identidades
- El frontend **NO** debe exponer `TIA_RECEIPT_SECRET`
- Los recibos se obtienen del backend TIA, no se generan client-side
- Usa montos pequeños (0.10 USDC) para pruebas en mainnet
- Este es un contrato de prueba de concepto; NO usar en producción sin auditoría completa

---

**Versión del contrato:** v0_d1  
**Fecha:** Noviembre 2026  
**Hackathon:** Ship It (deadline Nov 27, 21:00 CDMX)
