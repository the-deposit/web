import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MisPedidosClient } from "./MisPedidosClient";

export default async function MisPedidosPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?redirect=/tienda/mis-pedidos");
  }

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      id,
      status,
      delivery_method,
      address_id,
      subtotal,
      shipping_cost,
      total,
      notes_customer,
      customer_nit,
      estimated_delivery,
      created_at,
      updated_at,
      address:addresses(id, label, full_address),
      order_items(
        id,
        quantity,
        unit_price,
        subtotal,
        product_presentations(
          id,
          name,
          products(name, images)
        )
      )
    `)
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  return <MisPedidosClient orders={orders ?? []} />;
}
