import { createClient } from "@/lib/supabase/server";
import { UnidadesMedida } from "./UnidadesMedida";

export default async function ConfiguracionPage() {
  const supabase = await createClient();

  const { data: units } = await supabase
    .from("measurement_units")
    .select("*")
    .order("category")
    .order("name");

  return (
    <div>
      <h1 className="font-display text-2xl text-primary mb-6">Configuración</h1>

      {/* Tabs — only Unidades de Medida active in this phase */}
      <div className="border-b border-border mb-6">
        <div className="flex gap-1">
          <button className="px-4 py-2.5 text-sm font-body font-medium text-primary border-b-2 border-primary -mb-px">
            Unidades de Medida
          </button>
          <button className="px-4 py-2.5 text-sm font-body text-gray-mid cursor-not-allowed opacity-50" disabled>
            Impuestos
          </button>
          <button className="px-4 py-2.5 text-sm font-body text-gray-mid cursor-not-allowed opacity-50" disabled>
            Métodos de Pago
          </button>
        </div>
      </div>

      <UnidadesMedida units={units ?? []} />
    </div>
  );
}
