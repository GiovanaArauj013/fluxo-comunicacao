import { useState } from "react";
import { COLUMNS, PRIORITIES } from "../data.js";
import { useData } from "../context.js";
import { Avatar, Mentions, TypeTag, itemKey, timeAgo } from "./ui.jsx";

export default function ItemDrawer({ item, onClose, onUpdate, onMove, onComment, onDelete }) {
  const { users, tasks, taskName, userName } = useData();
  const [text, setText] = useState("");
  const submit = (e) => {
    e.preventDefault();
    onComment(text.trim());
    setText("");
  };
  return (
    <div className="ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="drawer">
        <button className="x" onClick={onClose} aria-label="Fechar">×</button>
        <div className="crumb">{taskName(item.taskId)} / {itemKey(item)}</div>
        <h2>{item.title}</h2>
        <TypeTag type={item.type} />
        <p className="desc">{item.description || "Sem descrição."}</p>
        <div className="grid">
          <span>Tarefa</span>
          <select value={item.taskId} onChange={(e) => onUpdate({ taskId: Number(e.target.value) })}>{tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <span>Status</span>
          <select value={item.status} onChange={(e) => onMove(e.target.value)}>{COLUMNS.map((c) => <option key={c}>{c}</option>)}</select>
          <span>Responsável</span>
          <select value={item.assigneeId} onChange={(e) => onUpdate({ assigneeId: Number(e.target.value) })}>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
          <span>Prioridade</span>
          <select value={item.priority} onChange={(e) => onUpdate({ priority: e.target.value })}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select>
          <span>Criado por</span>
          <span>{item.createdById ? userName(item.createdById) : "—"}</span>
        </div>
        <h3>Comentários</h3>
        {item.comments.length === 0 && <p className="desc">Nenhum comentário ainda. Comece a conversa abaixo.</p>}
        {item.comments.map((c) => (
          <div className="cm" key={c.id}>
            <Avatar id={c.authorId} />
            <div><b>{userName(c.authorId)}</b><small>{timeAgo(c.createdAt)}</small><p><Mentions text={c.text} /></p></div>
          </div>
        ))}
        <form className="cform" onSubmit={submit}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva um comentário. Use @nome para mencionar" required />
          <button className="btn p">Comentar</button>
        </form>
        <button className="btn danger" onClick={() => window.confirm(`Excluir ${itemKey(item)}?`) && onDelete()}>Excluir item</button>
      </div>
    </div>
  );
}
