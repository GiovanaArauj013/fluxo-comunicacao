// Camada de acesso à API, versão Supabase.
// Mantém a mesma interface do api.js antigo: App.jsx, Sidebar.jsx e os
// outros componentes continuam iguais. Aqui os nomes do banco (português)
// são traduzidos para os que o frontend usa (taskId, assigneeId...).
import { createClient } from "@supabase/supabase-js";

// Use SÓ a chave "anon" (pública). Nunca coloque a "service_role" no frontend.
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

const KEY = "fluxo_token";
export const getToken = () => localStorage.getItem(KEY);
export const setToken = (t) => localStorage.setItem(KEY, t);
export const clearToken = () => {
  localStorage.removeItem(KEY);
  supabase.auth.signOut();
};

// Sessão encerrada ou expirada: o App volta para a tela de login
supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event("fluxo:logout"));
  }
});

// ---------- tradução banco <-> frontend ----------
const iso = (s) => (s && !/(Z|[+-]\d\d(:?\d\d)?)$/.test(s) ? s.replace(" ", "T") + "Z" : s);

const USER_COLS = "id, nome, email, papel, usuarios_setores(setor_id), must_change_password";
const toUser = (u) => ({
  id: u.id, name: u.nome, email: u.email,
  role: u.papel, // "admin" | "gestor" | "membro"
  sectorIds: (u.usuarios_setores || []).map((x) => x.setor_id).sort((a, b) => a - b),
  must_change_password: u.must_change_password
});
const toSector = (s) => ({ id: s.id, name: s.nome, color: s.cor });
const toTask = (t) => ({ id: t.id, name: t.nome_da_tarefa, createdById: t.criado_por, sectorId: t.setor_id ?? null });
const toComment = (c) => ({ id: c.id, authorId: c.user_id, text: c.texto, createdAt: iso(c.created_at) });
const toItem = (r) => ({
  id: r.id, type: r.tipo, title: r.title, taskId: r.task_id, status: r.status,
  assigneeId: r.responsavel_id, priority: r.prioridade, description: r.descricao ?? "",
  createdById: r.criado_por, createdAt: iso(r.created_at),
  comments: (r.comentario || []).sort((a, b) => a.id - b.id).map(toComment),
});

// campo do frontend -> coluna do banco (criado_por NÃO entra: o banco preenche)
const COLS = {
  type: "tipo", title: "title", status: "status", priority: "prioridade",
  taskId: "task_id", assigneeId: "responsavel_id", description: "descricao",
};
const toRow = (o) =>
  Object.fromEntries(Object.entries(o).filter(([k]) => k in COLS).map(([k, v]) => [COLS[k], v]));

const ITEM = "*, comentario(*)";

function fail(error, fallback = "Não foi possível concluir a ação.") {
  if (error.code === "42501") throw new Error("Você não tem permissão para essa ação.");
  if (error.code === "23503") throw new Error("Usuário ou tarefa inválidos.");
  throw new Error(fallback);
}

// Chama uma função do banco. Os erros que a própria função levanta
// (ex.: "Escolha pelo menos 2 participantes...") já vêm em português.
async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    if (error.code === "P0001") throw new Error(error.message);
    fail(error);
  }
  return data;
}

async function myProfile() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sessão expirada. Entre novamente.");
  const { data, error } = await supabase.from("users").select(USER_COLS).eq("auth_id", session.user.id).single();
  if (error) fail(error, "Seu usuário não foi encontrado.");
  return toUser(data);
}

