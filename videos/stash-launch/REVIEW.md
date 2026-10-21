# REVIEW — Stash, filme de lançamento (30 s, 1920x1080, 30 fps)

## Decisões criativas

- Roteiro aprovado no checkpoint do plano: caos → Stash → Organize / Encontre / Salve → One more thing →
  extensão → assinatura. Arco "Feature-Benefit Cascade" com fechamento de keynote.
- Visual: preset `blue-professional` remixado para a marca (porcelana #f4f2ee, teal #0f9e8f, tinta #0b1120,
  Inter) + adendo de vidro/pratos no `frame.md`. Vidro e porcelana estão na lista BANNED por padrão; ficaram
  porque são a referência pedida (Manus 2.0), limitados a ≤ 2 cartões de vidro por quadro.
- Toda UI é captura real do app (conta de demonstração Marina Costa) em 4K; a única reconstrução é a camada
  de texto digitado sobre o input de busca (cena 4) e as máscaras do autopreenchimento (cena 5).
- "One more thing…" ficou em inglês, de propósito (citação do keynote).
- O site vite.dev (de terceiros, com logos de patrocinadores) foi capturado, mas não entra no filme.
- Não construídos: os ângulos "Salve em um clique" e "Do caos ao Stash" (oferecidos no intake).

## Som

- Trilha da biblioteca HeyGen (assets/bgm/track.mp3, 117.5 BPM, 30 s), volume 0.8, fade-in 0.4 s,
  fade-out 1.5 s. Cortes nos tempos fortes medidos (audiomap.json): virada de seção A→B em 4.0 s = nascimento
  do ícone; subida de energia em 26.05 s = assinatura.
- Efeitos (biblioteca offline do media-use; o Openverse não respondeu): whoosh no whip 11.77 s, teclas na
  digitação 12.68 s (picos alinhados 1 quadro depois da imagem), pop no "Salvo no Stash" 23.99 s.
- Removido: o riser/impacto da biblioteca (sfx_005) vinha saturado (25 596 amostras em 0 dBFS).
- As teclas ficam discretas (≈ −21 LUFS, abaixo da música): subir mais faria os picos passarem de 0 dB.
- **O som foi medido, não ouvido.** Ninguém escutou o mix; confira no preview antes do render.

## O que foi verificado

- `hyperframes check`: lint, runtime, layout, motion e contraste sem erros nem avisos.
- `snapshot --review`: momentos de cada cena, faixas −0.2/+0.2 s em todos os 7 cortes, folha de celular (360 px).
- Corrigido nesta revisão:
  - P1 · 4.0 s e 26.0 s · carry across deixava um quadro vazio no corte → o objeto chega a 55% de opacidade
    e o ícone já existe no corte (escala 0.6 / 0.7).
  - P2 · 12.0 s · whip chegava do vazio → "Encontre." entra a 60% de opacidade, borrado.
  - P2 · 22–26 s · popup com sobra vazia → tela do popup recortada na altura do conteúdo (806 px).
- Celular: todos os títulos e legendas leem a 360 px; o texto interno da UI não lê (é prova visual; as
  legendas carregam a mensagem) — mantido de propósito.

## Ponto mais fraco

- 9.04–9.90 s (cena 3): o plano geral do app dura menos de 1 s antes do zoom; com mais tempo, eu trocaria
  esse plano por um movimento único do divisor direto para a barra lateral.
- A digitação (cena 4) troca para a captura real em 14.05 s; o anel de foco teal aparece só depois da troca.

## Avisos mantidos de propósito

- `data-layout-allow-overflow` nos pratos (passam da borda), nas câmeras das cenas 3 e 4 (zoom dentro da
  janela) e nos recortes do diálogo e do popup.

## Versão

- CLI do projeto: 0.8.184 → 0.8.185 (`upgrade --project .`); `check` passou depois da troca. O check
  confirma que as composições validam na versão nova, não que o render seja idêntico quadro a quadro.
