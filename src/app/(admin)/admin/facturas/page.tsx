import { createClient } from "@/lib/supabase/server";
import { FacturasList } from "./FacturasList";

export default async function FacturasPage() {
  const supabase = await createClient();

  const { data: facturas } = await supabase
    .from("invoices")
    .select(`
      id,
      invoice_number,
      customer_name,
      customer_nit,
      subtotal,
      total,
      pdf_url,
      issued_at,
      sales(
        id,
        sale_type,
        payment_method,
        customer_name,
        sale_items(
          quantity,
          unit_price,
          subtotal,
          product_presentations(
            name,
            quantity_value,
            products(name),
            measurement_units(abbreviation)
          )
        )
      ),
      issuer:profiles(full_name)
    `)
    .order("issued_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl text-primary uppercase tracking-wide">Facturas</h1>
        <p className="text-sm text-gray-mid font-body mt-0.5">
          Historial de facturas generadas
        </p>
      </div>
      <FacturasList facturas={facturas ?? []} />
    </div>
  );
}
