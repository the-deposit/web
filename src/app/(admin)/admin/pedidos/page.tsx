import { getOrders } from "./actions";
import { PedidosList } from "./PedidosList";

export default async function PedidosPage() {
  const { orders } = await getOrders();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl text-primary uppercase tracking-wide">Pedidos</h1>
        <p className="text-sm text-gray-mid font-body mt-0.5">
          Gestiona los pedidos de la tienda en línea
        </p>
      </div>
      <PedidosList orders={orders} />
    </div>
  );
}
