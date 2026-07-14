# Pitch Deck — Import Guide (Google Slides / Figma)

Archivos generados desde `pitch-deck-tia-dev3pack.md` con tokens **BRAND-KIT v1.0**.

## Archivos listos

| Archivo | Uso |
|---------|-----|
| `pitch-deck-tia-dev3pack.pptx` | **Google Slides** — importar directo |
| `pitch-deck-tia-dev3pack.html` | Preview en browser + export PDF |
| `figma-slides/*.svg` | **Figma** — 1 SVG = 1 frame 1280×720 |
| `generate-pitch-pptx.mjs` | Regenerar PPTX tras editar copy |

## Google Slides (recomendado)

1. Abre tu deck en Google Slides (o presentación en blanco).
2. **Archivo → Importar diapositivas → Subir** → `pitch-deck-tia-dev3pack.pptx`.
3. Importa **todas** las diapositivas (ahora **12 main + 6 appendix**).
4. Slides clave post-inflection: **6 Built to test · 7 Validation plan · 8 Success & learning**.
5. Edita placeholders `[Founder]`, `$X` en slides 11–12.

### Fuentes en Slides (opcional, match Brand Kit)

- Títulos: **Georgia Bold** · color `#F5F0E8`
- Cuerpo: **Arial / system** · color `#7AAE8A`
- Fondo slide: `#0F2318` · barra izquierda `#C9A84C`

## Figma

### Opción A — SVG frames (más control)

1. En Figma: nuevo file → frame **1280 × 720**.
2. Arrastra cada SVG de `figma-slides/` al canvas (01-cover.svg … 10-ask.svg + appendix).
3. **Plugins → Unsplash** o pega screenshots en placeholders.
4. Texto editable: desagrupa SVG solo si necesitas editar paths; mejor reemplazar text layers encima.

### Opción B — Import PPTX

1. Plugin **"Pitchdeck Presentation Studio"** o **"Slides to Figma"**.
2. Sube `pitch-deck-tia-dev3pack.pptx`.
3. Ajusta fonts si Georgia no está instalada.

## Regenerar tras cambios

```bash
cd remesa-liquidez
node docs/accelerator/week-04/generate-pitch-pptx.mjs
node docs/accelerator/week-04/generate-figma-slides.mjs
```

Edita copy en `pitch-deck-tia-dev3pack.md` primero, luego actualiza los `.mjs` o el HTML.

## Tokens (referencia rápida)

```
Background:  #0F2318  forest
Headline:    #F5F0E8  cream · Georgia bold
Body:        #7AAE8A  muted-green · system-ui
Accent bar:  #C9A84C  calor · 5–6px left border
Pills:       #1A4A2E  institution bg + calor left-bar
```

## Checklist pre-presentación (Kerna)

- [ ] Traction `[FILL]` completado con fecha
- [ ] Ask slide legible sin contexto
- [ ] Partner status labels correctos (Live / In discussion)
- [ ] Screenshots reales en 3, 4, 6
- [ ] Team con proof lines + LinkedIn
