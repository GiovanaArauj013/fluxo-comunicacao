import { useState } from "react";
import { PRIORITIES, TYPES } from "../data.js";
import { useData } from "../context.js";

export default function NewItemModal({ status, defaultTask, onClose, onCreate }) {
  const { user, users, tasks } = useData();
  const [f, setF] = useState({ type: "Comunicado", title: "", taskId: defaultTask, assigneeId: user.id, priority: "Média" });
  const [busy, setBusy] = useState(false);
  const set = (k, num) => (e) => setF({ ...f, [k]: num ? Number(e.target.value) : e.target.value });
  const Select = ({ label, k, num, options }) => (
    <label className="f">{label}
      <select value={f[k]} onChange={set(k, num)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    </label>
  );
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    await onCreate({ ...f, status });
    setBusy(false);
  };
  return (
    <div className="ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit}>
        <button type="button" className="x" onClick={onClose} aria-label="Fechar">×</button>
        <h2>Criar item</h2>
        <Select label="Tarefa" k="taskId" num options={tasks.map((t) => [t.id, t.name])} />
        <Select label="Tipo" k="type" options={Object.keys(TYPES).map((t) => [t, t])} />
        <label className="f">Título
          <input autoFocus required maxLength={200} value={f.title} onChange={set("title")} placeholder="Ex.: Confirmar datas com a diretoria" />
        </label>
        <Select label="Responsável" k="assigneeId" num options={users.map((u) => [u.id, u.name])} />
        <Select label="Prioridade" k="priority" options={PRIORITIES.map((p) => [p, p])} />
        <button className="btn p" disabled={busy}>{busy ? "Criando…" : "Criar item"}</button>
      </form>
    </div>
  );
}
