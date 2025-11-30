export enum GameStatus {
  IDLE = "IDLE",
  WAITING_FOR_PLAYER = "WAITING_FOR_PLAYER",
  ENCRYPTING = "ENCRYPTING",
  SUBMITTED = "SUBMITTED",
  BOTH_SUBMITTED = "BOTH_SUBMITTED",
  REVEALING = "REVEALING",
  REVEALED = "REVEALED"
}

export enum Move {
  ROCK = "ROCK",
  PAPER = "PAPER",
  SCISSORS = "SCISSORS"
}

export enum GameResult {
  WIN = "WIN",
  LOSS = "LOSS",
  DRAW = "DRAW"
}

export interface GameHistoryItem {
  id: number;
  playerMove: Move;
  opponentMove: Move;
  result: GameResult;
  timestamp: number;
}

export interface Stats {
  total: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface EncryptionState {
  status: 'unencrypted' | 'encrypting' | 'encrypted' | 'decrypted';
  hash?: string;
}