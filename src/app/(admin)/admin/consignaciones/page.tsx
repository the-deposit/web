import { getConsignaciones } from "./actions";
import { ConsignacionesList } from "./ConsignacionesList";

export default async function ConsignacionesPage() {
  const { consignaciones } = await getConsignaciones();
  return <ConsignacionesList consignaciones={consignaciones} />;
}
