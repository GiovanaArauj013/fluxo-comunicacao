// Camada de acesso à API. Todas as chamadas passam por aqui.
const KEY = "fluxo_token";
export const getToken = () => localStorage.getItem(KEY);
export const setToken = (t) => localStorage.setItem(KEY, t);
export const clearToken = () => localStorage.removeItem(KEY);

async function request(path, { method = "GET", body } = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== "/auth/login") {
    clearToken();
    window.dispatchEvent(new Event("fluxo:logout"));
  }
  if (!res.ok) throw new Error(data.error || "Não foi possível concluir a ação.");
  return data;
}

export const api = {
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  bootstrap: () => request("/bootstrap"),
  createItem: (data) => request("/items", { method: "POST", body: data }),
  updateItem: (id, patch) => request(`/items/${id}`, { method: "PATCH", body: patch }),
  deleteItem: (id) => request(`/items/${id}`, { method: "DELETE" }),
  addComment: (id, text) => request(`/items/${id}/comments`, { method: "POST", body: { text } }),
  chats: () => request("/chats"),
  openChat: (userId) => request("/chats", { method: "POST", body: { userId } }),
  chatMessages: (id, after = 0) => request(`/chats/${id}/messages?after=${after}`),
  sendMessage: (id, text) => request(`/chats/${id}/messages`, { method: "POST", body: { text } }),
  createGroup: (name, memberIds) => request("/chats", { method: "POST", body: { name, memberIds } }),
  addMembers: (id, userIds) => request(`/chats/${id}/members`, { method: "POST", body: { userIds } }),
  leaveChat: (id) => request(`/chats/${id}/leave`, { method: "POST" }),
  createTask: (name) => request("/tasks", { method: "POST", body: { name } }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
};
