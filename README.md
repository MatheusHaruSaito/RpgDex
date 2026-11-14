# RPGDex

Plataforma web para jogadores de RPG, que leva o RPG de mesa para o ambiente online para que todos possam jogar juntos, independente da distância.

O mestre cria a campanha, os jogadores entram com seus personagens e todos compartilham uma mesa virtual (canvas) em tempo real, com chat, rolagem de dados e biblioteca de documentos.

## Sumário

- [Funcionalidades](#funcionalidades)
- [Tech stack](#tech-stack)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Como rodar](#como-rodar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Planos e pagamentos](#planos-e-pagamentos)
- [Papéis e permissões](#papéis-e-permissões)
- [Tarefas em segundo plano](#tarefas-em-segundo-plano)
- [Verificação de idade](#verificação-de-idade-branch-featage-verification)
- [CI](#ci)
- [Deploy](#deploy)

## Funcionalidades

### Conta e autenticação
- Cadastro e login com validação de e-mail e verificação de conta
- Login social com **Google** e **Discord** (com opção de vincular/desvincular a conta)
- Autenticação em dois fatores (2FA) por e-mail
- Recuperação e redefinição de senha
- Autenticação via JWT com refresh token
- Perfil do usuário e edição do perfil (nome de exibição, ícone com recorte de imagem)

### Campanhas
- Criação e edição de campanhas, com limite de jogadores, data da próxima sessão e senha opcional
- Entrada de jogadores por campanha, com remoção/saída
- Aprovação de personagens pelo mestre (configurável por campanha)
- Ativar/desativar campanhas

### Canvas (mesa virtual)
- Mesa colaborativa em **tempo real** (SignalR) para a realização das sessões com mapas
- Elementos de quatro tipos: **tokens** (inclusive vinculados a personagens), **textos**, **imagens** e **desenhos**
- Mover, redimensionar, reordenar camadas e ativar/desativar elementos
- Sincronização entre todos os participantes da campanha

### Chat da campanha
- Chat em tempo real (SignalR)
- Mensagens **criptografadas** no banco de dados
- Edição de mensagens com histórico de revisões e possibilidade de restaurar versões anteriores
- Rolagem de dados por expressão (ex.: `2d20+5`, `3#1d6`), com log de rolagens da campanha

### Personagens
- Criação e edição de fichas de personagem com propriedades flexíveis (documento BSON)
- Ícone, descrição e vínculo do personagem a campanhas
- Visualização da ficha (modo leitura) e editor de ficha

### Biblioteca
- Armazenamento de documentos importantes para a campanha: anotações, imagens, áudios, etc. (arquivos salvos no GridFS do MongoDB)
- Compartilhamento: o dono pode dar ou remover acesso de outros usuários a cada documento

### Planos e assinaturas
- Planos pagos com limites de personagens, campanhas e espaço de armazenamento
- Pagamento via **Mercado Pago**, com webhook e sincronização de pagamentos
- Controle de assinaturas e histórico (ledger)

### Denúncias e painel do admin
- Usuários podem denunciar usuários, personagens e campanhas (ou enviar denúncia personalizada)
- Painel do admin com abas de **reportes**, **usuários**, **personagens** e **campanhas**
- Ações do admin: fechar denúncias e punir usuários; gerenciamento de tags de planos

### Outros
- Interface em **português e inglês** (i18n)
- Tema (claro/escuro)

## Tech stack

### Front-end (`UI/RpgDexUI`)
- Angular 21 + TypeScript
- RxJS
- `@microsoft/signalr` (tempo real)
- `@ngx-translate` (internacionalização)
- Chart.js / ng2-charts
- Angular CDK, ngx-colors, ngx-image-cropper, Font Awesome
- SSR (`@angular/ssr`) com Express
- Vitest (testes)

### Back-end (`API/RpgDex`)
- C# / .NET 10 (ASP.NET Core Web API)
- ASP.NET Core Identity com armazenamento no MongoDB
- MongoDB (MongoDB.Driver, GridFS para arquivos)
- SignalR, com backplane **Redis** (opcional)
- FluentValidation e Mapster/mapeamento de DTOs
- Envio de e-mails (Resend/SMTP)
- Mercado Pago (pagamentos)
- OpenAPI

### Infra
- Docker / Docker Compose (API + MongoDB + Redis)
- GitHub Actions (CI)
- Cloudflare (front-end, via `wrangler.toml`)

## Estrutura do projeto

```
RpgDex/
├── .github/workflows/main.yml      # CI: build da API e do front
├── API/
│   └── RpgDex/
│       ├── RpgDex.slnx
│       ├── compose.yml             # API + MongoDB + Redis
│       ├── .env.example            # modelo de variáveis de ambiente
│       ├── RpgDex.Domain/          # Entidades, enums, value objects, interfaces, erros
│       ├── RpgDex.Application/     # Serviços, DTOs, validadores, mapeamentos
│       ├── RpgDex.Infrastructure/  # MongoDB, repositórios, hubs SignalR, e-mail, jobs, seeders
│       └── RpgDex.WebApi/          # Controllers, Program.cs, Dockerfile, appsettings
└── UI/
    └── RpgDexUI/
        ├── angular.json
        ├── wrangler.toml           # configuração de deploy (Cloudflare)
        ├── public/i18n/            # traduções (pt.json, en.json)
        └── src/
            ├── environments/       # URL da API e Google Client ID
            ├── models/
            └── app/
                ├── pages/          # home, login, cadastro, campanhas, personagens,
                │                   # biblioteca, perfil, planos, admin...
                ├── components/     # canvas da campanha, chat, skeleton, etc.
                ├── modals/         # criar/editar campanha, personagem, denúncia, 2FA...
                ├── callbacks/      # retorno do Discord e dos pagamentos
                ├── services/       # comunicação com a API
                ├── guards/         # authGuard e adminGuard
                ├── core/           # interceptors (token)
                └── shared/         # navbar e footer
```

A API segue uma arquitetura em camadas (Domain → Application → Infrastructure → WebApi).

## Como rodar

### Pré-requisitos

- [Node.js](https://nodejs.org/) 20.19+ (ou 22.12+) e npm
- [.NET SDK 10](https://dotnet.microsoft.com/)
- [Docker](https://www.docker.com/) e Docker Compose (recomendado para subir API, MongoDB e Redis)
- Uma instância do MongoDB (local via Docker ou MongoDB Atlas)

### 1. Clonar o repositório

```bash
git clone https://github.com/MatheusHaruSaito/RpgDex.git
cd RpgDex
```

### 2. Back-end (API)

```bash
cd API/RpgDex
cp .env.example .env
Configure o env para que funcione corretamente
docker compose up
```

Isso sobe três serviços:

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| `app`   | 8080  | API em .NET com `dotnet watch` (hot reload) |
| `mongo` | 27017 | MongoDB |
| `redis` | 6379  | Redis (backplane do SignalR) |

A API ficará disponível em `http://localhost:8080`. Na primeira execução, os papéis (`Admin`, `User`, `Owner`) e os planos são criados automaticamente.

**Rodando sem Docker:**

```bash
cd API/RpgDex
dotnet restore
dotnet run --project RpgDex.WebApi
```

Neste caso, configure as chaves em `appsettings.Development.json`, nos *user secrets* (`dotnet user-secrets`) ou como variáveis de ambiente (ex.: `ConnectionStrings__MongoDbConnection`, `Jwt__Key`).

### 3. Front-end (Angular)

```bash
cd UI/RpgDexUI
npm install
ng s        
```

O front abre em `http://localhost:4200`.

Em desenvolvimento, o front usa `src/environments/environment.development.ts` (API em `http://localhost:8080/api`). O build de produção usa `src/environments/environment.ts`.

### Scripts úteis do front

| Comando | Descrição |
|---------|-----------|
| `npm start` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run watch` | Build em modo watch (desenvolvimento) |
| `npm test` | Testes (Vitest) |

## Variáveis de ambiente

Copie `API/RpgDex/.env.example` para `API/RpgDex/.env` e preencha:

| Variável | Descrição |
|----------|-----------|
| `MONGO_USER`, `MONGO_PASSWORD` | Credenciais do MongoDB local |
| `MONGO_CONNECTION` | String de conexão (local ou MongoDB Atlas) |
| `MONGO_DB_NAME`, `MONGO_COLLECTION_NAME` | Nome do banco e da coleção |
| `JWT_KEY`, `JWT_ISSUER`, `JWT_AUDIENCE` | Configuração dos tokens JWT |
| `GOOGLE_CLIENTID` | Client ID do login com Google |
| `DISCORD_CLIENTID`, `DISCORD_CLIENTSECRET` | Credenciais do login com Discord |
| `RESEND_API_KEY` | Chave da Resend (envio de e-mails) |
| `EMAIL_SMTP_SERVER`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_USERNAME`, `EMAIL_SMTP_PASSWORD` | Configuração SMTP |
| `ENCRYPTION_CHATKEY` | Chave de 32 caracteres para criptografar o chat |
| `MercadoPago_AccessToken` | Token de acesso do Mercado Pago |
| `MercadoPago_WebHookSecret` | Segredo do webhook |
| `MercadoPago_ValidateWebHookSignature` | `true` em produção |
| `MercadoPago_SuccessUrl`, `MercadoPago_FailureUrl`, `MercadoPago_PendingUrl` | URLs de retorno do pagamento |
| `ENCRYPTION_CPFHASHKEY` | Chave do hash de CPF *(apenas na branch `feat/age-verification`)* |

> **Importante:** nunca faça commit do arquivo `.env` nem de chaves reais. O `.gitignore` já ignora `.env` e mantém apenas o `.env.example`.

O Redis é opcional: se `ConnectionStrings:Redis` estiver vazio, o SignalR funciona sem backplane (instância única).

## Planos e pagamentos

Os planos são criados automaticamente na inicialização da API:

| Plano | Preço/mês | Personagens | Campanhas | Documentos | Canvas |
|-------|-----------|-------------|-----------|------------|--------|
| Adventurer | R$ 9,90 | 15 | 3 | 500 MB | 500 MB |
| Master | R$ 19,90 | 50 | 10 | 2 GB | 3 GB |
| Legendary | R$ 39,90 | 150 | 30 | 5 GB | 10 GB |

Os pagamentos são processados pelo Mercado Pago. Após o checkout, o usuário é redirecionado para `/payment/success`, `/payment/failure` ou `/payment/pending`.

## Papéis e permissões

| Papel | Descrição |
|-------|-----------|
| `User` | Usuário comum |
| `Admin` | Acesso ao painel de administração (rota `/admin`) |
| `Owner` | Dono da plataforma |

## Tarefas em segundo plano

A API executa serviços em background (`HostedService`):

- **SyncPaymentJob** – sincroniza o status dos pagamentos
- **SubscriptionExpiryJob** – expira assinaturas vencidas
- **OrphanFilesCleanupJob** – remove arquivos órfãos
- **InactiveCanvasElementsCleanupJob** – limpa elementos inativos do canvas

## CI

O workflow `.github/workflows/main.yml` roda em pushes para `main`, `feat/**` e `fix/**` e em pull requests para `main`:

- **API:** `dotnet restore` e `dotnet build` (.NET 10)
- **Front:** `npm ci`, lint (se existir) e `ng build` (Node 20)

Os secrets `MONGODB_CONNECTION_STRING` e `JWT_KEY` precisam estar configurados no repositório.

## Deploy

- **API:** imagem Docker via `API/RpgDex/RpgDex.WebApi/Dockerfile` (hospedada no Render)
- **Front-end:** build em `dist/RpgDexUI/browser`, publicado via Cloudflare (`wrangler.toml`, modo SPA)

## Branches

| Branch | Descrição |
|--------|-----------|
| `main` | Versão principal e estável |
