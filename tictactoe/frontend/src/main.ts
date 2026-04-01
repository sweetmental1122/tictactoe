import { SignIn } from "./components/SignIn";
import { SignUp } from "./components/SignUp";
import { Lobby } from "./components/Lobby";
import { GameBoard } from "./components/GameBoard";

const app = document.getElementById("app")!;

function showSignIn() {
  const signIn = new SignIn(
    () => showLobby(),
    () => showSignUp()
  );
  signIn.render(app);
}

function showSignUp() {
  const signUp = new SignUp(() => showSignIn());
  signUp.render(app);
}

function showLobby() {
  const lobby = new Lobby((gameId) => showGame(gameId));
  lobby.render(app);
}

function showGame(gameId: number) {
  const board = new GameBoard(gameId, () => showLobby());
  board.render(app);
}

localStorage.getItem("token") ? showLobby() : showSignIn();
