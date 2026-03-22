"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Plus, Edit2, Trash2, MapPin, Star } from "lucide-react";
import { updateProfile, createProfileAddress, updateProfileAddress, deleteProfileAddress } from "./actions";
import type { Database } from "@/lib/supabase/types";

type Address = Database["public"]["Tables"]["addresses"]["Row"];

interface Profile {
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface MiPerfilClientProps {
  profile: Profile;
  addresses: Address[];
}

const emptyAddressForm = {
  label: "Casa",
  full_address: "",
  department: "",
  municipality: "",
  zone: "",
  reference: "",
  is_default: false,
};

export function MiPerfilClient({ profile, addresses: initialAddresses }: MiPerfilClientProps) {
  const [profileForm, setProfileForm] = useState({
    full_name: profile.full_name ?? "",
    phone: profile.phone ?? "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSaveProfile = async () => {
    setProfileLoading(true);
    setProfileError(null);
    const res = await updateProfile({
      full_name: profileForm.full_name,
      phone: profileForm.phone || null,
    });
    setProfileLoading(false);
    if (res.success) {
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } else {
      setProfileError(res.error ?? "Error al guardar");
    }
  };

  const openAddAddress = () => {
    setEditingAddress(null);
    setAddressForm(emptyAddressForm);
    setAddressError(null);
    setShowAddressModal(true);
  };

  const openEditAddress = (addr: Address) => {
    setEditingAddress(addr);
    setAddressForm({
      label: addr.label,
      full_address: addr.full_address,
      department: addr.department ?? "",
      municipality: addr.municipality ?? "",
      zone: addr.zone ?? "",
      reference: addr.reference ?? "",
      is_default: addr.is_default,
    });
    setAddressError(null);
    setShowAddressModal(true);
  };

  const handleSaveAddress = async () => {
    setAddressLoading(true);
    setAddressError(null);

    const data = {
      label: addressForm.label,
      full_address: addressForm.full_address,
      department: addressForm.department || null,
      municipality: addressForm.municipality || null,
      zone: addressForm.zone || null,
      reference: addressForm.reference || null,
      is_default: addressForm.is_default,
    };

    let res;
    if (editingAddress) {
      res = await updateProfileAddress(editingAddress.id, data);
    } else {
      res = await createProfileAddress(data);
    }

    setAddressLoading(false);

    if (res.success) {
      // Refresh addresses from server state by reloading
      window.location.reload();
    } else {
      setAddressError(res.error ?? "Error al guardar");
    }
  };

  const handleDeleteAddress = async (id: string) => {
    const res = await deleteProfileAddress(id);
    if (res.success) {
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    }
    setDeletingId(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <h1 className="font-display text-2xl md:text-3xl text-primary uppercase tracking-wide">
        Mi perfil
      </h1>

      {/* Profile data */}
      <div className="bg-secondary border border-border rounded p-5 space-y-4">
        <h2 className="font-display text-lg text-primary">Datos personales</h2>

        {profile.avatar_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt="Avatar"
            className="w-16 h-16 rounded-full object-cover border-2 border-border"
          />
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-mid font-body mb-1">Nombre completo</label>
            <Input
              value={profileForm.full_name}
              onChange={(e) => setProfileForm((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-mid font-body mb-1">Correo electrónico</label>
            <Input value={profile.email ?? ""} disabled className="opacity-60" />
          </div>
          <div>
            <label className="block text-xs text-gray-mid font-body mb-1">Teléfono / WhatsApp</label>
            <Input
              value={profileForm.phone}
              onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+502 xxxx-xxxx"
            />
          </div>
        </div>

        {profileError && <p className="text-sm text-error font-body">{profileError}</p>}
        {profileSuccess && <p className="text-sm text-success font-body">¡Perfil actualizado correctamente!</p>}

        <Button onClick={handleSaveProfile} loading={profileLoading}>
          Guardar cambios
        </Button>
      </div>

      {/* Addresses */}
      <div className="bg-secondary border border-border rounded p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-primary">Mis direcciones</h2>
          <Button size="sm" variant="secondary" onClick={openAddAddress}>
            <Plus className="w-4 h-4" />
            Agregar
          </Button>
        </div>

        {addresses.length === 0 ? (
          <p className="text-sm text-gray-mid font-body">No tienes direcciones guardadas.</p>
        ) : (
          <div className="space-y-2">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="flex items-start gap-3 p-3 border border-border rounded"
              >
                <MapPin className="w-4 h-4 text-gray-mid shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-body font-medium text-primary">{addr.label}</p>
                    {addr.is_default && (
                      <span className="flex items-center gap-1 text-xs text-warning font-body">
                        <Star className="w-3 h-3 fill-current" />
                        Principal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-mid font-body">{addr.full_address}</p>
                  {addr.reference && (
                    <p className="text-xs text-gray-mid font-body">{addr.reference}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openEditAddress(addr)}
                    className="p-1.5 text-gray-mid hover:text-primary transition-colors rounded hover:bg-gray-light"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingId(addr.id)}
                    className="p-1.5 text-gray-mid hover:text-error transition-colors rounded hover:bg-gray-light"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Address modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-primary/50 backdrop-blur-sm" onClick={() => setShowAddressModal(false)} />
          <div className="relative z-10 w-full md:max-w-lg bg-secondary rounded-t-2xl md:rounded-lg md:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-secondary border-b border-border p-4 flex items-center justify-between">
              <div className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-border" />
              <h3 className="font-display text-lg text-primary mt-2 md:mt-0">
                {editingAddress ? "Editar dirección" : "Nueva dirección"}
              </h3>
              <button onClick={() => setShowAddressModal(false)} className="text-gray-mid hover:text-primary">×</button>
            </div>
            <div className="p-4 space-y-3">
              <Input
                label="Etiqueta"
                value={addressForm.label}
                onChange={(e) => setAddressForm((p) => ({ ...p, label: e.target.value }))}
                placeholder="Casa, Oficina, etc."
              />
              <Input
                label="Dirección completa *"
                value={addressForm.full_address}
                onChange={(e) => setAddressForm((p) => ({ ...p, full_address: e.target.value }))}
                placeholder="Calle, número, colonia..."
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Departamento"
                  value={addressForm.department}
                  onChange={(e) => setAddressForm((p) => ({ ...p, department: e.target.value }))}
                  placeholder="Sacatepéquez"
                />
                <Input
                  label="Municipio"
                  value={addressForm.municipality}
                  onChange={(e) => setAddressForm((p) => ({ ...p, municipality: e.target.value }))}
                  placeholder="La Antigua Guatemala"
                />
              </div>
              <Input
                label="Referencia"
                value={addressForm.reference}
                onChange={(e) => setAddressForm((p) => ({ ...p, reference: e.target.value }))}
                placeholder="Casa azul, frente al parque..."
              />
              <label className="flex items-center gap-2 text-sm font-body text-primary cursor-pointer">
                <input
                  type="checkbox"
                  checked={addressForm.is_default}
                  onChange={(e) => setAddressForm((p) => ({ ...p, is_default: e.target.checked }))}
                  className="accent-primary"
                />
                Establecer como dirección principal
              </label>
              {addressError && <p className="text-sm text-error font-body">{addressError}</p>}
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveAddress} loading={addressLoading} className="flex-1">
                  Guardar dirección
                </Button>
                <Button variant="ghost" onClick={() => setShowAddressModal(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && handleDeleteAddress(deletingId)}
        title="Eliminar dirección"
        message="¿Eliminar esta dirección? No podrás usarla en futuros pedidos."
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  );
}
