import { signUp } from "../api";

export class SignUp {
  constructor(private onSwitchToSignIn: () => void) {}

  render(container: HTMLElement) {
    container.innerHTML = `
      <div class="auth-container">
        <h1>TicTacToe</h1>
        <div class="tabs">
          <button id="tab-signin" class="tab">Sign In</button>
          <button id="tab-signup" class="tab active">Sign Up</button>
        </div>
        <form id="signup-form">
          <input id="username" type="text" placeholder="Username" required autocomplete="username" />
          <input id="password" type="password" placeholder="Password" required autocomplete="new-password" />
          <button type="submit">Sign Up</button>
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

        msgEl.style.color = "green";
        msgEl.textContent = "Account created! Please sign in.";
        setTimeout(() => this.onSwitchToSignIn(), 1200);
      });
  }
}
