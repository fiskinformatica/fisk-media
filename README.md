# Fisk Media

Biblioteca digital de áudios e vídeos das aulas Fisk, construída com React + Vite + Tailwind CSS no frontend e Cloudflare Workers + D1 + Google Drive no backend.

## Arquitetura

### Frontend
- **React 19** + Vite
- **Tailwind CSS 4**
- **Lucide React** (ícones)
- **GitHub Pages** (hospedagem estática)

### Backend
- **Cloudflare Workers** (runtime serverless)
- **Hono** (framework web)
- **Cloudflare D1** (banco SQLite)
- **Google Drive API v3** (armazenamento via Service Account)
- **TypeScript**

### Fluxo de Dados

1. **Armazenamento:** Arquivos de áudio/vídeo permanecem no Google Drive (13 pastas compartilhadas)
2. **Backend:** Worker sincroniza metadados das pastas para o D1 e serve a API
3. **Frontend:** Aplicação React consome a API e faz streaming direto via backend proxy
4. **Administração:** Painel web para sincronização, organização e gerenciamento da biblioteca

## Características

- **PIN mensal:** Acesso dos alunos controlado por PIN de 4 dígitos renovado automaticamente
- **Streaming otimizado:** Áudio e vídeo com suporte a HTTP Range (seek/skip)
- **Sincronização inteligente:** Detecta arquivos novos, removidos e renomeados
- **Organização persistente:** Ordem customizada de pastas e vídeos salva no banco
- **Painel administrativo:** Controle total da biblioteca sem tocar no Drive
- **Mobile-first:** Interface responsiva e otimizada para dispositivos móveis
- **Sem banco de dados no frontend:** Toda a persistência migrada para o backend

---

## Início Rápido

### Pré-requisitos

- Node.js 18+
- Conta Cloudflare (plano gratuito)
- Projeto Google Cloud com Drive API v3
- Service Account com as 13 pastas compartilhadas

### 1. Clonar o repositório

```bash
git clone https://github.com/fiskinformatica/fisk-media.git
cd fisk-media
```

### 2. Configurar e iniciar o backend

```bash
cd backend
npm install

# Aplicar migrations locais
npm run db:migrate:local
npm run db:seed:local

# Configurar .dev.vars (copie de .env.example e preencha)
# Veja backend/README.md para detalhes

# Iniciar o Worker localmente
npm run dev
# Backend rodando em http://localhost:8787
```

### 3. Criar o primeiro administrador

```bash
curl -X POST http://localhost:8787/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "SuaSenhaForte123!",
    "setupKey": "fisk-dev-setup-key-2024"
  }'
```

### 4. Configurar e iniciar o frontend

```bash
cd ..
npm install

# Criar .env
echo "VITE_API_URL=http://localhost:8787" > .env

# Iniciar o frontend
npm run dev
# Frontend rodando em http://localhost:5173
```

### 5. Acessar a aplicação

- **Biblioteca (alunos):** http://localhost:5173
- **Área do professor:** http://localhost:5173/#/teachers

**Credenciais de teste:**
- Usuário admin: `admin` / `SuaSenhaForte123!`
- PIN atual dos alunos: exibido no painel do professor após login

---

## Estrutura do Projeto

```
fisk-media/
├── backend/                    # Cloudflare Worker API
│   ├── migrations/            # Migrations D1
│   │   ├── 0001_initial.sql  # Schema do banco
│   │   └── seed.sql           # 13 pastas do Drive
│   ├── src/
│   │   ├── index.ts           # Entry point + cron
│   │   ├── types.ts           # TypeScript types
│   │   ├── middleware/        # CORS, JWT, rate limiting
│   │   ├── routes/            # Rotas da API
│   │   ├── services/          # Lógica de negócio
│   │   └── utils/             # Helpers
│   ├── wrangler.toml          # Configuração Cloudflare
│   ├── .dev.vars              # Secrets locais (não commitado)
│   └── package.json
│
├── src/                        # Frontend React
│   ├── components/            # Componentes UI
│   ├── hooks/                 # Hooks customizados
│   ├── pages/                 # Páginas principais
│   ├── services/              # Integração com API
│   │   └── apiService.js     # Cliente HTTP
│   ├── utils/                 # Utilitários
│   └── config/                # Configurações
│
├── public/                     # Assets estáticos
├── .env                        # Variáveis do frontend (não commitado)
├── .env.example               # Template
├── vite.config.js             # Configuração Vite
├── tailwind.config.js         # Configuração Tailwind
└── package.json
```

---

## API Endpoints

### Públicos (sem autenticação)

- `GET /api/library` - Biblioteca completa
- `POST /api/pin/validate` - Valida PIN do aluno (rate limited)
- `GET /api/stream/:fileId` - Stream de áudio/vídeo
- `GET /health` - Health check

### Autenticação

- `POST /api/auth/login` - Login admin → retorna JWT
- `POST /api/auth/setup` - Cria primeiro admin (uso único)
- `GET /api/auth/me` - Verifica token

### Administração (requer JWT)

- `GET /api/pin/info` - PIN atual
- `POST /api/sync` - Sincronização manual
- `GET /api/sync/history` - Histórico de sincronizações
- `GET /api/admin/folders` - Lista pastas
- `PATCH /api/admin/folders/:id` - Atualiza pasta
- `GET /api/admin/videos` - Lista vídeos
- `PATCH /api/admin/videos/:id` - Atualiza vídeo
- _E mais..._

