import { useState } from "react";
import { api, setToken } from "../api.js";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
  e.preventDefault();
  setBusy(true);
  setError("");

  try {
    await api.login(email, password);
    await onLogin();

  } catch (err) {
    setError(err.message);
  } finally {
    setBusy(false);
  }
};

  return (
    <div className="login">
      <form onSubmit={submit}>
        <div className="logo"><i>F</i>Fluxo</div>
        <h2>Entrar</h2>
        <label className="f">E-mail
          <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="f">Senha
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn p" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
      </form>
    </div>
  );
}