export const api = {
  getCurrentUser: async () => {
  return await myProfile();
  },
  
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: String(email).trim(), password });
    if (error) throw new Error("E-mail ou senha incorretos.");
    setToken(data.session.access_token);
    const user = await myProfile();
    return {token: data.session.access_token, user };
  },

  changePassword: async (password) => {

    const { data, error } = await supabase.functions.invoke(
    "force-password-change",
    {
      body: { password }
    }
  );

  console.log("Resposta da Edge Function:", data);
  console.log("Erro da requisição:", error);

  if (error) {
    throw new Error(error.message || "Erro ao chamar a função.");
  }

  if (!data?.success) {
    throw new Error(
      data?.error ||
      data?.message ||
      "A função respondeu, mas não confirmou a alteração da senha."
    );
  }

  return data;
  
  //const { data, error } = await supabase.functions.invoke("force-password-change",
  //  { body: { password } }
  //);

  //if (error) throw error;
  //if (!data?.success) {
  //  throw new Error(data?.error || "Não foi possível alterar a senha.");
  //}

  //return data;
},

  bootstrap: async () => {
    const user = await myProfile();
    const [u, t, i, s] = await Promise.all([
      supabase.from("users").select(USER_COLS).order("nome"),
      supabase.from("tasks").select("id, nome_da_tarefa, criado_por, setor_id").order("id"),
      supabase.from("items").select(ITEM).order("id"),
      supabase.from("setores").select("id, nome, cor").order("nome"),
    ]);
    for (const r of [u, t, i, s]) if (r.error) fail(r.error);
    return {
      user, users: u.data.map(toUser), tasks: t.data.map(toTask),
      items: i.data.map(toItem), sectors: s.data.map(toSector),
    };
  },

  // ----- itens -----
  createItem: async (data) => {
    const { data: row, error } = await supabase.from("items").insert(toRow(data)).select(ITEM).single();
    if (error) fail(error);
    return toItem(row);
  },
  updateItem: async (id, patch) => {
    const { data: row, error } = await supabase.from("items").update(toRow(patch)).eq("id", id).select(ITEM).single();
    if (error) (error.code === "PGRST116" ? (() => { throw new Error("Item não encontrado."); })() : fail(error));
    return toItem(row);
  },
  deleteItem: async (id) => {
    const { data, error } = await supabase.from("items").delete().eq("id", id).select("id");
    if (error) fail(error);
    if (!data.length) throw new Error("Item não encontrado.");
    return null;
  },
  addComment: async (id, text) => {
    const { data, error } = await supabase.from("comentario").insert({ item_id: id, texto: text }).select().single();
    if (error) fail(error);
    return toComment(data);
  },

  // ----- tarefas -----
  createTask: async (name, sectorId = null) => {
    const { data, error } = await supabase.from("tasks").insert({ nome_da_tarefa: name, setor_id: sectorId }).select().single();
    if (error) {
      if (error.code === "23505") throw new Error("Já existe uma tarefa com esse nome.");
      fail(error);
    }
    return toTask(data);
  },
  deleteTask: async (id) => {
    const { data, error } = await supabase.from("tasks").delete().eq("id", id).select("id");
    if (error) fail(error);
    // o banco só apaga se quem pediu for o criador; senão volta vazio
    if (!data.length) throw new Error("Só quem criou a tarefa pode excluí-la.");
    return null;
  },

  setTaskSector: async (taskId, sectorId) => { await rpc("set_task_sector", { p_task: taskId, p_setor: sectorId }); return null; },

  // ----- setores e papéis (supabase_setores.sql) -----
  createSector: async (name, color) => {
    const { data, error } = await supabase.from("setores").insert({ nome: name, cor: color }).select().single();
    if (error) {
      if (error.code === "23505") throw new Error("Já existe um setor com esse nome.");
      fail(error);
    }
    return toSector(data);
  },
  updateSector: async (id, patch) => {
    const row = {};
    if (patch.name !== undefined) row.nome = patch.name;
    if (patch.color !== undefined) row.cor = patch.color;
    const { data, error } = await supabase.from("setores").update(row).eq("id", id).select();
    if (error) {
      if (error.code === "23505") throw new Error("Já existe um setor com esse nome.");
      fail(error);
    }
    if (!data.length) throw new Error("Só gestores e administradores podem editar setores.");
    return toSector(data[0]);
  },
  deleteSector: async (id) => {
    const { data, error } = await supabase.from("setores").delete().eq("id", id).select("id");
    if (error) fail(error);
    if (!data.length) throw new Error("Só gestores e administradores podem excluir setores.");
    return null;
  },
  setUserSectors: async (userId, sectorIds) => { await rpc("set_user_sectors", { p_user: userId, p_setores: sectorIds }); return null; },
  setUserRole: async (userId, role) => { await rpc("set_user_role", { p_user: userId, p_papel: role }); return null; },

  // ----- chat (funções criadas no supabase_chat.sql) -----
  chats: () => rpc("chat_list"),
  openChat: (userId) => rpc("open_chat", { p_other: userId }),
  chatMessages: (id, after = 0) => rpc("chat_messages", { p_chat: id, p_after: after }),
  sendMessage: (id, text) => rpc("send_message", { p_chat: id, p_text: text }),
  createGroup: (name, memberIds) => rpc("create_group", { p_name: name, p_members: memberIds }),
  addMembers: (id, userIds) => rpc("add_members", { p_chat: id, p_ids: userIds }),
  leaveChat: async (id) => { await rpc("leave_chat", { p_chat: id }); return null; },
};
