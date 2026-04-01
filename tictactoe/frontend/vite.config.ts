import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0", // listen on all interfaces so LAN devices can connect
    port: 5173,
  },
});
