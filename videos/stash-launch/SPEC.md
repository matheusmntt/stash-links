# SPEC — Stash, filme de lançamento

GOAL:    ao fim, a pessoa entende que o Stash junta tudo o que ela salva (docs, ferramentas, posts) num só
         lugar, acha qualquer link em segundos e salva de qualquer aba pela extensão — e quer instalar.

OUTPUT:  HyperFrames, 1920 x 1080, 30 fps. MP4 1080p.

TIME:    30 s x 30 fps = 900 frames. Música assets/bgm/track.mp3, 117.5 BPM → 15.32 frames por tempo,
         compasso ≈ 2.04 s. Tempos fortes (audiomap.json): 2.04 4.04 6.04 8.03 10.03 12.03 14.05 16.05
         18.04 20.04 22.04 24.03 26.05 s. Tempos: 1.556 + k·0.5106 s (arredondar cada um a partir do
         índice, nunca somando). Seções: A 0–4.0, B 4.0–13.5, C 13.5–30. Pico 4.80 s; queda ~21 s;
         subida 26.05 s; a música acaba em 28.91 s (fade-out de 1.5 s até 29.4).

LOOK:    Medium = porcelana + vidro + a interface real do produto.
         - Chão: porcelana #f4f2ee, liso, sem grão; um levantamento radial branco a 40% no terço superior
           (centro em 50% 20%, raio 70%). Sem vinheta.
         - Tinta: #0b1120 (todo texto que se lê). Cinza de apoio #5b6170.
         - Acento: teal #0f9e8f — no máximo UMA palavra por cena, e só onde carrega sentido
           ("só", "segundos", "sozinho", "qualquer"). Nunca em fundos grandes.
         - Pratos horizontais: faixas de #ebe8e2 ou teal a 7% (rgba(15,158,143,.07)), 120–260 px de
           altura, raio 36 px, largura 70–100%; nunca verticais; no máximo 3 por cena.
         - Vidro (só como o Manus usa — cartão flutuando sobre um prato, segurando UI real ou um fato):
           fundo rgba(255,255,255,.55), backdrop-filter blur(24px) saturate(140%), borda 1 px
           rgba(255,255,255,.7) + linha interna 1 px rgba(11,17,32,.06), raio 24 px, sombra
           0 30px 60px -20px rgba(11,17,32,.18). No máximo 2 cartões de vidro por quadro.
         - Display: Inter 800, tracking -0.045em, line-height 0.95. Divisores 280 px (26% da altura);
           títulos 96 px (8.9%); linhas quietas 40 px (3.7%), Inter 500, #5b6170; nada abaixo de 28 px.
         - Mono: JetBrains Mono 500, só onde o próprio produto usa (domínios, contadores).
         - UI real: recortes das capturas 4K (capture/assets), mostrados a 1.6–2.0x do tamanho CSS real;
           texto da UI nunca abaixo de 26 px depois do zoom. Janela do navegador: cantos 20 px, barra
           superior #ffffff com 3 pontos #e4e2dd, sombra 0 40px 80px -30px rgba(11,17,32,.25).

OBJECTS: - Os cards de link reais (favicon, título, domínio, descrição, categoria teal, tags cinza):
           card-react, card-shadcn, card-useeffect.
         - A barra lateral real (categorias com contadores, nuvem de tags).
         - A caixa de busca real com o texto "documentacao" e os 5 resultados.
         - O diálogo real "Novo link" com o selo "automático".
         - O popup real da extensão (Salvar → "Salvo no Stash" ✓ → Buscar "react").
         - O ícone oficial do Stash (stash-icon.svg): quadrado com gradiente teal + marcador azul-noite.

