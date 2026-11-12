import { useState, type FormEvent } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import AuthFlowLayout from "../../components/AuthFlowLayout";
import { useAuth } from "../../features/auth/auth-context";
export default function ChangePasswordPage() {
  const { changePassword, mustChangePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!actual) next.password_actual = "Ingresa tu contraseña actual.";
    if (nueva.length < 8 || !/[a-záéíóúñ]/i.test(nueva) || !/[0-9]/.test(nueva)) next.password_nueva = "Debe tener al menos 8 caracteres, letras y números.";
    if (actual === nueva) next.password_nueva = "Debe ser distinta de la contraseña actual.";
    if (nueva !== confirmacion) next.confirmacion = "Las contraseñas no coinciden.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try { await changePassword(actual, nueva); navigate("/", { replace: true }); }
    catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        setErrors(Object.fromEntries(Object.entries(error.response.data).map(([key, value]) => [key, Array.isArray(value) ? value.join(" ") : String(value)])));
      } else setErrors({ detail: "No pudimos cambiar la contraseña. Inténtalo nuevamente." });
    } finally { setSaving(false); }
  }
  return <AuthFlowLayout title="Cambiar contraseña" subtitle={mustChangePassword ? "Debes cambiar tu contraseña para continuar." : "Actualiza tu contraseña de acceso."} showBack={false}>
    <form className="management-form" onSubmit={submit} noValidate>
      <label>Contraseña actual<input aria-label="Contraseña actual" type="password" autoComplete="current-password" value={actual} onChange={e => setActual(e.target.value)} disabled={saving} />{errors.password_actual && <small role="alert">{errors.password_actual}</small>}</label>
      <label>Nueva contraseña<input aria-label="Nueva contraseña" type="password" autoComplete="new-password" value={nueva} onChange={e => setNueva(e.target.value)} disabled={saving} />{errors.password_nueva && <small role="alert">{errors.password_nueva}</small>}</label>
      <label>Confirmar contraseña<input aria-label="Confirmar contraseña" type="password" autoComplete="new-password" value={confirmacion} onChange={e => setConfirmacion(e.target.value)} disabled={saving} />{errors.confirmacion && <small role="alert">{errors.confirmacion}</small>}</label>
      {Object.entries(errors).filter(([key]) => !["password_actual", "password_nueva", "confirmacion", "code"].includes(key)).map(([key, value]) => <p role="alert" key={key}>{value}</p>)}
      <button className="primary-button" disabled={saving}>{saving ? "Guardando…" : "Cambiar contraseña"}</button>
    </form>
    {!mustChangePassword && <Link to="/">Volver al inicio</Link>}
    <button type="button" onClick={() => { void signOut().catch(() => {}).finally(() => navigate("/login", { replace: true })); }}>Cerrar sesión</button>
  </AuthFlowLayout>;
}
