import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Em desenvolvimento, as chamadas /api vão para o servidor Express.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:3001" } },
  base: '/',
});
