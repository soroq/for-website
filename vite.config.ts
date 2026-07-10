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
        "cli-login": path.resolve(__dirname, "website/cli-login.html"),
        "what-is-soroq": path.resolve(__dirname, "website/what-is-soroq.html"),
        "before-you-begin": path.resolve(__dirname, "website/before-you-begin.html"),
        "getting-started": path.resolve(__dirname, "website/getting-started.html"),
        installation: path.resolve(__dirname, "website/installation.html"),
        authentication: path.resolve(__dirname, "website/authentication.html"),
        "soroq-yaml-reference": path.resolve(
          __dirname,
          "website/soroq-yaml-reference.html",
        ),
        "compatibility-limitations": path.resolve(
          __dirname,
          "website/compatibility-limitations.html",
        ),
        "security-model": path.resolve(__dirname, "website/security-model.html"),
        "product-status": path.resolve(__dirname, "website/product-status.html"),
        "android-quickstart": path.resolve(
          __dirname,
          "website/android-quickstart.html",
        ),
        "ios-quickstart": path.resolve(__dirname, "website/ios-quickstart.html"),
        troubleshooting: path.resolve(__dirname, "website/troubleshooting.html"),
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
