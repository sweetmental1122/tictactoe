const BASE = "http://localhost:3001/api";

export function getToken(): string | null {
  return localStorage.getItem("token");
}

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
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

export async function createGame() {
  const res = await fetch(`${BASE}/game/create`, { method: "POST", headers: authHeaders() });
  return res.json();
}

export async function listGames() {
  const res = await fetch(`${BASE}/game/list`, { headers: authHeaders() });
  return res.json();
}

export async function joinGame(id: number) {
  const res = await fetch(`${BASE}/game/join/${id}`, { method: "POST", headers: authHeaders() });
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
