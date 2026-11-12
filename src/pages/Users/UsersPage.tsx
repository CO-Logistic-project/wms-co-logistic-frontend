import { useCallback, useEffect, useState, type FormEvent } from "react";
import Modal from "../../components/Modal";
import {
  resetUserPassword,
  assignUserRoles,
  createUser,
  getApiMessage,
  listRoles,
  listUsers,
  setUserStatus,
  updateUser,
} from "../../features/access/api";
import type { AccessRole, ManagedUser } from "../../features/access/types";
import { useAuth } from "../../features/auth/auth-context";

interface UserFormState {
  nombre: string;
  apellido: string;
  correo: string;
  password: string;
  roleIds: number[];
}

const EMPTY_FORM: UserFormState = {
  nombre: "",
  apellido: "",
  correo: "",
  password: "",
  roleIds: [],
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default function UsersPage() {
  const { profile, refreshProfile } = useAuth();
  const permissions = new Set(profile?.permisos ?? []);
  const canCreate = permissions.has("usuarios.crear");
  const canEdit = permissions.has("usuarios.editar");
  const canAssign = permissions.has("usuarios.asignar_roles");
  const canDeactivate = permissions.has("usuarios.desactivar");
  const canViewRoles = permissions.has("roles.ver");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<ManagedUser | null>(null);
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  async function copyTemporaryPassword() {
    if (!temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopyMessage("Copiada");
    } catch {
      setCopyMessage("No se pudo copiar. Copia la clave manualmente.");
    }
  }
  async function confirmReset() {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const result = await resetUserPassword(resetTarget.id_usuario);
      setTemporaryPassword(result.password_temporal); setCopyMessage(""); setResetTarget(null);
    } catch (error) { setPageError(getApiMessage(error)); setResetTarget(null); }
    finally { setResetting(false); }
  }
  const [changingStatus, setChangingStatus] = useState(false);

  const loadData = useCallback(async (term = "") => {
    setLoading(true);
    setPageError(null);
    try {
      const [userData, roleData] = await Promise.all([
        listUsers(term),
        canViewRoles ? listRoles() : Promise.resolve([]),
      ]);
      setUsers(userData);
      setRoles(roleData);
    } catch (error) {
      setPageError(getApiMessage(error));
    } finally {
      setLoading(false);
    }
  }, [canViewRoles]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(loadTimer);
  }, [loadData]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(user: ManagedUser) {
    setEditing(user);
    setForm({
      nombre: user.nombre,
      apellido: user.apellido,
      correo: user.correo,
      password: "",
      roleIds: user.roles.map((role) => role.id_rol),
    });
    setFormError(null);
    setModalOpen(true);
  }

  function toggleRole(roleId: number) {
    setForm((current) => ({
      ...current,
      roleIds: current.roleIds.includes(roleId)
        ? current.roleIds.filter((id) => id !== roleId)
        : [...current.roleIds, roleId],
    }));
  }

  async function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!form.nombre.trim() || !form.apellido.trim() || !form.correo.trim()) {
      setFormError("Completa nombre, apellido y correo.");
      return;
    }
    if (!editing && form.password.length < 8) {
      setFormError("La contraseña temporal debe tener al menos 8 caracteres.");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        let saved = await updateUser(editing.id_usuario, {
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          correo: form.correo.trim().toLowerCase(),
        });
        if (canAssign) {
          saved = await assignUserRoles(saved.id_usuario, form.roleIds);
        }
        if (saved.id_usuario === profile?.id) await refreshProfile();
      } else {
        await createUser({
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          correo: form.correo.trim().toLowerCase(),
          password: form.password,
          role_ids: form.roleIds,
        });
      }
      setModalOpen(false);
      await loadData(search);
    } catch (error) {
      setFormError(getApiMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function confirmStatusChange() {
    if (!statusTarget) return;
    setChangingStatus(true);
    setPageError(null);
    try {
      await setUserStatus(statusTarget.id_usuario, !statusTarget.estado);
      setStatusTarget(null);
      await loadData(search);
    } catch (error) {
      setPageError(getApiMessage(error));
      setStatusTarget(null);
    } finally {
      setChangingStatus(false);
    }
  }

  return (
    <section className="management-page">
      <header className="page-heading management-heading">
        <div><span className="page-eyebrow">Seguridad y accesos</span><h1>Usuarios</h1><p>Registra y actualiza las cuentas que pueden ingresar al WMS.</p></div>
        {canCreate && <button className="action-button" type="button" onClick={openCreate}>＋ Nuevo usuario</button>}
      </header>

      <div className="toolbar-card">
        <form className="search-form" onSubmit={(event) => { event.preventDefault(); void loadData(search); }}>
          <span aria-hidden="true">⌕</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o correo" aria-label="Buscar usuarios" />
          <button type="submit">Buscar</button>
        </form>
        <span className="record-count">{users.length} usuario{users.length === 1 ? "" : "s"}</span>
      </div>

      {pageError && <div className="inline-alert" role="alert">{pageError}<button type="button" onClick={() => void loadData(search)}>Reintentar</button></div>}
      {loading ? (
        <div className="content-loading"><span className="loading-spinner" /> Cargando usuarios…</div>
      ) : (
        <div className="data-card">
          <table className="data-table">
            <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Registro</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id_usuario}>
                  <td><div className="user-cell"><span className="table-avatar">{user.nombre[0]?.toUpperCase()}</span><div><strong>{user.nombre} {user.apellido}</strong><small>{user.correo}</small></div></div></td>
                  <td><div className="tag-list">{user.roles.length ? user.roles.map((role) => <span className="role-tag" key={role.id_rol}>{role.nombre}</span>) : <span className="muted-copy">Sin rol</span>}</div></td>
                  <td><span className={`status-pill ${user.estado ? "active" : "inactive"}`}><i />{user.estado ? "Activo" : "Inactivo"}</span></td>
                  <td>{formatDate(user.fecha_registro)}</td>
                  <td><div className="row-actions">{canEdit && user.id_usuario !== profile?.id && <button className="table-action" type="button" onClick={() => setResetTarget(user)}>Restablecer contraseña</button>}{canEdit && <button className="table-action" type="button" onClick={() => openEdit(user)}>Editar</button>}{canDeactivate && user.id_usuario !== profile?.id && <button className={`table-action ${user.estado ? "danger" : "success"}`} type="button" onClick={() => setStatusTarget(user)}>{user.estado ? "Desactivar" : "Reactivar"}</button>}</div></td>
                </tr>
              ))}
              {!users.length && <tr><td colSpan={5}><div className="empty-state"><strong>No encontramos usuarios</strong><span>Prueba otro término de búsqueda.</span></div></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal title={editing ? "Editar usuario" : "Registrar usuario"} description={editing ? "Actualiza la información de acceso sin crear duplicados." : "La cuenta se registra en el WMS."} onClose={() => !saving && setModalOpen(false)}>
          <form className="management-form" onSubmit={submitUser}>
            <div className="form-grid">
              <label><span>Nombre</span><input value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} autoFocus maxLength={255} required /></label>
              <label><span>Apellido</span><input value={form.apellido} onChange={(event) => setForm({ ...form, apellido: event.target.value })} maxLength={255} required /></label>
            </div>
            <label><span>Correo electrónico</span><input type="email" value={form.correo} onChange={(event) => setForm({ ...form, correo: event.target.value })} autoComplete="off" required /></label>
            {!editing && <label><span>Contraseña temporal</span><input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" minLength={8} required /><small>Debe contener al menos 8 caracteres.</small></label>}
            {canAssign && roles.length > 0 && <fieldset className="choice-fieldset"><legend>Roles asignados</legend><div className="choice-grid">{roles.filter((role) => role.estado).map((role) => <label className="check-choice" key={role.id_rol}><input type="checkbox" checked={form.roleIds.includes(role.id_rol)} onChange={() => toggleRole(role.id_rol)} /><span><strong>{role.nombre}</strong><small>{role.descripcion || "Sin descripción"}</small></span></label>)}</div></fieldset>}
            {formError && <div className="inline-alert compact" role="alert">{formError}</div>}
            <footer className="modal-actions"><button className="secondary-button" type="button" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</button><button className="action-button" type="submit" disabled={saving}>{saving ? "Guardando…" : editing ? "Guardar cambios" : "Registrar usuario"}</button></footer>
          </form>
        </Modal>
      )}

      {resetTarget && <Modal title="Restablecer contraseña" onClose={() => !resetting && setResetTarget(null)}>
        <p>¿Confirmas restablecer la contraseña de {resetTarget.correo}?</p>
        <footer className="modal-actions"><button type="button" disabled={resetting} onClick={() => setResetTarget(null)}>Cancelar</button><button type="button" disabled={resetting} onClick={() => void confirmReset()}>{resetting ? "Procesando…" : "Confirmar restablecimiento"}</button></footer>
      </Modal>}
      {temporaryPassword && <Modal title="Contraseña temporal" description="El usuario deberá cambiarla al ingresar" onClose={() => { setTemporaryPassword(null); setCopyMessage(""); }}>
        <p>Esta clave se muestra una sola vez.</p><output>{temporaryPassword}</output>
        <button type="button" onClick={() => void copyTemporaryPassword()}>Copiar</button>
        {copyMessage && <p role="status">{copyMessage}</p>}
      </Modal>}
      {statusTarget && (
        <Modal title={statusTarget.estado ? "Desactivar usuario" : "Reactivar usuario"} description={statusTarget.estado ? "La cuenta perderá acceso inmediatamente al WMS." : "La cuenta podrá iniciar sesión nuevamente."} onClose={() => !changingStatus && setStatusTarget(null)}>
          <div className="confirmation-body">
            <p>¿Confirmas que deseas {statusTarget.estado ? "desactivar" : "reactivar"} a <strong>{statusTarget.nombre} {statusTarget.apellido}</strong>?</p>
            <div className="confirmation-note"><span aria-hidden="true">!</span><p>{statusTarget.estado ? "La cuenta pierde acceso al sistema." : "Conservará los roles y permisos que tenía asignados."}</p></div>
            <footer className="modal-actions"><button className="secondary-button" type="button" onClick={() => setStatusTarget(null)} disabled={changingStatus}>Cancelar</button><button className={`action-button ${statusTarget.estado ? "danger-button" : ""}`} type="button" onClick={() => void confirmStatusChange()} disabled={changingStatus}>{changingStatus ? "Procesando…" : statusTarget.estado ? "Sí, desactivar" : "Sí, reactivar"}</button></footer>
          </div>
        </Modal>
      )}
    </section>
  );
}
