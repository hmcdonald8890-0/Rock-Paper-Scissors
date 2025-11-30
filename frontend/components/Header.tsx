import React from "react";
import { ShieldCheck } from "lucide-react";
import { Badge } from "./ui/Primitives";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface HeaderProps {
  isConnected: boolean;
  address?: string;
}

export const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/20 backdrop-blur-xl">
      <div className="container max-w-5xl mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg shadow-blue-500/20">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <span className="hidden font-bold tracking-tight text-white sm:inline-block">
            FHE Rock Paper Scissors
          </span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Network Badge */}
          <Badge variant="outline" className="hidden border-blue-500/30 bg-blue-500/10 text-blue-400 sm:flex gap-1.5 px-3 py-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Sepolia
          </Badge>

          {/* RainbowKit Connect Button */}
          <ConnectButton />
        </div>
      </div>
    </header>
  );
};
