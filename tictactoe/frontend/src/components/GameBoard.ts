import { getGame, makeMove } from "../api";
import { Cell } from "./Cell";

interface RoomData {
  id: number;
  room_name: string;
  player_x: number;
  player_o: number | null;
  board: string;
  current_turn: "X" | "O";
  winner: string | null;
  status: "waiting" | "active" | "finished";
  x_name: string;
  o_name: string | null;
}

export class GameBoard {
  private pollInterval: number | null = null;
  private container: HTMLElement | null = null;
  private updating = false;
  private lastBoard = "";

  private get userId(): number {
    return Number(localStorage.getItem("userId"));
  }

  constructor(
    private roomId: number,
    private onBack: () => void
  ) {}

  render(container: HTMLElement) {
    this.container = container;
    container.innerHTML = `
      <div class="game-container">
        <div class="game-info">
          <span id="game-status">Loading...</span>
          <button id="back-btn">← Back</button>
        </div>
        <div class="player-labels" id="player-labels"></div>
        <div id="board" class="board" role="grid" aria-label="TicTacToe board"></div>
        <p id="game-msg" class="error" role="alert"></p>
      </div>
    `;

    container.querySelector<HTMLButtonElement>("#back-btn")!
      .addEventListener("click", () => { this.stopPolling(); this.onBack(); });

    this.update();
    this.pollInterval = window.setInterval(() => this.update(), 1500);
  }

  private stopPolling() {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async update() {
    if (!this.container || this.updating) return;
    this.updating = true;

    try {
      const data: RoomData = await getGame(this.roomId);
      if ((data as any).error) {
        const statusEl = this.container.querySelector<HTMLElement>("#game-status");
        if (statusEl) statusEl.textContent = `Error: ${(data as any).error}`;
        return;
      }
      this.applyData(data);
    } finally {
      this.updating = false;
    }
  }

  private applyData(data: RoomData) {
    if (!this.container) return;

    const boardEl   = this.container.querySelector<HTMLElement>("#board")!;
    const statusEl  = this.container.querySelector<HTMLElement>("#game-status")!;
    const msgEl     = this.container.querySelector<HTMLElement>("#game-msg")!;
    const labelsEl  = this.container.querySelector<HTMLElement>("#player-labels")!;

    const uid      = this.userId;
    const playerX  = Number(data.player_x);
    const playerO  = data.player_o !== null ? Number(data.player_o) : null;
    const mySymbol: "X" | "O" | null =
      playerX === uid ? "X" : playerO === uid ? "O" : null;
    const isMyTurn =
      mySymbol !== null &&
      data.status === "active" &&
      data.current_turn === mySymbol;

    statusEl.textContent = this.buildStatus(data, playerX, playerO, uid, isMyTurn);

    if (data.status !== "waiting") {
      labelsEl.innerHTML = `
        <span class="plabel x ${data.current_turn === "X" && data.status === "active" ? "active-turn" : ""}">
          ✕ ${data.x_name}${playerX === uid ? " (you)" : ""}
        </span>
        <span class="plabel o ${data.current_turn === "O" && data.status === "active" ? "active-turn" : ""}">
          ○ ${data.o_name ?? "?"}${playerO === uid ? " (you)" : ""}
        </span>
      `;
    } else {
      labelsEl.innerHTML = "";
    }

    if (data.status === "finished") {
      this.stopPolling();
      this.renderBoard(boardEl, msgEl, data.board, false);
      return;
    }

    if (data.board !== this.lastBoard) {
      this.lastBoard = data.board;
      this.renderBoard(boardEl, msgEl, data.board, isMyTurn);
    } else if (isMyTurn !== this.isBoardInteractive(boardEl)) {
      this.renderBoard(boardEl, msgEl, data.board, isMyTurn);
    }
  }

  private isBoardInteractive(boardEl: HTMLElement): boolean {
    const first = boardEl.querySelector<HTMLButtonElement>(".cell:not(.taken)");
    return first ? !first.disabled : false;
  }

  private buildStatus(
    data: RoomData,
    playerX: number,
    playerO: number | null,
    uid: number,
    isMyTurn: boolean
  ): string {
    const name = data.room_name ? `"${data.room_name}"` : `#${this.roomId}`;
    if (data.status === "waiting")
      return `Room ${name} — Waiting for opponent to join...`;
    if (data.status === "finished") {
      if (data.winner === "D") return "Draw! Well played.";
      const iWon =
        (data.winner === "X" && playerX === uid) ||
        (data.winner === "O" && playerO === uid);
      return iWon ? "You won! 🎉" : "You lost!";
    }
    return isMyTurn
      ? "Your turn!"
      : `Waiting for ${data.current_turn === "X" ? data.x_name : data.o_name}...`;
  }

  private renderBoard(
    boardEl: HTMLElement,
    msgEl: HTMLElement,
    board: string,
    isMyTurn: boolean
  ) {
    boardEl.innerHTML = "";
    board.split("").forEach((value, index) => {
      const cell = new Cell({
        value,
        index,
        disabled: !isMyTurn || value !== "-",
        onClick: async (i) => {
          boardEl.querySelectorAll<HTMLButtonElement>("button")
            .forEach(b => (b.disabled = true));
          msgEl.textContent = "";

          const result = await makeMove(this.roomId, i);
          if (result.error) {
            msgEl.textContent = result.error;
            await this.update();
          } else {
            const updated: RoomData = await getGame(this.roomId);
            if (!(updated as any).error) {
              this.lastBoard = "";
              this.applyData(updated);
            }
          }
        },
      });
      boardEl.appendChild(cell.getElement());
    });
  }
}
