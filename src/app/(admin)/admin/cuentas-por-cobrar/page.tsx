import { getCxC } from "./actions";
import { CxCList } from "./CxCList";

export default async function CxCPage() {
  const { accounts } = await getCxC();
  return <CxCList accounts={accounts} />;
}
