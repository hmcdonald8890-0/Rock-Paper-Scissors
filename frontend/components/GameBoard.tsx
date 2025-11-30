import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Circle, Hand, Scissors, Lock, Unlock, Loader2, ShieldCheck, Swords, RotateCcw, AlertCircle, CheckCircle } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, CardFooter, Badge, Alert, AlertTitle, AlertDescription } from "./ui/Primitives";
import { GameStatus, Move, GameResult, EncryptionState } from "../types";
import { cn } from "../lib/utils";

interface GameBoardProps {
  status: GameStatus;
  encryption: EncryptionState;
  onMoveSelect: (move: Move) => void;
  onReset: () => void;
  playerMove: Move | null;
  opponentMove: Move | null;
  result: GameResult | null;
}

const MoveIcon = ({ move, className }: { move: Move; className?: string }) => {
  switch (move) {
    case Move.ROCK:
      return <Circle className={cn("fill-current", className)} />;
    case Move.PAPER:
      return <Hand className={cn("fill-current", className)} />;
    case Move.SCISSORS:
      return <Scissors className={cn("fill-current", className)} />;
    default:
      return null;
  }
};

export const GameBoard: React.FC<GameBoardProps> = ({
  status,
  encryption,
  onMoveSelect,
  onReset,
  playerMove,
  opponentMove,
  result,
}) => {
  // Local state for countdowns or visual delays can be added here if needed

  const isSelectionDisabled = status !== GameStatus.WAITING_FOR_PLAYER;

  return (
    <div className="relative w-full max-w-2xl">
      {/* Encryption Status Indicator (Top Right Absolute) */}
      <div className="absolute -top-12 right-0 md:top-0 md:right-0 z-10">
        <motion.div 
            initial={false}
            animate={{ scale: encryption.status === 'encrypting' ? 1.05 : 1 }}
            className="flex items-center gap-2"
        >
             {encryption.status === 'encrypting' && (
                 <Badge variant="warning" className="animate-pulse shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Encrypting...
                 </Badge>
             )}
             {encryption.status === 'encrypted' && (
                 <Badge variant="success" className="shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                    <Lock className="mr-1 h-3 w-3" />
                    FHE Encrypted
                 </Badge>
             )}
             {encryption.status === 'decrypted' && (
                 <Badge variant="secondary" className="bg-slate-700">
                    <Unlock className="mr-1 h-3 w-3" />
                    Decrypted
                 </Badge>
             )}
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* PHASE 1: SELECTION */}
        {(status === GameStatus.WAITING_FOR_PLAYER || status === GameStatus.ENCRYPTING) && (
          <motion.div
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
             <Card className="border-t-4 border-t-blue-500 overflow-hidden relative">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                 
                 <CardHeader className="text-center pb-2">
                     <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                         Choose Your Move
                     </CardTitle>
                     <p className="text-muted-foreground">Select a hand to encrypt and submit to the blockchain.</p>
                 </CardHeader>

                 <CardContent className="pt-8 pb-10">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[Move.ROCK, Move.PAPER, Move.SCISSORS].map((m) => (
                            <Button
                                key={m}
                                variant="glass"
                                size="xl"
                                disabled={isSelectionDisabled}
                                onClick={() => onMoveSelect(m)}
                                className={cn(
                                    "group relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:border-blue-500/50",
                                    playerMove === m && "ring-2 ring-primary bg-primary/20"
                                )}
                            >
                                <div className="z-10 flex flex-col items-center gap-3">
                                    <MoveIcon move={m} className="h-12 w-12 text-slate-200 group-hover:text-white transition-colors" />
                                    <span className="font-bold tracking-widest">{m}</span>
                                </div>
                                {/* Background glow effect */}
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 opacity-0 group-hover:opacity-20 transition-opacity" />
                            </Button>
                        ))}
                     </div>

                     <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground bg-black/20 py-2 rounded-full border border-white/5">
                        <ShieldCheck className="h-3 w-3 text-green-500" />
                        <span>Your choice is hidden from the opponent until both players commit.</span>
                     </div>
                 </CardContent>
             </Card>
          </motion.div>
        )}

        {/* PHASE 2: SUBMITTED / WAITING */}
        {(status === GameStatus.SUBMITTED || status === GameStatus.BOTH_SUBMITTED) && (
            <motion.div
                key="waiting"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full"
            >
                <Card className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
                    <div className="relative mb-8">
                        {/* Pulse Effect */}
                        <div className="absolute inset-0 rounded-full bg-blue-500 blur-xl opacity-20 animate-pulse" />
                        <div className="relative h-24 w-24 rounded-full bg-black/50 border border-white/10 flex items-center justify-center">
                            {status === GameStatus.SUBMITTED ? (
                                <Loader2 className="h-10 w-10 text-blue-400 animate-spin" />
                            ) : (
                                <Swords className="h-10 w-10 text-purple-400 animate-bounce" />
                            )}
                        </div>
                    </div>
                    
                    <h2 className="text-2xl font-bold mb-2">
                        {status === GameStatus.SUBMITTED ? "Waiting for Opponent..." : "Calculating Result..."}
                    </h2>
                    
                    <p className="text-muted-foreground max-w-sm mx-auto mb-8">
                        {status === GameStatus.SUBMITTED 
                            ? "Your move has been encrypted and submitted. Waiting for the opponent to commit their move."
                            : "Both players have committed. Decrypting moves and determining the winner using FHE logic."}
                    </p>

                    <div className="w-full max-w-xs space-y-4">
                        <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-white/5 border border-white/10">
                            <span className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-green-500" />
                                You
                            </span>
                            <Badge variant="outline" className="border-green-500/30 text-green-400">Encrypted</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-white/5 border border-white/10 opacity-80">
                            <span className="flex items-center gap-2">
                                <span className={cn("h-2 w-2 rounded-full", status === GameStatus.BOTH_SUBMITTED ? "bg-green-500" : "bg-yellow-500 animate-pulse")} />
                                Opponent
                            </span>
                            <Badge variant="outline" className="border-white/10">
                                {status === GameStatus.BOTH_SUBMITTED ? "Encrypted" : "Waiting..."}
                            </Badge>
                        </div>
                    </div>
                </Card>
            </motion.div>
        )}

        {/* PHASE 3: REVEAL */}
        {(status === GameStatus.REVEALED && playerMove && opponentMove && result) && (
            <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
                <Card className="overflow-hidden border-t-4 border-t-white/20">
                    <CardHeader className="text-center pb-2">
                         <Badge 
                            variant={result === GameResult.WIN ? "success" : result === GameResult.LOSS ? "destructive" : "warning"}
                            className="mx-auto mb-4 text-base px-4 py-1"
                         >
                             {result === GameResult.WIN ? "Victory" : result === GameResult.LOSS ? "Defeat" : "Draw"}
                         </Badge>
                         <CardTitle className="text-4xl font-black uppercase tracking-tighter">
                            {result === GameResult.WIN ? "You Won!" : result === GameResult.LOSS ? "You Lost" : "It's a Draw"}
                         </CardTitle>
                    </CardHeader>

                    <CardContent className="pt-8">
                        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
                            {/* Player */}
                            <div className="flex flex-col items-center gap-4">
                                <div className={cn(
                                    "relative h-32 w-32 flex items-center justify-center rounded-2xl border-4 shadow-2xl transition-all",
                                    result === GameResult.WIN 
                                        ? "border-green-500 bg-green-500/10 shadow-green-500/20" 
                                        : "border-white/10 bg-white/5"
                                )}>
                                    <MoveIcon move={playerMove} className="h-16 w-16" />
                                    <div className="absolute -bottom-3 px-3 py-1 bg-black rounded-full border border-white/20 text-xs font-bold uppercase">
                                        You
                                    </div>
                                </div>
                            </div>

                            {/* VS */}
                            <div className="flex flex-col items-center justify-center">
                                <span className="text-4xl font-black italic text-muted-foreground opacity-30">VS</span>
                            </div>

                            {/* Opponent */}
                            <div className="flex flex-col items-center gap-4">
                                <div className={cn(
                                    "relative h-32 w-32 flex items-center justify-center rounded-2xl border-4 shadow-2xl transition-all",
                                    result === GameResult.LOSS 
                                        ? "border-red-500 bg-red-500/10 shadow-red-500/20" 
                                        : "border-white/10 bg-white/5"
                                )}>
                                    <MoveIcon move={opponentMove} className="h-16 w-16" />
                                    <div className="absolute -bottom-3 px-3 py-1 bg-black rounded-full border border-white/20 text-xs font-bold uppercase">
                                        Opponent
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Result Message */}
                        <div className="mt-10 mb-6">
                            <Alert variant={result === GameResult.WIN ? "success" : result === GameResult.LOSS ? "destructive" : "warning"} className="bg-opacity-10 border-opacity-20">
                                {result === GameResult.WIN ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                <AlertTitle>Game Over</AlertTitle>
                                <AlertDescription>
                                    {result === GameResult.WIN 
                                        ? "Congratulations! Your encrypted move beat the opponent."
                                        : result === GameResult.LOSS
                                            ? "Better luck next time. The opponent had the upper hand."
                                            : "Great minds think alike. Both players chose the same move."
                                    }
                                </AlertDescription>
                            </Alert>
                        </div>
                    </CardContent>

                    <CardFooter className="bg-white/5 border-t border-white/10 justify-center p-6">
                        <Button onClick={onReset} size="lg" className="w-full md:w-auto min-w-[200px] font-bold">
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Play Again
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};