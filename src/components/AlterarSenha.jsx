import { useState } from "react";
import { api } from "../api.js";

export default function AlterarSenha({ onComplete, onLogout }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
          <div className="password-field" style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              style={{ paddingRight: "42px", boxSizing: "border-box", width: "100%" }}
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "24px",
                height: "24px",
                padding: 0,
                border: 0,
                background: "transparent",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                color: "currentColor",
              }}
            >
              {showPassword ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                  <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.2-2.3 3.3" />
                  <path d="M6.2 6.2C3.9 7.6 2.7 9.7 2.5 12c.5 1.2 3.8 7 9.5 7 1.1 0 2.1-.2 3-.6" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
              )}
            </button>
          </div>
        </label>

        <label className="f">
          Confirmar nova senha
          <div className="password-field" style={{ position: "relative" }}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword((value) => !value)}
              aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showConfirmPassword}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "24px",
                height: "24px",
                padding: 0,
                border: 0,
                background: "transparent",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                color: "currentColor",
              }}
            >
              {showConfirmPassword ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                  <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.2-2.3 3.3" />
                  <path d="M6.2 6.2C3.9 7.6 2.7 9.7 2.5 12c.5 1.2 3.8 7 9.5 7 1.1 0 2.1-.2 3-.6" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
              )}
            </button>
          </div>
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
