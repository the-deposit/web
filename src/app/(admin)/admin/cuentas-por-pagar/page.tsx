import { getCxP } from "./actions";
import { CxPList } from "./CxPList";

export default async function CxPPage() {
  const { accounts } = await getCxP();
  return <CxPList accounts={accounts} />;
}
