import { signIn } from "../api";

export class SignIn {
  constructor(
    private onSuccess: () => void,
    private onSwitchToSignUp: () => void
  ) {}

  render(container: HTMLElement) {
    container.innerHTML = `
      <div class="auth-container">
        <h1>TicTacToe</h1>
        <div class="tabs">
          <button id="tab-signin" class="tab active">Sign In</button>
          <button id="tab-signup" class="tab">Sign Up</button>
        </div>
        <form id="signin-form">
          <input id="username" type="text" placeholder="Username" required autocomplete="username" />
          <input id="password" type="password" placeholder="Password" required autocomplete="current-password" />
          <button type="submit">Sign In</button>
          <p id="signin-error" class="error" role="alert"></p>
        </form>
      </div>
    `;

    container.querySelector<HTMLButtonElement>("#tab-signup")!
      .addEventListener("click", () => this.onSwitchToSignUp());

    container.querySelector<HTMLFormElement>("#signin-form")!
      .addEventListener("submit", async (e: SubmitEvent) => {
        e.preventDefault();
        const username = container.querySelector<HTMLInputElement>("#username")!.value.trim();
        const password = container.querySelector<HTMLInputElement>("#password")!.value;
        const errEl = container.querySelector<HTMLElement>("#signin-error")!;
        errEl.textContent = "";

        const data = await signIn(username, password);
        if (data.error) { errEl.textContent = data.error; return; }

        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username);
        localStorage.setItem("userId", String(data.id));
        this.onSuccess();
      });
  }
}
