import { getCompras } from "./actions";
import { ComprasList } from "./ComprasList";

export default async function ComprasPage() {
  const { purchases } = await getCompras();
  return <ComprasList purchases={purchases} />;
}
