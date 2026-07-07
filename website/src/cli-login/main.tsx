import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { CliLogin } from "./CliLogin";
import "../index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CliLogin />
  </StrictMode>,
);
