import { useData } from "../context.js";
import { Avatar, TypeTag, itemKey } from "./ui.jsx";

export default function ListView({ items, onOpen }) {
  const { taskName } = useData();
  return (
    <div className="list">
      <table>
        <thead>
          <tr><th>Chave</th><th>Título</th><th>Tarefa</th><th>Tipo</th><th>Status</th><th>Prioridade</th><th>Responsável</th></tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} onClick={() => onOpen(i.id)}>
              <td>{itemKey(i)}</td><td>{i.title}</td><td>{taskName(i.taskId)}</td><td><TypeTag type={i.type} /></td>
              <td>{i.status}</td><td>{i.priority}</td><td><Avatar id={i.assigneeId} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && <p className="empty">Nenhum item encontrado. Ajuste os filtros ou crie um novo item.</p>}
    </div>
  );
}
