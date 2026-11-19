
import { useState } from "react";
import { COLUMNS, PRIORITIES } from "../data.js";
import { useData } from "../context.js";
import { Avatar, Mentions, TypeTag, itemKey, timeAgo } from "./ui.jsx";

export default function ItemDrawer({
  item,
  onClose,
  onUpdate,
  onMove,
  onComment,
  onDelete,
}) {
  const { users, tasks, taskName, userName } = useData();
  const [text, setText] = useState("");

  const comments = item.comments || [];

  const submit = (e) => {
    e.preventDefault();

    const comment = text.trim();
    if (!comment) return;

    onComment(comment);
    setText("");
  };

  const confirmDelete = () => {
    if (window.confirm(`Excluir ${itemKey(item)}?`)) {
      onDelete();
    }
  };

  return (
    <div
      className="ov"
      onClick={(e) =>
        e.target === e.currentTarget && onClose()
      }
    >
      <section
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="drawer-header">
          <div className="crumb">
            {taskName(item.taskId)} / {itemKey(item)}
          </div>

          <button
            className="x"
            onClick={onClose}
            aria-label="Fechar detalhes"
            type="button"
          >
            ×
          </button>
        </div>

        <div className="drawer-content">
          <h2 id="drawer-title">{item.title}</h2>

          <div className="drawer-type">
            <TypeTag type={item.type} />
          </div>

          <p className="desc">
            {item.description || "Sem descrição."}
          </p>

          <div className="grid drawer-fields">
            <span>Tarefa</span>
            <select
              value={item.taskId}
              onChange={(e) =>
                onUpdate({ taskId: Number(e.target.value) })
              }
              aria-label="Tarefa"
            >
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <span>Status</span>
            <select
              value={item.status}
              onChange={(e) => onMove(e.target.value)}
              aria-label="Status"
            >
              {COLUMNS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>

            <span>Responsável</span>
            <select
              value={item.assigneeId ?? ""}
              onChange={(e) =>
                onUpdate({ assigneeId: Number(e.target.value) })
              }
              aria-label="Responsável"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            <span>Prioridade</span>
            <select
              value={item.priority}
              onChange={(e) =>
                onUpdate({ priority: e.target.value })
              }
              aria-label="Prioridade"
            >
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>

            <span>Criado por</span>
            <span className="drawer-created-by">
              {item.createdById
                ? userName(item.createdById)
                : "—"}
            </span>
          </div>

          <section className="drawer-comments">
            <h3>Comentários</h3>

            {comments.length === 0 ? (
              <p className="desc">
                Nenhum comentário ainda. Comece a conversa abaixo.
              </p>
            ) : (
              <div className="comments-list">
                {comments.map((c) => (
                  <div className="cm" key={c.id}>
                    <Avatar id={c.authorId} />

                    <div className="comment-content">
                      <b>{userName(c.authorId)}</b>
                      <small>{timeAgo(c.createdAt)}</small>
                      <p>
                        <Mentions text={c.text} />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form className="cform" onSubmit={submit}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escreva um comentário..."
                aria-label="Escrever comentário"
                required
              />

              <button
                className="btn p"
                type="submit"
                disabled={!text.trim()}
              >
                Comentar
              </button>
            </form>
          </section>

          <div className="drawer-actions">
            <button
              className="btn danger"
              onClick={confirmDelete}
              type="button"
            >
              Excluir item
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
