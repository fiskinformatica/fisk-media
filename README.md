# Fisk Media

Biblioteca digital de áudios e vídeos das aulas, construída com React + Vite +
Tailwind CSS e alimentada diretamente pelo Google Drive. O site é 100% estático
(GitHub Pages), sem backend, banco de dados ou serviços adicionais.

## O que está implementado

- Montagem automática da biblioteca a partir de 13 pastas do Google Drive.
- Leitura recursiva de subpastas, paginação da Drive API v3 e identificação de
  áudios/vídeos por MIME type (com fallback por extensão).
- Ordenação natural (numérica) de pastas e arquivos.
- Ordenação manual das subpastas pela área do professor.
- Seções de pastas recolhíveis, fechadas por padrão, para reduzir a rolagem.
- Detecção de arquivos novos, removidos e renomeados entre sincronizações.
- Sincronização automática a cada 15 minutos, atualização manual e cache local.
- Biblioteca anterior mantida visível durante uma nova sincronização.
- PIN global mensal de 4 dígitos, com aceitação opcional do PIN do mês anterior.
- Persistência do estado de acesso no `localStorage` (sem salvar o PIN).
- Área do professor em `/teachers` (e `/#/teachers`).
- Player de áudio fixo com play/pause, anterior/próxima, progresso, duração,
  volume, mudo e reprodução contínua.
- Player de vídeo integrado com controles, tela cheia e fallback para o preview
  oficial do Drive.
- Interface mobile-first em vermelho Fisk e branco, minimalista e com ícones
  Lucide.

## Stack

- React 19 + Vite
- JavaScript (JSX)
- Tailwind CSS v4
- Lucide React
- Google Drive API v3
- GitHub Pages

## Começando

```bash
npm install
cp .env.example .env   # Windows: copy .env.example .env
npm run dev
```

Sem `VITE_GOOGLE_API_KEY`, a aplicação exibe uma tela de configuração — nenhum
dado fictício é mostrado.

## 1. Configurar a Google Drive API

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/) e crie (ou
   selecione) um projeto.
2. Em **APIs e serviços → Biblioteca**, habilite **Google Drive API**.
3. Em **APIs e serviços → Credenciais**, crie uma **Chave de API**.
4. Restrinja a chave:
   - **Restrições de API:** Google Drive API.
   - **Restrições de aplicativo:** Referenciadores HTTP. Adicione
     `http://localhost:5173/*` e a URL do site, por exemplo
     `https://SEU-USUARIO.github.io/fisk-media-player/*`.
5. Crie o arquivo `.env` na raiz:

```env
VITE_GOOGLE_API_KEY=sua-chave-aqui
```

> A chave é embutida no JavaScript do site. Isso é aceitável apenas porque todos
> os arquivos são públicos. As restrições por referenciador e por API reduzem o
> uso indevido, mas não tornam a chave secreta em um site estático.

### Compartilhamento das pastas

A API key só consegue listar e reproduzir arquivos públicos. Compartilhe **as 13
pastas e todo o conteúdo interno** com **Qualquer pessoa com o link · Leitor**.
Se uma subpasta ou arquivo não estiver público, ele não aparecerá ou a
reprodução falhará; a interface mostra o erro da pasta correspondente.

### IDs verificados

Os IDs abaixo foram conferidos contra os links originais do Drive. Os nomes
retornados pelo Drive estão indicados entre parênteses.

| Categoria | Pasta de áudios | Pasta de vídeos |
| --- | --- | --- |
| Essentials 1 | `1vsn1Wzpq-igaSo_L3LieedKDU03F5up9` (`01. Essentials 1`) | `16wwTRWEQ_1jo_NKX8dvdY0YyoNR-2U8q` (`01. Essentials 1`) |
| Essentials 2 | `14ZbR6JL8GVnA7YMvlNfOXfxj7aoYjnQE` (`02. Essentials 2`) | `1DwvtCelTY5tPPPe1m-doEVneDsK-DgFw` (`02. Essentials 2`) |
| Transitions 1 | `1MVN-pk1ARtNTq4hnqh_ZiXnIhL7zmFja` (`03. Transitions 1`) | `1AOr0fHh5GhvCf397EM-xtV8hMFI23tVg` (`03. Transitions 1`) |
| Transitions 2 | `1OjqutogX1_iweEMvh72fLc5jGk6obove` (`04. Transitions 2`) | `1YW7T7jaSA-Z6FNybIuMLl4dhjiCVneoq` (`04. Transitions 2`) |
| Fluency 1 | `1rtyh87_Xt_p30z4hEkSSMgYi1EDaDPFy` (`05. Fluency 1`) | `1uVNsPa037xAFm1hMuayoEAf9nmUsltBC` (`05. Fluency 1`) |
| Fluency 2 | `1FnLhKEC4VLJehLz9Lrg9WAPsi1CACn9C` (`06. Fluency 2`) | `1jHxWwFwK1wFWCm1b6AP9ZjA4DJtWGfa-` (`06. Fluency 2`) |
| In Focus | `1ci02_Qt2OdWM_WOK736zn6TJKn7I241A` (`07. In Focus`) | — (sem vídeos inicialmente) |