MOTION:  - Chegada: expo.out (0.5–0.7 s) para cartões e UI; palavras por blur 8→0 px + opacidade em
           0.15 s, 0.07 s entre palavras, sem translate.
         - Câmera (zoom/pan na UI): power2.inOut, 0.55 s, blur de movimento 8 px no pico, depois segura.
         - Saída: power3.in, 40–50% da duração da entrada; blur 8 px + fade em 0.18 s.
         - Mola (ícone, cartões assentando): back.out(1.4) ≈ amortecimento 0.75; nunca em opacidade/cor.
         - Batidas: um movimento que precisa cair numa batida começa 40–190 ms antes; o acerto em si é
           tl.set. Uma mudança de layout por compasso.
         - Um movimento herói por cena; secundários andam 50–70% e começam 100–200 ms depois.
         - Títulos pousados ficam parados até sair (nada de flutuar, respirar ou crescer devagar).

SHOTS:   01 O caos (0–4 s, f 0–120). "Docs." 0.03, "Ferramentas." 0.54, "Posts." 1.05 batem um a um
            no centro-esquerda (blur-in, cada um substitui o anterior no mesmo lugar). 1.56: os 3 cards
            reais entram como cartões de vidro em ângulos de -6° a 5° sobre 2 pratos, espalhados (o
            "monte de abas"). 2.04 (forte): "Perdidos em abas." pousa (96 px, "abas" em tinta normal),
            segura até 3.80. Saída → carry across: os cards encolhem para o centro (1 → 0.2, blur 6 px)
            em 0.45 s e somem dentro do ícone que nasce na cena 2. Som: entrada forte da faixa.
         02 Stash (4–8 s, f 120–240). 4.04 (forte, virada de seção): o ícone nasce no centro com mola
            (0.6 → 1, 220 px). 4.55: "Stash" letra por letra (0.1 s) à direita do ícone, 150 px.
            Lockup ≈ 26% da largura. 6.04 (forte): "Tudo num só lugar." 64 px embaixo, "só" em teal;
            segura até 7.95. Sai por corte seco no forte de 8.03. Som: pico da faixa em 4.80.
         03 Organize (8–12 s, f 240–360). 8.03: "Organize." 280 px, divisor centrado, blur-in de
            linha inteira em 0.15 s; segura até 8.95; sai com blur 0.18 s. 9.04: janela do app (tema
            claro) sobe de y+60 com expo.out 0.6 s sobre 3 pratos, ocupando 90% da largura.
            10.03 (forte): câmera empurra para a barra lateral (categorias + tags) até 1.9x em 0.55 s,
            power2.inOut, e segura. 10.54: "Categorias, tags e favoritos." 64 px num cartão de vidro à
            direita da barra lateral; segura até 11.85. Saída → whip para a esquerda (0.2 s, blur 18 px).
         04 Encontre (12–16 s, f 360–480). Entra pelo whip. 12.03 (forte): "Encontre." 280 px, segura até
            12.9. 13.04: punch-in na barra superior real: a caixa de busca a 2x; o texto "documentacao"
            é digitado letra a letra (12 letras, 0.06 s cada, 13.10–13.82) numa camada reconstruída por cima
            do input real. 14.05 (forte): troca para a captura app-search (blur swap 0.15 s) e a câmera
            desce da busca para os 5 resultados (1.6x), power2.inOut 0.55 s. 14.56: "Em segundos." e
            15.07: "Até sem acento." 64 px à esquerda num cartão de vidro; "segundos" em teal.
            Segura até 15.85. Saída → blur swap na mesma porcelana. Som: tique de tecla por letra.
         05 Salve (16–20 s, f 480–600). 16.05 (forte): "Salve." 280 px, segura até 16.95. 17.05: o diálogo
            real "Novo link" (recorte superior: URL, título, descrição) entra como cartão de vidro à
            direita, 1.7x, expo.out 0.6 s, sobre 2 pratos. Título e descrição são revelados por máscara da
            esquerda para a direita em 17.30–17.70 ("autopreenchimento"). 17.55: "Cole a URL." 64 px à
            esquerda; 18.04 (kick forte): os 3 cards reais deslizam pelos pratos atrás e assentam com mola;
            18.56: "O resto vem sozinho." ("sozinho" em teal). Segura até 19.85.
            Saída → colour flood: o chão vira #0b1120 em 0.4 s power2.inOut, começando em 19.70.
         06 One more thing (20–22 s, f 600–660). Chão #0b1120. 20.55: "One more thing…" 96 px, Inter 700,
            branco #f4f2ee, por palavra do cinza #5b6170 ao claro (0.09 s entre palavras), centrado;
            segura parado até 21.80 (a queda da faixa em ~21 s é a pausa). Saída → colour flood de volta
            para a porcelana em 0.4 s, começando em 21.70.
         07 A extensão (22–26 s, f 660–780). 22.04 (forte): "A extensão." 96 px à esquerda (x 140). 22.30:
            o popup real (aba Salvar) sobe como cartão de vidro à direita, 1.6x (624 x 960 px), expo.out
            0.6 s, sobre um prato largo. 22.55: "Salve de qualquer aba." 64 px ("qualquer" em teal).
            24.03 (forte): blur swap para o popup "Salvo no Stash" ✓ — o check entra com mola; som de pop.
            24.56: blur swap para a aba Buscar ("react", 4 resultados); "Busque sem sair dela." substitui a
            linha anterior. Segura até 25.80. Saída → carry across: o popup encolhe para o centro
            (1 → 0.25, blur 6 px) em 0.45 s e vira o ícone da cena 8.
         08 Assinatura (26–30 s, f 780–900). 26.05 (forte, subida da faixa): o ícone (180 px) pousa no
            centro e um preenchimento teal sobe por dentro dele (clip-path inset de baixo para cima,
            0.35 s); 26.45: "Stash" entra num wipe da esquerda para a direita ao lado (140 px). Lockup ≈
            24% da largura. 27.05: "Tudo o que vale guardar." 56 px embaixo, #5b6170. 27.56: "App +
            extensão para Chrome, Edge e Brave" 32 px, #5b6170. Tudo segura parado até 30.0 (última linha
            ≥ 2 s). Som: impacto único na subida de 26.05; fade-out da faixa até 29.4.

