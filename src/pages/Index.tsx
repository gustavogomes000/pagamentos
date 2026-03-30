import Dashboard from "./Dashboard";
import { PageTransition } from "@/components/PageTransition";

export default function Index() {
  return (
    <PageTransition>
      <Dashboard />
    </PageTransition>
  );
}
