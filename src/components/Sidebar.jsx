import { useState } from "react";
import { useData } from "../context.js";

export default function Sidebar({ items, task, onTask, onAddTask, onDeleteTask, page, onChat, unread }) {
  const { user, users, tasks } = useData();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const count = (id) =>
    id === "all" ? items.length : id === "mine" ? items.filter((i) => i.assigneeId === user.id).length : items.filter((i) => i.taskId === id).length;

  const Nav = ({ id, label, text = label, padRight = false }) => (
    <button className={`nav ${page === "board" && task === id ? "on" : ""}`} onClick={() => onTask(id)} title={label} style={padRight ? { paddingRight: 64 } : undefined}>
      <span className="t" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{text}</span><span className="n">{count(id)}</span>
    </button>
  );

  const submit = async (e) => {
    e.preventDefault();
    if (await onAddTask(name.trim())) { setName(""); setAdding(false); }
  };

  return (
    <aside>
      <div className="logo"><i>F</i>Fluxo</div>
      <Nav id="all" label="Todas as tarefas" />
      <h4>Tarefas</h4>
      {tasks.map((t) => {
        const creator = users.find((u) => u.id === t.createdById)?.name;
        const canDelete = t.createdById === user.id;
        return (
          <div key={t.id} className="navrow" style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Nav id={t.id} label={creator ? `${t.name} — criada por ${creator}` : t.name} text={t.name} padRight={canDelete} />
            {canDelete && (
              <button
                type="button"
                className="deltask"
                title="Excluir tarefa"
                aria-label={`Excluir a tarefa ${t.name}`}
                onClick={() => onDeleteTask(t.id)}
                style={{ position: "absolute", right: 36, top: "50%", transform: "translateY(-50%)", background: "none", border: 0, cursor: "pointer" }}
              >
                <img src="src/assets/icon_lixo.png" width={15} />
              </button>
            )}
          </div>
        );
      })}
      {adding ? (
        <form className="newtask" onSubmit={submit}>
          <input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da tarefa" aria-label="Nome da tarefa" onKeyDown={(e) => e.key === "Escape" && setAdding(false)} />
        </form>
      ) : (
        <button className="nav addtask" onClick={() => setAdding(true)}>+ Nova tarefa</button>
      )}
      <h4>Visões</h4>
      <Nav id="mine" label="Atribuídos a mim" />
      <h4>Conversas</h4>
      <button className={`nav ${page === "chat" ? "on" : ""}`} onClick={onChat}>
        <span className="t">Mensagens e grupos</span>{unread > 0 ? <b className="badge">{unread}</b> : null}
      </button>
    </aside>
  );
}