BANNED:  - vazio escuro com elementos pequenos no meio (a cena 6 é escura de propósito: tipo de 96 px,
           1.8 s, e é a pausa do keynote — nada mais flutua nela);
         - glow, bloom, neon, partículas, orbes; gradientes roxos/azuis; mesh gradients;
         - vidro fora do uso do Manus (vidro só como cartão sobre prato, máx. 2 por quadro);
         - serif display, itálico de destaque, rótulos "01 / 02", rótulos mono em caixa alta como enfeite,
           chips/botões em pílula inventados;
         - tudo centralizado (só divisores, o "One more thing" e a assinatura são centrados);
         - tudo aparecendo ao mesmo tempo; tudo com fade + subida;
         - texto que se mexe enquanto é lido; títulos que continuam deslizando depois de pousar;
         - lista de 3 recursos como 3 cartões lado a lado; título sobre screenshot escurecido;
         - janela pequena no meio de tela vazia; UI inclinada em 3D; UI inventada (só capturas reais e a
           camada de texto do input, que reconstrói o que o app mostra);
         - o logo no canto; o mesmo whoosh em todo corte;
         - o site de terceiros (vite.dev) e logos de patrocinadores na tela.

QA:      - 0.4 s "Docs." legível · 2.6 s cards espalhados + "Perdidos em abas." · 4.9 s ícone + "Stash" ·
           7.0 s lockup + "Tudo num só lugar." · 8.5 "Organize." · 11.0 barra lateral a 1.9x + legenda ·
           12.5 "Encontre." · 13.6 digitação no meio · 15.3 resultados + legenda · 16.5 "Salve." ·
           18.9 diálogo + cards + legenda · 21.2 "One more thing…" · 23.2 popup Salvar ·
           24.3 "Salvo no Stash" ✓ · 25.3 popup Buscar · 28.5 assinatura completa.
         - Antes e depois de cada corte (−0.1 s / +0.2 s): sem salto de posição, escala ou cor.
         - Texto da UI ≥ 26 px depois dos zooms; nada fora da área de ação (90%).
