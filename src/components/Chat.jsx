import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { useData } from "../context.js";
import { Avatar, GroupAvatar, clock, timeAgo } from "./ui.jsx";

const firstName = (n) => n.split(" ")[0];

// Lista de pessoas com caixa de seleção (usada ao criar grupo e ao adicionar membros)
function PeoplePicker({ people, selected, onToggle }) {
  return (
    <div className="people">
      {people.map((u) => (
        <label key={u.id} className="prow">
          <input type="checkbox" checked={selected.includes(u.id)} onChange={() => onToggle(u.id)} />
          <Avatar id={u.id} /><span>{u.name}</span>
        </label>
      ))}
    </div>
  );
}

export default function Chat({ chats, onRefresh, notify }) {
  const { user, users, userName } = useData();
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [panel, setPanel] = useState(null); // null | "dm" | "group"
  const [groupName, setGroupName] = useState("");
  const [picked, setPicked] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [toAdd, setToAdd] = useState([]);
  const endRef = useRef(null);
  const lastId = useRef(0);

  const active = chats.find((c) => c.id === activeId);
  const title = (c) => (c.isGroup ? c.name : userName(c.userId));
  const toggle = (list, setList) => (id) => setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const others = users.filter((u) => u.id !== user.id);

  // Carrega a conversa aberta e busca mensagens novas a cada 3 s
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    let first = true;
    setMessages([]);
    setShowMembers(false);
    setToAdd([]);
    lastId.current = 0;
    const pull = async () => {
      try {
        const fresh = await api.chatMessages(activeId, lastId.current);
        if (cancelled) return;
        if (fresh.length) {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const add = fresh.filter((m) => !seen.has(m.id));
            return add.length ? [...prev, ...add] : prev;
          });
          lastId.current = fresh[fresh.length - 1].id;
        }
        if (first || fresh.length) onRefresh(); // atualiza as não lidas
        first = false;
      } catch { /* tenta de novo no próximo ciclo */ }
    };
    pull();
    const t = setInterval(pull, 3000);
    return () => { cancelled = true; clearInterval(t); };
  }, [activeId, onRefresh]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.length, activeId]);

  const closePanel = () => { setPanel(null); setPicked([]); setGroupName(""); };

  const startDm = async (userId) => {
    try {
      const c = await api.openChat(userId);
      await onRefresh();
      setActiveId(c.id);
      closePanel();
    } catch (e) { notify(e.message); }
  };

  const createGroup = async (e) => {
    e.preventDefault();
    try {
      const c = await api.createGroup(groupName.trim(), picked);
      await onRefresh();
      setActiveId(c.id);
      closePanel();
      notify("Grupo criado");
    } catch (err) { notify(err.message); }
  };

  const addMembers = async () => {
    try {
      await api.addMembers(activeId, toAdd);
      await onRefresh();
      setToAdd([]);
      notify("Participantes adicionados");
    } catch (err) { notify(err.message); }
  };

  const leave = async () => {
    if (!window.confirm(`Sair do grupo "${active.name}"? Você deixará de ver as mensagens.`)) return;
    try {
      await api.leaveChat(activeId);
      setActiveId(null);
      await onRefresh();
      notify("Você saiu do grupo");
    } catch (err) { notify(err.message); }
  };

  const send = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText("");
    try {
      const m = await api.sendMessage(activeId, t);
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      lastId.current = Math.max(lastId.current, m.id);
      onRefresh();
    } catch (err) {
      notify(err.message);
      setText(t);
    }
  };

  return (
    <div className={`chat ${activeId ? "has-active" : ""}`}>
      <section className="clist" aria-label="Conversas">
        <div className="chead">
          <h2>Mensagens</h2>
          <div className="cbtns">
            <button className="btn" onClick={() => { closePanel(); setPanel(panel === "dm" ? null : "dm"); }}>Conversa</button>
            <button className="btn p" onClick={() => { closePanel(); setPanel(panel === "group" ? null : "group"); }}>Novo grupo</button>
          </div>
        </div>

        {panel === "dm" && (
          <div className="picker">
            <p>Escolha com quem conversar</p>
            {others.map((u) => (
              <button key={u.id} className="crow" onClick={() => startDm(u.id)}>
                <Avatar id={u.id} /><span className="cname">{u.name}</span>
              </button>
            ))}
          </div>
        )}

        {panel === "group" && (
          <form className="picker gform" onSubmit={createGroup}>
            <label className="f">Nome do grupo
              <input value={groupName} onChange={(e) => setGroupName(e.target.value)} maxLength={60} placeholder="Ex.: Comitê de comunicação" autoFocus />
            </label>
            <p>Participantes (escolha pelo menos 2)</p>
            <PeoplePicker people={others} selected={picked} onToggle={toggle(picked, setPicked)} />
            <div className="gactions">
              <button type="button" className="btn" onClick={closePanel}>Cancelar</button>
              <button className="btn p" disabled={!groupName.trim() || picked.length < 2}>Criar grupo</button>
            </div>
          </form>
        )}

        {chats.length === 0 && !panel && <p className="empty">Você ainda não tem conversas. Inicie uma conversa ou crie um grupo.</p>}
        {chats.map((c) => (
          <button key={c.id} className={`crow ${c.id === activeId ? "on" : ""}`} onClick={() => setActiveId(c.id)}>
            {c.isGroup ? <GroupAvatar name={c.name} /> : <Avatar id={c.userId} />}
            <span className="cbody">
              <span className="cname">{title(c)}</span>
              <span className="cprev">
                {c.lastMessage ? `${c.lastMessage.senderId === user.id ? "Você" : c.isGroup ? firstName(userName(c.lastMessage.senderId)) : ""}${c.lastMessage.senderId === user.id || c.isGroup ? ": " : ""}${c.lastMessage.text}` : "Sem mensagens"}
              </span>
            </span>
            <span className="cside">
              {c.lastMessage && <small>{timeAgo(c.lastMessage.createdAt)}</small>}
              {c.unread > 0 && <b className="badge">{c.unread}</b>}
            </span>
          </button>
        ))}
      </section>

      <section className="thread" aria-label="Conversa">
        {!active ? (
          <p className="empty mid">Selecione uma conversa ou crie um grupo. Somente os participantes de cada conversa veem as mensagens.</p>
        ) : (
          <>
            <div className="thead">
              <button className="btn back" onClick={() => setActiveId(null)} aria-label="Voltar às conversas">←</button>
              {active.isGroup ? <GroupAvatar name={active.name} /> : <Avatar id={active.userId} />}
              <strong>{title(active)}</strong>
              {active.isGroup ? (
                <button className="btn members-btn" onClick={() => setShowMembers((v) => !v)} aria-expanded={showMembers}>
                  {active.memberIds.length} participantes
                </button>
              ) : <small>Conversa privada</small>}
            </div>

            {active.isGroup && showMembers && (
              <div className="members">
                <h3>Participantes</h3>
                <ul>
                  {active.memberIds.map((id) => (
                    <li key={id}><Avatar id={id} /><span>{userName(id)}{id === user.id ? " (você)" : ""}{id === active.createdBy ? " · criou o grupo" : ""}</span></li>
                  ))}
                </ul>
                {users.some((u) => !active.memberIds.includes(u.id)) && (
                  <>
                    <h3>Adicionar pessoas</h3>
                    <PeoplePicker people={users.filter((u) => !active.memberIds.includes(u.id))} selected={toAdd} onToggle={toggle(toAdd, setToAdd)} />
                    <button className="btn p" disabled={!toAdd.length} onClick={addMembers}>Adicionar</button>
                  </>
                )}
                <button className="btn danger" onClick={leave}>Sair do grupo</button>
              </div>
            )}

            <div className="msgs">
              {messages.length === 0 && <p className="empty">Nenhuma mensagem ainda. Diga olá.</p>}
              {messages.map((m) => (
                <div key={m.id} className={`msg ${m.senderId === user.id ? "me" : ""}`}>
                  {active.isGroup && m.senderId !== user.id && <b className="who">{userName(m.senderId)}</b>}
                  <p>{m.text}</p>
                  <small>{clock(m.createdAt)}</small>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form className="cform composer" onSubmit={send}>
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder={active.isGroup ? `Mensagem para ${active.name}` : `Mensagem para ${firstName(userName(active.userId))}`} aria-label="Mensagem" autoFocus />
              <button className="btn p" disabled={!text.trim()}>Enviar</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
