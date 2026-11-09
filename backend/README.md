# Fisk Media Backend

Backend API construído com Cloudflare Workers, Hono, D1 e integração com Google Drive via Service Account.

## Stack

- **Runtime:** Cloudflare Workers
- **Framework:** Hono 4.x
- **Database:** Cloudflare D1 (SQLite)
- **Authentication:** JWT (admin), PBKDF2 (passwords), deterministic PIN (students)
- **External APIs:** Google Drive API v3 (OAuth2 Service Account)
- **Language:** TypeScript

## Pré-requisitos

- Node.js 18+ instalado
- Wrangler CLI instalado e autenticado (`npm install -g wrangler && wrangler login`)
- Conta Cloudflare com Workers e D1 habilitados (plano gratuito funciona)
- Projeto Google Cloud com Drive API v3 ativada
- Service Account criada com as 13 pastas compartilhadas

---

## Configuração Local

### 1. Instalar dependências

```bash
npm install
```

### 2. Aplicar migrations ao banco local

```bash
npm run db:migrate:local
npm run db:seed:local
```

### 3. Configurar variáveis locais

Edite o arquivo `.dev.vars` (já existe no repositório):

```env
GOOGLE_CLIENT_EMAIL="sua-service-account@seu-projeto.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
JWT_SECRET="sua-chave-jwt-segura-com-32-caracteres-ou-mais"
SECRET_SALT="seu-salt-para-pin-mensal"
ADMIN_SETUP_KEY="sua-chave-de-setup-para-primeiro-admin"
FRONTEND_URL="http://localhost:5173"
```

**IMPORTANTE:** 
- A chave `GOOGLE_PRIVATE_KEY` deve conter as quebras de linha como `\n` literais.
- Gere `JWT_SECRET` com: `openssl rand -hex 32`
- Use o mesmo `SECRET_SALT` que estava no frontend antigo (se estiver migrando)
- Não commite `.dev.vars` — ele está no `.gitignore`

### 4. Iniciar o servidor local

```bash
npm run dev
```

O Worker estará disponível em `http://localhost:8787`.

### 5. Criar o primeiro administrador

Após iniciar o servidor, crie o primeiro admin com:

```bash
curl -X POST http://localhost:8787/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "SuaSenhaForte123!",
    "setupKey": "sua-chave-de-setup-para-primeiro-admin"
  }'
```

O endpoint `/api/auth/setup` só funciona **uma vez** (quando não há nenhum admin no banco).

---

## Estrutura do Projeto

```
backend/
├── migrations/
│   ├── 0001_initial.sql    # Schema completo (tabelas)
│   └── seed.sql            # 13 pastas do Google Drive
├── src/
│   ├── index.ts            # Entry point, rotas, cron handler
│   ├── types.ts            # TypeScript types
│   ├── middleware/
│   │   └── index.ts        # CORS, JWT auth, rate limiting
│   ├── routes/
│   │   ├── library.ts      # GET /api/library (público)
│   │   ├── stream.ts       # GET /api/stream/:fileId (streaming)
│   │   ├── sync.ts         # POST /api/sync (admin)
│   │   ├── auth.ts         # Login, setup, verificação JWT
│   │   ├── pin.ts          # Validação e info do PIN
│   │   └── admin.ts        # Gerenciamento de pastas/vídeos
│   ├── services/
│   │   ├── driveService.ts # Google Drive API (OAuth2 JWT)
│   │   ├── syncService.ts  # Sincronização e library payload
│   │   └── pinService.ts   # Geração e validação do PIN
│   └── utils/
│       └── helpers.ts      # JWT, hashing, PIN, utilidades
├── wrangler.toml           # Configuração Cloudflare
├── .dev.vars               # Variáveis locais (não commitado)
├── .env.example            # Template para .dev.vars
└── package.json
```

---

## Endpoints da API

### Públicos (sem autenticação)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/library` | Retorna a biblioteca completa (pastas e vídeos visíveis) |
| `POST` | `/api/pin/validate` | Valida o PIN do aluno (rate limited: 10/5min) |
| `GET` | `/api/stream/:fileId` | Stream de áudio/vídeo (suporta HTTP Range) |
| `HEAD` | `/api/stream/:fileId` | Metadados do arquivo (Content-Length, etc.) |

### Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/auth/login` | Login do administrador → retorna JWT |
| `POST` | `/api/auth/setup` | Cria o primeiro admin (uso único) |
| `GET` | `/api/auth/me` | Verifica o token JWT |

### Admin (requer JWT)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/pin/info` | PIN atual para exibir no painel admin |
| `POST` | `/api/pin/rotate` | Rotaciona o PIN manualmente |
| `POST` | `/api/sync` | Sincronização manual com Google Drive |
| `GET` | `/api/sync/status` | Status da última sincronização |
| `GET` | `/api/sync/history` | Histórico das últimas 20 sincronizações |
| `GET` | `/api/admin/folders` | Lista todas as pastas (incluindo ocultas) |
| `PATCH` | `/api/admin/folders/:id` | Renomeia/oculta/reordena uma pasta |
| `POST` | `/api/admin/folders/reorder` | Reordena múltiplas pastas |
| `GET` | `/api/admin/videos` | Lista vídeos (com filtros) |
| `PATCH` | `/api/admin/videos/:id` | Renomeia/oculta/reordena um vídeo |
| `POST` | `/api/admin/videos/reorder` | Reordena múltiplos vídeos |

---

## Deploy para Produção

### 1. Criar o banco D1 (se ainda não existir)

O banco já foi criado previamente. Apenas confirme o ID em `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "fisk-media-db"
database_id = "09b16bdf-fe0a-4ef3-b682-59675d3f3887"
```

### 2. Aplicar migrations em produção

```bash
npm run db:migrate
npm run db:seed
```

### 3. Configurar secrets de produção

**NUNCA** coloque secrets no `wrangler.toml`. Use `wrangler secret put`:

```bash
# Service Account do Google Drive
wrangler secret put GOOGLE_CLIENT_EMAIL
# Cole: fisk-media-backend@fisk-media-player.iam.gserviceaccount.com

wrangler secret put GOOGLE_PRIVATE_KEY
# Cole o conteúdo do arquivo JSON (incluindo \n como literais)

# Secret para JWT (gere com: openssl rand -hex 32)
wrangler secret put JWT_SECRET
# Cole: sua-chave-jwt-segura

# Salt para geração do PIN mensal
wrangler secret put SECRET_SALT
# Cole: seu-salt-secreto

# Chave de setup (use uma vez e esqueça)
wrangler secret put ADMIN_SETUP_KEY
# Cole: sua-chave-de-setup-unica
```

### 4. Deploy do Worker

```bash
npm run deploy
```

O Worker estará disponível em:  
`https://fisk-media-backend.crucialclock.workers.dev`

### 5. Criar o primeiro admin em produção

```bash
curl -X POST https://fisk-media-backend.crucialclock.workers.dev/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "SuaSenhaForteDeProdução!",
    "setupKey": "sua-chave-de-setup-unica"
  }'
```

### 6. Configurar o frontend

No repositório frontend, edite `.env` ou configure secrets no GitHub Actions:

```env
VITE_API_URL=https://fisk-media-backend.crucialclock.workers.dev
```

Depois, faça deploy do frontend.

---

## Google Drive Service Account

A Service Account deve ter:

1. **Email:** `fisk-media-backend@fisk-media-player.iam.gserviceaccount.com`
2. **Permissões:** As 13 pastas compartilhadas com essa conta (permissão de **Leitor**)
3. **Chave privada:** JSON baixado e configurado como secret

### IDs das Pastas (já seedadas)