Para adicionar uma nova categoria, basta incluir o objeto
`{ name, id }` em `AUDIO_FOLDERS` e/ou `VIDEO_FOLDERS` em
`src/config/drive.js`. Nenhuma outra alteração é necessária.

## 2. PIN mensal e área do professor

Configure os segredos no `.env` (ou nos secrets do GitHub Actions) antes de
publicar:

```env
VITE_SECRET_SALT=um-segredo-longo-e-exclusivo
VITE_STAFF_PASSWORD=1234
VITE_OWNER_PASSWORD=9876
```

`VITE_STAFF_PASSWORD` e `VITE_OWNER_PASSWORD` são PINs de 4 dígitos. Use valores
diferentes entre si e evite sequências óbvias.

- O PIN tem exatamente 4 dígitos e é gerado de forma determinística a partir de
  `mês + ano + VITE_SECRET_SALT`.
- O PIN do mês atual é sempre aceito.
- Com `ACCEPT_PREVIOUS_MONTH = true` (padrão), o PIN do mês anterior também é
  aceito durante todo o mês atual.
- PINs de meses mais antigos são tratados como expirados.
- Ao acertar, o site salva em `localStorage` apenas
  `{ authorized, period, expiresAt }` — nunca o PIN em texto puro.
- A autorização vale até o fim do mês corrente. Ao expirar, o aluno precisa do
  novo PIN com o professor.

A área do professor fica em:

- `/#/teachers` (funciona em qualquer hospedagem, inclusive GitHub Pages);
- `/teachers` (funciona em desenvolvimento e, em produção, é redirecionado pelo
  `404.html` para o app).

A tela de login usa o mesmo estilo do PIN do aluno e pede o PIN de 4 dígitos
`VITE_STAFF_PASSWORD`. Depois de entrar, ela mostra o PIN atual, o mês/ano de
referência, o PIN do mês anterior (quando aplicável) e um botão para copiar.

No fim da página fica o painel **Administração**, que pede o segundo PIN de 4
dígitos, `VITE_OWNER_PASSWORD`. Só depois de desbloqueá-lo a sincronização e a
ordem das pastas ficam disponíveis. Use **Sair** no painel para bloquear os
controles novamente.

A biblioteca tem um atalho **Área do professor** no cabeçalho e no rodapé. A
página do professor também tem sempre um link de volta para a biblioteca.

> **Limitação de segurança:** o site é estático. `VITE_SECRET_SALT`,
> `VITE_STAFF_PASSWORD`, `VITE_OWNER_PASSWORD`, o algoritmo do PIN e a API key
> chegam ao navegador do visitante. Os PINs são um controle casual de acesso,
> não uma proteção contra usuários técnicos. Não armazene conteúdo sensível
> nessa biblioteca.

## 3. Sincronização e cache

- Ao abrir a biblioteca, o cache local (`fisk.library.v1`) é exibido
  imediatamente.
- Se o cache tiver mais de 15 minutos, uma sincronização silenciosa é iniciada.
- Um intervalo atualiza a biblioteca a cada 15 minutos.
- O botão de sincronizar no painel **Administração** força uma nova
  sincronização e só aparece após o PIN do administrador.
- A versão anterior continua visível enquanto a nova é carregada.
- Novos arquivos, removidos e renomeados são detectados por `id` e nome e
  exibidos em um aviso discreto.
- Falhas em uma pasta não interrompem as demais; o erro é mostrado na categoria.

### Ordem das pastas

No fim do painel **Administração**, o controle **Ordem das pastas** permite mover
as subpastas de cada categoria para cima ou para baixo e restaurar a ordem
natural. O painel inteiro só é liberado com a `VITE_OWNER_PASSWORD`. A
configuração é salva no navegador e aplicada imediatamente à biblioteca.

As seções de pastas na biblioteca começam recolhidas. Clique no cabeçalho da
pasta para expandir ou recolher.

