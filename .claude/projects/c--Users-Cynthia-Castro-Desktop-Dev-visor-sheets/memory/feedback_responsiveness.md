---
name: Regla de responsiveness
description: Siempre considerar diseño responsivo (mobile, tablet, desktop) en cada cambio de UI
type: feedback
---

Todo desarrollo de UI debe considerar desde el inicio los tres breakpoints: mobile (≤640px), tablet (≤1024px) y desktop. No es un paso posterior.

**Why:** El visor se usa en celular y tablet, y los problemas de responsive han sido recurrentes.

**How to apply:** Al agregar cualquier componente nuevo (gráfico, panel, botón, layout), definir simultáneamente su comportamiento en los tres breakpoints. Incluir media queries en el mismo commit que el componente.
