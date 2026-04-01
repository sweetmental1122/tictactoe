import { getGame, makeMove } from "../api";
import { Cell } from "./Cell";

export class GameBoard {
  private pollInterval: number | null = null;
  private userId = Number(localStorage.getItem("userId"));
  private container: HTMLElement | null = null;

  constructor(
    private gameId: number,
    private onBack: () => void
  ) {}

  render(container: HTMLElement) {
    this.container = container;
    container.innerHTML = `
      <div class="game-container">
        <div class="game-info">
          <span id="game-status">Loading...</span>
          <button id="back-btn">Back to Lobby</button>
        </div>
        <div id="board" class="board" role="grid" aria-label="TicTacToe board"></div>
        <p id="game-msg" class="error" role="alert"></p>
      </div>
    `;

    container.querySelector<HTMLButtonElement>("#back-btn")!
      .addEventListener("click", () => { this.stopPolling(); this.onBack(); });

    this.update();
    this.pollInterval = window.setInterval(() => this.update(), 2000);
  }

  private stopPolling() {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async update() {
    if (!this.container) return;
    const data = await getGame(this.gameId);

    // Container may have been replaced (e.g. user navigated away)
    const boardEl = this.container.querySelector<HTMLElement>("#board");
    const statusEl = this.container.querySelector<HTMLElement>("#game-status");
    const msgEl = this.container.querySelector<HTMLElement>("#game-msg");
    if (!boardEl || !statusEl || !msgEl) { this.stopPolling(); return; }

    const mySymbol = data.player_x === this.userId ? "X"
      : data.player_o === this.userId ? "O" : null;
    const isMyTurn = data.current_turn === mySymbol && data.status === "active";

    statusEl.textContent = this.buildStatusText(data, isMyTurn);
    if (data.status === "finished") this.stopPolling();

    this.renderBoard(boardEl, msgEl, data.board, isMyTurn);
  }

  private buildStatusText(data: any, isMyTurn: boolean): string {
    if (data.status === "waiting") return `Game #${this.gameId} — Waiting for opponent...`;
    if (data.status === "finished") {
      if (data.winner === "D") return "It's a draw!";
      const iWon =
        (data.winner === "X" && data.player_x === this.userId) ||
        (data.winner === "O" && data.player_o === this.userId);
      return iWon ? "You won!" : "You lost!";
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
          const result = await makeMove(this.gameId, i);
          if (result.error) {
            msgEl.textContent = result.error;
          } else {
            msgEl.textContent = "";
            this.update();
          }
        },
      });
      boardEl.appendChild(cell.getElement());
    });
  }
}