> Como o site é estático, a ordem fica salva apenas no navegador em que foi
> configurada. Ela não é compartilhada automaticamente entre dispositivos.

Chaves usadas no `localStorage`:

| Chave | Conteúdo |
| --- | --- |
| `fisk.library.v1` | Cache da biblioteca + horário da última sincronização |
| `fisk.access.v1` | Estado de autorização e período de validade (sem PIN) |
| `fisk.player.v1` | Volume do player de áudio |
| `fisk.folderOrder.v1` | Ordem manual das pastas por tipo e categoria |

## 4. Reprodução de mídia

- Áudios e vídeos são servidos por
  `https://www.googleapis.com/drive/v3/files/{id}?alt=media&key=...`.
- Se o endpoint da API não estiver disponível, o áudio tenta o link público
  `drive.usercontent.google.com`.
- Se o `<video>` direto falhar, o modal troca automaticamente para o player
  incorporado do Drive (`/file/d/{id}/preview`), que mantém controles e tela
  cheia.
- O navegador precisa suportar o codec do arquivo (por exemplo MP3/M4A para
  áudio e MP4/WebM para vídeo). O Drive não transcodifica os arquivos.
- Arquivos protegidos por "download desativado" ou fora do compartilhamento
  público podem não reproduzir.

## 5. Deploy no GitHub Pages

### Via GitHub Actions (recomendado)

1. Envie o projeto para um repositório no GitHub.
2. Em **Settings → Secrets and variables → Actions → New repository secret**,
   crie `VITE_GOOGLE_API_KEY`, `VITE_SECRET_SALT`, `VITE_STAFF_PASSWORD` e
   `VITE_OWNER_PASSWORD` com os valores correspondentes.
3. Em **Settings → Pages**, defina **Source: GitHub Actions**.
4. Faça push para a branch `main`. O workflow
   `.github/workflows/deploy.yml` executa `npm ci`, `npm run build` e publica o
   conteúdo de `dist`.
5. A URL será `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

O Vite usa `base: './'`, então os assets funcionam tanto em project sites
(`/nome-do-repo/`) quanto em domínios personalizados. O `public/404.html` trata
rotas diretas como `/teachers`, e `public/.nojekyll` evita o processamento
Jekyll.

### Build manual

```bash
npm run build
npm run preview
```

Publique o conteúdo de `dist/` na hospedagem estática de sua preferência.

## 6. Estrutura do projeto

```text
src/
  config/
    access.js          # segredos vindos do .env e regra do PIN
    drive.js           # pastas de áudio/vídeo, API key e intervalo de sync
  services/
    accessService.js   # geração/validação do PIN e persistência do acesso
    driveService.js    # Drive API v3, recursão, paginação, cache diff e URLs
  hooks/
    useAccess.js       # estado de autorização
    useAudioPlayer.js  # fila, controles e reprodução contínua
    useLibrary.js      # sincronização, cache, progresso e alterações
    useRoute.js        # rota /teachers sem dependência de router
  components/          # UI reutilizável (players, listas, avisos, PIN etc.)
  pages/
    TeachersPage.jsx   # /teachers
    LibraryPage.jsx    # gate do PIN + biblioteca
  utils/               # formatação, grupos de pastas e localStorage
```

## 7. Checklist de teste manual

1. Configure a API key e confirme que as 13 pastas são consultadas.
2. Abra cada categoria e confira a lista de arquivos reais e subpastas.
3. Clique em um áudio: play/pause, progresso, volume, anterior/próxima e
   reprodução contínua.
4. Abra um vídeo: reprodução, controles, tela cheia e comportamento no celular.
5. Gere o PIN em `/#/teachers` e valide na tela do aluno.
6. Confirme que o PIN do mês anterior também é aceito e que um PIN antigo
   retorna "expirado".
7. Recarregue a página e confirme que o acesso persiste no `localStorage`.
8. Adicione, remova e renomeie um arquivo no Drive; aguarde a sincronização (ou
   use o botão no painel **Administração**) e confira o aviso de alterações.
9. No painel **Administração**, desbloqueie com a `VITE_OWNER_PASSWORD`, reordene
   as pastas e confirme a nova ordem na biblioteca. Recarregue e confirme que a
   ordem permanece. Use **Sair** para bloquear o painel novamente.
10. Confirme que as pastas começam recolhidas e que o cabeçalho expande e
    recolhe cada uma.
11. Teste uma pasta vazia e uma pasta sem permissão pública.
12. Publique no GitHub Pages e valide `/#/teachers`, a biblioteca e a reprodução.
