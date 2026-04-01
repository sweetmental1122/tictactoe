import { createGame, listGames, joinGame } from "../api";

export class Lobby {
  constructor(private onGameStart: (gameId: number) => void) {}

  render(container: HTMLElement) {
    const username = localStorage.getItem("username");
    container.innerHTML = `
      <div class="lobby">
        <div class="lobby-header">
          <h2>Welcome, ${username}</h2>
          <button id="logout-btn">Logout</button>
        </div>
        <button id="create-btn">Create New Game</button>
        <h3>Open Games</h3>
        <ul id="game-list" aria-label="Available games"></ul>
        <p id="lobby-msg" class="error" role="alert"></p>
      </div>
    `;

    container.querySelector<HTMLButtonElement>("#logout-btn")!
      .addEventListener("click", () => { localStorage.clear(); location.reload(); });

    container.querySelector<HTMLButtonElement>("#create-btn")!
      .addEventListener("click", async () => {
        const data = await createGame();
        if (data.gameId) this.onGameStart(data.gameId);
      });

    this.loadGames(container);
  }

  private async loadGames(container: HTMLElement) {
    const list = container.querySelector<HTMLUListElement>("#game-list")!;
    const games = await listGames();

    if (!Array.isArray(games) || games.length === 0) {
      list.innerHTML = "<li class='empty-msg'>No open games. Create one!</li>";
      return;
    }

    list.innerHTML = "";
    games.forEach((g: any) => {
      const li = document.createElement("li");
      li.innerHTML = `
        Game #${g.id} by <strong>${g.x_name}</strong>
        <button class="join-btn" aria-label="Join game ${g.id}">Join</button>
      `;
      li.querySelector<HTMLButtonElement>(".join-btn")!
        .addEventListener("click", async () => {
          const data = await joinGame(g.id);
          if (data.error) {
            container.querySelector<HTMLElement>("#lobby-msg")!.textContent = data.error;
          } else {
            this.onGameStart(g.id);
          }
        });
      list.appendChild(li);
    });
  }
}
