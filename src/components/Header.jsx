
import { useData } from "../context.js";
import { Avatar } from "./ui.jsx";

export default function Header({
  query,
  onQuery,
  onNew,
  onChat,
  onLogout,
  unread,
  chatOpen,
  onMenu,
  theme,
  onToggleTheme,
  mobileMenuOpen,
}) {
  const { user } = useData();

  return (
    <header>
      <button
        className="mobile-menu-btn"
        onClick={onMenu}
        aria-label="Abrir menu de navegação"
        aria-expanded={!!mobileMenuOpen}
        type="button"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <input
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Buscar comunicados, pedidos e decisões"
        aria-label="Buscar"
      />

      <button className="btn p" onClick={onNew}>
        Criar item
      </button>

      <button
        className={`btn ${chatOpen ? "active" : ""}`}
        onClick={onChat}
      >
        Mensagens
        {unread > 0 && (
          <b className="badge inline">{unread}</b>
        )}
      </button>

      <button
        className="theme-toggle"
        onClick={onToggleTheme}
        type="button"
        aria-label={
          theme === "dark"
            ? "Ativar modo claro"
            : "Ativar modo escuro"
        }
        title={
          theme === "dark"
            ? "Ativar modo claro"
            : "Ativar modo escuro"
        }
      >
        <span className="theme-icon" aria-hidden="true">
          {theme === "dark" ? "☀" : "☾"}
        </span>

        <span className="theme-label">
          {theme === "dark" ? "Modo claro" : "Modo escuro"}
        </span>
      </button>

      <Avatar id={user.id} />

      <span className="uname">{user.name}</span>

      <button className="btn" onClick={onLogout}>
        Sair
      </button>
    </header>
  );
}
