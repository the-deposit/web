"use server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendShipmentUpdate } from "@/lib/email";

async function checkSellerRole(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "vendedor"].includes(profile.role)) throw new Error("Sin permisos");
  return user;
}

export async function getEnvios(filters?: { status?: string; shipment_type?: string }) {
  const supabase: SupabaseClient = await createClient();
  await checkSellerRole(supabase);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("shipments")
    .select(`
      id, shipment_type, carrier_name, tracking_number, status,
      shipped_at, delivered_at, shipping_cost, notes, created_at,
      order:orders(
        id, delivery_method,
        customer:profiles(id, full_name, email, phone),
        address:addresses(label, full_address, department, municipality)
      ),
      sale:sales(id, customer_name, sale_type)
    `)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.shipment_type && filters.shipment_type !== "all") {
    query = query.eq("shipment_type", filters.shipment_type);
  }

  const { data, error } = await query.limit(200);
  if (error) return { shipments: [], error: error.message };
  return { shipments: data ?? [], error: null };
}

const CreateShipmentSchema = z.object({
  order_id: z.string().uuid().optional().nullable(),
  sale_id: z.string().uuid().optional().nullable(),
  shipment_type: z.enum(["repartidor_propio", "empresa_tercera"]),
  carrier_name: z.string().min(1),
  tracking_number: z.string().optional().nullable(),
  shipping_cost: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

export async function createEnvio(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  await checkSellerRole(supabase);

  const parsed = CreateShipmentSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { order_id, sale_id, shipment_type, carrier_name, tracking_number, shipping_cost, notes } = parsed.data;

  if (!order_id && !sale_id) return { success: false, error: "Debe asociar a un pedido o venta." };

  const { data: shipment, error } = await supabase.from("shipments").insert({
    order_id: order_id ?? null,
    sale_id: sale_id ?? null,
    shipment_type,
    carrier_name,
    tracking_number: tracking_number ?? null,
    shipping_cost,
    notes: notes ?? null,
    status: "preparando",
  }).select("id").single();

  if (error || !shipment) return { success: false, error: error?.message ?? "Error al crear envío." };

  revalidatePath("/admin/envios");
  revalidatePath("/admin/pedidos");
  return { success: true, shipmentId: shipment.id };
}

const UpdateStatusSchema = z.object({
  shipment_id: z.string().uuid(),
  status: z.enum(["preparando", "en_camino", "entregado", "devuelto"]),
  tracking_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function updateEnvioStatus(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  await checkSellerRole(supabase);

  const parsed = UpdateStatusSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { shipment_id, status, tracking_number, notes } = parsed.data;

  const updateData: Record<string, unknown> = { status };
  if (tracking_number !== undefined) updateData.tracking_number = tracking_number;
  if (notes !== undefined) updateData.notes = notes;
  if (status === "en_camino") updateData.shipped_at = new Date().toISOString();
  if (status === "entregado") updateData.delivered_at = new Date().toISOString();

  const { error } = await supabase
    .from("shipments")
    .update(updateData)
    .eq("id", shipment_id);

  if (error) return { success: false, error: error.message };

  // Sync order status and send email when shipped or delivered
  if (status === "en_camino" || status === "entregado") {
    try {
      const { data: shipment } = await supabase
        .from("shipments")
        .select(`
          order_id, carrier_name, tracking_number,
          order:orders(
            id, status,
            customer:profiles(full_name, email)
          )
        `)
        .eq("id", shipment_id)
        .single();

      // Sync order status: en_camino → enviado, entregado → entregado
      if (shipment?.order_id && shipment?.order) {
        const orderStatus = status === "en_camino" ? "enviado" : "entregado";
        const currentOrderStatus = shipment.order.status;
        // Only advance if not already at or past this status
        const shouldUpdate = status === "en_camino"
          ? !["enviado", "entregado", "cancelado", "recogido"].includes(currentOrderStatus)
          : !["entregado", "cancelado", "recogido"].includes(currentOrderStatus);
        if (shouldUpdate) {
          await supabase
            .from("orders")
            .update({ status: orderStatus })
            .eq("id", shipment.order_id);
        }
      }

      if (shipment?.order?.customer?.email) {
        await sendShipmentUpdate({
          customerName: shipment.order.customer.full_name ?? "Cliente",
          customerEmail: shipment.order.customer.email,
          orderId: shipment.order.id,
          status,
          carrierName: shipment.carrier_name,
          trackingNumber: tracking_number ?? shipment.tracking_number ?? null,
        });
      }
    } catch (err) {
      console.error("Error sending shipment email:", err);
    }
  }

  revalidatePath("/admin/envios");
  revalidatePath("/admin/pedidos");
  revalidatePath("/tienda/mis-pedidos");
  return { success: true };
}

// Fetch orders with envio delivery_method that don't have a shipment yet
export async function getPendingShipmentOrders() {
  const supabase: SupabaseClient = await createClient();
  await checkSellerRole(supabase);

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id, status, created_at,
      customer:profiles(id, full_name, phone),
      address:addresses(label, full_address, department, municipality)
    `)
    .eq("delivery_method", "envio")
    .in("status", ["confirmado", "en_preparacion", "enviado"])
    .is("converted_sale_id", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return { orders: [] };
  return { orders: data ?? [] };
}