Veja `backend/README.md` para documentação completa.

---

## Deploy

### Backend (Cloudflare Workers)

```bash
cd backend

# 1. Aplicar migrations em produção
npm run db:migrate
npm run db:seed

# 2. Configurar secrets
wrangler secret put GOOGLE_CLIENT_EMAIL
wrangler secret put GOOGLE_PRIVATE_KEY
wrangler secret put JWT_SECRET
wrangler secret put SECRET_SALT
wrangler secret put ADMIN_SETUP_KEY

# 3. Deploy
npm run deploy
```

O Worker estará em: `https://fisk-media-backend.crucialclock.workers.dev`

### Frontend (GitHub Pages)

```bash
# 1. Configurar URL da API
echo "VITE_API_URL=https://fisk-media-backend.crucialclock.workers.dev" > .env

# 2. Build
npm run build

# 3. Deploy
npm run deploy
```

O site estará em: `https://fiskinformatica.github.io/fisk-media`

**Ou use GitHub Actions:** Faça push para `main` e o workflow `.github/workflows/deploy.yml` fará o deploy automaticamente.

---

## Configuração do Google Drive

### 1. Criar Service Account

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie ou selecione o projeto `fisk-media-player`
3. Habilite **Google Drive API**
4. Crie uma **Service Account**
5. Baixe a chave JSON

### 2. Compartilhar as 13 Pastas

Compartilhe cada uma das 13 pastas com o email da Service Account:

```
fisk-media-backend@fisk-media-player.iam.gserviceaccount.com
```

Permissão: **Leitor**

### 3. IDs das Pastas

Os IDs já estão configurados em `backend/migrations/seed.sql`:

- **Áudio:** Essentials 1 e 2, Transitions 1 e 2, Fluency 1 e 2, In Focus
- **Vídeo:** Essentials 1 e 2, Transitions 1 e 2, Fluency 1 e 2

---

## Segurança

- **PINs dos alunos:** Hash PBKDF2-SHA256 (100k iterações) no D1
- **Senhas admin:** Hash PBKDF2-SHA256 (100k iterações) no D1
- **Sessões admin:** JWT HMAC-SHA256, expiração 7 dias
- **Rate limiting:** 10 tentativas de PIN por 5 minutos (por IP)
- **CORS:** Apenas frontend configurado
- **Secrets:** Gerenciados via Wrangler (nunca no código)
- **Streaming:** Autenticado via Service Account (não expõe credenciais)

---

## Funcionalidades

### Para Alunos

- Acesso via PIN mensal de 4 dígitos
- Navegação por categorias (Essentials, Transitions, Fluency, In Focus)
- Player de áudio fixo com controles completos
- Player de vídeo modal com tela cheia
- Busca e filtro por tipo de mídia
- Reprodução contínua de áudios
- Interface mobile-first

### Para Professores

- Login administrativo seguro
- Visualização do PIN atual e anterior
- Painel de sincronização com Google Drive
- Histórico de sincronizações
- Reordenação drag-and-drop de pastas e vídeos
- Renomeação de títulos
- Controle de visibilidade
- Estatísticas da biblioteca

---

## Desenvolvimento

### Frontend

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run preview      # Preview do build
npm run lint         # Oxlint
```

### Backend

```bash
npm run dev                  # Worker local
npm run deploy               # Deploy para produção
npm run db:migrate:local     # Migrations locais
npm run db:seed:local        # Seed local
npm run type-check           # TypeScript check
```

---

## Troubleshooting

### Backend não sincroniza

1. Confirme que as pastas estão compartilhadas com a Service Account
2. Verifique os logs: `wrangler tail`
3. Teste a autenticação do Google Drive

### Frontend não carrega a biblioteca

1. Confirme que `VITE_API_URL` está definido no `.env`
2. Verifique se o backend está rodando
3. Abra o DevTools → Network para ver erros de API

### Streaming não funciona

1. Teste o endpoint `/api/stream/:fileId` diretamente
2. Confirme que os arquivos estão compartilhados
3. Verifique CORS no backend

### PIN não valida

1. Confirme que `SECRET_SALT` é o mesmo no backend e no cron
2. Verifique se o PIN não expirou
3. Consulte o PIN atual em `/api/pin/info` (requer admin)

---

## Tecnologias

**Frontend:**
- React 19
- Vite 8
- Tailwind CSS 4
- Lucide React

**Backend:**
- Cloudflare Workers
- Hono 4
- Cloudflare D1 (SQLite)
- TypeScript 5

**APIs Externas:**
- Google Drive API v3 (OAuth2 Service Account)

**Infraestrutura:**
- GitHub Pages (frontend)
- Cloudflare Workers (backend)
- Cloudflare D1 (banco)

---

## Licença

Uso interno da Fisk Informática.

---

## Suporte

Para problemas ou dúvidas:

1. Consulte `backend/README.md` para documentação detalhada do backend
2. Veja os logs do Worker: `wrangler tail`
3. Verifique o status do D1: `wrangler d1 info fisk-media-db`

---

## Créditos

Desenvolvido para Fisk Informática.

Stack: React, Vite, Tailwind CSS, Cloudflare Workers, Hono, D1, Google Drive API.
