# Ship It! — Funciones Nuevas para el Hackathon

**Versión del contrato:** `v0_d1`

Este documento contiene las instrucciones exactas para desplegar o actualizar el contrato Soroban de Remesa TIA en **testnet** con las 3 nuevas funciones públicas del desafío "Función nueva" del hackathon.

## Nuevas Funciones

### 1. `settle_with_receipt`

Libera fondos en garantía al comerciante **solo si** existe un recibo TIA registrado y no ha sido usado antes.

**Firma:**
```rust
pub fn settle_with_receipt(
    env: Env,
    merchant: Address,
    reservation_id: u64,
    receipt_hash: BytesN<32>,
) -> Result<(), Error>
```

**Qué hace:**
- Similar a `validate_cashout`, pero requiere un recibo TIA registrado en el contrato
- Verifica que el recibo existe (con `register_receipt` previo)
- Verifica que el recibo NO ha sido usado para liquidar otra reserva
- Vincula el recibo a la reserva (previene reuso)
- Libera fondos al comerciante (monto neto - 25 bps al treasury)
- Marca la reserva como `settled`
- Emite evento `rsv_settled_rcpt`

**Validaciones:**
- Requiere autenticación del `merchant` y del `receiver`
- La reserva debe estar verificada
- La reserva NO debe estar expirada
- La reserva NO debe estar disputada
- El comerciante debe estar activo
- El `merchant` debe coincidir con el asignado en la reserva
- El recibo debe existir en el registro
- El recibo NO debe haber sido usado antes

