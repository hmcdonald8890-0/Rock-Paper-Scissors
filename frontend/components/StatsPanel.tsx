import React from "react";
import { Card, CardContent, CardHeader, CardTitle, Progress, Badge } from "./ui/Primitives";
import { Stats, GameHistoryItem, GameResult, Move } from "../types";
import { Trophy, History, Swords, Minus } from "lucide-react";
import { cn } from "../lib/utils";

interface StatsPanelProps {
  stats: Stats;
  history: GameHistoryItem[];
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ stats, history }) => {
  const winRate = stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;

  const getResultIcon = (result: GameResult) => {
    switch(result) {
        case GameResult.WIN: return <Trophy className="h-4 w-4 text-green-500" />;
        case GameResult.LOSS: return <Swords className="h-4 w-4 text-red-500" />;
        case GameResult.DRAW: return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  }

  const getResultColor = (result: GameResult) => {
    switch(result) {
        case GameResult.WIN: return "text-green-500";
        case GameResult.LOSS: return "text-red-500";
        case GameResult.DRAW: return "text-yellow-500";
    }
  }

  return (
    <div className="w-full space-y-4 lg:w-80">
      {/* Stats Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Matches</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-400">{winRate}%</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Win Rate</div>
                </div>
            </div>
            
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-green-500">Wins ({stats.wins})</span>
                    <span className="text-red-500">Losses ({stats.losses})</span>
                </div>
                {/* Custom multi-color progress bar simulation */}
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div style={{ width: `${(stats.wins/stats.total || 0)*100}%` }} className="bg-green-500 h-full" />
                    <div style={{ width: `${(stats.draws/stats.total || 0)*100}%` }} className="bg-yellow-500 h-full" />
                    <div style={{ width: `${(stats.losses/stats.total || 0)*100}%` }} className="bg-red-500 h-full" />
                </div>
                <div className="text-center text-xs text-muted-foreground">
                    Draws: {stats.draws}
                </div>
            </div>
        </CardContent>
      </Card>

      {/* History Card */}
      <Card className="flex-1">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-blue-400" />
            Recent History
          </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-3">
                {history.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-4">No games played yet.</div>
                ) : (
                    history.slice(0, 5).map((game) => (
                        <div key={game.id} className="flex items-center justify-between rounded-md border border-white/5 bg-white/5 p-3 text-sm">
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className={cn("w-16 justify-center", getResultColor(game.result))}>
                                    {game.result}
                                </Badge>
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">You</span>
                                    <span className="font-medium capitalize">{game.playerMove.toLowerCase()}</span>
                                </div>
                            </div>
                            <div className="text-muted-foreground text-xs">vs</div>
                            <div className="flex flex-col items-end">
                                <span className="text-xs text-muted-foreground">Opponent</span>
                                <span className="font-medium capitalize">{game.opponentMove.toLowerCase()}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
};