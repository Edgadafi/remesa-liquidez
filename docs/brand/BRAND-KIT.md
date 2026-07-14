# TIA — Brand Kit para Cursor

> Documento de referencia de diseño para uso directo en Cursor AI.  
> Pega este archivo como contexto en cualquier prompt de UI, landing page, componente o deck.  
> Versión: 1.0 · Fase: Bridge Accelerator MVP → Mainnet

---

## 1. Decisión estratégica fundacional

**TIA es una marca de consumidor.** No una marca de protocolo.

El stack tecnológico (Solana, USDC, MXNe, World ID, Blinks) es infraestructura — va en la ficha técnica del pitch, no en el logo. La identidad visual se construye para Doña Carmen recibiendo dinero en su tiendita, y la historia para inversores es: "tenemos 10,000 Doñas Carmens."

**Tagline oficial:** `Send dollars. Cash out at your corner store.`  
**Tagline ES (B2C):** `Manda dólares. Cóbralos en tu tienda de la esquina.`  
**Nombre del asistente conversacional:** TIA  
**Canal primario:** WhatsApp  
**Red blockchain:** Solana  
**Stablecoins:** USDC · MXNe  

---

## 2. Design Tokens

Implementación en repo: `web/styles/tia-brand.css` · `web/lib/tia-brand.ts`

### 2.1 Paleta de color

```css
:root {
  --color-forest:       #0F2318;
  --color-institution:  #1A4A2E;
  --color-cream:        #F5F0E8;
  --color-grove:        #2A6A3E;
  --color-sage:         #4A7A5E;
  --color-muted-green:  #7AAE8A;
  --color-soft-green:   #A8C5B0;
  --color-calor:        #C9A84C;
  --color-calor-warm:   #C1603A;
  --color-alert:        #E85D26;
  --color-solana:       #9945FF;
  --color-text-primary:   #F5F0E8;
  --color-text-dark:      #1A4A2E;
  --color-text-secondary: #4A7A5E;
  --color-text-muted:     #7AAE8A;
}
```

### 2.2 Uso de color por superficie

| Superficie | Fondo | Texto principal | Acento |
|---|---|---|---|
| Pitch deck (slides oscuras) | `--color-forest` | `--color-cream` | `--color-calor` |
| Web / landing page | `--color-cream` | `--color-institution` | `--color-calor` |
| Admin Dashboard | `--color-forest` | `--color-cream` | `--color-grove` |
| Merchant UI (tiendita) | `--color-cream` | `--color-institution` | `--color-calor-warm` |
| WhatsApp onboarding | N/A (native) | N/A | `--color-calor-warm` |
| Pills / badges | `--color-institution` | `--color-muted-green` | `--color-calor` (left bar) |
| Alertas de liquidez | `--color-forest` | `--color-alert` | Solo en Admin |

**Regla dura:** `--color-alert` nunca aparece como color de marca. Solo como estado funcional en el Admin Dashboard.

---

## 3. Tipografía

- **Display / Wordmark:** Georgia, serif, 700
- **UI / Body:** system-ui sans-serif, 400/500
- **Mono:** DM Mono (tx hashes)

Ver escala en `web/styles/tia-brand.css`.

---

## 4. Logo & Isotype

Assets SVG: `web/public/brand/`

| Archivo | Uso |
|---------|-----|
| `tia-monogram.svg` | Favicon, WhatsApp avatar |
| `tia-logo-horizontal-light.svg` | Web header |
| `tia-logo-horizontal-dark.svg` | Deck slides |

Componente React: `web/components/TiaLogo.tsx`

---

## 5–10. Componentes, grid, voz, Cursor prompt

Ver archivo completo en control de versiones — secciones 5–10 idénticas al Brand Kit v1.0 aprobado por el equipo.

### Prompt de contexto recomendado para Cursor

```
Estoy construyendo la interfaz de TIA, una app de remesas para LATAM que opera vía WhatsApp y Solana.

Usa este sistema de diseño:
- Paleta: Forest #0F2318, Institution #1A4A2E, Cream #F5F0E8, Calor #C9A84C, Calor Warm #C1603A, Alert #E85D26 (solo low-liquidity)
- Tipografía display: Georgia serif bold. UI: system-ui sans-serif.
- Pills: fondo #1A4A2E, texto #7AAE8A, left-bar 3px #C9A84C
- Tagline: "Send dollars. Cash out at your corner store."
- TIA es marca de consumidor, no protocolo. No usar lenguaje técnico en UI de usuario final.
```

---

*TIA Brand Kit v1.0 · Bridge Accelerator Phase*
