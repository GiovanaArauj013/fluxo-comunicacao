import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { db } from "./db.js";

const PORT = process.env.PORT || 3001;
const SECRET = process.env.JWT_SECRET || "dev-secret-troque-em-producao";
if (!process.env.JWT_SECRET) console.warn("⚠  JWT_SECRET não definido: usando segredo de desenvolvimento.");

const TYPES = ["Comunicado", "Solicitação", "Decisão", "Dúvida"];
const STATUSES = ["Novo", "Em andamento", "Aguardando resposta", "Concluído"];
const PRIORITIES = ["Alta", "Média", "Baixa"];

const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));

// ---------- helpers ----------
const iso = (s) => s.replace(" ", "T") + "Z"; // SQLite grava UTC sem fuso
const fail = (res, code, msg) => res.status(code).json({ error: msg });
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

const toComment = (c) => ({ id: c.id, authorId: c.author_id, text: c.text, createdAt: iso(c.created_at) });
const itemRow = db.prepare("SELECT * FROM items WHERE id = ?");
const commentsOf = db.prepare("SELECT * FROM comments WHERE item_id = ? ORDER BY id");

function toItem(r) {
  return {
    id: r.id, type: r.type, title: r.title, taskId: r.task_id, status: r.status,
    assigneeId: r.assignee_id, priority: r.priority, description: r.description,
    createdAt: iso(r.created_at), comments: commentsOf.all(r.id).map(toComment),
  };
}

// ---------- autenticação ----------
app.post("/api/auth/login", (req, res) => {
  const email = str(req.body.email, 120).toLowerCase();
  const u = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!u || !bcrypt.compareSync(String(req.body.password || ""), u.password_hash))
    return fail(res, 401, "E-mail ou senha incorretos.");
  const token = jwt.sign({ sub: u.id }, SECRET, { expiresIn: "12h" });
  res.json({ token, user: { id: u.id, name: u.name, email: u.email } });
});

function auth(req, res, next) {
  const h = req.headers.authorization || "";
  try {
    const { sub } = jwt.verify(h.replace(/^Bearer /, ""), SECRET);
    const u = db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(sub);
    if (!u) throw new Error("usuário inexistente");
    req.user = u;
    next();
  } catch {
    fail(res, 401, "Sessão expirada. Entre novamente.");
  }
}
app.use("/api", auth);

// ---------- dados ----------
app.get("/api/me", (req, res) => res.json(req.user));
app.get("/api/users", (_req, res) => res.json(db.prepare("SELECT id, name, email FROM users ORDER BY name").all()));

app.get("/api/tasks", (_req, res) => res.json(db.prepare("SELECT id, name FROM tasks ORDER BY id").all()));
app.post("/api/tasks", (req, res) => {
  const name = str(req.body.name, 80);
  if (!name) return fail(res, 400, "Informe o nome da tarefa.");
  try {
    const r = db.prepare("INSERT INTO tasks (name) VALUES (?)").run(name);
    res.status(201).json({ id: r.lastInsertRowid, name });
  } catch {
    fail(res, 409, "Já existe uma tarefa com esse nome.");
  }
});

// Carrega tudo de uma vez (usado ao abrir o app e na atualização periódica)
app.get("/api/bootstrap", (req, res) => {
  res.json({
    user: req.user,
    users: db.prepare("SELECT id, name, email FROM users ORDER BY name").all(),
    tasks: db.prepare("SELECT id, name FROM tasks ORDER BY id").all(),
    items: db.prepare("SELECT * FROM items ORDER BY id").all().map(toItem),
  });
});

app.get("/api/items", (req, res) => {
  const { taskId, assigneeId, status, type } = req.query;
  let rows = db.prepare("SELECT * FROM items ORDER BY id").all();
  if (taskId) rows = rows.filter((r) => r.task_id === Number(taskId));
  if (assigneeId) rows = rows.filter((r) => r.assignee_id === Number(assigneeId));
  if (status) rows = rows.filter((r) => r.status === status);
  if (type) rows = rows.filter((r) => r.type === type);
  res.json(rows.map(toItem));
});

function validate(b, partial) {
  const out = {};
  const err = (m) => { throw new Error(m); };
  if (!partial || b.title !== undefined) { out.title = str(b.title, 200); if (!out.title) err("O título é obrigatório."); }
  if (!partial || b.type !== undefined) { if (!TYPES.includes(b.type)) err("Tipo inválido."); out.type = b.type; }
  if (!partial || b.status !== undefined) { if (!STATUSES.includes(b.status)) err("Status inválido."); out.status = b.status; }
  if (!partial || b.priority !== undefined) { if (!PRIORITIES.includes(b.priority)) err("Prioridade inválida."); out.priority = b.priority; }
  if (!partial || b.taskId !== undefined) {
    if (!db.prepare("SELECT 1 FROM tasks WHERE id = ?").get(b.taskId)) err("Tarefa inválida.");
    out.task_id = Number(b.taskId);
  }
  if (!partial || b.assigneeId !== undefined) {
    if (!db.prepare("SELECT 1 FROM users WHERE id = ?").get(b.assigneeId)) err("Responsável inválido.");
    out.assignee_id = Number(b.assigneeId);
  }
  if (b.description !== undefined) out.description = str(b.description, 4000);
  return out;
}

