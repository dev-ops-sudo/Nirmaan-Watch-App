import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "next/link": path.resolve(__dirname, "./lib/link.tsx"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
