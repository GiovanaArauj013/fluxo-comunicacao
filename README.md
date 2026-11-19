# Fluxo

**Sistema de gerenciamento de tarefas, setores e comunicação interna.**

O Fluxo é uma aplicação web desenvolvida para organizar o fluxo de trabalho de equipes, permitindo o gerenciamento de tarefas, a distribuição de responsabilidades e a comunicação entre usuários em um único ambiente.

Inspirado em ferramentas como Jira, o sistema possui uma interface construída em React e utiliza o Supabase como plataforma de backend, autenticação e banco de dados.

##  Funcionalidades

###  Gerenciamento de tarefas
- Organização de tarefas em quadros visuais, inspirados no Jira.
- Criação, edição e exclusão de tarefas e itens.
- Definição de responsáveis e prioridades.
- Acompanhamento do status e da evolução das atividades.
- Comentários associados aos itens.

###  Gerenciamento de setores e permissões

O sistema possui uma estrutura hierárquica de usuários e setores, com permissões específicas para cada nível:

| Perfil | Permissões |
|---|---|
| **Administrador** | Gerenciamento global de usuários, setores e permissões. |
| **Gestor** | Gerenciamento dos membros e das atividades dos setores em que possui função de gestor. |
| **Membro** | Acesso às atividades e funcionalidades disponibilizadas em seus setores. |

Um mesmo usuário pode possuir diferentes funções em setores distintos, podendo ser gestor em um setor e membro em outro.

###  Autenticação e segurança
- Autenticação de usuários pelo Supabase Auth.
- Controle de acesso baseado em papéis e vínculos com setores.
- Integração com políticas de segurança do banco de dados (RLS).
- Processo de troca obrigatória de senha no primeiro acesso.
- Bloqueio do acesso às funcionalidades principais enquanto a troca de senha estiver pendente.
- Atualização do perfil após a alteração da senha.

### 💬 Comunicação interna
- Conversas privadas entre usuários.
- Criação de grupos de comunicação.
- Adição de participantes aos grupos.
- Envio e recebimento de mensagens.
- Identificação de mensagens não lidas.
- Atualização periódica das conversas e mensagens.
- Possibilidade de sair de grupos.

##  Tecnologias utilizadas

| Tecnologia | Aplicação |
|---|---|
| React | Construção da interface e componentes. |
| Vite | Ambiente de desenvolvimento e build do front-end. |
| JavaScript | Lógica e integração da aplicação. |
| Supabase | Backend, banco de dados e autenticação. |
| PostgreSQL | Armazenamento dos dados. |
| Supabase Auth | Gerenciamento de autenticação dos usuários. |
| Row Level Security (RLS) | Controle de acesso aos dados. |
| Supabase Edge Functions | Execução de funções de backend, incluindo o fluxo de troca obrigatória de senha. |

##  Como executar o projeto

### 1. Pré-requisitos

- Node.js instalado.
- npm instalado.
- Projeto configurado no Supabase.

### 2. Instalação

Clone o repositório:

```bash
git clone URL_DO_REPOSITORIO
```

Entre na pasta do projeto:

```bash
cd fluxo
```

Instale as dependências:

```bash
npm install
```

### 3. Configuração do Supabase

Configure as credenciais do projeto em um arquivo `.env` na raiz da aplicação:

```env
VITE_SUPABASE_URL=SUA_URL_DO_SUPABASE
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA_DO_SUPABASE
```

Substitua os valores pelos dados correspondentes ao projeto no painel do Supabase.

**Importante:** não inclua chaves secretas ou credenciais administrativas no código do front-end.

### 4. Executar em desenvolvimento

```bash
npm run dev
```

O Vite disponibilizará a aplicação no endereço indicado pelo terminal, normalmente:

```text
http://localhost:5173
```

## 🗄️ Estrutura de dados

O Fluxo utiliza o PostgreSQL disponibilizado pelo Supabase.

Entre as principais tabelas e estruturas utilizadas estão:

| Tabela / Estrutura | Responsabilidade |
|---|---|
| `users` | Informações e perfis dos usuários. |
| `tasks` | Organização das tarefas. |
| `items` | Itens e atividades vinculados às tarefas. |
| `setores` | Cadastro e organização dos setores. |
| `usuarios_setores` | Vínculo entre usuários e setores, incluindo seus papéis. |
| `comentario` | Comentários associados às atividades. |
| Estruturas de chat | Conversas privadas, grupos, participantes e mensagens. |

A aplicação também utiliza funções do banco de dados (RPC) para operações relacionadas ao gerenciamento de papéis, setores e comunicação.

##  Hierarquia e controle de acesso

A autorização considera tanto o papel global do usuário quanto sua função em cada setor.

- Administradores possuem gerenciamento global.
- Gestores administram somente os setores nos quais possuem essa função.
- Membros possuem acesso às funcionalidades permitidas nos setores dos quais participam.
- As permissões são independentes por setor, permitindo que um usuário tenha diferentes responsabilidades.

O controle de acesso aos dados utiliza políticas RLS e operações específicas no Supabase.

##  Estrutura do projeto

```text
fluxo/
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── Header.jsx
│   │   ├── Login.jsx
│   │   └── ...
│   │
│   ├── api.js
│   ├── context.js
│   ├── data.js
│   ├── App.jsx
│   └── main.jsx
│
├── supabase/
│   └── functions/
│       └── force-password-change/
│
├── index.html
├── package.json
└── vite.config.js
```

##  Fluxo de primeiro acesso

Quando um usuário precisa realizar a troca obrigatória de senha:

1. O usuário realiza a autenticação.
2. O sistema consulta as informações do perfil.
3. Caso exista uma troca de senha pendente, o acesso ao painel principal é bloqueado.
4. O usuário é direcionado à tela de alteração de senha.
5. Após a alteração, o perfil é atualizado e o acesso às funcionalidades é liberado.

##  Objetivo do projeto

Centralizar a organização das atividades e a comunicação entre equipes, oferecendo controle de responsabilidades, gestão hierárquica de setores e acompanhamento do trabalho em um ambiente integrado.

---

**Fluxo — Organização, colaboração e produtividade em um só lugar.**
