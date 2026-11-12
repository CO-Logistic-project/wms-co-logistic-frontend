import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/auth-context";

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6.5h16v11H4z" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 14v2" />
    </svg>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
      <path d="M9.8 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9 5.5 9 5.5a15 15 0 0 1-2.2 2.7M6.3 6.3A16 16 0 0 0 3 9.5S6.5 15 12 15c.8 0 1.6-.1 2.3-.3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12s3.5-5.5 9-5.5S21 12 21 12s-3.5 5.5-9 5.5S3 12 3 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function WarehouseMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32">
        <path d="M5 10.5 16 5l11 5.5v12L16 27 5 22.5Z" />
        <path d="M10 19h4m-4 3h4m4-9v10m4-7v7" />
      </svg>
    </span>
  );
}

function Login() {
  const navigate = useNavigate();
  const { configured, signIn, status, mustChangePassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      navigate(mustChangePassword ? "/cambiar-contrasena" : "/", { replace: true });
    }
  }, [navigate, status, mustChangePassword]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }

    setSubmitting(true);

    try {
      await signIn(email, password);
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : "No pudimos iniciar sesión.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") return <main className="session-loading">Validando sesión…</main>;

  return (
    <main className="login-page">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <div className="ambient ambient-three" aria-hidden="true" />

      <section className="login-grid" aria-label="Inicio de sesión WMS Pro">
        <div className="login-card">
          <header className="login-header">
            <div className="brand-row">
              <WarehouseMark />
              <span>WMS Pro</span>
            </div>
            <h1>Iniciar sesión</h1>
            <p>Sistema empresarial de gestión logística</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="field-group">
              <label htmlFor="email">Correo electrónico</label>
              <div className="input-shell">
                <span className="input-icon"><MailIcon /></span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="usuario@empresa.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={submitting}
                  aria-invalid={Boolean(error)}
                  required
                />
              </div>
            </div>

            <div className="field-group">
              <div className="field-label-row">
                <label htmlFor="password">Contraseña</label>
                <Link
                  className="text-action"
                  to="/recuperar-contrasena"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="input-shell">
                <span className="input-icon"><LockIcon /></span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={submitting}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-error" : undefined}
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <EyeIcon hidden={showPassword} />
                </button>
              </div>
            </div>

            {error && (
              <div id="login-error" className="login-error" role="alert">
                {error}
              </div>
            )}

            {!configured && (
              <div className="login-error" role="status">
                No se pudo configurar el acceso.
              </div>
            )}

            <button
              className="primary-button"
              type="submit"
              disabled={submitting || !configured}
            >
              {submitting ? (
                <><span className="button-spinner" aria-hidden="true" />Validando…</>
              ) : (
                <>Ingresar <span aria-hidden="true">→</span></>
              )}
            </button>

            <div className="divider" aria-hidden="true">
              <span />
              <small>O</small>
              <span />
            </div>

            <button
              className="sso-button"
              type="button"
              disabled
              title="Disponible cuando se habilite SSO empresarial"
            >
              <span className="sso-mark" aria-hidden="true">S</span>
              Ingresar con SSO
            </button>
          </form>

          <p className="contact-copy">
            ¿No tienes acceso? <span>Contacta al administrador</span>
          </p>
        </div>

        <aside className="login-benefits" aria-label="Beneficios de WMS Pro">
          <article>
            <span className="benefit-icon" aria-hidden="true">◎</span>
            <div>
              <h2>Precisión de inventario</h2>
              <p>Información confiable y sincronizada para todas tus operaciones.</p>
            </div>
          </article>
          <article>
            <span className="benefit-icon" aria-hidden="true">↗</span>
            <div>
              <h2>Trazabilidad en vivo</h2>
              <p>Controla cada movimiento desde la recepción hasta el despacho.</p>
            </div>
          </article>
          <p className="version-copy">WMS Pro · Acceso empresarial seguro</p>
        </aside>
      </section>
    </main>
  );
}

export default Login;
