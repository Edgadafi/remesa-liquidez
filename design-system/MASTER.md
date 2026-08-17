# TIA — Design System Master

> Generated from ui-ux-pro-max (`fintech status dashboard LATAM web3`) then **overridden by the TIA Brand Kit**. Do not apply the search’s gold/purple/Orbitron crypto palette.

**Product:** TIA (remesas US→MX, WhatsApp, Solana piloto / Stellar beta)  
**Stack:** Next.js 14 + TypeScript + CSS tokens (`web/styles/tia-brand.css`) — no Tailwind in this app  
**Pattern:** Minimalism & Swiss + LATAM brutalist (existing brand)  
**Surfaces:** Web/landing = cream; Status/data room = forest

## Brand (source of truth)

Keep forest green + cream. Serif display (Georgia) + sans UI is intentional hierarchy — not a bug.

| Role | Hex | CSS |
|------|-----|-----|
| Forest (admin bg) | `#0F2318` | `--color-forest` |
| Institution | `#1A4A2E` | `--color-institution` |
| Cream (web bg) | `#F5F0E8` | `--color-cream` |
| Grove | `#2A6A3E` | `--color-grove` |
| Calor (accent) | `#C9A84C` | `--color-calor` |
| Calor warm (CTA secondary) | `#C1603A` | `--color-calor-warm` |
| Alert (ops only) | `#E85D26` | `--color-alert` |
| On dark (body) | `#F5F0E8` | `--color-on-dark` |
| On dark muted (≥4.5:1) | `#D4E8DA` | `--color-on-dark-muted` |
| On cream (body) | `#1A4A2E` | `--color-text-dark` |
| On cream secondary (≥4.5:1) | `#2D5A3C` | `--color-text-secondary` |

**Do not use** `#7AAE8A` / `#A8C5B0` for small body text on forest or institution — contrast fails WCAG AA.

## Typography

- **Display / H1:** Georgia serif, 700 — headlines only
- **UI / body / nav:** system sans
- **Mono:** hashes, pubkeys — ≥13px, cream on dark, institution on cream
- Do not mix serif into labels, badges, or table values

## Layout

- Full-bleed surface (cream or forest), not a narrow card floating on the other color
- Shell: `min(960px, 100%)` centered; padding 24px (375) → 48px (1024+)
- Shared `SiteNav`: Inicio · Comercio · Status, `aria-current="page"`
- Status is a data room for Bridge mentors — honest states, no fake “online”

## Interaction & a11y

- `cursor: pointer` on links/buttons; `not-allowed` when disabled
- `:focus-visible` 2px calor outline, 3px offset
- `prefers-reduced-motion: reduce` kills transitions
- Decorative icons: `aria-hidden="true"`; logo wordmark: `aria-label="TIA"`
- Never leak env var names (`NEXT_PUBLIC_*`) into UI
- Color is not the only status signal — use a text badge
- Copy control for truncated hashes (full value in `title` + clipboard)

## Anti-patterns (ui-ux-pro-max + brand)

- Playful / AI purple gradients / Orbitron
- Unclear fees or invented metrics (SPEI, fake uptime)
- Emoji-as-icons
- Raw `disabled` / `unset` developer strings on mentor-facing pages

## Pre-delivery

- [ ] Contrast 4.5:1 body text both surfaces
- [ ] Visible focus, reduced motion
- [ ] Responsive 375 / 768 / 1024 / 1440
- [ ] No env names in copy
- [ ] Logo renders without raster/broken-image