| Categoria | Pasta | ID |
|-----------|-------|-----|
| Essentials 1 (audio) | Essentials 1 | `13AkH5a-R3vo7GusDrtno2GT_Ziwa5a7n` |
| Essentials 2 (audio) | Essentials 2 | `1ncrq4Rl4vIx-TS_-KHpLYsOjC8i1lwif` |
| Transitions 1 (audio) | Transitions 1 | `1snq7mtHv0HJPr_SXokfYiHrou_u_ZEzi` |
| Transitions 2 (audio) | Transitions 2 | `13yGr3Bo5rRUEvJ6JhIUo3HYxOEZr6BpW` |
| Fluency 1 (audio) | Fluency 1 | `1cGMiNjdYqKC7WUFdtKaGMXcwpwEfe2NF` |
| Fluency 2 (audio) | Fluency 2 | `161J8pT6z-T1htkCVybGelMpg3EM4kRxr` |
| In Focus (audio) | In Focus | `1cA7b4vCjhuE0xa2EtQwHFA3rq3UbB8jv` |
| Essentials 1 (video) | Essentials 1 | `1Im0EZZghHm27P2TAOKX5eD0Vv5ZmEpm-` |
| Essentials 2 (video) | Essentials 2 | `17Jnd7Mq5B1uDzJ408QU4MjzMYgIor-dz` |
| Transitions 1 (video) | Transitions 1 | `1jOAeE5_1OhPbmfv2hM21yGeJV8ZjzwG8` |
| Transitions 2 (video) | Transitions 2 | `1pSCHDCYvobzp7JXmnp9dID1BKnczriQA` |
| Fluency 1 (video) | Fluency 1 | `1qNiNdt_XhRPxRAv2f694Fy7uqKucIMOu` |
| Fluency 2 (video) | Fluency 2 | `1j5l0S7_kGLwFyFC7JdNFmsi8P9PpnoE2` |

---

## Cron Trigger

O Worker executa automaticamente **todo dia 1º de cada mês à meia-noite UTC**:

1. Rotaciona o PIN mensal dos alunos
2. Sincroniza a biblioteca com o Google Drive

Configurado em `wrangler.toml`:

```toml
[triggers]
crons = ["0 0 1 * *"]
```

Para testar o cron localmente, use:

```bash
wrangler dev --test-scheduled
```

---

## Segurança

- **PINs:** Hash PBKDF2-SHA256 (100.000 iterações) armazenado no D1
- **Senhas admin:** PBKDF2-SHA256 (100.000 iterações)
- **JWT:** HMAC-SHA256, expiração de 7 dias
- **Rate limiting:** 10 tentativas de PIN a cada 5 minutos por IP
- **CORS:** Apenas o frontend configurado em `FRONTEND_URL`
- **Secrets:** Gerenciados via Wrangler (nunca no código)

---

## Comandos Úteis

```bash
# Desenvolvimento
npm run dev                  # Inicia o Worker localmente

# Banco de dados (local)
npm run db:migrate:local     # Aplica migrations
npm run db:seed:local        # Popula as 13 pastas

# Banco de dados (produção)
npm run db:migrate           # Aplica migrations em produção
npm run db:seed              # Popula as 13 pastas em produção

# Deploy
npm run deploy               # Publica o Worker em produção

# Type checking
npm run type-check           # Verifica tipos TypeScript
```

---

## Troubleshooting

### Erro: "JWT_SECRET não está configurado"

Configure o secret:

```bash
wrangler secret put JWT_SECRET
```

### Erro: "GOOGLE_CLIENT_EMAIL não está configurado"

Configure os secrets do Google:

```bash
wrangler secret put GOOGLE_CLIENT_EMAIL
wrangler secret put GOOGLE_PRIVATE_KEY
```

### Erro: "A pasta não foi encontrada" durante sync

Confirme que as 13 pastas estão compartilhadas com a Service Account (`fisk-media-backend@fisk-media-player.iam.gserviceaccount.com`) com permissão de **Leitor**.

### Erro: "No migrations to apply"

As migrations já foram aplicadas. Para forçar reexecução:

```bash
wrangler d1 migrations apply fisk-media-db --local --remote
```

### Streaming não funciona

1. Confirme que os arquivos estão compartilhados com a Service Account
2. Verifique os logs do Worker: `wrangler tail`
3. Teste o endpoint `/api/stream/:fileId` diretamente no navegador

---

## Suporte

Para problemas ou dúvidas, consulte:

- [Documentação Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Documentação Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Documentação Hono](https://hono.dev/)
- [Google Drive API v3](https://developers.google.com/drive/api/v3/reference)
