"use client";

import { useState, useTransition, useMemo } from "react";
import { Users, Search, User, Shield, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { updateUserRole, toggleUserActive } from "./actions";
import { useAuth } from "@/hooks/useAuth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UserProfile = any;

const ROLES = [
  { value: "admin", label: "Admin", icon: Shield },
  { value: "vendedor", label: "Vendedor", icon: ShoppingBag },
  { value: "cliente", label: "Cliente", icon: User },
] as const;

const ROLE_BADGE: Record<string, { variant: "default" | "success" | "warning" | "error" | "info" | "outline"; label: string }> = {
  admin:    { variant: "default",  label: "Admin" },
  vendedor: { variant: "info",     label: "Vendedor" },
  cliente:  { variant: "outline",  label: "Cliente" },
};

type RoleFilter = "todos" | "admin" | "vendedor" | "cliente";
type StatusFilter = "todos" | "activo" | "inactivo";

function RoleSelect({ user, currentUserId }: { user: UserProfile; currentUserId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isSelf = user.id === currentUserId;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setError(null);
    const role = e.target.value;
    startTransition(async () => {
      const result = await updateUserRole({ user_id: user.id, role });
      if (!result.success) setError(result.error ?? "Error");
    });
  };

  return (
    <div>
      <select
        value={user.role}
        onChange={handleChange}
        disabled={isPending || isSelf}
        className="border border-border rounded px-2 py-1 text-xs bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        title={isSelf ? "No puedes cambiar tu propio rol" : undefined}
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      {error && <p className="text-[10px] text-error mt-0.5">{error}</p>}
    </div>
  );
}

function ActiveToggle({ user, currentUserId }: { user: UserProfile; currentUserId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isSelf = user.id === currentUserId;

  const handleToggle = () => {
    setError(null);
    startTransition(async () => {
      const result = await toggleUserActive({ user_id: user.id, is_active: !user.is_active });
      if (!result.success) setError(result.error ?? "Error");
    });
  };

  return (
    <div>
      <button
        onClick={handleToggle}
        disabled={isPending || isSelf}
        title={isSelf ? "No puedes desactivar tu propia cuenta" : user.is_active ? "Desactivar" : "Activar"}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
          user.is_active ? "bg-success" : "bg-border"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-secondary shadow transition-transform ${
            user.is_active ? "translate-x-4.5" : "translate-x-0.5"
          }`}
        />
      </button>
      {error && <p className="text-[10px] text-error mt-0.5">{error}</p>}
    </div>
  );
}

interface UsuariosClientProps {
  users: UserProfile[];
}

export function UsuariosClient({ users: initialUsers }: UsuariosClientProps) {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("todos");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");

  // Optimistic updates: reflect role/active changes from server revalidation
  // (revalidatePath handles this — no local state needed for the list itself)
  const users = initialUsers;

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    vendedores: users.filter((u) => u.role === "vendedor").length,
    clientes: users.filter((u) => u.role === "cliente").length,
    inactivos: users.filter((u) => !u.is_active).length,
  }), [users]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !search ||
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "todos" || u.role === roleFilter;
      const matchStatus =
        statusFilter === "todos" ||
        (statusFilter === "activo" ? u.is_active : !u.is_active);
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const currentUserId = currentUser?.id ?? "";

  return (
    <div className="space-y-5">
      {/* Header */}
      <h1 className="font-display text-2xl text-primary uppercase">Usuarios</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-secondary border border-border rounded p-3 text-center">
          <p className="text-2xl font-display text-primary">{stats.total}</p>
          <p className="text-xs text-gray-mid mt-0.5">Total</p>
        </div>
        <div className="bg-secondary border border-border rounded p-3 text-center">
          <p className="text-2xl font-display text-primary">{stats.admins}</p>
          <p className="text-xs text-gray-mid mt-0.5">Admins</p>
        </div>
        <div className="bg-secondary border border-border rounded p-3 text-center">
          <p className="text-2xl font-display text-primary">{stats.vendedores}</p>
          <p className="text-xs text-gray-mid mt-0.5">Vendedores</p>
        </div>
        <div className="bg-secondary border border-error/30 rounded p-3 text-center">
          <p className="text-2xl font-display text-error">{stats.inactivos}</p>
          <p className="text-xs text-gray-mid mt-0.5">Inactivos</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-mid pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre o correo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-border rounded text-sm bg-secondary text-primary placeholder-gray-mid focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          className="border border-border rounded px-3 py-2 text-sm bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="todos">Todos los roles</option>
          <option value="admin">Admin</option>
          <option value="vendedor">Vendedor</option>
          <option value="cliente">Cliente</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="border border-border rounded px-3 py-2 text-sm bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="todos">Activos e inactivos</option>
          <option value="activo">Solo activos</option>
          <option value="inactivo">Solo inactivos</option>
        </select>
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <EmptyState
          icon={Users}
          title="Sin resultados"
          description="Ningún usuario coincide con los filtros."
        />
      )}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <>
          <div className="hidden md:block bg-secondary border border-border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-light">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-mid uppercase tracking-wide">Usuario</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-mid uppercase tracking-wide">Correo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-mid uppercase tracking-wide">Rol</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-mid uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-mid uppercase tracking-wide">Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((u: UserProfile) => {
                  const isSelf = u.id === currentUserId;
                  const roleBadge = ROLE_BADGE[u.role];
                  return (
                    <tr key={u.id} className={`hover:bg-gray-light/50 transition-colors ${!u.is_active ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-light flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-gray-mid" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-primary truncate">
                              {u.full_name ?? "Sin nombre"}
                              {isSelf && (
                                <span className="ml-1.5 text-[10px] font-normal text-gray-mid">(tú)</span>
                              )}
                            </p>
                            {u.phone && <p className="text-xs text-gray-mid">{u.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-mid text-xs">{u.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                          <RoleSelect user={u} currentUserId={currentUserId} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ActiveToggle user={u} currentUserId={currentUserId} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-mid">{formatDate(u.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((u: UserProfile) => {
              const isSelf = u.id === currentUserId;
              const roleBadge = ROLE_BADGE[u.role];
              return (
                <div
                  key={u.id}
                  className={`bg-secondary border border-border rounded p-3 space-y-3 ${!u.is_active ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    {u.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-light flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-gray-mid" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-primary text-sm truncate">
                        {u.full_name ?? "Sin nombre"}
                        {isSelf && <span className="ml-1 text-[10px] text-gray-mid">(tú)</span>}
                      </p>
                      <p className="text-xs text-gray-mid truncate">{u.email ?? "—"}</p>
                    </div>
                    <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-mid">Rol:</span>
                      <RoleSelect user={u} currentUserId={currentUserId} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-mid">{u.is_active ? "Activo" : "Inactivo"}</span>
                      <ActiveToggle user={u} currentUserId={currentUserId} />
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-mid">Registrado: {formatDate(u.created_at)}</p>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-mid text-right">
            {filtered.length} {filtered.length === 1 ? "usuario" : "usuarios"}
          </p>
        </>
      )}
    </div>
  );
}