app.post("/api/items", (req, res) => {
  let d;
  try { d = validate({ status: "Novo", priority: "Média", ...req.body }, false); } catch (e) { return fail(res, 400, e.message); }
  const r = db.prepare(
    "INSERT INTO items (type, title, task_id, status, assignee_id, priority, description) VALUES (@type,@title,@task_id,@status,@assignee_id,@priority,@description)"
  ).run({ description: "", ...d });
  res.status(201).json(toItem(itemRow.get(r.lastInsertRowid)));
});

app.patch("/api/items/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!itemRow.get(id)) return fail(res, 404, "Item não encontrado.");
  let d;
  try { d = validate(req.body, true); } catch (e) { return fail(res, 400, e.message); }
  const cols = Object.keys(d);
  if (cols.length) db.prepare(`UPDATE items SET ${cols.map((c) => `${c} = @${c}`).join(", ")} WHERE id = @id`).run({ ...d, id });
  res.json(toItem(itemRow.get(id)));
});

app.delete("/api/items/:id", (req, res) => {
  const r = db.prepare("DELETE FROM items WHERE id = ?").run(Number(req.params.id));
  r.changes ? res.status(204).end() : fail(res, 404, "Item não encontrado.");
});

app.post("/api/items/:id/comments", (req, res) => {
  const id = Number(req.params.id);
  if (!itemRow.get(id)) return fail(res, 404, "Item não encontrado.");
  const text = str(req.body.text, 2000);
  if (!text) return fail(res, 400, "Escreva o comentário.");
  const r = db.prepare("INSERT INTO comments (item_id, author_id, text) VALUES (?,?,?)").run(id, req.user.id, text);
  res.status(201).json(toComment(db.prepare("SELECT * FROM comments WHERE id = ?").get(r.lastInsertRowid)));
});

// ---------- conversas privadas (1 para 1) e grupos ----------
// Só os participantes enxergam a conversa; para os demais ela "não existe" (404).
const chatOf = (id, me) =>
  db.prepare("SELECT c.* FROM chats c JOIN chat_members m ON m.chat_id = c.id WHERE c.id = ? AND m.user_id = ?").get(id, me);
const membersOf = (id) => db.prepare("SELECT user_id FROM chat_members WHERE chat_id = ? ORDER BY user_id").all(id).map((r) => r.user_id);
const toMessage = (m) => ({ id: m.id, senderId: m.sender_id, text: m.text, createdAt: iso(m.created_at) });
const lastMsg = db.prepare("SELECT * FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT 1");
const unreadQ = db.prepare(
  "SELECT COUNT(*) n FROM messages WHERE chat_id = ? AND sender_id <> ? AND id > COALESCE((SELECT last_read_id FROM chat_members WHERE chat_id = ? AND user_id = ?), 0)"
);
const markRead = db.prepare("UPDATE chat_members SET last_read_id = MAX(last_read_id, ?) WHERE chat_id = ? AND user_id = ?");
const userExists = db.prepare("SELECT 1 FROM users WHERE id = ?");
const MAX_MEMBERS = 50;

function chatSummary(c, me) {
  const last = lastMsg.get(c.id);
  const memberIds = membersOf(c.id);
  return {
    id: c.id,
    isGroup: !!c.is_group,
    name: c.name,
    memberIds,
    userId: c.is_group ? null : memberIds.find((u) => u !== me), // outro participante (só em 1 para 1)
    createdBy: c.created_by,
    createdAt: iso(c.created_at),
    lastMessage: last ? toMessage(last) : null,
    unread: unreadQ.get(c.id, me, c.id, me).n,
  };
}
const summaryById = (id, me) => chatSummary(db.prepare("SELECT * FROM chats WHERE id = ?").get(id), me);
const cleanIds = (v) => [...new Set((Array.isArray(v) ? v : []).map(Number))];
const validIds = (ids) => ids.every((id) => Number.isInteger(id) && userExists.get(id));

app.get("/api/chats", (req, res) => {
  const me = req.user.id;
  const list = db
    .prepare("SELECT c.* FROM chats c JOIN chat_members m ON m.chat_id = c.id WHERE m.user_id = ?")
    .all(me)
    .map((c) => chatSummary(c, me));
  list.sort((a, b) => (b.lastMessage?.createdAt ?? b.createdAt).localeCompare(a.lastMessage?.createdAt ?? a.createdAt) || b.id - a.id);
  res.json(list);
});

