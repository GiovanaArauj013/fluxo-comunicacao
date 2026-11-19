import { useState } from "react";
import { useData } from "../context.js";
import SectorTag from "./SectorTag.jsx";

export default function Sidebar({ items, task, onTask, onAddTask, onDeleteTask, page, onChat, unread, sector, onSector, onManageSectors, mobileOpen, onClose }) {
  const { user, users, tasks, sectors, isManager } = useData();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [newSector, setNewSector] = useState("");

  // Filtro de setor: "all" | "none" (tarefas gerais) | id do setor
  const taskInSector = (t) => sector === "all" || (sector === "none" ? t.sectorId == null : t.sectorId === sector);
  const shownTasks = tasks.filter(taskInSector);
  const itemsInSector = items.filter((i) => {
    const t = tasks.find((x) => x.id === i.taskId);
    return t ? taskInSector(t) : sector === "all";
  });

  const count = (id) =>
    id === "all" ? itemsInSector.length : id === "mine" ? itemsInSector.filter((i) => i.assigneeId === user.id).length : items.filter((i) => i.taskId === id).length;

  const Nav = ({ id, label, text = label }) => (
    <button className={`nav ${page === "board" && task === id ? "on" : ""}`} onClick={() => { onTask(id); onClose?.();}} title={label}>
      <span className="t">{text}</span><span className="n">{count(id)}</span>
    </button>
  );

  const submit = async (e) => {
    e.preventDefault();
    if (await onAddTask(name.trim(), newSector ? Number(newSector) : null)) { setName(""); setAdding(false); }
  };

  const startAdding = () => {
    setNewSector(typeof sector === "number" ? String(sector) : ""); // já sugere o setor filtrado
    setAdding(true);
  };

  return (
    <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="mobile-sidebar-header">
      <div className="logo">
        <i>F</i>Fluxo
      </div>

      <button
        className="mobile-close-btn"
        onClick={onClose}
        aria-label="Fechar menu"
      >
        ×
      </button>
    </div>

    <div className="desktop-logo logo">
      <i>F</i>Fluxo
    </div>
      <Nav id="all" label="Todas as tarefas" />
      <h4>Tarefas</h4>
      <select
        value={sector}
        onChange={(e) => onSector(e.target.value === "all" || e.target.value === "none" ? e.target.value : Number(e.target.value))}
        aria-label="Filtrar por setor"
        style={{ width: "100%", margin: "0 0 6px" }}
      >
        <option value="all">Todos os setores</option>
        {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        <option value="none">Gerais (sem setor)</option>
      </select>
      {shownTasks.map((t) => {
        const creator = users.find((u) => u.id === t.createdById)?.name;
        const tag = sectors.find((s) => s.id === t.sectorId);
        return (
          <div key={t.id} className="navrow" style={{ position: "relative" }}>
            <Nav
              id={t.id}
              label={`${t.name}${tag ? ` · ${tag.name}` : ""}${creator ? ` — criada por ${creator}` : ""}`}
              text={<>{t.name}<SectorTag sector={tag} /></>}
            />
            {t.createdById === user.id && (
              <button
                type="button"
                className="deltask"
                title="Excluir tarefa"
                aria-label={`Excluir a tarefa ${t.name}`}
                onClick={() => onDeleteTask(t.id)}
                style={{ position: "absolute", right: 36, top: "50%", transform: "translateY(-50%)", background: "none", border: 0, cursor: "pointer", opacity: 0.6 }}
              >
                🗑
              </button>
            )}
          </div>
        );
      })}
      {adding ? (
        <form className="newtask" onSubmit={submit}>
          <input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da tarefa" aria-label="Nome da tarefa" onKeyDown={(e) => e.key === "Escape" && setAdding(false)} />
          <select value={newSector} onChange={(e) => setNewSector(e.target.value)} aria-label="Setor da nova tarefa" style={{ width: "100%", marginTop: 4 }}>
            <option value="">Geral (sem setor)</option>
            {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </form>
      ) : (
        <button className="nav addtask" onClick={startAdding}>+ Nova tarefa</button>
      )}
      <h4>Visões</h4>
      <Nav id="mine" label="Atribuídos a mim" />
      {isManager && (
        <>
          <h4>Administração</h4>
          <button className="nav" onClick={onManageSectors}><span className="t">Gerenciar setores</span></button>
        </>
      )}
      <h4>Conversas</h4>
      <button className={`nav ${page === "chat" ? "on" : ""}`} onClick={() => {onChat(); onClose?.();}}>
        <span className="t">Mensagens e grupos</span>{unread > 0 ? <b className="badge">{unread}</b> : null}
      </button>
    </aside>
  );
}