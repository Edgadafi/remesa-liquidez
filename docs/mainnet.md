# Despliegue y uso del contrato TIA en Stellar Mainnet

Este documento explica cómo desplegar el contrato de escrow `remesa-tia-stellar` en Stellar Mainnet y cómo invocar sus 5 funciones principales desde el frontend.

## Tabla de funciones principales

| Función | Qué hace | Pantalla/Componente | Archivo:Línea | Link TX |
|---------|----------|---------------------|---------------|---------|
| `set_merchant_status` | Activa o desactiva un comerciante en el sistema. Solo el admin puede llamarla. | Contrato TIA en mainnet | site/contrato.html:242 | [Por completar] |
| `initialize_reservation` | Crea una reserva bloqueando USDC en el contrato. El sender firma y paga la operación. | Contrato TIA en mainnet | site/contrato.html:263 | [Por completar] |
| `mark_verified` | Marca una reserva como verificada (KYC/compliance aprobado). Solo admin/verifier puede llamarla, y el caller NO puede ser el sender de la reserva. | Contrato TIA en mainnet | site/contrato.html:288 | [Por completar] |
| `settle_with_receipt` | Liquida una reserva usando un recibo TIA registrado y verificado. Requiere firma del merchant y del receiver. Paga al merchant (neto - 25 bps) y al treasury (25 bps). | Contrato TIA en mainnet | site/contrato.html:302 | [Por completar] |
| `open_dispute` | Abre una disputa en una reserva, congelándola. El sender, admin o verifier pueden llamarla. | Contrato TIA en mainnet | site/contrato.html:324 | [Por completar] |

## Requisitos previos

- **Stellar CLI** instalado y configurado: `brew install stellar/tap/stellar-cli` (macOS) o [instrucciones oficiales](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup)
- **Rust toolchain** con target `wasm32-unknown-unknown`: `rustup target add wasm32-unknown-unknown`
- **Identidad Stellar** configurada con fondos en mainnet: `stellar keys generate tu-identidad --network mainnet`
- **Fondos XLM** en la cuenta para pagar fees de deploy y configuración (~10-20 XLM)
- **Parámetros del constructor**:
  - `--admin`: Dirección G... del administrador del contrato
  - `--token`: Dirección del USDC SAC en mainnet: `CCMSA3JFWUTMJQCPRMM56B2YSGJVVFG2LK4KCA34NHD2RRGDHMLZ4RJR`
  - `--treasury`: Dirección G... donde se enviarán los fees del 0.25%

## Pasos para desplegar en Mainnet

### 1. Compilar el contrato

Desde la raíz del repositorio:

```bash
cd contracts/remesa-tia-stellar
stellar contract build
```

Esto genera el archivo WASM optimizado en `target/wasm32-unknown-unknown/release/remesa_tia_stellar.wasm`.

### 2. Desplegar el contrato

**IMPORTANTE:** Reemplaza `<tu-identidad>`, `<G-ADMIN>` y `<G-TREASURY>` con tus valores reales.

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/remesa_tia_stellar.wasm \
  --source tu-identidad \
  --network mainnet
```

El comando devolverá el **Contract ID** (formato `C...`). Guárdalo, lo necesitarás para configurar el frontend y para invocar funciones.

### 3. Invocar el constructor

El contrato usa `__constructor` para inicializarse. Debes llamarlo una sola vez después del deploy:

```bash
stellar contract invoke \
  --id <CONTRACT-ID> \
  --source tu-identidad \
  --network mainnet \
  -- \
  __constructor \
  --admin <G-ADMIN> \
  --token CCMSA3JFWUTMJQCPRMM56B2YSGJVVFG2LK4KCA34NHD2RRGDHMLZ4RJR \
  --treasury <G-TREASURY>
