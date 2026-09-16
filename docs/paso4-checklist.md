# Paso 4 — Checklist de publicación (discovery de primeros agentes)

Objetivo: **10 agentes activos** pagando `/v1/quote` o `/v1/route` en pubnet.

## Pre-publicación

- [ ] Merge del PR de material (docs/agents + examples/agent-client + outreach)
- [ ] Repo **público** en GitHub (Settings → General → visibility) — sin esto los links del pitch no abren
- [ ] Revisar que ningún `.env` real esté trackeado (`git ls-files | grep -i env` → solo `.env.example`)
- [ ] **Issues habilitadas** y **Discussions activadas** (Settings → Features) — crear una Discussion fijada: "Early adopters: feedback de agentes x402" con link a docs/agents
- [ ] Probar el ejemplo end-to-end desde un clone limpio: `cd examples/agent-client && npm install && npm run quote` → 200 + tx visible en stellar.expert

## Publicación (usar textos de [outreach.md](outreach.md); verificar links antes de postear)

- [ ] **Stellar Developers Discord** — canal sugerido: `#dev-help` o el canal de proyectos/ecosistema vigente (invite oficial: https://discord.gg/stellardev)
- [ ] **1–2 foros de agentes** (elegir dos):
  - LangChain Forum — https://forum.langchain.com (categoría Show & Tell / Integrations)
  - CrewAI Community — https://community.crewai.com
  - r/AI_Agents — https://www.reddit.com/r/AI_Agents/
- [ ] Registrar fecha/link de cada post aquí mismo al publicarlo

## Métrica: cómo contar los 10 agentes activos

1. **On-chain (fuente de verdad):** pagos USDC entrantes al payTo —
   [stellar.expert/…/GBRMBOEG…](https://stellar.expert/explorer/public/account/GBRMBOEGDTF72FP72D7OQLICBXVTSG25GYWZ3W7TNCLD47NEYVU7JUBS)
   o vía Horizon:
   `curl "https://horizon.stellar.org/accounts/GBRMBOEGDTF72FP72D7OQLICBXVTSG25GYWZ3W7TNCLD47NEYVU7JUBS/payments?order=desc&limit=50"`
   — un "agente activo" = cuenta origen distinta con ≥2 pagos en 7 días.
2. **Logs de Vercel (contexto):** requests 200 en `/v1/*` del proyecto `remesa-tia-backend` (Deployments → Runtime Logs) para correlacionar rutas consumidas.
3. Anotar semanalmente: # cuentas únicas, # requests pagados, ruta más consumida.

## Fuera de alcance de este paso

- `/v1/execute`, x402-sessions, facilitador propio (bloqueados — ver ADR-0001 en PR #5)
- Activar alertas en prod (checklist propio en SPEC.md: CRON_SECRET, UPSTASH_*, cron externo)
- Publicar los posts: los ejecuta el usuario tras el merge, no el agente
