import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { pool } from "./db";

export const gameRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

function authenticate(req: Request, res: Response): any | null {
  const auth = req.headers.authorization;
  if (!auth) { res.status(401).json({ error: "No token" }); return null; }
  try {
    return jwt.verify(auth.split(" ")[1], JWT_SECRET) as any;
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return null;
  }
}

function checkWinner(board: string): string | null {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];
  for (const [a,b,c] of wins) {
    if (board[a] !== '-' && board[a] === board[b] && board[b] === board[c])
      return board[a];
  }
  if (!board.includes('-')) return 'D';
  return null;
}

// List open games — MUST be before /:id to avoid route conflict
gameRouter.get("/list", async (req: Request, res: Response) => {
  const user = authenticate(req, res);
  if (!user) return;
  const [rows]: any = await pool.execute(`
    SELECT g.id, ux.username as x_name, g.created_at
    FROM games g
    JOIN users ux ON g.player_x = ux.id
    WHERE g.status = 'waiting' AND g.player_x != ?
  `, [user.id]);
  res.json(rows);
});

// Create a new game
gameRouter.post("/create", async (req: Request, res: Response) => {
  const user = authenticate(req, res);
  if (!user) return;
  const [result]: any = await pool.execute(
    "INSERT INTO games (player_x) VALUES (?)", [user.id]
  );
  res.json({ gameId: result.insertId });
});

// Join an existing game
gameRouter.post("/join/:id", async (req: Request, res: Response) => {
  const user = authenticate(req, res);
  if (!user) return;
  const id = Number(req.params.id);
  const [rows]: any = await pool.execute("SELECT * FROM games WHERE id = ?", [id]);
  const game = rows[0];
  if (!game) return res.status(404).json({ error: "Game not found" });
  if (game.status !== 'waiting') return res.status(400).json({ error: "Game not available" });
  if (game.player_x === user.id) return res.status(400).json({ error: "Cannot join your own game" });

  await pool.execute(
    "UPDATE games SET player_o = ?, status = 'active' WHERE id = ?",
    [user.id, id]
  );
  res.json({ message: "Joined game", gameId: id });
});

// Make a move
gameRouter.post("/move/:id", async (req: Request, res: Response) => {
  const user = authenticate(req, res);
  if (!user) return;
  const id = Number(req.params.id);
  const position = Number(req.body.position);

  if (isNaN(position) || position < 0 || position > 8)
    return res.status(400).json({ error: "Invalid position" });

  const [rows]: any = await pool.execute("SELECT * FROM games WHERE id = ?", [id]);
  const game = rows[0];
  if (!game) return res.status(404).json({ error: "Game not found" });
  if (game.status !== 'active') return res.status(400).json({ error: "Game not active" });

  const isX = game.player_x === user.id;
  const isO = game.player_o === user.id;
  if (!isX && !isO) return res.status(403).json({ error: "Not a player in this game" });
  if ((game.current_turn === 'X' && !isX) || (game.current_turn === 'O' && !isO))
    return res.status(400).json({ error: "Not your turn" });
  if (game.board[position] !== '-')
    return res.status(400).json({ error: "Cell already taken" });

  const board = game.board.split('');
  board[position] = game.current_turn;
  const newBoard = board.join('');
  const winner = checkWinner(newBoard);
  const nextTurn = game.current_turn === 'X' ? 'O' : 'X';

  if (winner) {
    await pool.execute(
      "UPDATE games SET board = ?, winner = ?, status = 'finished' WHERE id = ?",
      [newBoard, winner, id]
    );
  } else {
    await pool.execute(
      "UPDATE games SET board = ?, current_turn = ? WHERE id = ?",
      [newBoard, nextTurn, id]
    );
  }

  res.json({ board: newBoard, winner: winner || null, currentTurn: winner ? null : nextTurn });
});

// Get game state — keep /:id last
gameRouter.get("/:id", async (req: Request, res: Response) => {
  const user = authenticate(req, res);
  if (!user) return;
  const id = Number(req.params.id);
  const [rows]: any = await pool.execute(`
    SELECT g.*, ux.username as x_name, uo.username as o_name
    FROM games g
    LEFT JOIN users ux ON g.player_x = ux.id
    LEFT JOIN users uo ON g.player_o = uo.id
    WHERE g.id = ?
  `, [id]);
  if (!rows[0]) return res.status(404).json({ error: "Game not found" });
  res.json(rows[0]);
});
