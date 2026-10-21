---
format: 1920x1080
duration: 30s
message: "Tudo o que vale guardar — docs, ferramentas, posts — num só lugar, a um clique."
arc: Hook → Product intro → Organize → Encontre → Salve → One More Thing → Brand outro
audience: desenvolvedores e pessoas que vivem salvando links de documentação, ferramentas e artigos
mode: collaborative
music: confident minimal electronic keynote launch, clean pulse, modern tech, uplifting, ~120 BPM
bpm: 117.5
grid: "assets/bgm/track.mp3 — 117.5 BPM, tempos fortes em 2.04 4.04 6.04 8.03 10.03 12.03 14.05 16.05 18.04 20.04 22.04 24.03 26.05s (audiomap.json); tempos a cada ~0.51s; silêncio 29-30s"
---

# Stash — filme de lançamento (30s, sem narração, com trilha)

Estilo Manus 2.0: porcelana, tipografia cinética, palavras novas como divisores de cena, a interface
real com zoom de câmera, cartões de vidro sobre pratos horizontais e um "One More Thing". Sem narração —
o campo `voiceover` de cada cena guarda o **texto na tela**, que dita o ritmo das revelações. Cada cena
começa num tempo forte da faixa (a cada ~2s); revelações internas caem nos tempos (~0.51s) listados em
`audiomap.json`. Momentos da música: queda em ~21s (dentro do "One more thing"), subida em 26s (lockup).

## Frame 1 — O caos

- scene: Na porcelana, "Docs." "Ferramentas." "Posts." batem um a um no ritmo; viram uma nuvem de cartões de vidro com títulos reais de links, que se espalham e somem; fica "Perdidos em abas."
- voiceover: "Docs. Ferramentas. Posts. — Perdidos em abas."
- duration: 4s
- poster: 3.2s
- transition_in: cut
- status: outline
- src: compositions/frames/01-hook.html
- type: hook
- persuasion: Pain validation
- beat: overwhelm → curiosity
- blueprint: kinetic-type-beats
- asset_candidates: assets/card-react.png — card real do link React Reference; assets/card-shadcn.png — card real do shadcn/ui; assets/card-useeffect.png — card real do guia de useEffect
- reads: "Docs." (0.0-0.5s); "Ferramentas." (0.5-1.0s); "Posts." (1.0-1.5s); cartões se espalham (1.5-2.5s); "Perdidos em abas." (2.5-4.0s)
- sound: trilha entra forte (energia alta 0-1s e 2-3s); cada palavra num tempo

narrativeRole: nomeia a dor que o público reconhece na hora — o que vale guardar fica espalhado.
keyMessage: seus links bons estão espalhados e somem.

## Frame 2 — Stash

- scene: Os fragmentos se recolhem no centro e viram o ícone do Stash (gradiente teal + marcador); o nome "Stash" assenta ao lado e, embaixo, "Tudo num só lugar."
- voiceover: "Stash. — Tudo num só lugar."
- duration: 4s
- poster: 3.0s
- transition_in: zoom-through
- status: outline
- src: compositions/frames/02-intro.html
- type: product_intro
- persuasion: Negative contrast (caos → um lugar)
- beat: relief
- blueprint: logo-assemble-lockup
- asset_candidates: assets/stash-icon.svg — ícone oficial do Stash (gradiente teal, marcador azul-noite)
- reads: ícone se forma (0.0-1.0s); "Stash" (1.0-2.0s); "Tudo num só lugar." (2.0-4.0s)
- sound: trilha; lockup no tempo forte de 4.04s

narrativeRole: a promessa (message) chega no beat 2; tudo depois é prova.
keyMessage: o Stash junta tudo num só lugar.

## Frame 3 — Organize

- scene: Divisor "Organize." enche a tela num tempo; corta para a interface real (tema claro) num navegador sobre pratos de porcelana; a câmera empurra da visão geral para a barra lateral — categorias com contadores, tags, favoritos.
- voiceover: "Organize. — Categorias, tags e favoritos."
- duration: 4s
- poster: 2.8s
- transition_in: crossfade
- status: outline
- src: compositions/frames/03-organize.html
- type: feature_showcase
- persuasion: Show-don't-tell proof
- beat: clarity + control
- blueprint: camera-journey
- asset_candidates: assets/app-list-light.png — tela principal real (barra lateral com categorias e tags, lista de cards); assets/sidebar.png — recorte da barra lateral
- reads: "Organize." (0.0-1.0s); app inteiro aparece (1.0-2.0s); zoom nas categorias e tags (2.0-3.5s); "Categorias, tags e favoritos." (2.5-4.0s)
- sound: trilha; divisor no tempo forte de 8.03s, corte para a UI no tempo seguinte

narrativeRole: primeira prova — tudo tem lugar.
keyMessage: cada link fica organizado por categoria e tag.

## Frame 4 — Encontre

