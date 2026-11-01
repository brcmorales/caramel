# DESIGN — Caramel 2.0

**Direção:** confeitaria artesanal premium e afetuosa. O pote e o selo são os protagonistas.
**Paleta:** creme #faf3e6 · caramelo #b87326 / #8a4a14 · dourado da tampa #c79a3b · café #3a2519 · amora #6d1f3f (acento da geleia). Contraste AA no texto.
**Tipografia:** Fraunces (display, com personalidade) + DM Sans (leitura). `font-display: swap`.
**Movimento:** só `transform`/`opacity`. Entradas com ease-out `cubic-bezier(.23,1,.32,1)`, 120–320 ms; bottom sheet com `cubic-bezier(.32,.72,0,1)` e arrasto com velocidade. Roleta: 5,2 s com ease-out de 4ª potência (único momento longo, é o "momento de delight"). `prefers-reduced-motion` respeitado.
**Mobile:** 100dvh/safe areas, inputs 16 px, tap highlight off, hover só com `(hover:hover)`, alvos ≥ 44 px.
