// Automatically use the same host the browser connected to.
// This means if player opens http://192.168.1.10:5173, API calls go to
// http://192.168.1.10:3001/api — no manual .env change needed.
const BASE: string =
  (import.meta as any).env?.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:3001/api`;

export function getToken(): string | null {
  return localStorage.getItem("token");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

export async function signUp(username: string, password: string) {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function signIn(username: string, password: string) {
  const res = await fetch(`${BASE}/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function createRoom(room_name: string) {
  const res = await fetch(`${BASE}/game/create`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ room_name }),
  });
  return res.json();
}

export async function listGames() {
  const res = await fetch(`${BASE}/game/list`, { headers: authHeaders() });
  return res.json();
}

export async function joinGame(id: number) {
  const res = await fetch(`${BASE}/game/join/${id}`, {
    method: "POST",
    headers: authHeaders(),
  });
  return res.json();
}

export async function getGame(id: number) {
  const res = await fetch(`${BASE}/game/${id}`, { headers: authHeaders() });
  return res.json();
}

export async function makeMove(id: number, position: number) {
  const res = await fetch(`${BASE}/game/move/${id}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ position }),
  });
  return res.json();
}
