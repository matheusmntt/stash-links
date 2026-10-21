---
workflow: product-launch-video
flow: automation
storyboard: yes
message: "Tudo o que vale guardar — docs, ferramentas, posts — num só lugar, a um clique."
destination: website
aspect: 1920x1080
language: pt-BR
audience: desenvolvedores e pessoas que vivem salvando links de documentação, ferramentas e artigos
length: 30s
angle: tudo-num-so-lugar
narration: no
resolution: 1080p
---

## Intent

Vídeo de lançamento do Stash (gerenciador de links) no estilo Manus 2.0: um filme de ~30 segundos
com tipografia cinética sobre uma tela de porcelana, divisores de cena com palavras novas, a interface
real do produto com zoom de câmera, cartões de vidro sobre pratos horizontais e uma revelação do tipo
"One More Thing", tudo editado ao ritmo de uma trilha sonora sincronizada.

Ângulo "Tudo num só lugar": docs, ferramentas e posts espalhados viram uma biblioteca organizada,
com busca, tags e favoritos. O "One More Thing" é a extensão do navegador (salvar e buscar de
qualquer aba, conectada à conta só com "Autorizar").

Vender o produto (promo de lançamento), não fazer um tour da tela. Sem narração: a tipografia conta
a história.

## Assets

- Interface real do app rodando localmente com a conta de demonstração (Marina Costa, 15 links de
  `scripts/demo-links.json`) — capturas em alta resolução para os zooms de câmera.
- `docs/screenshots/*.png` (repositório) — screenshots já existentes do app e da extensão, como referência.
- `app/icon.svg` (repositório) — ícone/logo do Stash.

## Customizations

- Trilha sonora sincronizada: música da biblioteca HeyGen (energia de keynote/lançamento tech),
  cortes nos tempos fortes da batida real da faixa (grade planejada em 120 BPM).
- Projeto editável + MP4 em 1080p.

## Notes

- O Stash ainda não está publicado: não há URL pública para capturar. A fonte visual é o app local,
  capturado por nós (no-capture path do `hyperframes capture`, com as telas reais como assets).
- Paleta: porcelana (estilo pedido) com o verde-teal do Stash como acento; fontes Inter e
  JetBrains Mono, as mesmas do app.
- Música: aprovada no plano (checkpoint do storyboard) — trilha da biblioteca HeyGen, de preferência ~120 BPM, com os cortes ajustados às batidas reais dela.
