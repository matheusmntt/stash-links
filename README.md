# Stash

Gerenciador pessoal de links: documentações, ferramentas, posts e qualquer coisa que valha guardar, tudo em um só lugar.

## Rodando

```bash
pnpm install
pnpm dev                        # http://localhost:3000
```

Requer **Node 22.13+** (usa o SQLite nativo do Node, `node:sqlite`, sem dependências nativas).

### Contas

Na primeira vez, a tela inicial pede para **criar a primeira conta**. Depois disso o cadastro fica fechado; para permitir que outras pessoas criem conta, defina `ALLOW_SIGNUP=true` no `.env` (veja `.env.example`).

Cada usuário tem seus próprios links, categorias e tags. Em **Minha conta** (menu do usuário na barra lateral) dá para editar nome/e-mail, trocar a senha e ver/revogar sessões e extensões conectadas. Trocar a senha encerra todas as outras sessões.

As sessões ficam no banco (só o hash do token é guardado) e duram 7 dias por padrão (`AUTH_SESSION_MINUTES`).

## Dados

Tudo fica em `data/stash.db` (SQLite, fora do git). Para backup, use **Exportar JSON** na barra lateral (ou `GET /api/export`). Para mudar a pasta, use `STASH_DATA_DIR`.

## Funcionalidades

- Adicionar, editar, excluir (com **desfazer**) e favoritar links
- Título, descrição e favicon preenchidos automaticamente a partir da URL
- Aviso de link duplicado
- Busca por título, URL, descrição, categoria e tags (sem diferenciar acentos)
- Filtros por categoria, tag e favoritos, com contadores na barra lateral
- Ordenação (recentes, antigos, A–Z, mais acessados) e visualização em lista ou grade
- Contador de acessos por link
- Importar/exportar JSON
- Bookmarklet **"Salvar no Stash"**: arraste da barra lateral para os favoritos do navegador e salve qualquer página com um clique
- Tema claro, escuro ou do sistema
- Atalhos: <kbd>/</kbd> ou <kbd>⌘K</kbd> busca · <kbd>N</kbd> novo link · <kbd>⌘ Enter</kbd> salva · <kbd>Esc</kbd> limpa a busca

## Extensão do navegador

A pasta [`extension/`](extension/) tem uma extensão (Manifest V3) para Chrome, Edge, Brave e Arc:

- **Popup** (clique no ícone ou <kbd>Alt+Shift+S</kbd>): salva a aba atual com título e descrição já preenchidos, avisa se o link já existe, e tem uma aba **Buscar** para abrir qualquer link salvo.
- **Clique direito** → "Salvar esta página/link no Stash": salva direto, com a categoria padrão escolhida nas configurações.

### Instalação

No Stash, clique em **Instalar extensão** na barra lateral (página `/extensao`): lá tem o download do `.zip` e o passo a passo. Resumindo:

1. Baixe e descompacte o `.zip` (ou use a pasta `extension/` deste repositório)
2. Em `chrome://extensions`, ative o **Modo do desenvolvedor** e clique em **Carregar sem compactação**
3. Nas configurações da extensão, confira o endereço do Stash e clique em **Conectar com o Stash**
4. Na aba que abrir, entre na sua conta (se precisar) e clique em **Autorizar**

Nenhuma senha fica na extensão: a autorização gera um token válido por 1 ano, devolvido direto para a extensão. Ele aparece em **Minha conta → Sessões** e pode ser revogado por lá ou pelo "Desconectar" da extensão. Entrar com e-mail e senha na própria extensão continua disponível como alternativa.

#### Como funciona a conexão

A extensão abre `/connect?redirect=<página da extensão>&state=<aleatório>`. Ao autorizar, o Stash cria o token e redireciona para `chrome-extension://…/connected.html#token=…&state=…`. A página confere se o `state` é o mesmo que ela gerou (e se o pedido tem menos de 15 minutos) antes de salvar. O servidor só aceita redirecionar para a página `connected.html` de uma extensão, nunca para um site.

### API

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/v1/ping` | `{ app: "stash" }`, usado para validar o endereço |
| `POST` | `/api/v1/token` | `{ email, password, label? }` → `{ token, expiresAt, user }` |
| `DELETE` | `/api/v1/token` | Revoga o token enviado |
| `GET` | `/api/v1/links` | `{ links, categories, tags, user }` do dono do token |
| `POST` | `/api/v1/links` | Cria um link. Com `autoMeta: true`, busca título/descrição na página. `409` se já existir |

Autenticação: `Authorization: Bearer <token>`.
