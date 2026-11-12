import { useState } from "react";
import { useData } from "../context.js";
import SectorTag from "./SectorTag.jsx";

const ROLES = { admin: "Administrador", gestor: "Gestor", membro: "Membro" };

// Tela para gestores e administradores: criar/renomear/excluir setores e
// definir em quais setores cada pessoa está. Só administradores mudam papéis.
export default function SectorsModal({ onClose, onCreate, onRename, onDelete, onUserSectors, onUserRole }) {
  const { user, users, sectors, isAdmin } = useData();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");

  const submit = async (e) => {
    e.preventDefault();
    if (await onCreate(name.trim(), color)) setName("");
  };

  const rename = (s) => {
    const next = window.prompt("Novo nome do setor:", s.name);
    if (next && next.trim() && next.trim() !== s.name) onRename(s.id, next.trim());
  };

  const toggle = (u, sectorId) => {
    const has = u.sectorIds.includes(sectorId);
    onUserSectors(u.id, has ? u.sectorIds.filter((x) => x !== sectorId) : [...u.sectorIds, sectorId]);
  };

  const card = {
    background: "var(--bg, #fff)", color: "inherit", borderRadius: 12, padding: 20,
    width: "min(720px, 94vw)", maxHeight: "88vh", overflow: "auto", boxShadow: "0 10px 40px rgba(0,0,0,.25)",
  };
  const row = { display: "flex", alignItems: "center", gap: 8, padding: "6px 0", flexWrap: "wrap" };

  return (
    <div className="ov" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={card} role="dialog" aria-label="Gerenciar setores">
        <div style={{ ...row, justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Setores</h2>
          <button className="x" onClick={onClose} aria-label="Fechar" style={{ position: "static" }}>×</button>
        </div>

        <form onSubmit={submit} style={row}>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do novo setor" aria-label="Nome do novo setor" maxLength={100} />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Cor do setor" />
          <button className="btn p">Criar setor</button>
        </form>

        {sectors.length === 0 && <p>Nenhum setor ainda. Crie o primeiro acima.</p>}
        {sectors.map((s) => (
          <div key={s.id} style={row}>
            <SectorTag sector={s} />
            <span style={{ flex: 1 }} />
            <button className="btn" onClick={() => rename(s)}>Renomear</button>
            <button className="btn danger" onClick={() => onDelete(s.id)}>Excluir</button>
          </div>
        ))}

        <h3 style={{ marginTop: 20 }}>Pessoas</h3>
        <p style={{ fontSize: 13, opacity: 0.75, marginTop: 0 }}>
          Marque os setores de cada pessoa. Uma pessoa pode estar em mais de um.
        </p>
        {users.map((u) => (
          <div key={u.id} style={{ ...row, borderTop: "1px solid rgba(128,128,128,.25)" }}>
            <b style={{ minWidth: 130 }}>{u.name}{u.id === user.id ? " (você)" : ""}</b>
            {isAdmin ? (
              <select value={u.role} onChange={(e) => onUserRole(u.id, e.target.value)} aria-label={`Papel de ${u.name}`}>
                {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            ) : (
              <span style={{ fontSize: 12, opacity: 0.7 }}>{ROLES[u.role] ?? u.role}</span>
            )}
            {sectors.map((s) => (
              <label key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                <input type="checkbox" checked={u.sectorIds.includes(s.id)} onChange={() => toggle(u, s.id)} />
                {s.name}
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
