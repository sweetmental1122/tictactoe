import "dotenv/config";
import express from "express";
import cors from "cors";
import os from "os";
import { initDB } from "./db";
import { authRouter } from "./auth";
import { gameRouter } from "./game";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/game", gameRouter);

const PORT = Number(process.env.PORT) || 3001;

function getLanIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "localhost";
}

initDB()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      const lan = getLanIP();
      console.log(`Server running:`);
      console.log(`  Local : http://localhost:${PORT}`);
      console.log(`  LAN   : http://${lan}:${PORT}`);
      console.log(`Share the LAN address with other players.`);
    });
  })
  .catch((err) => {
    console.error("DB init failed:", err);
    process.exit(1);
  });
