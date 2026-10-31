# Caramel 2.0 — como editar

Site estático (HTML/CSS/JS). Publique a pasta inteira no Netlify (arrastar e soltar). Para testar local: `python3 -m http.server` e abra http://localhost:8000 (precisa de servidor por causa do `fetch`).

## Tudo que você edita fica em `data/produtos.json`
- **Preços:** `sabores[].precos` ({ "40": 7, "150": 14 }). Tamanho ausente = indisponível.
- **Pedido mínimo de entrega:** `pedidoMinimoEntrega` (hoje `null`, sem aviso no carrinho).
- **Kit Festa:** `kitFesta.preco` (hoje `null` → aparece `[PREÇO A DEFINIR]`).
- **Embalagem de presente:** `embalagemPresente.preco` (hoje `null` → "valor combinado no WhatsApp").
- **Roleta:** `roleta.premios[]` (`peso` = chance relativa; `tipo` = percent, fixed, embalagem, brinde, giro, nada), `validadeDias`, `brindeMinimoPedido`, `ativa`.

## Pontos que assumi (confirme!)
- "Pudim + creme de avelã R$ 15": assumi **150 ml**.
- Validade do prêmio **7 dias** e brinde válido para pedidos a partir de **R$ 30** são sugestões minhas.
- Custo dos brindes e pesos da roleta: ajuste conforme sua margem.
- A roleta roda no navegador (sem servidor): 1 giro por aparelho, e quem limpar os dados do navegador pode girar de novo. O código (CARAMEL-XXXX) vai na mensagem do WhatsApp para você conferir e honrar.

## Fotos que faltam
- `[FOTO: pudim + creme de avelã 150 ml, vista 3/4, luz lateral]` (hoje usa a do pudim)
- Pote por tamanho (40, 150, 180 ml) com recorte, para mostrar a escala real (hoje a mesma foto é escalada)
- Creme de avelã e geleia em 150/180 ml, se forem vendidos
- Embalagem de presente
- Doce de leite + avelã com fundo recortado (hoje usa a foto da mão, em círculo)
- Depoimentos reais de clientes (opcional)

## Depoimentos (estrelas, comentário, nome e foto)
- O formulário usa **Netlify Forms** (já configurado no HTML; ative em Site configuration → Forms depois de publicar). Cada envio chega no painel **Forms → feedback**, com nota, nome, comentário e a foto.
- **Nada aparece sozinho no site.** Você lê, e se aprovar, adiciona em `data/depoimentos.json`:
  `{ "nome": "Maria Silva", "estrelas": 5, "texto": "…", "data": "2026-10-30", "foto": "img/depoimentos/maria.jpg" }`
  (baixe a foto do painel e salve em `img/depoimentos/`; `foto` é opcional, sem ela aparecem as iniciais).
- A lista começa vazia de propósito (sem depoimento inventado). A nota média só aparece quando houver avaliações.
- Fora do Netlify (ex.: na prévia ou em `localhost`) o envio não funciona; o site mostra uma mensagem de erro com a opção do WhatsApp.

## Seleção de pote e Kit Festa (estilo escuro)
- Os potes são desenhos em SVG com as cores de cada sabor (`sabores[].visual`) e proporção ilustrativa (`tamanhos[].larg/alt`).
- **Medidas reais:** quando souber altura e diâmetro do vidro, preencha `tamanhos[].medidasMm` (ex.: `{"alt":63,"diam":63}`) e as cotas em mm aparecem ao lado do pote.
- **Sabor + Variedade:** vêm de `bases[]` e de `sabores[].base` / `variedade`. Para criar um sabor novo, adicione em `sabores` com `precos`.
- **Kit Festa:** a pessoa distribui 20 potinhos de 40 ml entre os sabores que têm preço de 40 ml; o pedido vai ao WhatsApp com a composição. Falta definir `kitFesta.preco`.
- Novo sabor: **Doce de leite + coco ralado** (40 ml R$ 7, 150 ml R$ 14, 180 ml R$ 16). Falta foto real: `[FOTO: doce de leite + coco ralado 150 ml]`.