- scene: Divisor "Encontre." num tempo; a busca real é digitada — "documentacao", sem acento — e a câmera desce da caixa de busca para os 5 resultados de Documentação.
- voiceover: "Encontre. — Em segundos. Até sem acento."
- duration: 4s
- poster: 2.8s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/04-encontre.html
- type: feature_showcase
- persuasion: Friction reduction
- beat: ease
- blueprint: prompt-type-submit-generate
- asset_candidates: assets/app-search.png — busca real "documentacao" com 5 resultados e chip de filtro; assets/app-list-light.png — estado antes da busca
- reads: "Encontre." (0.0-1.0s); "documentacao" é digitado (1.0-2.0s); resultados aparecem com zoom (2.0-3.5s); "Em segundos. Até sem acento." (2.5-4.0s)
- sound: trilha; divisor em 12.03s (subida de energia), letras digitadas em subtempos

narrativeRole: segunda prova — guardar só vale se você acha depois.
keyMessage: achar um link é instantâneo.

## Frame 5 — Salve

- scene: Divisor "Salve." num tempo; o diálogo real "Novo link" entra como um cartão de vidro sobre pratos horizontais, a URL colada, o título e a descrição surgindo com o selo "automático"; atrás, cartões de links reais deslizam pelos pratos e se alinham.
- voiceover: "Salve. — Cole a URL. O resto vem sozinho."
- duration: 4s
- poster: 3.0s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/05-salve.html
- type: feature_showcase
- persuasion: Feature-to-benefit translation
- beat: ease + delight
- blueprint: device-surface-showcase
- asset_candidates: assets/dialog-new-link.png — diálogo Novo link com título e descrição automáticos; assets/card-react.png — card real; assets/card-shadcn.png — card real; assets/card-useeffect.png — card real
- reads: "Salve." (0.0-1.0s); cartão de vidro com o diálogo (1.0-2.5s); "Cole a URL." (2.0-3.0s); "O resto vem sozinho." (3.0-4.0s)
- sound: trilha; divisor em 16.05s, cartões assentam no kick forte de 18.04s

narrativeRole: terceira prova — guardar dá zero trabalho.
keyMessage: salvar um link leva um colar.

## Frame 6 — One more thing

- scene: Corte seco para azul-noite. Silêncio visual. "One more thing…" surge devagar, centralizado.
- voiceover: "One more thing…"
- duration: 2s
- poster: 1.4s
- transition_in: cut
- status: outline
- src: compositions/frames/06-one-more-thing.html
- type: hook
- persuasion: Curiosity gap (pausa de keynote)
- beat: intrigue
- blueprint: titlecard-reveal
- asset_candidates:
- reads: tela escura (0.0-0.5s); "One more thing…" (0.5-2.0s)
- sound: trilha cai em ~21s (hard stop) — a pausa da música é a pausa do keynote

narrativeRole: a virada clássica de keynote — prepara a revelação.
keyMessage: ainda tem mais.

## Frame 7 — A extensão

- scene: Volta à porcelana; o popup real da extensão sobe como cartão de vidro sobre pratos horizontais; salva a aba atual (título e descrição lidos da página), o check "Salvo no Stash" acende; vira para a aba Buscar com "react" e 4 resultados.
- voiceover: "A extensão. — Salve de qualquer aba. — Busque sem sair dela."
- duration: 4s
- poster: 2.2s
- transition_in: zoom-through
- status: outline
- src: compositions/frames/07-extensao.html
- type: feature_showcase
- persuasion: Value stacking
- beat: excitement
- blueprint: device-surface-showcase
- asset_candidates: assets/ext-popup-save.png — popup aba Salvar com título e descrição lidos da página; assets/ext-popup-saved.png — popup com "Salvo no Stash"; assets/ext-popup-search.png — popup aba Buscar com 4 resultados para "react"
- reads: "A extensão." (0.0-0.5s); popup Salvar + "Salve de qualquer aba." (0.5-2.0s); "Salvo no Stash" ✓ (2.0-2.5s); popup Buscar + "Busque sem sair dela." (2.5-4.0s)
- sound: trilha volta em 22.04s; o check acende no tempo forte de 24.03s

narrativeRole: o One More Thing — o Stash vai até onde o link está.
keyMessage: salvar e buscar sem sair da página.

## Frame 8 — Assinatura

- scene: Cartões e prato se recolhem; ícone do Stash + "Stash" centralizados na porcelana; embaixo, "Tudo o que vale guardar." e, menor, "App + extensão para Chrome, Edge e Brave".
- voiceover: "Stash. — Tudo o que vale guardar."
- duration: 4s
- poster: 2.6s
- transition_in: blur-crossfade
- status: outline
- src: compositions/frames/08-outro.html
- type: branding
- persuasion: Brand recall
- beat: confidence
- blueprint: logo-assemble-lockup
- asset_candidates: assets/stash-icon.svg — ícone oficial do Stash
- reads: logo e nome (0.0-1.0s); "Tudo o que vale guardar." (1.0-2.0s); linha de plataformas (2.0-4.0s)
- sound: lockup na subida de energia da faixa (26.05s); a música some em 29s e o quadro segura em silêncio até 30s

narrativeRole: fecha na marca e na promessa.
keyMessage: o Stash é onde ficam os links que importam.
