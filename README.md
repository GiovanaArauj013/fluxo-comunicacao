# Fluxo – Comunicação interna

Quadro de comunicações organizado por tarefas, inspirado no Jira.
Front-end em React (Vite) e back-end em Node.js (Express) com banco SQLite.

## Como rodar (desenvolvimento)
```bash
npm install
npm run dev:all        # API em :3001 + front-end em :5173
```
Abra http://localhost:5173 e entre com **ana@fluxo.com / senha123**.
Os outros usuários de exemplo são marina@, carlos@, paula@ e rafael@fluxo.com (mesma senha).

O banco `server/fluxo.db` é criado e populado automaticamente na primeira execução.
Para recomeçar do zero, apague o arquivo.

## Como rodar (produção)
```bash
npm run build
JWT_SECRET="um-segredo-longo-e-aleatorio" PORT=3001 npm start
```
O Express serve a API e o front-end compilado no mesmo endereço.

## Variáveis de ambiente
| Variável | Padrão | Uso |
|---|---|---|
| `PORT` | 3001 | porta da API |
| `JWT_SECRET` | segredo de desenvolvimento | **defina em produção** |
| `DB_FILE` | `server/fluxo.db` | caminho do arquivo SQLite |

## API (todas as rotas, exceto o login, exigem `Authorization: Bearer <token>`)
| Método e rota | Descrição |
|---|---|
| `POST /api/auth/login` | `{ email, password }` → `{ token, user }` |
| `GET /api/me` | usuário logado |
| `GET /api/bootstrap` | usuário, usuários, tarefas e itens com comentários |
| `GET /api/users` | lista de usuários |
| `GET /api/tasks` · `POST /api/tasks` | listar e criar tarefas |
| `GET /api/items` | lista (filtros: `taskId`, `assigneeId`, `status`, `type`) |
| `POST /api/items` | cria item |
| `PATCH /api/items/:id` | atualiza campos (status, tarefa, responsável, prioridade, título, descrição) |
| `DELETE /api/items/:id` | exclui item e seus comentários |
| `POST /api/items/:id/comments` | `{ text }` → comenta como o usuário logado |
| `GET /api/chats` | minhas conversas (privadas e grupos), com última mensagem e não lidas |
| `POST /api/chats` | `{ userId }` abre (ou cria) a conversa privada · `{ name, memberIds }` cria um grupo |
| `POST /api/chats/:id/members` | `{ userIds }` adiciona pessoas a um grupo |
| `POST /api/chats/:id/leave` | sai de um grupo (grupo sem ninguém é removido) |
| `GET /api/chats/:id/messages` | mensagens (`?after=<id>` traz só as novas) e marca como lidas |
| `POST /api/chats/:id/messages` | `{ text }` envia mensagem |

### Regras das conversas
- Privadas (1 para 1): só os dois participantes leem e escrevem; para os demais a API responde 404.
- Grupos: nome de até 60 caracteres, de 3 a 50 pessoas (quem cria + pelo menos 2).
- Qualquer participante pode adicionar pessoas. Quem entra vê o histórico, mas ele não conta como "não lido".
- Quem sai deixa de ver o grupo; as mensagens que enviou permanecem.
- Bancos criados antes dos grupos são migrados automaticamente na primeira execução.
- A tela busca mensagens novas a cada 3 s e a lista de conversas a cada 5 s.

## Estrutura
- `server/db.js` – esquema SQLite e dados iniciais
- `server/index.js` – rotas, validação e autenticação (JWT + bcrypt)
- `src/api.js` – chamadas à API; `src/context.js` – usuários e tarefas compartilhados
- `src/App.jsx` – estado e ações; `src/components/` – telas e componentes
