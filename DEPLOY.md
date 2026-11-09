# Guia de Deploy - Fisk Media

Este guia detalha o processo completo de deploy do Fisk Media para produção.

## Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Backend (Cloudflare Workers)](#backend-cloudflare-workers)
3. [Frontend (GitHub Pages)](#frontend-github-pages)
4. [Validação](#validação)
5. [Manutenção](#manutenção)
6. [Rollback](#rollback)

---

## Pré-requisitos

### Contas e Acessos

- [ ] Conta Cloudflare com Workers habilitado
- [ ] Wrangler CLI instalado e autenticado (`wrangler login`)
- [ ] Repositório GitHub com acesso de escrita
- [ ] Projeto Google Cloud com Drive API v3 ativada
- [ ] Service Account criada e chave JSON baixada
- [ ] 13 pastas do Drive compartilhadas com a Service Account

### Informações Necessárias

- **Database ID D1:** `09b16bdf-fe0a-4ef3-b682-59675d3f3887`
- **Worker subdomain:** `crucialclock.workers.dev`
- **Service Account email:** `fisk-media-backend@fisk-media-player.iam.gserviceaccount.com`
- **Frontend URL produção:** `https://fiskinformatica.github.io/fisk-media`

---

## Backend (Cloudflare Workers)

### Passo 1: Preparar o Ambiente

```bash
cd backend
npm install
```

### Passo 2: Validar wrangler.toml

Confirme que `wrangler.toml` contém:

```toml
name = "fisk-media-backend"
main = "src/index.ts"
compatibility_date = "2024-11-01"

[[d1_databases]]
binding = "DB"
database_name = "fisk-media-db"
database_id = "09b16bdf-fe0a-4ef3-b682-59675d3f3887"

[triggers]
crons = ["0 0 1 * *"]

[env.production]
vars = { FRONTEND_URL = "https://fiskinformatica.github.io" }
```

### Passo 3: Aplicar Migrations em Produção

```bash
# Aplicar schema
npm run db:migrate

# Popular as 13 pastas
npm run db:seed
```

**Importante:** Só execute `db:seed` uma vez. Ele usa `INSERT OR IGNORE`, então é seguro executar múltiplas vezes, mas não é necessário.

### Passo 4: Configurar Secrets

**NUNCA coloque secrets no código ou no wrangler.toml.**

Execute cada comando e cole o valor quando solicitado:

```bash
# Service Account do Google Drive
wrangler secret put GOOGLE_CLIENT_EMAIL
# Cole: fisk-media-backend@fisk-media-player.iam.gserviceaccount.com

wrangler secret put GOOGLE_PRIVATE_KEY
# Cole o conteúdo da chave privada do JSON (com \n literais)
# Exemplo: -----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n
```

```bash
# JWT Secret (gere com: openssl rand -hex 32)
wrangler secret put JWT_SECRET
# Cole um hash de 64 caracteres, exemplo:
# a1b2c3d4e5f6...
```

```bash
# Salt para PIN mensal (use o mesmo do frontend antigo se estiver migrando)
wrangler secret put SECRET_SALT
# Cole um salt secreto, exemplo: fisk-prod-salt-2024-seguro-xyz
```

```bash
# Chave de setup (use uma vez e depois descarte)
wrangler secret put ADMIN_SETUP_KEY
# Cole uma chave única, exemplo: fisk-prod-setup-key-2024-unico
```

### Passo 5: Deploy do Worker

```bash
npm run deploy
```

Saída esperada:

```
✨ Successfully deployed worker to
   https://fisk-media-backend.crucialclock.workers.dev
```

### Passo 6: Criar o Primeiro Administrador

**IMPORTANTE:** Execute este comando apenas UMA vez, logo após o deploy inicial.

```bash
curl -X POST https://fisk-media-backend.crucialclock.workers.dev/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "SuaSenhaForteDeProdução!",
    "setupKey": "fisk-prod-setup-key-2024-unico"
  }'
```

**Resposta esperada:**

```json
{"ok":true,"data":{"message":"Administrador criado com sucesso."}}
```

**Anote as credenciais em um local seguro (gerenciador de senhas).**

Após criar o admin, o endpoint `/api/auth/setup` será bloqueado permanentemente.

### Passo 7: Testar o Backend

```bash
# Health check
curl https://fisk-media-backend.crucialclock.workers.dev/health

# Login admin
curl -X POST https://fisk-media-backend.crucialclock.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"SuaSenhaForteDeProdução!"}'

# Biblioteca (público)
curl https://fisk-media-backend.crucialclock.workers.dev/api/library
```

### Passo 8: Primeira Sincronização

Use o token JWT retornado no login:

```bash
curl -X POST https://fisk-media-backend.crucialclock.workers.dev/api/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_JWT_AQUI"
```

Isso pode levar alguns minutos dependendo do tamanho da biblioteca.

---

## Frontend (GitHub Pages)

### Passo 1: Configurar Variáveis de Ambiente

Edite `.env` na raiz do projeto:

```env
VITE_API_URL=https://fisk-media-backend.crucialclock.workers.dev
```

**OU** configure secrets do GitHub Actions:

1. Vá em **Settings → Secrets and variables → Actions**
2. Clique em **New repository secret**
3. Nome: `VITE_API_URL`
4. Valor: `https://fisk-media-backend.crucialclock.workers.dev`

### Passo 2: Build Local (Opcional)

Teste o build localmente antes de fazer deploy:

```bash
npm install
npm run build
npm run preview
```

Acesse http://localhost:4173 e valide que tudo funciona.

### Passo 3: Deploy Manual (via gh-pages)

```bash
npm run deploy
```

Isso executará:
1. `npm run build` (gera `dist/`)
2. `gh-pages -d dist` (publica no GitHub Pages)

### Passo 4: Deploy Automático (via GitHub Actions)

**Recomendado para produção.**

O workflow `.github/workflows/deploy.yml` já está configurado.

Para fazer deploy:

```bash
git add .
git commit -m "Deploy: migração para backend Cloudflare"
git push origin main
```

O GitHub Actions executará automaticamente:
1. Checkout do código
2. Instalação de dependências
3. Build com as variáveis de ambiente
4. Deploy para GitHub Pages

Acompanhe em: `https://github.com/fiskinformatica/fisk-media/actions`

### Passo 5: Configurar GitHub Pages

1. Vá em **Settings → Pages**
2. **Source:** GitHub Actions (ou Branch: `gh-pages` se usar deploy manual)
3. Aguarde alguns minutos

O site estará disponível em:  
`https://fiskinformatica.github.io/fisk-media`

---

## Validação

### Backend

- [ ] Health check responde: `curl https://fisk-media-backend.crucialclock.workers.dev/health`
- [ ] Login admin funciona
- [ ] GET `/api/library` retorna a biblioteca
- [ ] GET `/api/pin/info` retorna o PIN atual (requer JWT)
- [ ] POST `/api/sync` executa sincronização (requer JWT)
- [ ] GET `/api/stream/:fileId` faz streaming de um arquivo

### Frontend

- [ ] Site carrega: `https://fiskinformatica.github.io/fisk-media`
- [ ] Tela de PIN aparece
- [ ] Login com PIN válido funciona
- [ ] Biblioteca carrega as categorias
- [ ] Player de áudio reproduz corretamente
- [ ] Player de vídeo reproduz corretamente
- [ ] Área do professor (`/#/teachers`) funciona
- [ ] Login administrativo funciona
- [ ] Painel de sincronização funciona
- [ ] Drag and drop de pastas funciona

### Integração

- [ ] PIN gerado pelo backend valida corretamente
- [ ] Streaming de mídia funciona sem interrupções
- [ ] Sincronização atualiza a biblioteca no frontend
- [ ] CORS permite requisições do GitHub Pages
- [ ] Mobile funciona (teste em dispositivo real)

---

## Manutenção

### Atualizar o Backend

```bash
cd backend
# Fazer alterações no código
npm run type-check
npm run deploy
```

### Atualizar o Frontend

```bash
# Fazer alterações no código
npm run build
npm run deploy
# OU
git push origin main  # GitHub Actions fará o deploy
```

### Adicionar um Novo Admin

Execute via SQL no D1:

```bash
wrangler d1 execute fisk-media-db --remote --command="
  INSERT INTO admins (username, password_hash)
  VALUES ('novo_admin', 'HASH_PBKDF2_AQUI')
"
```

**Ou** crie um endpoint admin para isso.

### Monitorar o Worker

```bash
# Logs em tempo real
wrangler tail

# Ver métricas no dashboard
# https://dash.cloudflare.com → Workers → fisk-media-backend
```

### Backup do Banco D1

```bash
wrangler d1 export fisk-media-db --remote --output=backup-$(date +%Y%m%d).sql
```

---

## Rollback

### Backend

```bash
# Ver deployments anteriores
wrangler deployments list

# Fazer rollback para uma versão específica
wrangler rollback --version-id <VERSION_ID>
```

### Frontend

```bash
# Voltar ao commit anterior
git revert HEAD
git push origin main

# OU build manualmente de um commit anterior
git checkout <COMMIT_HASH>
npm run build
npm run deploy
git checkout main
```

---

## Troubleshooting

### Worker não responde

```bash
# Verificar status
wrangler tail

# Verificar secrets
wrangler secret list

# Re-deploy
npm run deploy
```

### Sincronização falha

1. Confirme que as 13 pastas estão compartilhadas com a Service Account
2. Teste a autenticação do Google Drive:
   ```bash
   curl -X POST https://fisk-media-backend.crucialclock.workers.dev/api/sync \
     -H "Authorization: Bearer SEU_TOKEN"
   ```
3. Verifique os logs: `wrangler tail`

### Frontend não carrega biblioteca

1. Confirme `VITE_API_URL` no build
2. Teste a API diretamente: `curl https://fisk-media-backend.crucialclock.workers.dev/api/library`
3. Verifique CORS no navegador (DevTools → Console)

### CORS Error

Confirme que `FRONTEND_URL` está configurado corretamente no `wrangler.toml`:

```toml
[env.production]
vars = { FRONTEND_URL = "https://fiskinformatica.github.io" }
```

Re-deploy após alterar.

---

## Checklist Final

### Antes do Deploy

- [ ] Todas as dependências instaladas
- [ ] Testes locais passando
- [ ] Secrets configurados no Cloudflare
- [ ] Migrations aplicadas
- [ ] `.env` com URL de produção
- [ ] GitHub Actions configurado (se usar)

### Após o Deploy

- [ ] Health check do backend OK
- [ ] Frontend carregando
- [ ] Login admin funcionando
- [ ] Sincronização executada
- [ ] Streaming testado
- [ ] PIN validando
- [ ] Mobile testado
- [ ] Documentação atualizada
- [ ] Credenciais armazenadas com segurança

---

## Comandos Rápidos

```bash
# Backend: deploy completo
cd backend && npm run db:migrate && npm run deploy && cd ..

# Frontend: deploy completo
npm run build && npm run deploy

# Logs em tempo real
wrangler tail

# Backup do banco
wrangler d1 export fisk-media-db --remote --output=backup.sql

# Listar secrets
wrangler secret list

# Deletar secret
wrangler secret delete SECRET_NAME
```

---

## Contatos de Suporte

- **Documentação Cloudflare Workers:** https://developers.cloudflare.com/workers/
- **Documentação D1:** https://developers.cloudflare.com/d1/
- **Documentação Hono:** https://hono.dev/
- **Google Drive API:** https://developers.google.com/drive/api/v3/reference

---

**Última atualização:** 2026-11-09
