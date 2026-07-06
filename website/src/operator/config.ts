import {
  BarChart3,
  CircleGauge,
  LockKeyhole,
  RadioTower,
  RotateCcw,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";

import type { OperatorTabDefinition } from "./types";

export const operatorTabs: OperatorTabDefinition[] = [
  { key: "overview", label: "Overview", icon: CircleGauge },
  { key: "ownership", label: "Ownership", icon: LockKeyhole },
  { key: "developer", label: "Developer", icon: TerminalSquare },
  { key: "billing", label: "Billing", icon: BarChart3 },
  { key: "trust", label: "Trust", icon: ShieldCheck },
  { key: "patches", label: "Patches", icon: RadioTower },
  { key: "releases", label: "Releases", icon: TerminalSquare },
  { key: "health", label: "Health", icon: BarChart3 },
  { key: "rollback", label: "Rollback", icon: RotateCcw },
];
