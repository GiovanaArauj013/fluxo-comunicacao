import { useCallback, useEffect, useMemo, useState } from "react";
import { api, clearToken, getToken } from "./api.js";
import { DataContext } from "./context.js";
import { TYPES } from "./data.js";
import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";
import Board from "./components/Board.jsx";
import ListView from "./components/ListView.jsx";
import ItemDrawer from "./components/ItemDrawer.jsx";
import NewItemModal from "./components/NewItemModal.jsx";
import Login from "./components/Login.jsx";
import Chat from "./components/Chat.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(Boolean(getToken()));
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [items, setItems] = useState([]);

  const [task, setTask] = useState("all"); // "all" | "mine" | id da tarefa
  const [typeFilter, setTypeFilter] = useState(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState("board");
  const [openId, setOpenId] = useState(null);
  const [newStatus, setNewStatus] = useState(null); // null = modal fechado
  const [toast, setToast] = useState("");
  const [page, setPage] = useState("board"); // "board" | "chat"
  const [chats, setChats] = useState([]);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  // ---------- carga de dados ----------
  const load = useCallback(async () => {
    const d = await api.bootstrap();
    setUser(d.user); setUsers(d.users); setTasks(d.tasks); setItems(d.items);
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    load().catch(() => clearToken()).finally(() => setBooting(false));
  }, [load]);

  useEffect(() => {
    const out = () => setUser(null);
    window.addEventListener("fluxo:logout", out);
    return () => window.removeEventListener("fluxo:logout", out);
  }, []);

  // Atualização periódica para ver o que os colegas fizeram
  useEffect(() => {
    if (!user) return;
    const t = setInterval(() => load().catch(() => {}), 15000);
    return () => clearInterval(t);
  }, [user, load]);

  // Conversas privadas: atualiza a lista (e as não lidas) a cada 5 s
  const refreshChats = useCallback(() => api.chats().then(setChats).catch(() => {}), []);
  useEffect(() => {
    if (!user) return;
    refreshChats();
    const t = setInterval(refreshChats, 5000);
    return () => clearInterval(t);
  }, [user, refreshChats]);
  const unread = chats.reduce((n, c) => n + c.unread, 0);

  const logout = () => {
    clearToken();
    setUser(null); setItems([]); setChats([]); setOpenId(null); setTask("all"); setPage("board");
  };

  // ---------- ações ----------
  const visible = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter(
      (i) =>
        (task === "all" || (task === "mine" ? i.assigneeId === user?.id : i.taskId === task)) &&
        (!typeFilter || i.type === typeFilter) &&
        (!q || `${i.title} COM-${i.id}`.toLowerCase().includes(q))
    );
  }, [items, task, typeFilter, query, user]);

  // Atualiza na tela na hora e confirma com o servidor; em caso de erro, recarrega.
  const update = async (id, patch) => {
    setItems((l) => l.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    try {
      const saved = await api.updateItem(id, patch);
      setItems((l) => l.map((i) => (i.id === id ? saved : i)));
    } catch (e) {
      notify(e.message);
      load().catch(() => {});
    }
  };

  const move = (id, status) => {
    update(id, { status });
    notify(`COM-${id} movido para ${status}`);
  };

  const addComment = async (id, text) => {
    try {
      const c = await api.addComment(id, text);
      setItems((l) => l.map((i) => (i.id === id ? { ...i, comments: [...i.comments, c] } : i)));
      notify("Comentário publicado");
    } catch (e) { notify(e.message); }
  };

  const create = async (data) => {
    try {
      const item = await api.createItem(data);
      setItems((l) => [...l, item]);
      setNewStatus(null);
      notify("Item criado");
    } catch (e) { notify(e.message); }
  };

  const remove = async (id) => {
    try {
      await api.deleteItem(id);
      setItems((l) => l.filter((i) => i.id !== id));
      setOpenId(null);
      notify("Item excluído");
    } catch (e) { notify(e.message); }
  };

  const addTask = async (name) => {
    try {
      const t = await api.createTask(name);
      setTasks((l) => [...l, t]);
      setTask(t.id);
      setPage("board");
      return true;
    } catch (e) { notify(e.message); return false; }
  };

  // ---------- tela ----------
  if (booting) return <p className="boot">Carregando…</p>;
  if (!user) return <Login onLogin={load} />;

  const current = items.find((i) => i.id === openId);
  const taskTitle = typeof task === "number" ? tasks.find((t) => t.id === task)?.name : null;

  return (
    <DataContext.Provider value={{ user, users, tasks }}>
      <div className="app">
        <Sidebar items={items} task={task} onTask={(t) => { setPage("board"); setTask(t); }} onAddTask={addTask} page={page} onChat={() => setPage("chat")} unread={unread} />
        <main>
          <Header query={query} onQuery={setQuery} onNew={() => { setPage("board"); setNewStatus("Novo"); }} onChat={() => setPage("chat")} onLogout={logout} unread={unread} chatOpen={page === "chat"} />
          {page === "chat" ? (
            <Chat chats={chats} onRefresh={refreshChats} notify={notify} />
          ) : (
          <>
          <div className="top">
            <div className="crumb">Tarefas / {task === "all" ? "Todas as tarefas" : task === "mine" ? "Atribuídos a mim" : taskTitle}</div>
            <h1>{taskTitle || "Quadro de tarefas"}</h1>
            <div className="bar">
              <div className="seg">
                <button className={view === "board" ? "on" : ""} onClick={() => setView("board")}>Quadro</button>
                <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>Lista</button>
              </div>
              {Object.keys(TYPES).map((t) => (
                <button key={t} className={`chip ${typeFilter === t ? "on" : ""}`} onClick={() => setTypeFilter(typeFilter === t ? null : t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          {view === "board" ? (
            <Board items={visible} onOpen={setOpenId} onMove={move} onNew={setNewStatus} />
          ) : (
            <ListView items={visible} onOpen={setOpenId} />
          )}
          </>
          )}
        </main>
        {current && (
          <ItemDrawer item={current} onClose={() => setOpenId(null)} onUpdate={(p) => update(current.id, p)} onMove={(s) => move(current.id, s)} onComment={(t) => addComment(current.id, t)} onDelete={() => remove(current.id)} />
        )}
        {newStatus && <NewItemModal status={newStatus} defaultTask={typeof task === "number" ? task : tasks[0]?.id} onClose={() => setNewStatus(null)} onCreate={create} />}
        <div className={`toast ${toast ? "on" : ""}`} role="status">{toast}</div>
      </div>
    </DataContext.Provider>
  );
}
