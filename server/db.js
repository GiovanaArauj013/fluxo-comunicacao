import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
export const db = new Database(process.env.DB_FILE || path.join(dir, "fluxo.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  status TEXT NOT NULL,
  assignee_id INTEGER REFERENCES users(id),
  priority TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id),
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,                                   -- só para grupos
  is_group INTEGER NOT NULL DEFAULT 0,
  dm_key TEXT UNIQUE,                          -- "menor-maior" ids, evita conversas 1:1 duplicadas
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS chat_members (
  chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  last_read_id INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (chat_id, user_id)
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_members_user ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, id);
CREATE INDEX IF NOT EXISTS idx_items_task ON items(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_item ON comments(item_id);
`);

// Migração: bancos criados antes dos grupos tinham chats(user_a, user_b) e chat_reads.
if (db.prepare("SELECT 1 FROM pragma_table_info('chats') WHERE name = 'user_a'").get()) {
  db.pragma("foreign_keys = OFF");
  db.exec(`
    BEGIN;
    INSERT OR IGNORE INTO chat_members (chat_id, user_id, last_read_id)
      SELECT c.id, c.user_a, COALESCE((SELECT last_read_id FROM chat_reads r WHERE r.chat_id = c.id AND r.user_id = c.user_a), 0) FROM chats c;
    INSERT OR IGNORE INTO chat_members (chat_id, user_id, last_read_id)
      SELECT c.id, c.user_b, COALESCE((SELECT last_read_id FROM chat_reads r WHERE r.chat_id = c.id AND r.user_id = c.user_b), 0) FROM chats c;
    CREATE TABLE chats_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, is_group INTEGER NOT NULL DEFAULT 0,
      dm_key TEXT UNIQUE, created_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO chats_new (id, is_group, dm_key, created_at) SELECT id, 0, user_a || '-' || user_b, created_at FROM chats;
    DROP TABLE chats;
    ALTER TABLE chats_new RENAME TO chats;
    DROP TABLE IF EXISTS chat_reads;
    COMMIT;
  `);
  db.pragma("foreign_keys = ON");
}

// Dados iniciais (somente se o banco estiver vazio)
if (db.prepare("SELECT COUNT(*) c FROM users").get().c === 0) {
  const hash = bcrypt.hashSync("senha123", 10);
  const addUser = db.prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)");
  [["Ana Souza", "ana@fluxo.com"], ["Marina Lopes", "marina@fluxo.com"], ["Carlos Mendes", "carlos@fluxo.com"], ["Paula Ribeiro", "paula@fluxo.com"], ["Rafael Costa", "rafael@fluxo.com"]]
    .forEach(([n, e]) => addUser.run(n, e, hash));

  const addTask = db.prepare("INSERT INTO tasks (name) VALUES (?)");
  ["Recesso de fim de ano", "Política de despesas e viagens", "Plano de saúde 2027", "Sexta sem reuniões", "Apresentação institucional 2027", "Infraestrutura e acessos"].forEach((t) => addTask.run(t));

  const addItem = db.prepare("INSERT INTO items (type, title, task_id, status, assignee_id, priority, description) VALUES (?,?,?,?,?,?,?)");
  const addComment = db.prepare("INSERT INTO comments (item_id, author_id, text, created_at) VALUES (?,?,?, datetime('now', ?))");
  // users: 1 Ana, 2 Marina, 3 Carlos, 4 Paula, 5 Rafael
  addItem.run("Comunicado", "Recesso de fim de ano: datas e escala de plantão", 1, "Em andamento", 2, "Alta", "Definir as datas do recesso coletivo e publicar a escala de plantão para as áreas que atendem clientes.");
  addItem.run("Solicitação", "Acesso à VPN para equipe de campo", 6, "Novo", 3, "Média", "Cinco vendedores precisam de acesso remoto aos relatórios de estoque.");
  addItem.run("Decisão", "Adotar reuniões sem agenda às sextas à tarde", 4, "Aguardando resposta", 1, "Média", "Proposta de bloquear sextas após 14h para trabalho focado. Precisamos da posição de cada gestor.");
  addItem.run("Comunicado", "Novo fluxo de aprovação de despesas", 2, "Concluído", 4, "Baixa", "Publicado no mural e enviado por e-mail a todos os gestores.");
  addItem.run("Dúvida", "Quem aprova viagens acima de R$ 5.000?", 2, "Novo", 5, "Alta", "A política antiga cita um cargo que não existe mais.");
  addItem.run("Solicitação", "Atualizar apresentação institucional 2027", 5, "Em andamento", 4, "Média", "Incluir novos números do trimestre e depoimentos de clientes.");
  addItem.run("Decisão", "Escolha do fornecedor de plano de saúde", 3, "Aguardando resposta", 2, "Alta", "Três propostas recebidas. Votação do comitê até dia 12.");
  addItem.run("Comunicado", "Manutenção do servidor de arquivos no sábado", 6, "Novo", 3, "Média", "Indisponibilidade prevista das 22h às 02h.");
  addComment.run(1, 2, "Rascunho pronto. @Ana pode revisar o texto até quinta?", "-1 day");
  addComment.run(3, 4, "Comercial apoia, desde que os plantões de atendimento sejam mantidos.", "-2 hours");
  addComment.run(3, 5, "Tecnologia a favor.", "-1 hours");
  addComment.run(6, 4, "Já tenho os números. Faltam os depoimentos.", "-3 hours");
}

// Conversas de exemplo (somente em banco novo): uma privada e um grupo
if (db.prepare("SELECT COUNT(*) c FROM chats").get().c === 0 && db.prepare("SELECT COUNT(*) c FROM users WHERE id BETWEEN 1 AND 5").get().c === 5) {
  const newChat = db.prepare("INSERT INTO chats (name, is_group, dm_key, created_by) VALUES (?,?,?,?)");
  const member = db.prepare("INSERT INTO chat_members (chat_id, user_id, last_read_id) VALUES (?,?,?)");
  const msg = db.prepare("INSERT INTO messages (chat_id, sender_id, text, created_at) VALUES (?,?,?, datetime('now', ?))");

  const dm = newChat.run(null, 0, "1-2", 1).lastInsertRowid;
  msg.run(dm, 2, "Oi Ana! Conseguiu ver o rascunho do comunicado de recesso?", "-30 minutes");
  const read = msg.run(dm, 1, "Vi sim, só ajustei as datas. Te mando hoje.", "-20 minutes").lastInsertRowid;
  msg.run(dm, 2, "Perfeito, obrigada!", "-5 minutes");
  member.run(dm, 1, read); member.run(dm, 2, 0);

  const grp = newChat.run("Comitê de comunicação", 1, null, 1).lastInsertRowid;
  const first = msg.run(grp, 4, "Pessoal, podemos fechar o texto do comunicado de recesso até quinta?", "-2 hours").lastInsertRowid;
  msg.run(grp, 5, "Por mim está ok.", "-1 hours");
  member.run(grp, 1, first); [2, 4, 5].forEach((u) => member.run(grp, u, 0));
}
