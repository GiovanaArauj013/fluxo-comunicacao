
import { useState } from "react";
import { api } from "../api.js";

export default function AlterarSenha({ onComplete, onLogout }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setBusy(true);

    try {
      await api.changePassword(password);
      await onComplete();
    } catch (err) {
      setError(err.message || "Erro ao alterar senha.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form onSubmit={submit}>
        <div className="logo"><i>F</i>Fluxo</div>

        <h2>Crie sua nova senha</h2>

        <p>
          Este é seu primeiro acesso.
          Para continuar, você precisa cadastrar uma nova senha.
        </p>

        <label className="f">
          Nova senha
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <label className="f">
          Confirmar nova senha
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </label>

        {error && <p className="err" role="alert">{error}</p>}

        <button className="btn p" disabled={busy}>
          {busy ? "Salvando..." : "Salvar nova senha"}
        </button>

        {onLogout && (
          <button
            type="button"
            className="btn"
            onClick={onLogout}
            disabled={busy}
          >
            Sair da conta
          </button>
        )}
      </form>
    </div>
  );
}
