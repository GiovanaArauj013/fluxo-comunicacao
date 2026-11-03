import { useData } from "../context.js";
import { Avatar, TypeTag, itemKey } from "./ui.jsx";

export default function Card({ item, onOpen }) {
  const { taskName } = useData();
  return (
    <div
      className="card"
      draggable
      tabIndex={0}
      onDragStart={(e) => e.dataTransfer.setData("id", String(item.id))}
      onClick={() => onOpen(item.id)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(item.id)}
    >
      <p>{item.title}</p>
      <div className="tasklabel">{taskName(item.taskId)}</div>
      <div className="meta">
        <TypeTag type={item.type} />
        <span>{itemKey(item)}</span>
        <span className="sp" />
        {item.priority === "Alta" && <strong className="high">▲ Alta</strong>}
        {item.comments.length > 0 && <span>💬 {item.comments.length}</span>}
        <Avatar id={item.assigneeId} />
      </div>
    </div>
  );
}
