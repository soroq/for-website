import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const operatorApiProxyTarget =
  process.env.SOROQ_OPERATOR_API_PROXY_TARGET ||
  "https://soroq-hosted-surface.vercel.app";

export default defineConfig({
  root: "website",
  publicDir: "public",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "website/src"),
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "website/index.html"),
        quickstart: path.resolve(__dirname, "website/quickstart.html"),
        cli: path.resolve(__dirname, "website/cli.html"),
        "control-plane": path.resolve(__dirname, "website/control-plane.html"),
        compatibility: path.resolve(__dirname, "website/compatibility.html"),
        operator: path.resolve(__dirname, "website/operator.html"),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": {
        target: operatorApiProxyTarget,
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: {
    port: 4173,
    strictPort: false,
  },
});
