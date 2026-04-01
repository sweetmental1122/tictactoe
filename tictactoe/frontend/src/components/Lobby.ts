import { createRoom, listGames, joinGame } from "../api";

export class Lobby {
  private refreshTimer: number | null = null;

  constructor(private onGameStart: (roomId: number) => void) {}

  render(container: HTMLElement) {
    const username = localStorage.getItem("username");
    container.innerHTML = `
      <div class="lobby">
        <div class="lobby-header">
          <h2>Welcome, ${username}</h2>
          <button id="logout-btn">Logout</button>
        </div>

        <!-- Always visible: create a new room -->
        <div class="create-room">
          <input id="room-name-input" type="text" placeholder="Room name..." maxlength="50" />
          <button id="create-btn">Create Room</button>
        </div>

        <!-- Active game re-entry -->
        <div id="active-room-section"></div>

        <!-- My waiting rooms -->
        <div id="my-rooms-section"></div>

        <!-- Other open rooms -->
        <h3>Open Rooms <button id="refresh-btn" class="refresh-btn" title="Refresh">↻</button></h3>
        <ul id="open-rooms-list" aria-label="Open rooms"></ul>

        <p id="lobby-msg" class="error" role="alert"></p>
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
      <div class="section-label">Your Active Game</div>
      <div class="my-room active-room">
        <div class="my-room-info">
          <span class="room-badge active">● Active</span>
          <strong>${active.room_name}</strong>
          <small>2/2 players</small>
        </div>
        <button class="enter-btn" id="reenter-btn">Re-enter Game</button>
      </div>
    `;
    section.querySelector<HTMLButtonElement>("#reenter-btn")!
      .addEventListener("click", () => { this.stopRefresh(); this.onGameStart(active.id); });
  }

  private renderMyRooms(container: HTMLElement, mine: any[]) {
    const section = container.querySelector<HTMLElement>("#my-rooms-section")!;
    if (!mine || mine.length === 0) { section.innerHTML = ""; return; }

    section.innerHTML = `<div class="section-label">Your Rooms</div>`;
    mine.forEach((r: any) => {
      const div = document.createElement("div");
      div.className = "my-room waiting-room";
      div.innerHTML = `
        <div class="my-room-info">
          <span class="room-badge waiting">◌ Waiting</span>
          <strong>${r.room_name}</strong>
          <small>1/2 — waiting for opponent</small>
        </div>
        <button class="enter-btn enter-my-room-btn">Enter</button>
      `;
      div.querySelector<HTMLButtonElement>(".enter-my-room-btn")!
        .addEventListener("click", () => { this.stopRefresh(); this.onGameStart(r.id); });
      section.appendChild(div);
    });
  }

  private renderOpenRooms(container: HTMLElement, open: any[]) {
    const list = container.querySelector<HTMLUListElement>("#open-rooms-list")!;

    list.innerHTML = "";
    open.forEach((r: any) => {
      const isFull = Number(r.player_count) >= 2;
      const li = document.createElement("li");
      li.className = isFull ? "room-full" : "";
      li.innerHTML = `
        <span>
          <strong>${r.room_name}</strong>
          <small>by ${r.host}</small>
          <span class="player-count">${r.player_count}/2</span>
        </span>
        <button class="join-btn" ${isFull ? "disabled" : ""}>
          ${isFull ? "Full" : "Join"}
        </button>
      `;
      if (!isFull) {
        li.querySelector<HTMLButtonElement>(".join-btn")!
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
