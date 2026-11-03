import { useData } from "../context.js";
import { Avatar } from "./ui.jsx";

export default function Header({ query, onQuery, onNew, onChat, onLogout, unread, chatOpen }) {
  const { user } = useData();
  return (
    <header>
      <input type="search" value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Buscar comunicados, pedidos e decisões" aria-label="Buscar" />
      <button className="btn p" onClick={onNew}>Criar item</button>
      <button className={`btn ${chatOpen ? "active" : ""}`} onClick={onChat}>
        Mensagens{unread > 0 && <b className="badge inline">{unread}</b>}
      </button>
      <Avatar id={user.id} />
      <span className="uname">{user.name}</span>
      <button className="btn" onClick={onLogout}>Sair</button>
    </header>
  );
}
