export interface GameState {
  Board: Array<"X" | "O" | null>;
  CurrentPlayer: string;
  Players: { [address: string]: "X" | "O" };
  State: "REGISTER" | "PLAY";
  Winner: string;
}
