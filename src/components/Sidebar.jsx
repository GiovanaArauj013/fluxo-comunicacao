import { useState } from "react";
import { useData } from "../context.js";

export default function Sidebar({ items, task, onTask, onAddTask, page, onChat, unread }) {
  const { user, tasks } = useData();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const count = (id) =>
    id === "all" ? items.length : id === "mine" ? items.filter((i) => i.assigneeId === user.id).length : items.filter((i) => i.taskId === id).length;

  const Nav = ({ id, label }) => (
    <button className={`nav ${page === "board" && task === id ? "on" : ""}`} onClick={() => onTask(id)} title={label}>
      <span className="t">{label}</span><span className="n">{count(id)}</span>
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
      {tasks.map((t) => <Nav key={t.id} id={t.id} label={t.name} />)}
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
