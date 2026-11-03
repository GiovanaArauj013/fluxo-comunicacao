import { TYPES } from "../data.js";
import { useData } from "../context.js";

export const itemKey = (i) => `COM-${i.id}`;

export function TypeTag({ type }) {
  const c = TYPES[type];
  return <span className="tag" style={{ background: `${c}1f`, color: c }}>{type}</span>;
}

export function Avatar({ id }) {
  const { userName } = useData();
  const name = userName(id);
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return <span className="av" title={name}>{initials}</span>;
}

// Destaca @menções nos comentários
export function Mentions({ text }) {
  return text.split(/(@\w+)/g).map((p, i) =>
    p.startsWith("@") ? <span key={i} className="mention">{p}</span> : p
  );
}

export function timeAgo(iso) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  if (min < 1440) return `${Math.floor(min / 60)} h`;
  if (min < 2880) return "ontem";
  return new Date(iso).toLocaleDateString("pt-BR");
}

// Hora da mensagem; inclui a data quando não é de hoje
export function clock(iso) {
  const d = new Date(iso);
  const hm = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString() ? hm : `${d.toLocaleDateString("pt-BR")} ${hm}`;
}

export function GroupAvatar({ name }) {
  return <span className="av grp" title={name}>{(name.trim()[0] || "G").toUpperCase()}</span>;
}
