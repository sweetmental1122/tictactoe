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

// List ALL rooms with player count — must be before /:id
gameRouter.get("/list", async (req: Request, res: Response) => {
  const user = authenticate(req, res);
  if (!user) return;
  const uid = Number(user.id);

  const [open]: any = await pool.execute(`
    SELECT r.id, r.room_name, ux.username AS host, r.created_at,
           IF(r.player_o IS NULL, 1, 2) AS player_count
    FROM game_rooms r
    JOIN users ux ON r.player_x = ux.id
    WHERE r.status = 'waiting' AND r.player_x != ?
  `, [uid]);

  const [mine]: any = await pool.execute(`
    SELECT r.id, r.room_name, ux.username AS host, r.created_at,
           IF(r.player_o IS NULL, 1, 2) AS player_count
    FROM game_rooms r
    JOIN users ux ON r.player_x = ux.id
    WHERE r.status = 'waiting' AND r.player_x = ?
  `, [uid]);

  const [active]: any = await pool.execute(`
    SELECT r.id, r.room_name, ux.username AS host, r.created_at,
           2 AS player_count
    FROM game_rooms r
    JOIN users ux ON r.player_x = ux.id
    WHERE r.status = 'active' AND (r.player_x = ? OR r.player_o = ?)
  `, [uid, uid]);

  res.json({ open, mine: mine || [], active: active[0] || null });
});

// Create a room
gameRouter.post("/create", async (req: Request, res: Response) => {
  const user = authenticate(req, res);
  if (!user) return;
  const { room_name } = req.body;
  if (!room_name || !String(room_name).trim())
    return res.status(400).json({ error: "Room name is required" });

  const [result]: any = await pool.execute(
    "INSERT INTO game_rooms (room_name, player_x) VALUES (?, ?)",
    [String(room_name).trim(), Number(user.id)]
  );
  res.status(201).json({ roomId: result.insertId, room_name: String(room_name).trim() });
});

// Join a room
gameRouter.post("/join/:id", async (req: Request, res: Response) => {
  const user = authenticate(req, res);
  if (!user) return;
  const roomId = Number(req.params.id);

  const [rows]: any = await pool.execute("SELECT * FROM game_rooms WHERE id = ?", [roomId]);
  const room = rows[0];
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.status !== 'waiting') return res.status(400).json({ error: "Room is full or already finished" });
  if (Number(room.player_x) === Number(user.id))
    return res.status(400).json({ error: "Cannot join your own room" });

  await pool.execute(
    "UPDATE game_rooms SET player_o = ?, status = 'active' WHERE id = ?",
    [Number(user.id), roomId]
  );
  res.json({ message: "Joined room", roomId });
});

// Make a move
gameRouter.post("/move/:id", async (req: Request, res: Response) => {
  const user = authenticate(req, res);
  if (!user) return;
  const roomId = Number(req.params.id);
  const position = Number(req.body.position);

  if (isNaN(position) || position < 0 || position > 8)
    return res.status(400).json({ error: "Invalid position (must be 0–8)" });

  const [rows]: any = await pool.execute("SELECT * FROM game_rooms WHERE id = ?", [roomId]);
  const room = rows[0];
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.status !== 'active') return res.status(400).json({ error: "Game is not active — need 2 players" });

  const board: string = room.board.toString();
  const userId = Number(user.id);
  const isX = Number(room.player_x) === userId;
  const isO = Number(room.player_o) === userId;

  if (!isX && !isO) return res.status(403).json({ error: "You are not a player in this room" });
  if ((room.current_turn === 'X' && !isX) || (room.current_turn === 'O' && !isO))
    return res.status(400).json({ error: "Not your turn" });
  if (board[position] !== '-')
    return res.status(400).json({ error: "Cell already taken" });

  const cells = board.split('');
  cells[position] = room.current_turn;
  const newBoard = cells.join('');
  const winner = checkWinner(newBoard);
  const nextTurn = room.current_turn === 'X' ? 'O' : 'X';

  if (winner) {
    await pool.execute(
      "UPDATE game_rooms SET board = ?, winner = ?, status = 'finished' WHERE id = ?",
      [newBoard, winner, roomId]
    );
  } else {
    await pool.execute(
      "UPDATE game_rooms SET board = ?, current_turn = ? WHERE id = ?",
      [newBoard, nextTurn, roomId]
    );
  }

  res.json({ board: newBoard, winner: winner || null, currentTurn: winner ? null : nextTurn });
});

// Get room state — keep /:id last
gameRouter.get("/:id", async (req: Request, res: Response) => {
  const user = authenticate(req, res);
  if (!user) return;
  const roomId = Number(req.params.id);
  const [rows]: any = await pool.execute(`
    SELECT
      r.id, r.room_name,
      r.player_x, r.player_o,
      r.board, r.current_turn,
      r.winner, r.status, r.created_at,
      ux.username AS x_name,
      uo.username AS o_name
    FROM game_rooms r
    LEFT JOIN users ux ON r.player_x = ux.id
    LEFT JOIN users uo ON r.player_o = uo.id
    WHERE r.id = ?
  `, [roomId]);
  if (!rows[0]) return res.status(404).json({ error: "Room not found" });

  const room = rows[0];
  // Normalize types so frontend comparisons are reliable
  res.json({
    ...room,
    player_x: Number(room.player_x),
    player_o: room.player_o !== null ? Number(room.player_o) : null,
    board: room.board.toString(),
  });
});
