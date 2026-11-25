# Reel — piloto TIA · BAF Builders Elite × Stellar

Reel 9:16 (~26 s) para comunicar la actualización de [holatia.app](https://holatia.app) y el CTA del piloto: **3 fintechs, 30 días, 0%**, corredor EE. UU. a México.

Regenerar: `python3 docs/gtm/reel/render_reel.py` (Pillow + ffmpeg + numpy). La cama instrumental se sintetiza en el script (original, volumen bajo); no hay samples de terceros.

| Entrega | Uso |
|---|---|
| `/opt/cursor/artifacts/tia-piloto-baf-reel.mp4` | Instagram Reels, TikTok, Stories, X |
| `/opt/cursor/artifacts/tia-piloto-baf-linkedin-1x1.jpg` | Feed LinkedIn / Discord BAF |
| `docs/gtm/reel/frames/` | Stills si el video se recorta (gitignored) |

Hooks y subtítulos van sincronizados con cada bloque (~26 s). Se puede grabar VO encima; bajar o mute la cama.

## Voice-over (ES, ~22 s)

En el corredor de Estados Unidos a México, el costo se esconde en el tipo de cambio.
TIA compara y cotiza rutas USD a MXN, y deja un recibo firmado en IPFS.
No ejecutamos pagos. No custodiamos fondos. No guardamos PII.
Tres fintechs. Treinta días. Cero comisiones.
Aplica en holatia.app.

## Caption Instagram / TikTok / X (ES)

Holatia.app actualizado.

TIA es capa de inteligencia para fintechs del corredor EE. UU.–México: cotización USD/MXN, comparación de rutas y recibos verificables en IPFS (Nirium Audit Trail).

Compara y cotiza. No ejecuta pagos. No custodia fondos. No sustituye un SPEI.

Piloto gratuito de 30 días · 3 cupos · cierre 2026.
Cotizar, rutear y auditar a 0% durante el piloto.

Aplica: holatia.app

#Stellar #BAFBuilders #Remesas #Fintech #LATAM #x402

## Caption LinkedIn / BAF ambassadors (EN)

We just shipped an update to holatia.app.

TIA is an intelligence layer for US–Mexico corridor fintechs: USD/MXN quotes, route comparison, and signed IPFS receipts (Nirium Audit Trail). We quote and compare. We do not execute payments, custody funds, store PII, or replace SPEI.

Offer: a 30-day free pilot for 3 fintechs (close 2026). Quote, route, and audit at 0% during the pilot; outside the slot, calls settle in USDC via x402. Verification at /v1/audit remains free.

Apply: https://holatia.app

For BAF Builders Elite and the Stellar community — happy to intro a corridor operator.

## Qué no decir

- No “ejecutamos remesas”, “custodiamos USDC”, ni “anclaje on-chain”.
- No inventar clientes de pago (hoy: prototipo, 0 clientes de pago).
- ~US$63.3B y ~4.54% son del corredor / World Bank, no una medición de TIA.
- El escrow Soroban no es este producto; no mencionarlo en el reel.

## Dirección de arte

El reel es holatia.app en vertical: tokens de `site/index.html` (Forest `#0F2318`, Cream `#F5F0E8`, Calor `#C9A84C`), logo circular de `site/logo.png`, nav, badge, métricas con barra dorada, tarjetas `#fffdf8` y botones `.btn-primary`. Fondo crema con grano de papel y una marca de agua suave del logo — sin mapas, sellos ni ilustraciones ajenas al sitio. Pillow + ffmpeg.

## Ritmo y ganchos

Transiciones `slideup` 0.26 s (scroll de la landing). Zoom lento en hero, tabla SPEI/Stablecoin/Bitso y beneficios del piloto. Cama instrumental original a volumen bajo.

Hooks debajo de la nav; subtítulos en la franja media-baja, encima del footer. No cubren CTAs ni campos del formulario.

| Tiempo | Bloque | Hook (arriba) | Subtítulo (media-baja) |
|---|---|---|---|
| 00:00–00:04 | Hero | Inteligencia USD a MXN sin custodia | Cotiza, compara y audita sin mover dinero |
| 00:04–00:08 | El problema | ¿Respaldas cada tasa que cotizas? | Sin custodia · Sin PII · Sin fricción regulatoria |
| 00:08–00:13 | Demo | Compara rieles antes de ejecutar | SPEI · Stablecoin · Bitso FX en un vistazo |
| 00:13–00:18 | Cómo funciona | Tú ejecutas. TIA deja la prueba | Cotiza · Compara · Decide · Audita en IPFS |
| 00:18–00:22 | Piloto | 30 días gratis · Solo 3 fintechs | Cero custodia y verificación en /v1/audit gratis |
| 00:22–00:26 | Cierre | Asegura tu lugar en el piloto | Aplica en holatia.app · Cierre 2026 |

## Shot list

1. Hero móvil · logo circular · badge de 3 cupos · H1 y CTAs del sitio
2. El problema · tres cards (precios opacos / sin auditoría / cero custodia)
3. Corredor · métricas ~4.54% / Bitso / IPFS y chrome de la tabla demo
4. Cómo funciona · cuatro pasos con `.step-n`
5. Piloto · 0% / cero custodia / OpenAPI
6. Cierre · callout 30 días / 3 cupos / cero custodia + holatia.app / stellar.holatia.app
