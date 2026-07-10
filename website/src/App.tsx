import { OperatorConsolePage } from "@/console/OperatorConsolePage";
import { DocsHome } from "@/docs/docs";
import { MarketingHome, ProductPageRoute } from "@/marketing/components";
import { resolveRoute } from "@/routes";
import { useCanonicalHead } from "@/shared/head";

function App() {
  const route = resolveRoute(window.location.pathname, window.location.hostname);
  useCanonicalHead(route);

  if (route.kind === "console") {
    return <OperatorConsolePage />;
  }

  if (route.kind === "docs-home") {
    return <DocsHome />;
  }

  if (route.kind === "product") {
    return <ProductPageRoute page={route.page} />;
  }

  return <MarketingHome />;
}

export default App;