```

**Parámetros:**
- `--admin`: Dirección pública G... del admin (ej: tu wallet principal)
- `--token`: USDC SAC en mainnet (Circle USDC)
- `--treasury`: Dirección G... que recibirá los fees del 0.25%

### 4. Verificar el despliegue

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

### 5. Configurar el frontend

Edita el archivo `site/contrato.html` y actualiza la constante `CONFIG.contractId`:

```javascript
const CONFIG = {
  contractId: '<CONTRACT-ID>',  // ← Reemplaza con el Contract ID del paso 2
  usdcAddress: 'CCMSA3JFWUTMJQCPRMM56B2YSGJVVFG2LK4KCA34NHD2RRGDHMLZ4RJR',
  networkPassphrase: Networks.PUBLIC,
  rpcUrl: 'https://soroban-rpc.mainnet.stellar.gateway.fm',
};
```

### 6. Desplegar el frontend en Vercel

El proyecto `tia-stellar` en Vercel sirve el directorio `site/` como sitio estático.

**Opción A: Deploy automático (si Vercel está conectado al repo)**

Haz commit y push del cambio:

```bash
git add site/contrato.html docs/mainnet.md
git commit -m "feat: página contrato TIA mainnet + docs despliegue"
git push origin cursor/ship-it-funciones-nuevas-597d
```

Vercel desplegará automáticamente. La página estará en:
- **https://stellar.holatia.app/contrato.html**

**Opción B: Deploy manual con Vercel CLI**

```bash
cd site
vercel --prod
```

## Uso del frontend

### Pre-requisitos para Edgar

- **2 wallets configuradas** (Varial/Freighter):
  - **Wallet 1** (admin, merchant, receiver): Usada para `set_merchant_status`, `mark_verified`, `settle_with_receipt`
  - **Wallet 2** (sender): Usada para `initialize_reservation`
  - _Razón:_ `mark_verified` requiere que el caller ≠ sender de la reserva
- **Fondos**:
  - Wallet 1: ~5 XLM para fees + 0.10 USDC (receiver)
  - Wallet 2: ~3 XLM para fees + 0.10 USDC (sender, bloqueará en el contrato)
  - **Total estimado:** ~10 XLM + 0.20 USDC

### Flujo de prueba completo

1. **Conectar Wallet 1** en https://stellar.holatia.app/contrato.html
2. **set_merchant_status:**
   - Dirección: (pegar la dirección de Wallet 1)
   - Marcar "Activar"
   - Click "Ejecutar set_merchant_status"
   - Firmar en Varial/Freighter
   - Copiar link de Stellar Expert

3. **Desconectar y conectar Wallet 2**
4. **initialize_reservation:**
   - Receiver: (dirección de Wallet 1)
   - Merchant: (dirección de Wallet 1)
   - Monto: `0.10` USDC
   - Expiración: `3600` segundos (1 hora)
   - Click "Ejecutar initialize_reservation"
   - Firmar (bloquea 0.10 USDC)
   - Anotar el **reservation_id** del evento (ver en Stellar Expert)
   - Copiar link TX

5. **Desconectar y volver a conectar Wallet 1**
6. **mark_verified:**
   - ID de reserva: (el ID del paso 4)
   - Click "Ejecutar mark_verified"
   - Firmar
   - Copiar link TX

7. **settle_with_receipt:**
   - ID de reserva: (mismo ID)
   - Hash del recibo: (obtener de backend o registrar primero con `register_receipt`)
   - Click "Ejecutar settle_with_receipt"
   - Firmar (libera USDC al merchant - fee)
   - Copiar link TX

   **Nota sobre recibos:** Para obtener un hash válido:
   ```bash
   curl -s https://x402.holatia.app/v1/route?amount=100 -D - | grep X-TIA-Audit-Hash
   ```
   Extrae el hash y luego regístralo con `register_receipt` (ver sección siguiente).

8. **open_dispute** (opcional, en una nueva reserva):
   - Crear otra reserva (pasos 4-6)
   - ID de reserva: (nueva reserva)
   - Razón: `Prueba de disputa en hackathon`
   - Click "Ejecutar open_dispute"
   - Firmar
   - Copiar link TX

### Registrar un recibo TIA (pre-requisito para settle_with_receipt)

El contrato requiere que los recibos estén registrados con `register_receipt` antes de usarlos en `settle_with_receipt`.

**Paso 1: Obtener un recibo del backend TIA**

```bash
curl -s https://x402.holatia.app/v1/route?amount=100 | jq .
```

Extrae de la respuesta:
- `receipt.hash` (sha256 del recibo)
- `receipt.signature` (firma ed25519 en base64)
- `receipt.cid` (IPFS CID)

**Paso 2: Convertir la firma a bytes**

La firma viene en base64. Conviértela a hex (64 bytes, 128 caracteres hex).

**Paso 3: Invocar register_receipt desde CLI**

```bash
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
```

**Paso 4: Verificar que el recibo está registrado**

```bash
stellar contract invoke \
  --id <CONTRACT-ID> \
  --source tu-identidad \
  --network mainnet \
  -- \
  get_receipt \
  --receipt_hash <HASH-HEX-64-CHARS>
```

Debe devolver el `ReceiptRecord` con id, cid, signer, etc.

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

- **XLM para fees:** ~10 XLM total (deploy + configuración + 5 invocaciones)
- **USDC bloqueado:** 0.10 USDC por reserva de prueba
- **Fee del contrato:** 0.25% sobre el monto (0.00025 USDC en 0.10 USDC)

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
