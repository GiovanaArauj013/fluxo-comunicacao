
import { useMemo, useState } from "react";
import { useData } from "../context.js";
import SectorTag from "./SectorTag.jsx";

const ROLES = {
  admin: "Administrador",
  gestor: "Gestor",
  membro: "Membro",
};

const styles = {
  overlay: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    width: "min(850px, 96vw)",
    maxHeight: "90vh",
    overflow: "auto",
    padding: 24,
    borderRadius: 16,
    background: "var(--bg, #fff)",
    color: "inherit",
    boxShadow: "0 10px 40px rgba(0,0,0,.25)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  tabs: {
    display: "flex",
    gap: 8,
    borderBottom: "1px solid rgba(128,128,128,.25)",
    marginBottom: 20,
  },
  tab: {
    padding: "11px 16px",
    border: "none",
    borderBottom: "2px solid transparent",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    fontWeight: 600,
  },
  section: {
    border: "1px solid rgba(128,128,128,.22)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  input: {
    minWidth: 0,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid rgba(128,128,128,.35)",
    background: "var(--bg, #fff)",
    color: "inherit",
  },
  muted: {
    fontSize: 13,
    opacity: .7,
  },
  person: {
    border: "1px solid rgba(128,128,128,.22)",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
  },
  personHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 14,
    cursor: "pointer",
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 9px",
    borderRadius: 20,
    fontSize: 11,
    background: "rgba(128,128,128,.13)",
  },
  personDetails: {
    padding: 16,
    borderTop: "1px solid rgba(128,128,128,.2)",
    background: "rgba(128,128,128,.035)",
  },
  sectorGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 8,
    marginTop: 12,
  },
  sectorOption: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    border: "1px solid rgba(128,128,128,.2)",
    fontSize: 13,
  },
};

