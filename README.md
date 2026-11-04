# RPGDex
Site voltado a jogadores de RPG, tornando o RPG de mesa em algo online para que todos possam jogar independente da distância uns dos outros.

## Tech Stack

- Angular
- C#
- TypeScript
- MongoDB

## Como rodar

### Pré-requisitos

- Node.js 18+
- npm

### Instalação e execução

```bash
npm install
n gs
```

## Estrutura do projeto

```
src/
├── pages/
│   ├── dashboard/     # Feed, Calendário, Salvo, Planos, FAQ, Sobre, Perfil
│   ├── admin/         # Painel administrativo
│   ├── SignupFlow.tsx # Cadastro
│   └── LoginFlow.tsx  # Login
├── services/          # Chamadas à API (user, notice, favorite)
├── utils/             # Validações (CPF, email, senha, nome)
└── App.tsx            # Rotas e autenticação
```

## Funcionalidades

- Cadastro e login com validação de email e verificação de conta
- Canvas(Mesa) Para a realização das campanhas com mapas
- Criação de ficha dos seus personagens para a campanha
- Biblioteca para salvar documentos importates para a campanha, como anotações, imagens, áudios, etc.
- Perfil do usuário e edição do perfil
- Chat da campanha
- Painel do admin
