import { getEnvios, getPendingShipmentOrders } from "./actions";
import { EnviosList } from "./EnviosList";

export default async function EnviosPage() {
  const [{ shipments }, { orders }] = await Promise.all([
    getEnvios(),
    getPendingShipmentOrders(),
  ]);
  return <EnviosList shipments={shipments} pendingOrders={orders} />;
}
