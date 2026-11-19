
import { useData } from "../context.js";
import { Avatar, TypeTag, itemKey } from "./ui.jsx";

export default function ListView({ items, onOpen }) {
  const { taskName } = useData();

  return (
    <div className="list">
      <table className="responsive-table">
        <thead>
          <tr>
            <th>Chave</th>
            <th>Título</th>
            <th>Tarefa</th>
            <th>Tipo</th>
            <th>Status</th>
            <th>Prioridade</th>
            <th>Responsável</th>
          </tr>
        </thead>

        <tbody>
          {items.map((i) => (
            <tr
              key={i.id}
              onClick={() => onOpen(i.id)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") onOpen(i.id);
              }}
            >
              <td data-label="Chave">{itemKey(i)}</td>

              <td data-label="Título" className="mobile-title">
                {i.title}
              </td>

              <td data-label="Tarefa">
                {taskName(i.taskId)}
              </td>

              <td data-label="Tipo">
                <TypeTag type={i.type} />
              </td>

              <td data-label="Status">{i.status}</td>

              <td data-label="Prioridade">{i.priority}</td>

              <td data-label="Responsável">
                <Avatar id={i.assigneeId} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {items.length === 0 && (
        <p className="empty">
          Nenhum item encontrado. Ajuste os filtros ou crie um novo item.
        </p>
      )}
    </div>
  );
}
