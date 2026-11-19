
import { useData } from "../context.js";
import { Avatar, TypeTag, itemKey } from "./ui.jsx";

export default function Card({ item, onOpen }) {
  const { taskName } = useData();

  const openCard = () => onOpen(item.id);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openCard();
    }
  };

  return (
    <article
      className="card"
      draggable
      tabIndex={0}
      role="button"
      aria-label={`Abrir item ${item.title}`}
      onDragStart={(e) =>
        e.dataTransfer.setData("id", String(item.id))
      }
      onClick={openCard}
      onKeyDown={handleKeyDown}
    >
      <p className="card-title">{item.title}</p>

      <div className="tasklabel">
        {taskName(item.taskId)}
      </div>

      <div className="meta">
        <TypeTag type={item.type} />

        <span>{itemKey(item)}</span>

        <span className="sp" />

        {item.priority === "Alta" && (
          <strong className="high">▲ Alta</strong>
        )}

        {item.comments?.length > 0 && (
          <span aria-label={`${item.comments.length} comentários`}>
            💬 {item.comments.length}
          </span>
        )}

        <Avatar id={item.assigneeId} />
      </div>

      <span className="card-open-hint" aria-hidden="true">
        Abrir detalhes →
      </span>
    </article>
  );
}