**Errores:**
- `ReceiptNotFound` (#19): el recibo no está registrado
- `ReceiptAlreadyUsed` (#20): el recibo ya fue usado para otra reserva
- `Disputed` (#21): la reserva está en disputa
- Más todos los errores de `validate_cashout`

---

### 2. `open_dispute`

Congela una reserva activa. Mientras esté disputada, `validate_cashout`, `settle_with_receipt`, `cancel_reservation` y `refund_expired` quedan bloqueadas.

**Firma:**
```rust
pub fn open_dispute(
    env: Env,
    caller: Address,
    reservation_id: u64,
    reason_hash: BytesN<32>,
) -> Result<(), Error>
```

**Qué hace:**
- Marca la reserva como `disputed = true`
- Bloquea todas las operaciones de liquidación o reembolso
- Emite evento `rsv_disputed` con el `caller` y el hash del motivo
- Solo el sender, admin o verifier pueden abrir una disputa

**Validaciones:**
- Requiere autenticación del `caller`
- La reserva NO debe estar `settled`
- La reserva NO debe estar disputada ya
- El `caller` debe ser sender, admin o verifier

**Errores:**
- `NotAuthorizedToDispute` (#22): el caller no tiene permiso
- `Settled` (#5): la reserva ya fue liquidada
- `Disputed` (#21): ya hay una disputa abierta

---

### 3. `resolve_dispute`

Resuelve una disputa (solo admin). Libera fondos al comerciante o reembolsa al sender, cierra la disputa y emite evento.

**Firma:**
```rust
pub fn resolve_dispute(
    env: Env,
    reservation_id: u64,
    release_to_merchant: bool,
) -> Result<(), Error>
```

**Qué hace:**
- **Si `release_to_merchant = true`:** transfiere fondos al comerciante (con fee de 25 bps)
- **Si `release_to_merchant = false`:** reembolsa 100% al sender (sin fee)
- Marca la reserva como `settled = true` y `disputed = false`
- Emite evento `dispute_resolved_merchant` o `dispute_resolved_refund`

**Validaciones:**
- Requiere autenticación del admin (solo admin)
- La reserva NO debe estar `settled`
- La reserva DEBE estar disputada

**Errores:**
- `NotAdmin` (#23): el caller no es admin
- `Settled` (#5): la reserva ya fue liquidada
- `NotDisputed` (#24): la reserva no está disputada

---

## Valor para Fintechs Piloto

Estas funciones permiten:

1. **Proof-of-payout vinculado:** con `settle_with_receipt`, el comerciante demuestra que pagó al beneficiario usando un recibo TIA verificable on-chain. Esto reduce el riesgo de fraude y mejora la auditoría.

2. **Protección contra fraude:** con `open_dispute`, cualquier parte autorizada puede congelar una reserva sospechosa antes de que se liquide. Esto protege tanto al remitente como al comerciante.

3. **Resolución administrativa:** con `resolve_dispute`, el admin de TIA puede intervenir en casos de fraude confirmado o error, devolviendo fondos a la parte correcta. Esto es crítico para mantener la confianza en el piloto.

Estas funciones son ideales para:
- **Fintechs reguladas** que necesitan proof-of-delivery verificable
- **Pilotos con comerciantes nuevos** donde el riesgo de fraude es más alto
- **Casos de soporte** donde un usuario reporta que no recibió el pago en efectivo

---

## Prerequisitos

- Ubuntu (o Linux compatible)
- [Stellar CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup#install-the-stellar-cli) instalado
- Acceso a tu identidad de testnet (ej. `stellar keys generate <tu-identidad> --network testnet --fund`)
- El contrato compilado (ver sección "Compilar")

**Nota:** estas instrucciones NO tocan mainnet. Todo es testnet.

---

## 1. Compilar el Contrato

```bash
cd contracts/remesa-tia-stellar
cargo test
cargo build --target wasm32-unknown-unknown --release
```

El WASM estará en:
```
target/wasm32-unknown-unknown/release/remesa_tia_stellar.wasm
```

**Verifica que `cargo test` pase todas las pruebas.** La salida debe mostrar `53 passed`.

---

## 2. Desplegar o Actualizar en Testnet

### Escenario A: Primer Deploy (Contrato Nuevo)

Si NO tienes un contrato desplegado en testnet, o si el contrato actual NO es actualizable:

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/remesa_tia_stellar.wasm \
  --source-account <tu-identidad> \
  --network testnet \
  -- \
  --admin $(stellar keys address <tu-identidad>) \
  --token CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA \
  --treasury $(stellar keys address <tu-identidad>)
```

La respuesta será una dirección de contrato como `CCCCCC...`. Guárdala.

**Reemplaza:**
- `<tu-identidad>` con el nombre de tu identidad Stellar (ej. `tia-testnet`)
- `--treasury` con la dirección del treasury (puede ser la tuya para testnet)

### Escenario B: Actualizar Contrato Existente (Upgrade)

Si el contrato actual tiene una función `upgrade` o fue desplegado con soporte de upgrade, puedes actualizarlo. **Revisa el contrato actual primero:**

```bash
stellar contract invoke \
  --id <CONTRACT_ID_ACTUAL> \
  --source-account <tu-identidad> \
  --network testnet \
  -- \
  version
```

Si la versión es `v0_c3` o anterior y el contrato es actualizable, consulta al equipo de TIA sobre el proceso de upgrade. **El contrato mainnet actual (`CBCWBOZBCKJ4FSCMQ2OJUI3UDDNT7QSPURTSAELKESPY6D7DUA22M5MP`) NO es actualizable según el README.**

**Para testnet:** recomendamos un **deploy nuevo** (Escenario A) para evitar complicaciones.

---

## 3. Configurar el Contrato (Solo después de Deploy Nuevo)

### 3.1 Registrar un Comerciante

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account <tu-identidad> \
  --network testnet \
  --send yes \
  -- \
  set_merchant_status \
  --merchant <direccion-del-comerciante> \
  --active true
```

Reemplaza `<direccion-del-comerciante>` con la dirección G... del comerciante en testnet.

### 3.2 Configurar el Receipt Signer (Opcional, para `settle_with_receipt`)

Si vas a probar `settle_with_receipt`, necesitas configurar la clave pública del firmante de recibos TIA:

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account <tu-identidad> \
  --network testnet \
  --send yes \
  -- \
  set_receipt_signer \
  --signer <32_bytes_hex>
```

**Nota:** el `--signer` debe ser la clave pública ed25519 de TIA en formato hex (64 caracteres). Contacta al equipo de TIA para obtener esta clave.

---

## 4. Invocar las Funciones Nuevas en Testnet

### 4.1 Preparación: Crear una Reserva

Primero, necesitas una reserva activa para probar las funciones:

```bash
# Generar identidades de prueba si no las tienes
stellar keys generate sender-test --network testnet --fund
stellar keys generate receiver-test --network testnet --fund

# Inicializar reserva
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account sender-test \
  --network testnet \
  --send yes \
  -- \
  initialize_reservation \
  --sender $(stellar keys address sender-test) \
  --receiver $(stellar keys address receiver-test) \
  --merchant <direccion-del-comerciante> \
  --amount 10000000 \
  --expiry_seconds 3600
```

La respuesta será el `reservation_id` (ej. `0`).

### 4.2 Marcar la Reserva como Verificada

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account <tu-identidad> \
  --network testnet \
  --send yes \
  -- \
  mark_verified \
  --caller $(stellar keys address <tu-identidad>) \
  --reservation_id 0
```

---

### 4.3 Invocar `settle_with_receipt`

**Prerequisitos:**
1. Registrar un recibo TIA en el contrato (con `register_receipt`)
2. Tener el `receipt_hash` de ese recibo

```bash
# Paso 1: Registrar un recibo (simulado para testing)
# Necesitas el hash del recibo, el CID, y la firma ed25519 válida.
# Ejemplo con valores placeholder:
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account <tu-identidad> \
  --network testnet \
  --send yes \
  -- \
  register_receipt \
  --submitter $(stellar keys address <tu-identidad>) \
  --receipt_hash 0x0101010101010101010101010101010101010101010101010101010101010101 \
  --cid "bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy" \
  --signature 0x0202020202020202020202020202020202020202020202020202020202020202020202020202020202020202020202020202020202020202020202020202020

# Paso 2: Liquidar con el recibo
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account <direccion-del-comerciante> \
  --network testnet \
  --send yes \
  -- \
  settle_with_receipt \
  --merchant <direccion-del-comerciante> \
  --reservation_id 0 \
  --receipt_hash 0x0101010101010101010101010101010101010101010101010101010101010101
```

**Nota:** para un recibo TIA real, usa el script `scripts/receipt-args.mjs` del repositorio:

```bash
eval "$(node scripts/receipt-args.mjs <CID_REAL>)"
# Esto exporta RECEIPT_HASH, RECEIPT_CID, RECEIPT_SIGNER_HEX, RECEIPT_SIG
# Luego usa esas variables en las invocaciones
```

**Resultado esperado:** fondos transferidos al comerciante, evento `rsv_settled_rcpt` emitido, reserva marcada como `settled`.

---

### 4.4 Invocar `open_dispute`

```bash
# Crear una nueva reserva para disputar
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account sender-test \
  --network testnet \
  --send yes \
  -- \
  initialize_reservation \
  --sender $(stellar keys address sender-test) \
  --receiver $(stellar keys address receiver-test) \
  --merchant <direccion-del-comerciante> \
  --amount 10000000 \
  --expiry_seconds 3600

# Marcar como verificada
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account <tu-identidad> \
  --network testnet \
  --send yes \
  -- \
  mark_verified \
  --caller $(stellar keys address <tu-identidad>) \
  --reservation_id 1

# Abrir disputa (como sender)
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account sender-test \
  --network testnet \
  --send yes \
  -- \
  open_dispute \
  --caller $(stellar keys address sender-test) \
  --reservation_id 1 \
  --reason_hash 0x9999999999999999999999999999999999999999999999999999999999999999
```

**Resultado esperado:** reserva marcada como `disputed = true`, evento `rsv_disputed` emitido.

**Verificar:**
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account <tu-identidad> \
  --network testnet \
  -- \
  get_reservation \
  --reservation_id 1
```

Deberías ver `"disputed": true`.

---

### 4.5 Invocar `resolve_dispute`

```bash
# Resolver a favor del comerciante
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account <tu-identidad> \
  --network testnet \
  --send yes \
  -- \
  resolve_dispute \
  --reservation_id 1 \
  --release_to_merchant true
```

**Resultado esperado:** fondos transferidos al comerciante (con fee), reserva marcada como `settled = true` y `disputed = false`, evento `dispute_resolved_merchant` emitido.

**Alternativamente, para reembolsar al sender:**
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account <tu-identidad> \
  --network testnet \
  --send yes \
  -- \
  resolve_dispute \
  --reservation_id 1 \
  --release_to_merchant false
```

**Resultado esperado:** fondos reembolsados al sender (sin fee), evento `dispute_resolved_refund` emitido.

---

## 5. Verificar Eventos

Después de cada invocación, puedes verificar los eventos emitidos usando Stellar Expert:

```
https://stellar.expert/explorer/testnet/contract/<CONTRACT_ID>
```

Busca los eventos:
- `rsv_settled_rcpt` (desde `settle_with_receipt`)
- `rsv_disputed` (desde `open_dispute`)
- `dispute_resolved_merchant` o `dispute_resolved_refund` (desde `resolve_dispute`)

---

## 6. Chequeo de Versión

Verifica que el contrato desplegado tenga la versión correcta:

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account <tu-identidad> \
  --network testnet \
  -- \
  version
```

**Respuesta esperada:** `v0_d1`

---

## Notas Importantes

1. **No usar en Mainnet:** estas instrucciones son solo para testnet. El contrato mainnet actual NO es actualizable.

2. **Nunca imprimir secret keys:** no ejecutes `stellar keys show <identidad>` en producción. Usa siempre `stellar keys address <identidad>` para obtener la dirección pública.

3. **Backups:** antes de desplegar, guarda una copia del contrato WASM y del `CONTRACT_ID` resultante.

4. **Testing:** ejecuta `cargo test` antes de cada deploy. Todos los tests (53) deben pasar.

5. **Gas y Fees:** testnet tiene fees bajos, pero cada invocación consume XLM. Asegúrate de que tus identidades estén fondeadas (`--fund` al generar).

---

## Resumen de Cambios

- **Nuevos errores:** `ReceiptNotFound`, `ReceiptAlreadyUsed`, `Disputed`, `NotAuthorizedToDispute`, `NotAdmin`, `NotDisputed`
- **Nuevo campo en `Reservation`:** `disputed: bool`
- **Nueva DataKey:** `ReceiptUsage(BytesN<32>)` para rastrear recibos usados
- **Nuevas funciones públicas:** `settle_with_receipt`, `open_dispute`, `resolve_dispute`
- **Validaciones agregadas:** todas las funciones de liquidación/reembolso ahora bloquean si `disputed = true`
- **Tests:** 53 tests pasan, incluyendo los nuevos casos para las 3 funciones

---

## Soporte

Para preguntas sobre el despliegue o las funciones nuevas, contacta al equipo de Remesa TIA en el canal de desarrollo.

**Hackathon:** estas funciones cumplen con los requisitos del desafío "Función nueva" (Ship It!): cambian estado, mueven fondos, tienen tests, y son desplegables/invocables en testnet.

---

**¡Listo para Ship It! 🚀**
