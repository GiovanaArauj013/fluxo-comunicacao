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
import SectorsModal from "./components/SectorsModal.jsx";
import AlterarSenha from "./components/AlterarSenha.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(Boolean(getToken()));
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [items, setItems] = useState([]);
  const [sectors, setSectors] = useState([]);

  const [sector, setSector] = useState("all"); // filtro: "all" | "none" (tarefas gerais) | id do setor
  const [sectorsOpen, setSectorsOpen] = useState(false); // tela de gerenciar setores
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
    setUser(d.user); setUsers(d.users); setTasks(d.tasks); setItems(d.items); setSectors(d.sectors);
  }, []);

  // Primeiro consulta apenas o perfil. Se a troca de senha estiver pendente,
  // não carrega tarefas, setores, conversas ou outros dados do sistema.
  const loadProfile = useCallback(async () => {
    const currentUser = await api.getCurrentUser();
    setUser(currentUser);

    if (currentUser.must_change_password) {
      setUsers([]);
      setTasks([]);
      setItems([]);
      setSectors([]);
      setChats([]);
      return;
    }

    await load();
  }, [load]);

  useEffect(() => {
    if (!getToken()) {
      setBooting(false);
      return;
    }

    loadProfile().catch(() => clearToken()).finally(() => setBooting(false));
  }, [loadProfile]);

  useEffect(() => {
    const out = () => setUser(null);
    window.addEventListener("fluxo:logout", out);
    return () => window.removeEventListener("fluxo:logout", out);
  }, []);

  // Atualização periódica para ver o que os colegas fizeram
  useEffect(() => {
    if (!user || user.must_change_password) return;
    const t = setInterval(() => loadProfile().catch(() => {}), 15000);
    return () => clearInterval(t);
  }, [user, loadProfile]);

  // Conversas privadas: atualiza a lista (e as não lidas) a cada 5 s
  const refreshChats = useCallback(() => api.chats().then(setChats).catch(() => {}), []);
  useEffect(() => {
    if (!user || user.must_change_password) return;
    refreshChats();
    const t = setInterval(refreshChats, 5000);
    return () => clearInterval(t);
  }, [user, refreshChats]);
  const unread = chats.reduce((n, c) => n + c.unread, 0);

  const logout = () => {
    clearToken();
    setUser(null); setItems([]); setChats([]); setOpenId(null); setTask("all"); setSector("all"); setSectorsOpen(false); setPage("board");
  };


  // ---------- ações ----------
  // Os itens ficam no setor da tarefa a que pertencem
  const sectorOfTask = useMemo(() => new Map(tasks.map((t) => [t.id, t.sectorId ?? null])), [tasks]);
  const inSector = useCallback(
    (taskId) => sector === "all" || (sector === "none" ? sectorOfTask.get(taskId) == null : sectorOfTask.get(taskId) === sector),
    [sector, sectorOfTask]
  );

  const visible = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter(
      (i) =>
        inSector(i.taskId) &&
        (task === "all" || (task === "mine" ? i.assigneeId === user?.id : i.taskId === task)) &&
        (!typeFilter || i.type === typeFilter) &&
        (!q || `${i.title} COM-${i.id}`.toLowerCase().includes(q))
    );
  }, [items, task, typeFilter, query, user, inSector]);

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

  const addTask = async (name, sectorId = null) => {
    try {
      const t = await api.createTask(name, sectorId);
      setTasks((l) => [...l, t]);
      setTask(t.id);
      setPage("board");
      return true;
    } catch (e) { notify(e.message); return false; }
  };

  // Exclui a tarefa (grupo) e, junto, os itens dela. O servidor confere se
  // quem pediu é o criador da tarefa (ou admin) antes de apagar.
  const removeTask = async (id) => {
    const t = tasks.find((x) => x.id === id);
    if (!window.confirm(`Excluir a tarefa "${t?.name}" e todos os itens dela?`)) return;
    try {
      await api.deleteTask(id);
      setTasks((l) => l.filter((x) => x.id !== id));
      setItems((l) => l.filter((i) => i.taskId !== id));
      setOpenId(null);
      if (task === id) setTask("all");
      notify("Tarefa excluída");
    } catch (e) { notify(e.message); }
  };

  // ---------- setores ----------
  const byName = (a, b) => a.name.localeCompare(b.name, "pt-BR");

  const addSector = async (name, color) => {
    try {
      const s = await api.createSector(name, color);
      setSectors((l) => [...l, s].sort(byName));
      notify("Setor criado");
      return true;
    } catch (e) { notify(e.message); return false; }
  };

  const renameSector = async (id, name) => {
    try {
      const s = await api.updateSector(id, { name });
      setSectors((l) => l.map((x) => (x.id === id ? s : x)).sort(byName));
    } catch (e) { notify(e.message); }
  };

  const removeSector = async (id) => {
      const s = sectors.find((x) => x.id === id);
    if ( !window.confirm(`Excluir o setor "${s?.name}"? As tarefas dele passam a ser gerais.`) ) return;
    try { await api.deleteSector(id);
    setSectors((l) => l.filter((x) => x.id !== id));
    setTasks((l) =>  l.map((t) => t.sectorId === id ? { ...t, sectorId: null } : t ) );

    // Remove o vínculo e a função do setor de todos os usuários.
    const updateUser = (u) => { if (!u) return u;
    const sectorRoles = { ...(u.sectorRoles || {}) };
    delete sectorRoles[id];
    return {  ...u, sectorIds: (u.sectorIds || []).filter((x) => x !== id), sectorRoles, }; };
    setUsers((l) => l.map(updateUser));
    setUser(updateUser);

    if (sector === id) setSector("all"); notify("Setor excluído");
  } catch (e) {
    notify(e.message);
  }
  };

  const changeUserSectors = async (userId, sectorIds) => {
  try { await api.setUserSectors(userId, sectorIds);
    // Atualiza os vínculos localmente.
    const updateUser = (u) => {
      if (!u || u.id !== userId) return u;
      const sectorRoles = { ...(u.sectorRoles || {}) };
      // Novos vínculos começam como membros.
      for (const id of sectorIds) { if (!sectorRoles[id]) { sectorRoles[id] = "membro"; } }
      // Remove funções dos setores desvinculados.
      for (const id of Object.keys(sectorRoles)) {  if (!sectorIds.includes(Number(id))) { delete sectorRoles[id]; }}
      return { ...u, sectorIds, sectorRoles };
    };
    setUsers((list) => list.map(updateUser));
    setUser(updateUser);
    notify("Equipe atualizada");
  } catch (e) {
    notify(e.message);
  }
};


  
const changeUserSectorRole = async (userId, sectorId, role) => {
  try { if (!["gestor", "membro"].includes(role)) { throw new Error("Função inválida."); }

    await api.setUserSectorRole(userId, sectorId, role);
    const updateUser = (u) => { if (!u || u.id !== userId) return u;

      return { ...u, sectorRoles: {  ...(u.sectorRoles || {}), [sectorId]: role, }, };
    };
    setUsers((list) => list.map(updateUser));
    setUser(updateUser);
    notify("Função do setor atualizada!"); } catch (e) { notify(e.message || "Não foi possível alterar a função.");
  }
};


  const changeTaskSector = async (taskId, sectorId) => {
    const before = tasks.find((t) => t.id === taskId)?.sectorId ?? null;
    setTasks((l) => l.map((t) => (t.id === taskId ? { ...t, sectorId } : t)));
    try {
      await api.setTaskSector(taskId, sectorId);
    } catch (e) {
      setTasks((l) => l.map((t) => (t.id === taskId ? { ...t, sectorId: before } : t)));
      notify(e.message);
    }
  };

  // ---------- tela ----------
  if (booting) return <p className="boot">Carregando…</p>;
  if (!user) return <Login onLogin={loadProfile} />;

  if (user.must_change_password) {
    return (
      <AlterarSenha
        onComplete={load}
        onLogout={logout}
      />
    );
  }

  const current = items.find((i) => i.id === openId);
  const currentTask = typeof task === "number" ? tasks.find((t) => t.id === task) : null;
  const taskTitle = currentTask?.name ?? null;
  const canEditTaskSector = currentTask && (currentTask.createdById === user.id || user.role === "admin" || user.sectorRoles?.[currentTask.sectorId] === "gestor");

  return (
    <DataContext.Provider value={{ user, users, tasks, sectors }}>
      <div className="app">
        <Sidebar items={items} task={task} onTask={(t) => { setPage("board"); setTask(t); }} onAddTask={addTask} onDeleteTask={removeTask} page={page} onChat={() => setPage("chat")} unread={unread} sector={sector} onSector={setSector} onManageSectors={() => setSectorsOpen(true)} />
        <main>
          <Header query={query} onQuery={setQuery} onNew={() => { setPage("board"); setNewStatus("Novo"); }} onChat={() => setPage("chat")} onLogout={logout} unread={unread} chatOpen={page === "chat"} />
          {page === "chat" ? (
            <Chat chats={chats} onRefresh={refreshChats} notify={notify} />
          ) : (
          <>
          <div className="top">
            <div className="crumb">Tarefas / {task === "all" ? "Todas as tarefas" : task === "mine" ? "Atribuídos a mim" : taskTitle}</div>
            <h1>{taskTitle || "Quadro de tarefas"}</h1>
            {currentTask && (
              <div style={{ margin: "4px 0 10px", fontSize: 13 }}>
                <span>Setor: </span>
                {canEditTaskSector ? (
                  <select
                    value={currentTask.sectorId ?? ""}
                    onChange={(e) => changeTaskSector(currentTask.id, e.target.value ? Number(e.target.value) : null)}
                    aria-label="Setor da tarefa"
                  >
                    <option value="">Geral (sem setor)</option>
                    {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                ) : (
                  <b>{sectors.find((s) => s.id === currentTask.sectorId)?.name ?? "Geral"}</b>
                )}
              </div>
            )}
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
        {sectorsOpen && (
          <SectorsModal
            onClose={() => setSectorsOpen(false)}
            onCreate={addSector}
            onRename={renameSector}
            onDelete={removeSector}
            onUserSectors={changeUserSectors}
            onUserSectorRole={changeUserSectorRole}
          />
        )}
        <div className={`toast ${toast ? "on" : ""}`} role="status">{toast}</div>
      </div>
    </DataContext.Provider>
  );
}