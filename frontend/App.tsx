import React, { useState, useEffect, useCallback, useRef } from "react";
import { BrowserProvider, Contract } from "ethers";
import { useAccount, useWalletClient, usePublicClient, useChainId } from "wagmi";
import { Header } from "./components/Header";
import { StatsPanel } from "./components/StatsPanel";
import { GameBoard } from "./components/GameBoard";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/Primitives";
import { GameStatus, Move, GameResult, GameHistoryItem, Stats, EncryptionState } from "./types";
import { Wallet, Info } from "lucide-react";
import { cn } from "./lib/utils";
import { CONTRACT_ADDRESS, SEPOLIA_CHAIN_ID, CHAIN_CONFIG, MOVE, RESULT } from "./config";
import { initFhevm, encryptMove, setFhevmInstance, publicDecrypt } from "./fhevm";
import RockPaperScissorsABI from "./RockPaperScissors.abi.json";

const App: React.FC = () => {
  // --- Wagmi Hooks ---
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const prevChainIdRef = useRef<number | null>(null);

  // --- Blockchain State ---
  const [provider, setProvider] = useState<any>(null);
  const [signer, setSigner] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);
  const [fhevmInstance, setFhevmInstanceState] = useState<any>(null);

  // --- UI State ---
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [encryption, setEncryption] = useState<EncryptionState>({ status: 'unencrypted' });
  const [status, setStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // --- Game State ---
  const [currentGameId, setCurrentGameId] = useState<number | null>(null);
  const [playerMove, setPlayerMove] = useState<Move | null>(null);
  const [opponentMove, setOpponentMove] = useState<Move | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);

  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, wins: 0, losses: 0, draws: 0 });

  // --- Helper Functions ---

  const moveNumToEnum = (num: number): Move => {
    if (num === MOVE.ROCK) return Move.ROCK;
    if (num === MOVE.PAPER) return Move.PAPER;
    if (num === MOVE.SCISSORS) return Move.SCISSORS;
    throw new Error(`Invalid move: ${num}`);
  };

  const moveEnumToNum = (move: Move): number => {
    if (move === Move.ROCK) return MOVE.ROCK;
    if (move === Move.PAPER) return MOVE.PAPER;
    if (move === Move.SCISSORS) return MOVE.SCISSORS;
    throw new Error(`Invalid move: ${move}`);
  };

  const resultNumToEnum = (num: number): GameResult => {
    if (num === RESULT.WIN) return GameResult.WIN;
    if (num === RESULT.LOSS) return GameResult.LOSS;
    if (num === RESULT.DRAW) return GameResult.DRAW;
    throw new Error(`Invalid result: ${num}`);
  };

  // --- Initialize Provider, Signer, Contract and FHEVM when wallet connects ---
  useEffect(() => {
    if (!isConnected || !address || !walletClient) {
      setProvider(null);
      setSigner(null);
      setContract(null);
      setFhevmInstanceState(null);
      setGameStatus(GameStatus.IDLE);
      return;
    }

    const initializeWallet = async () => {
      try {
        setIsLoading(true);
        setStatus('Initializing wallet connection...');

        // For injected wallets (MetaMask, OKX), use window.ethereum directly
        // This is required for FHEVM SDK compatibility
        const ethereumProvider = (window as any).ethereum;
        
        if (!ethereumProvider) {
          throw new Error('No ethereum provider found. Please install MetaMask or OKX wallet.');
        }

        // Create BrowserProvider and Signer
        const newProvider = new BrowserProvider(ethereumProvider);
        const newSigner = await newProvider.getSigner();

        setProvider(newProvider);
        setSigner(newSigner);

        // Initialize contract
        const contractInstance = new Contract(CONTRACT_ADDRESS, RockPaperScissorsABI, newSigner);
        setContract(contractInstance);

        setStatus('Wallet connected! Initializing FHEVM...');

        // Initialize FHEVM after wallet connection
        try {
          const instance = await initFhevm();
          setFhevmInstanceState(instance);
          setFhevmInstance(instance);

          console.log('FHEVM initialized successfully');
          setStatus('✅ Wallet connected and FHEVM initialized!');
          setGameStatus(GameStatus.WAITING_FOR_PLAYER);
        } catch (fhevmError) {
          console.error('Failed to initialize FHEVM:', fhevmError);
          setStatus('⚠️ Wallet connected but FHEVM initialization failed. Encryption may not work.');
          setGameStatus(GameStatus.WAITING_FOR_PLAYER);
        }
      } catch (error: any) {
        console.error('Failed to initialize wallet:', error);
        setStatus(`Failed to initialize wallet: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    initializeWallet();
  }, [isConnected, address, walletClient]);

  // --- Load Player Stats and Active Game ---
  const loadPlayerStats = useCallback(async () => {
    if (!contract || !address) return;

    try {
      // Load stats
      const playerStats = await contract.getPlayerStats(address);
      setStats({
        wins: Number(playerStats.wins),
        losses: Number(playerStats.losses),
        draws: Number(playerStats.draws),
        total: Number(playerStats.totalGames)
      });

      // Check for active game
      const activeGameId = await contract.getPlayerActiveGame(address);
      if (Number(activeGameId) !== 0) {
        console.log('Found active game:', activeGameId);
        setStatus(`⚠️ You have an unfinished game (ID: ${activeGameId}). Complete it to start a new one.`);
        setCurrentGameId(Number(activeGameId));

        // Load game details
        const game = await contract.getGame(activeGameId);
        if (!game.isResolved && game.resolveRequested) {
          setStatus(`⚠️ Game ${activeGameId} is waiting for resolution. Please complete it.`);
        }
      }
    } catch (error) {
      console.error('Failed to load player stats:', error);
    }
  }, [contract, address]);

  // --- Handle Move Select ---
  const handleMoveSelect = async (move: Move) => {
    if (!contract || !fhevmInstance || !signer || !address) {
      setStatus('❌ Please ensure wallet and FHEVM are initialized');
      return;
    }

    try {
      setIsLoading(true);

      // Check if player has an active game
      const activeGameId = await contract.getPlayerActiveGame(address);
      if (Number(activeGameId) !== 0) {
        setStatus(`⚠️ You have an active game (ID: ${activeGameId}). Please complete it first.`);
        setIsLoading(false);
        return;
      }

      setPlayerMove(move);
      setGameStatus(GameStatus.ENCRYPTING);
      setEncryption({ status: 'encrypting' });
      setStatus('Encrypting your move with FHEVM...');

      // Encrypt the move
      const moveNum = moveEnumToNum(move);
      const { data, proof } = await encryptMove(moveNum, CONTRACT_ADDRESS, address);

      setEncryption({ status: 'encrypted', hash: data });
      setStatus('Move encrypted! Submitting to blockchain...');
      setGameStatus(GameStatus.SUBMITTED);

      // Submit to contract
      const tx = await contract.playGame(data, proof);
      setStatus(`Transaction sent: ${tx.hash.slice(0, 10)}..., waiting for confirmation...`);

      const receipt = await tx.wait();

      // Parse events to get game ID and opponent move
      const gameCreatedEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'GameCreated';
        } catch {
          return false;
        }
      });

      const opponentMoveEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'OpponentMoveGenerated';
        } catch {
          return false;
        }
      });

      if (gameCreatedEvent && opponentMoveEvent) {
        const gameCreatedParsed = contract.interface.parseLog(gameCreatedEvent);
        const opponentMoveParsed = contract.interface.parseLog(opponentMoveEvent);

        const gameId = Number(gameCreatedParsed?.args.gameId);
        const opponentMoveNum = Number(opponentMoveParsed?.args.opponentMove);

        setCurrentGameId(gameId);
        setOpponentMove(moveNumToEnum(opponentMoveNum));

        setStatus('✅ Game created! Opponent move generated. Now resolving...');
        setGameStatus(GameStatus.BOTH_SUBMITTED);

        // Auto-resolve after short delay
        setTimeout(() => {
          handleResolve(gameId);
        }, 1000);
      }
    } catch (error: any) {
      console.error('Failed to submit move:', error);
      setStatus(`❌ Failed to submit move: ${error.message}`);
      setGameStatus(GameStatus.WAITING_FOR_PLAYER);
      setPlayerMove(null);
      setEncryption({ status: 'unencrypted' });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handle Resolve Game ---
  const handleResolve = async (gameId: number) => {
    if (!contract || !signer || !fhevmInstance) {
      setStatus('❌ Contract or FHEVM not initialized');
      return;
    }

    try {
      setIsLoading(true);

      // ========== Check game state ==========
      const game = await contract.getGame(gameId);
      let playerMoveHandle: string;

      if (!game.resolveRequested) {
        // ========== Step 1: Request resolve (if not already requested) ==========
        setStatus('Requesting decryption...');
        const requestTx = await contract.requestResolve(gameId);
        setStatus(`Request sent: ${requestTx.hash.slice(0, 10)}..., waiting for confirmation...`);
        const requestReceipt = await requestTx.wait();

        setStatus('Decryption requested! Waiting for Gateway decryption...');

        // ========== Step 2: Get handle from event ==========
        const resolveRequestedEvent = requestReceipt.logs.find((log: any) => {
          try {
            const parsed = contract.interface.parseLog(log);
            return parsed?.name === 'ResolveRequested';
          } catch {
            return false;
          }
        });

        if (!resolveRequestedEvent) {
          throw new Error('ResolveRequested event not found');
        }

        const parsedEvent = contract.interface.parseLog(resolveRequestedEvent);
        playerMoveHandle = parsedEvent?.args.playerMoveHandle;

        console.log('📋 Got player move handle:', playerMoveHandle);

        // ========== Step 3: Wait for Gateway to process ==========
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        // Resolve already requested, get handle directly
        setStatus('Resolve already requested, getting encrypted move handle...');
        const encryptedMove = await contract.getPlayerEncryptedMove(gameId);
        playerMoveHandle = encryptedMove;
        console.log('📋 Got player move handle from contract:', playerMoveHandle);

        // Still wait a bit for Gateway
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      setStatus('Decrypting with Gateway...');

      // ========== Step 4: Public decrypt ==========
      const { cleartexts, decryptionProof, values } = await publicDecrypt([playerMoveHandle]);

      const decryptedMove = values[0];
      console.log(`✅ Decrypted move: ${decryptedMove}`);

      setStatus('Submitting decryption result...');

      // ========== Step 5: Resolve game with proof ==========
      const resolveTx = await contract.resolveGame(gameId, cleartexts, decryptionProof);
      setStatus(`Resolve sent: ${resolveTx.hash.slice(0, 10)}..., waiting for confirmation...`);

      const resolveReceipt = await resolveTx.wait();

      // ========== Step 6: Parse GameResolved event ==========
      const gameResolvedEvent = resolveReceipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'GameResolved';
        } catch {
          return false;
        }
      });

      if (gameResolvedEvent) {
        const parsed = contract.interface.parseLog(gameResolvedEvent);
        const playerMoveNum = Number(parsed?.args.playerMove);
        const opponentMoveNum = Number(parsed?.args.opponentMove);
        const resultNum = Number(parsed?.args.result);

        const playerMoveEnum = moveNumToEnum(playerMoveNum);
        const opponentMoveEnum = moveNumToEnum(opponentMoveNum);
        const gameResult = resultNumToEnum(resultNum);

        setPlayerMove(playerMoveEnum);
        setOpponentMove(opponentMoveEnum);
        setResult(gameResult);
        setEncryption({ status: 'decrypted' });
        setGameStatus(GameStatus.REVEALED);

        // Update history
        setHistory(prev => [{
          id: gameId,
          playerMove: playerMoveEnum,
          opponentMove: opponentMoveEnum,
          result: gameResult,
          timestamp: Date.now()
        }, ...prev]);

        // Reload stats
        await loadPlayerStats();

        setStatus(`🎮 Game Over! ${gameResult === GameResult.WIN ? 'You Won!' : gameResult === GameResult.LOSS ? 'You Lost' : "It's a Draw"}`);

        // Clear current game ID
        setCurrentGameId(null);
      }
    } catch (error: any) {
      console.error('Failed to resolve game:', error);
      setStatus(`❌ Failed to resolve game: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handle Reset ---
  const handleReset = () => {
    setPlayerMove(null);
    setOpponentMove(null);
    setResult(null);
    setCurrentGameId(null);
    setEncryption({ status: 'unencrypted' });
    setGameStatus(GameStatus.WAITING_FOR_PLAYER);
    setStatus('');
  };

  // --- Listen for chain changes (only when chain ID actually changes) ---
  useEffect(() => {
    if (isConnected && chainId && prevChainIdRef.current !== null && prevChainIdRef.current !== chainId) {
      console.log('Chain changed, reloading...', { from: prevChainIdRef.current, to: chainId });
      window.location.reload();
    }
    prevChainIdRef.current = chainId;
  }, [chainId, isConnected]);

  // --- Load stats on connect ---
  useEffect(() => {
    if (contract && address) {
      loadPlayerStats();
    }
  }, [contract, address, loadPlayerStats]);

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 font-sans text-slate-100 selection:bg-blue-500/30">

      <Header
        isConnected={isConnected}
        address={address || ""}
      />

      <main className="container mx-auto px-4 py-8 md:py-12">

        {!isConnected ? (
           // Connect Wallet Overlay / Placeholder
           <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-8 text-center">
              <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-blue-500 opacity-20 blur-2xl animate-pulse"></div>
                  <Wallet className="relative h-24 w-24 text-slate-200" />
              </div>
              <div className="space-y-2 max-w-md">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                    FHE Rock Paper Scissors
                </h1>
                <p className="text-muted-foreground text-lg">
                    Experience the future of privacy-preserving gaming.
                    Connect your wallet to play on the Sepolia Testnet using Fully Homomorphic Encryption.
                </p>
              </div>
              <p className="text-sm text-slate-400">
                Use the Connect Wallet button in the header to get started
              </p>
           </div>
        ) : (
          <>
            {/* Active Game Warning */}
            {currentGameId && gameStatus === GameStatus.WAITING_FOR_PLAYER && (
              <div className="max-w-2xl mx-auto mb-6">
                <Alert variant="warning" className="bg-yellow-500/10 border-yellow-500/30">
                  <Info className="h-4 w-4 text-yellow-500" />
                  <AlertTitle>Unfinished Game</AlertTitle>
                  <AlertDescription className="flex items-center justify-between">
                    <span>You have an unfinished game (ID: {currentGameId}). Please complete it first.</span>
                    <button
                      onClick={() => handleResolve(currentGameId)}
                      disabled={isLoading}
                      className="ml-4 px-4 py-1 bg-yellow-500 text-black rounded-md hover:bg-yellow-400 disabled:opacity-50 text-sm font-medium"
                    >
                      Resolve Now
                    </button>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">

             {/* Game Board (Left/Top) */}
             <div className="flex-1 w-full flex justify-center">
                 <GameBoard
                    status={gameStatus}
                    encryption={encryption}
                    onMoveSelect={handleMoveSelect}
                    onReset={handleReset}
                    playerMove={playerMove}
                    opponentMove={opponentMove}
                    result={result}
                 />
             </div>

             {/* Stats Panel (Right/Bottom) */}
             <StatsPanel stats={stats} history={history} />

          </div>
          </>
        )}
      </main>

      {/* Status Bar */}
      {status && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-800 border border-slate-700 rounded-lg px-6 py-3 shadow-lg max-w-md text-center z-50">
          <p className="text-sm text-slate-200">{status}</p>
        </div>
      )}

      {/* Footer / Decorative */}
      <footer className="fixed bottom-4 left-0 w-full text-center pointer-events-none">
          <p className="text-xs text-white/20">Powered by FHE & React</p>
      </footer>
    </div>
  );
};

export default App;
