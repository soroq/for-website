import { OperatorConsolePage } from "@/console/OperatorConsolePage";
import { MarketingHome, ProductPageRoute } from "@/marketing/components";
import { resolveRoute } from "@/routes";

function App() {
  const route = resolveRoute(window.location.pathname);

  if (route.kind === "console") {
    return <OperatorConsolePage />;
  }

  if (route.kind === "product") {
    return <ProductPageRoute page={route.page} />;
  }

  return <MarketingHome />;
}

export default App;