// Com { userId }: abre (ou cria) a conversa privada. Com { name, memberIds }: cria um grupo.
app.post("/api/chats", (req, res) => {
  const me = req.user.id;
  const addMember = db.prepare("INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)");

  if (Array.isArray(req.body.memberIds)) {
    const name = str(req.body.name, 60);
    if (!name) return fail(res, 400, "Dê um nome ao grupo.");
    const ids = cleanIds(req.body.memberIds).filter((id) => id !== me);
    if (ids.length < 2 || ids.length > MAX_MEMBERS - 1 || !validIds(ids))
      return fail(res, 400, "Escolha pelo menos 2 participantes além de você.");
    const id = db.transaction(() => {
      const cid = db.prepare("INSERT INTO chats (name, is_group, created_by) VALUES (?, 1, ?)").run(name, me).lastInsertRowid;
      [me, ...ids].forEach((u) => addMember.run(cid, u));
      return cid;
    })();
    return res.status(201).json(summaryById(id, me));
  }

  const other = Number(req.body.userId);
  if (!Number.isInteger(other) || other === me || !userExists.get(other))
    return fail(res, 400, "Escolha outro usuário para conversar.");
  const key = [me, other].sort((x, y) => x - y).join("-");
  let chat = db.prepare("SELECT * FROM chats WHERE dm_key = ?").get(key);
  const created = !chat;
  if (created) {
    const id = db.transaction(() => {
      const cid = db.prepare("INSERT INTO chats (is_group, dm_key, created_by) VALUES (0, ?, ?)").run(key, me).lastInsertRowid;
      addMember.run(cid, me);
      addMember.run(cid, other);
      return cid;
    })();
    chat = db.prepare("SELECT * FROM chats WHERE id = ?").get(id);
  }
  res.status(created ? 201 : 200).json(chatSummary(chat, me));
});

// Qualquer participante pode adicionar pessoas a um grupo. Quem entra vê o histórico.
app.post("/api/chats/:id/members", (req, res) => {
  const me = req.user.id;
  const chat = chatOf(Number(req.params.id), me);
  if (!chat) return fail(res, 404, "Conversa não encontrada.");
  if (!chat.is_group) return fail(res, 400, "Só é possível adicionar pessoas a grupos.");
  const current = new Set(membersOf(chat.id));
  const ids = cleanIds(req.body.userIds).filter((id) => !current.has(id));
  if (!ids.length || !validIds(ids)) return fail(res, 400, "Escolha pessoas que ainda não estão no grupo.");
  if (current.size + ids.length > MAX_MEMBERS) return fail(res, 400, `Um grupo comporta até ${MAX_MEMBERS} pessoas.`);
  const newest = lastMsg.get(chat.id)?.id ?? 0; // o que já existe não conta como "não lido" para quem entra
  const add = db.prepare("INSERT INTO chat_members (chat_id, user_id, last_read_id) VALUES (?, ?, ?)");
  db.transaction(() => ids.forEach((u) => add.run(chat.id, u, newest)))();
  res.json(chatSummary(chat, me));
});

app.post("/api/chats/:id/leave", (req, res) => {
  const me = req.user.id;
  const chat = chatOf(Number(req.params.id), me);
  if (!chat) return fail(res, 404, "Conversa não encontrada.");
  if (!chat.is_group) return fail(res, 400, "Só é possível sair de grupos.");
  db.prepare("DELETE FROM chat_members WHERE chat_id = ? AND user_id = ?").run(chat.id, me);
  if (membersOf(chat.id).length === 0) db.prepare("DELETE FROM chats WHERE id = ?").run(chat.id); // grupo vazio some
  res.status(204).end();
});

// Sem "after": últimas 200 mensagens. Com "after": só as mais novas que esse id.
app.get("/api/chats/:id/messages", (req, res) => {
  const me = req.user.id;
  const chat = chatOf(Number(req.params.id), me);
  if (!chat) return fail(res, 404, "Conversa não encontrada.");
  const after = Number(req.query.after) || 0;
  const rows = after
    ? db.prepare("SELECT * FROM messages WHERE chat_id = ? AND id > ? ORDER BY id LIMIT 200").all(chat.id, after)
    : db.prepare("SELECT * FROM (SELECT * FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT 200) ORDER BY id").all(chat.id);
  const newest = lastMsg.get(chat.id);
  if (newest) markRead.run(newest.id, chat.id, me);
  res.json(rows.map(toMessage));
});

app.post("/api/chats/:id/messages", (req, res) => {
  const me = req.user.id;
  const chat = chatOf(Number(req.params.id), me);
  if (!chat) return fail(res, 404, "Conversa não encontrada.");
  const text = str(req.body.text, 2000);
  if (!text) return fail(res, 400, "Escreva uma mensagem.");
  const r = db.prepare("INSERT INTO messages (chat_id, sender_id, text) VALUES (?,?,?)").run(chat.id, me, text);
  markRead.run(r.lastInsertRowid, chat.id, me);
  res.status(201).json(toMessage(db.prepare("SELECT * FROM messages WHERE id = ?").get(r.lastInsertRowid)));
});

app.use("/api", (_req, res) => fail(res, 404, "Rota não encontrada."));

// Em produção, serve o front-end compilado (npm run build)
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PORT, () => console.log(`Fluxo API em http://localhost:${PORT}`));
