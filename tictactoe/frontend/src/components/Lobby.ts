import { createRoom, listGames, joinGame } from "../api";

export class Lobby {
  private refreshTimer: number | null = null;

  constructor(private onGameStart: (roomId: number) => void) {}

  render(container: HTMLElement) {
    const username = localStorage.getItem("username");
    const initial = (username ?? "?")[0].toUpperCase();

    container.innerHTML = `
      <div class="lobby">

        <!-- Header -->
        <div class="lobby-header">
          <div class="lobby-brand">
            <span class="lobby-logo">✕○</span>
            <span class="lobby-title">TicTacToe</span>
          </div>
          <div class="lobby-user">
            <div class="avatar">${initial}</div>
            <span class="username-text">${username}</span>
            <button id="logout-btn" class="icon-btn" title="Logout">⏻</button>
          </div>
        </div>

        <!-- Create room -->
        <div class="create-room-card">
          <p class="card-label">Start a new game</p>
          <div class="create-room">
            <input id="room-name-input" type="text" placeholder="Enter room name..." maxlength="50" />
            <button id="create-btn">
              <span>＋</span> Create
            </button>
          </div>
          <p id="lobby-msg" class="error" role="alert"></p>
        </div>

        <!-- Active game re-entry -->
        <div id="active-room-section"></div>

        <!-- My waiting rooms -->
        <div id="my-rooms-section"></div>

        <!-- Other open rooms -->
        <div class="rooms-header">
          <span class="section-label">Open Rooms</span>
          <button id="refresh-btn" class="refresh-btn" title="Refresh">↻</button>
        </div>
        <ul id="open-rooms-list" aria-label="Open rooms"></ul>

      </div>
    `;

    container.querySelector<HTMLButtonElement>("#logout-btn")!
      .addEventListener("click", () => {
        this.stopRefresh();
        localStorage.clear();
        location.reload();
      });

    container.querySelector<HTMLButtonElement>("#create-btn")!
      .addEventListener("click", () => this.handleCreate(container));

    container.querySelector<HTMLInputElement>("#room-name-input")!
      .addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.handleCreate(container);
      });

    container.querySelector<HTMLButtonElement>("#refresh-btn")!
      .addEventListener("click", () => this.loadRooms(container));

    this.loadRooms(container);
    this.refreshTimer = window.setInterval(() => this.loadRooms(container), 3000);
  }

  private stopRefresh() {
    if (this.refreshTimer !== null) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private async handleCreate(container: HTMLElement) {
    const input = container.querySelector<HTMLInputElement>("#room-name-input")!;
    const msgEl = container.querySelector<HTMLElement>("#lobby-msg")!;
    const name = input.value.trim();
    if (!name) { msgEl.textContent = "Please enter a room name."; return; }
    msgEl.textContent = "";

    const data = await createRoom(name);
    if (data.error) { msgEl.textContent = data.error; return; }
    input.value = "";
    this.stopRefresh();
    this.onGameStart(data.roomId);
  }

  private async loadRooms(container: HTMLElement) {
    if (!document.body.contains(container)) { this.stopRefresh(); return; }

    const data = await listGames();
    if (!data || data.error) return;

    const { open, mine, active } = data as {
      open: any[];
      mine: any[];
      active: any | null;
    };

    this.renderActiveRoom(container, active);
    this.renderMyRooms(container, mine);
    this.renderOpenRooms(container, open);
  }

  private renderActiveRoom(container: HTMLElement, active: any | null) {
    const section = container.querySelector<HTMLElement>("#active-room-section")!;
    if (!active) { section.innerHTML = ""; return; }

    section.innerHTML = `
      <div class="section-label" style="margin-top:1.2rem">Your Active Game</div>
      <div class="room-card active-room">
        <div class="room-card-left">
          <span class="room-badge active">● Live</span>
          <div>
            <div class="room-card-name">${active.room_name}</div>
            <div class="room-card-meta">2 / 2 players</div>
          </div>
        </div>
        <button class="btn-primary" id="reenter-btn">Re-enter</button>
      </div>
    `;
    section.querySelector<HTMLButtonElement>("#reenter-btn")!
      .addEventListener("click", () => { this.stopRefresh(); this.onGameStart(active.id); });
  }

  private renderMyRooms(container: HTMLElement, mine: any[]) {
    const section = container.querySelector<HTMLElement>("#my-rooms-section")!;
    if (!mine || mine.length === 0) { section.innerHTML = ""; return; }

    section.innerHTML = `<div class="section-label" style="margin-top:1.2rem">Your Rooms</div>`;
    mine.forEach((r: any) => {
      const div = document.createElement("div");
      div.className = "room-card waiting-room";
      div.innerHTML = `
        <div class="room-card-left">
          <span class="room-badge waiting">◌ Waiting</span>
          <div>
            <div class="room-card-name">${r.room_name}</div>
            <div class="room-card-meta">1 / 2 — waiting for opponent</div>
          </div>
        </div>
        <button class="btn-secondary enter-my-room-btn">Enter</button>
      `;
      div.querySelector<HTMLButtonElement>(".enter-my-room-btn")!
        .addEventListener("click", () => { this.stopRefresh(); this.onGameStart(r.id); });
      section.appendChild(div);
    });
  }

  private renderOpenRooms(container: HTMLElement, open: any[]) {
    const list = container.querySelector<HTMLUListElement>("#open-rooms-list")!;
    list.innerHTML = "";

    if (!open || open.length === 0) {
      list.innerHTML = `<li class="empty-state">
        <span class="empty-icon">🎮</span>
        <span>No open rooms yet. Create one above!</span>
      </li>`;
      return;
    }

    open.forEach((r: any) => {
      const isFull = Number(r.player_count) >= 2;
      const li = document.createElement("li");
      li.className = `room-card open-room${isFull ? " room-full" : ""}`;
      li.innerHTML = `
        <div class="room-card-left">
          <div class="room-avatar">${r.room_name[0].toUpperCase()}</div>
          <div>
            <div class="room-card-name">${r.room_name}</div>
            <div class="room-card-meta">by ${r.host} · <span class="${isFull ? "full-text" : "open-text"}">${r.player_count}/2 players</span></div>
          </div>
        </div>
        <button class="btn-join" ${isFull ? "disabled" : ""}>
          ${isFull ? "Full" : "Join →"}
        </button>
      `;
      if (!isFull) {
        li.querySelector<HTMLButtonElement>(".btn-join")!
          .addEventListener("click", async () => {
            const msgEl = container.querySelector<HTMLElement>("#lobby-msg")!;
            msgEl.textContent = "";
            const data = await joinGame(r.id);
            if (data.error) { msgEl.textContent = data.error; return; }
            this.stopRefresh();
            this.onGameStart(r.id);
          });
      }
      list.appendChild(li);
    });
  }
}