export default function SectorsModal({
  onClose,
  onCreate,
  onRename,
  onDelete,
  onUserSectors,
  onUserSectorRole,
}) {
  const { user, users, sectors, isAdmin, isManagerInSector } = useData();

  const [activeTab, setActiveTab] = useState("pessoas");
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("todos");
  const [expandedUser, setExpandedUser] = useState(null);

  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        const term = search.toLowerCase();

        const matchesSearch =
          (u.name || "").toLowerCase().includes(term) ||
          (u.email || "").toLowerCase().includes(term);

        const hasRole = (person, role) => {
          if (role === "admin") return person.role === "admin";
          return Object.values(person.sectorRoles || {}).includes(role);
        };

        const matchesRole =
          roleFilter === "todos" || hasRole(u, roleFilter);

        return matchesSearch && matchesRole;
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [users, search, roleFilter]);

  const submit = async (e) => {
    e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) return;

    if (await onCreate(trimmed, color)) {
      setName("");
    }
  };

  const rename = (sector) => {
    const next = window.prompt("Novo nome do setor:", sector.name);

    if (next?.trim() && next.trim() !== sector.name) {
      onRename(sector.id, next.trim());
    }
  };

  const removeSector = (sector) => {
    const confirmed = window.confirm(
      `Deseja realmente excluir o setor "${sector.name}"?`
    );

    if (confirmed) onDelete(sector.id);
  };

  const canManageMembership = (person, sectorId) => {
    if (isAdmin) return true;
    // Gestores não podem alterar vínculos de administradores nem os próprios.
    if (person.role === "admin" || person.id === user?.id) return false;
    return Boolean(
      isManagerInSector
        ? isManagerInSector(sectorId)
        : user?.sectorRoles?.[sectorId] === "gestor"
    );
  };

  const toggleSector = (person, sectorId) => {
    if (!canManageMembership(person, sectorId)) return;
    const current = person.sectorIds || [];
    const hasSector = current.includes(sectorId);
    const updated = hasSector
      ? current.filter((id) => id !== sectorId)
      : [...current, sectorId];
    onUserSectors(person.id, updated);
  };

  const roleLabel = (role) => ROLES[role] || role;

  // Uma pessoa pode contar como gestora e membro em setores diferentes.
  const countByRole = (role) => {
    if (role === "admin") return users.filter((u) => u.role === "admin").length;
    return users.filter((u) =>
      Object.values(u.sectorRoles || {}).includes(role)
    ).length;
  };

  const personRoleSummary = (person) => {
    if (person.role === "admin") return "Administrador";
    const roles = Object.values(person.sectorRoles || {});
    const hasManager = roles.includes("gestor");
    const hasMember = roles.includes("membro");
    if (hasManager && hasMember) return "Gestor e membro";
    if (hasManager) return "Gestor";
    return "Membro";
  };

  return (
    <div
      className="ov"
      style={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Gerenciamento de setores e pessoas"
      >
        {/* Cabeçalho */}
        <div style={styles.header}>
          <div>
            <h2 style={{ margin: 0 }}>Gerenciamento</h2>
            <p style={{ ...styles.muted, marginBottom: 0 }}>
              Administre os setores e os acessos das pessoas.
            </p>
          </div>

          <button
            className="x"
            onClick={onClose}
            aria-label="Fechar"
            style={{ position: "static" }}
          >
            ×
          </button>
        </div>

        {/* Navegação */}
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              borderBottom:
                activeTab === "pessoas"
                  ? "2px solid var(--primary, #6366f1)"
                  : "2px solid transparent",
            }}
            onClick={() => setActiveTab("pessoas")}
          >
            Pessoas ({users.length})
          </button>

          {isAdmin && (
            <button
              style={{
                ...styles.tab,
                borderBottom:
                  activeTab === "setores"
                    ? "2px solid var(--primary, #6366f1)"
                    : "2px solid transparent",
              }}
              onClick={() => setActiveTab("setores")}
            >
              Setores ({sectors.length})
            </button>
          )}
        </div>

        {/* ABA DE PESSOAS */}
        {activeTab === "pessoas" && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: 10,
                marginBottom: 20,
              }}
            >
              {[
                ["Administradores", countByRole("admin")],
                ["Gestores", countByRole("gestor")],
                ["Membros", countByRole("membro")],
              ].map(([label, count]) => (
                <div key={label} style={styles.section}>
                  <div style={styles.muted}>{label}</div>
                  <strong style={{ fontSize: 23 }}>{count}</strong>
                </div>
              ))}
            </div>

            {/* Pesquisa e filtros */}
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              <input
                style={{ ...styles.input, flex: "1 1 220px" }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                aria-label="Buscar pessoas"
              />

              <select
                style={styles.input}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Filtrar por papel"
              >
                <option value="todos">Todos os papéis</option>
                <option value="admin">Administradores</option>
                <option value="gestor">Gestores</option>
                <option value="membro">Membros</option>
              </select>
            </div>

            <div style={styles.muted}>
              {filteredUsers.length} pessoa(s) encontrada(s).
              Clique em uma pessoa para administrar seus acessos.
            </div>

            {/* Lista de pessoas */}
            <div style={{ marginTop: 12 }}>
              {filteredUsers.length === 0 && (
                <div style={{ ...styles.section, textAlign: "center" }}>
                  Nenhuma pessoa encontrada.
                </div>
              )}

              {filteredUsers.map((person) => {
                const isExpanded = expandedUser === person.id;
                const assigned = person.sectorIds || [];

                return (
                  <div key={person.id} style={styles.person}>
                    <div
                      style={styles.personHeader}
                      onClick={() =>
                        setExpandedUser(
                          isExpanded ? null : person.id
                        )
                      }
                    >
                      <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                        <div style={{ fontWeight: 650 }}>
                          {person.name}
                          {person.id === user.id ? " (você)" : ""}
                        </div>

                        <div style={styles.muted}>
                          {person.email || "E-mail não informado"}
                        </div>
                      </div>

                      <span style={styles.badge}>
                        {personRoleSummary(person)}
                      </span>

                      <span style={styles.badge}>
                        {assigned.length} setor(es)
                      </span>

                      <span aria-hidden="true">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>

                    {isExpanded && (
                      <div style={styles.personDetails}>
                        {/* Papel global e funções por setor */}
                        <div style={{ marginBottom: 18 }}>
                          <strong style={{ fontSize: 14 }}>
                            {person.role === "admin" ? "Administrador global" : "Funções por setor"}
                          </strong>
                          <p style={styles.muted}>
                            {person.role === "admin"
                              ? "A função de administrador é global e não pode ser alterada por gestores."
                              : "A mesma pessoa pode ser gestora em um setor e membro em outro. Somente administradores podem alterar essas funções."}
                          </p>
                        </div>

                        {/* Vínculos com setores */}
                        <div>
                          <strong style={{ fontSize: 14 }}>
                            Setores vinculados
                          </strong>

                          <p style={styles.muted}>
                            Selecione os setores dos quais esta pessoa
                            participa.
                          </p>

                          {sectors.length === 0 ? (
                            <p style={styles.muted}>
                              Nenhum setor cadastrado.
                            </p>
                          ) : (
                            <div style={styles.sectorGrid}>
                              {sectors.map((sector) => {
                                const checked = assigned.includes(sector.id);
                                const sectorRole = person.sectorRoles?.[sector.id] || "membro";
                                const canEditMembership = canManageMembership(person, sector.id);

                                return (
                                  <div
                                    key={sector.id}
                                    style={{
                                      ...styles.sectorOption,
                                      justifyContent: "space-between",
                                      flexWrap: "wrap",
                                      background: checked
                                        ? "rgba(99,102,241,.08)"
                                        : "transparent",
                                    }}
                                  >
                                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, flex: "1 1 100px" }}>
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={!canEditMembership}
                                        onChange={() => toggleSector(person, sector.id)}
                                      />
                                      <span>{sector.name}</span>
                                    </label>

                                    {checked && (
                                      isAdmin && person.role !== "admin" ? (
                                        <select
                                          style={{ ...styles.input, padding: "5px 8px", fontSize: 12 }}
                                          value={sectorRole}
                                          onChange={(e) => onUserSectorRole(person.id, sector.id, e.target.value)}
                                          aria-label={`Função de ${person.name} em ${sector.name}`}
                                        >
                                          <option value="membro">Membro</option>
                                          <option value="gestor">Gestor</option>
                                        </select>
                                      ) : (
                                        <span style={styles.badge}>
                                          {person.role === "admin" ? "Administrador" : roleLabel(sectorRole)}
                                        </span>
                                      )
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ABA DE SETORES */}
        {isAdmin && activeTab === "setores" && (
          <>
            <div style={styles.section}>
              <h3 style={{ marginTop: 0 }}>Criar novo setor</h3>

              <form
                onSubmit={submit}
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <input
                  style={{ ...styles.input, flex: "1 1 200px" }}
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do setor"
                  aria-label="Nome do novo setor"
                />

                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  aria-label="Cor do setor"
                  style={{
                    width: 48,
                    height: 40,
                    padding: 3,
                    border: "1px solid rgba(128,128,128,.3)",
                    borderRadius: 8,
                  }}
                />

                <button className="btn p" type="submit">
                  Criar setor
                </button>
              </form>
            </div>

            <h3>Setores cadastrados</h3>

            {sectors.length === 0 && (
              <p style={styles.muted}>
                Nenhum setor cadastrado até o momento.
              </p>
            )}

            {sectors.map((sector) => {
              const members = users.filter((u) =>
                (u.sectorIds || []).includes(sector.id)
              );

              return (
                <div
                  key={sector.id}
                  style={{
                    ...styles.section,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: "1 1 180px" }}>
                    <SectorTag sector={sector} />

                    <div style={{ ...styles.muted, marginTop: 8 }}>
                      {members.length} pessoa(s) vinculada(s)
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn"
                      onClick={() => rename(sector)}
                    >
                      Renomear
                    </button>

                    <button
                      className="btn danger"
                      onClick={() => removeSector(sector)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Rodapé */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 20,
            paddingTop: 14,
            borderTop: "1px solid rgba(128,128,128,.2)",
          }}
        >
          <button className="btn" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
