import "dotenv/config";
import express from "express";
import cors from "cors";
import { initDB } from "./db";
import { authRouter } from "./auth";
import { gameRouter } from "./game";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/game", gameRouter);

const PORT = process.env.PORT || 3001;

initDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error("DB init failed:", err);
  process.exit(1);
});
