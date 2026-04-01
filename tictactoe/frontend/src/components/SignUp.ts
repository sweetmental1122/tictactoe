import { signUp } from "../api";

export class SignUp {
  constructor(private onSwitchToSignIn: () => void) {}

  render(container: HTMLElement) {
    container.innerHTML = `
      <div class="auth-container">
        <h1>TicTacToe</h1>
        <p class="subtitle">Create an account</p>
        <div class="tabs">
          <button id="tab-signin" class="tab">Sign In</button>
          <button id="tab-signup" class="tab active">Sign Up</button>
        </div>
        <form id="signup-form" novalidate>
          <div class="input-group">
            <label for="username">Username</label>
            <input id="username" type="text" placeholder="Choose a username" required autocomplete="username" />
          </div>
          <div class="input-group">
            <label for="password">Password</label>
            <input id="password" type="password" placeholder="Choose a password" required autocomplete="new-password" />
          </div>
          <button type="submit">Create Account</button>
          <p id="signup-msg" class="error" role="alert"></p>
        </form>
      </div>
    `;

    container.querySelector<HTMLButtonElement>("#tab-signin")!
      .addEventListener("click", () => this.onSwitchToSignIn());

    container.querySelector<HTMLFormElement>("#signup-form")!
      .addEventListener("submit", async (e: SubmitEvent) => {
        e.preventDefault();
        const username = container.querySelector<HTMLInputElement>("#username")!.value.trim();
        const password = container.querySelector<HTMLInputElement>("#password")!.value;
        const msgEl = container.querySelector<HTMLElement>("#signup-msg")!;
        msgEl.style.color = "#e94560";
        msgEl.textContent = "";

        const data = await signUp(username, password);
        if (data.error) { msgEl.textContent = data.error; return; }

        msgEl.style.color = "#4ade80";
        msgEl.textContent = "Account created! Signing you in...";
        setTimeout(() => this.onSwitchToSignIn(), 1200);
      });
  }
}
