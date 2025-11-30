// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint8, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title RockPaperScissors - FHE Rock Paper Scissors Game
/// @notice Single player vs random opponent with encrypted moves
/// @dev Uses FHEVM to encrypt player moves, opponent is generated on-chain randomly
contract RockPaperScissors is ZamaEthereumConfig {

    // ============ Constants ============

    /// @notice Move options: 1 = Rock, 2 = Paper, 3 = Scissors
    uint8 public constant ROCK = 1;
    uint8 public constant PAPER = 2;
    uint8 public constant SCISSORS = 3;

    /// @notice Game results: 0 = Draw, 1 = Win, 2 = Loss
    uint8 public constant DRAW = 0;
    uint8 public constant WIN = 1;
    uint8 public constant LOSS = 2;

    // ============ Structs ============

    /// @notice Game state structure
    struct Game {
        address player;                // Player address
        euint8 encryptedPlayerMove;    // Player's encrypted move (1=Rock, 2=Paper, 3=Scissors)
        uint8 opponentMove;            // Opponent's move (generated randomly)
        uint256 createdAt;             // Game creation timestamp
        bool isResolved;               // Whether game has been resolved
        uint8 result;                  // Game result (0=Draw, 1=Win, 2=Loss)
        uint8 revealedPlayerMove;      // Revealed player move after resolution
        bool resolveRequested;         // Whether resolve has been requested
    }

    // ============ State Variables ============

    /// @notice Game ID counter
    uint256 public gameIdCounter;

    /// @notice Game ID => Game data
    mapping(uint256 => Game) public games;

    /// @notice Player address => Current active game ID (0 if no active game)
    mapping(address => uint256) public playerActiveGame;

    /// @notice Player address => Stats (wins, losses, draws, total)
    mapping(address => PlayerStats) public playerStats;

    struct PlayerStats {
        uint256 wins;
        uint256 losses;
        uint256 draws;
        uint256 totalGames;
    }

    // ============ Events ============

    event GameCreated(uint256 indexed gameId, address indexed player, bytes32 encryptedMoveHandle);
    event OpponentMoveGenerated(uint256 indexed gameId, uint8 opponentMove);
    event ResolveRequested(uint256 indexed gameId, bytes32 playerMoveHandle);
    event GameResolved(uint256 indexed gameId, address indexed player, uint8 playerMove, uint8 opponentMove, uint8 result);

    // ============ Constructor ============

    constructor() {
        gameIdCounter = 1;
    }

    // ============ Core Functions ============

    /// @notice Create a new game with encrypted player move
    /// @param encryptedMove Player's encrypted move (1=Rock, 2=Paper, 3=Scissors)
    /// @param proof Encryption proof
    /// @return gameId The created game ID
    function playGame(externalEuint8 encryptedMove, bytes calldata proof) external returns (uint256) {
        require(playerActiveGame[msg.sender] == 0, "Player already has an active game");

        // Convert external encrypted input to internal
        euint8 playerMove = FHE.fromExternal(encryptedMove, proof);

        // Generate random opponent move (1, 2, or 3)
        uint8 opponentMove = generateRandomMove();

        uint256 gameId = gameIdCounter++;

        games[gameId] = Game({
            player: msg.sender,
            encryptedPlayerMove: playerMove,
            opponentMove: opponentMove,
            createdAt: block.timestamp,
            isResolved: false,
            result: 0,
            revealedPlayerMove: 0,
            resolveRequested: false
        });

        // Grant permissions for encrypted player move
        FHE.allowThis(games[gameId].encryptedPlayerMove);
        FHE.allow(games[gameId].encryptedPlayerMove, msg.sender);

        playerActiveGame[msg.sender] = gameId;

        // Emit event with encrypted move handle
        bytes32 playerMoveHandle = FHE.toBytes32(playerMove);
        emit GameCreated(gameId, msg.sender, playerMoveHandle);
        emit OpponentMoveGenerated(gameId, opponentMove);

        return gameId;
    }

    /// @notice Request game resolution - makes player move publicly decryptable
    /// @param gameId Game ID to resolve
    function requestResolve(uint256 gameId) external {
        require(gameId < gameIdCounter, "Game does not exist");
        Game storage game = games[gameId];

        require(game.player == msg.sender, "Only player can request resolve");
        require(!game.isResolved, "Game already resolved");
        require(!game.resolveRequested, "Resolve already requested");

        game.resolveRequested = true;

        // Make player move publicly decryptable
        game.encryptedPlayerMove = FHE.makePubliclyDecryptable(game.encryptedPlayerMove);

        // Emit event with player move handle for frontend decryption
        bytes32 playerMoveHandle = FHE.toBytes32(game.encryptedPlayerMove);
        emit ResolveRequested(gameId, playerMoveHandle);
    }

    /// @notice Resolve game with decrypted player move and proof
    /// @param gameId Game ID to resolve
    /// @param cleartexts ABI-encoded player move (uint8)
    /// @param decryptionProof Decryption proof from relayer
    function resolveGame(
        uint256 gameId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        require(gameId < gameIdCounter, "Game does not exist");
        Game storage game = games[gameId];

        require(!game.isResolved, "Game already resolved");
        require(game.resolveRequested, "Must request resolve first");

        // Verify decryption proof
        bytes32[] memory handlesList = new bytes32[](1);
        handlesList[0] = FHE.toBytes32(game.encryptedPlayerMove);

        FHE.checkSignatures(handlesList, cleartexts, decryptionProof);

        // Decode player move
        uint8 playerMove = abi.decode(cleartexts, (uint8));

        // Validate player move
        require(playerMove >= ROCK && playerMove <= SCISSORS, "Invalid player move");

        game.revealedPlayerMove = playerMove;

        // Determine game result
        uint8 result = determineWinner(playerMove, game.opponentMove);
        game.result = result;
        game.isResolved = true;

        // Update player stats
        PlayerStats storage stats = playerStats[game.player];
        stats.totalGames++;
        if (result == WIN) {
            stats.wins++;
        } else if (result == LOSS) {
            stats.losses++;
        } else {
            stats.draws++;
        }

        // Clear active game
        playerActiveGame[game.player] = 0;

        emit GameResolved(gameId, game.player, playerMove, game.opponentMove, result);
    }

    /// @notice Cancel an active game
    /// @dev Allows player to cancel their active game and start a new one
    function cancelGame() external {
        uint256 gameId = playerActiveGame[msg.sender];
        require(gameId != 0, "No active game to cancel");

        Game storage game = games[gameId];
        require(!game.isResolved, "Game already resolved");

        // Mark as resolved without updating stats
        game.isResolved = true;
        game.result = DRAW; // Mark as draw for record keeping

        // Clear active game
        playerActiveGame[msg.sender] = 0;

        emit GameResolved(gameId, msg.sender, 0, game.opponentMove, DRAW);
    }

    // ============ Helper Functions ============

    /// @notice Generate random opponent move
    /// @return Random move (1, 2, or 3)
    function generateRandomMove() internal view returns (uint8) {
        // Use block data and game counter for pseudo-randomness
        uint256 random = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            gameIdCounter,
            msg.sender
        )));

        // Return 1, 2, or 3
        return uint8((random % 3) + 1);
    }

    /// @notice Determine winner based on moves
    /// @param playerMove Player's move
    /// @param opponentMove Opponent's move
    /// @return result Game result (0=Draw, 1=Win, 2=Loss)
    function determineWinner(uint8 playerMove, uint8 opponentMove) internal pure returns (uint8) {
        if (playerMove == opponentMove) {
            return DRAW;
        }

        // Rock beats Scissors
        if (playerMove == ROCK && opponentMove == SCISSORS) return WIN;
        if (playerMove == SCISSORS && opponentMove == ROCK) return LOSS;

        // Paper beats Rock
        if (playerMove == PAPER && opponentMove == ROCK) return WIN;
        if (playerMove == ROCK && opponentMove == PAPER) return LOSS;

        // Scissors beats Paper
        if (playerMove == SCISSORS && opponentMove == PAPER) return WIN;
        if (playerMove == PAPER && opponentMove == SCISSORS) return LOSS;

        return DRAW; // Should never reach here
    }

    // ============ View Functions ============

    /// @notice Get game details
    /// @param gameId Game ID
    function getGame(uint256 gameId) external view returns (
        address player,
        uint8 opponentMove,
        uint256 createdAt,
        bool isResolved,
        uint8 result,
        uint8 revealedPlayerMove,
        bool resolveRequested
    ) {
        require(gameId < gameIdCounter, "Game does not exist");
        Game storage game = games[gameId];

        return (
            game.player,
            game.opponentMove,
            game.createdAt,
            game.isResolved,
            game.result,
            game.revealedPlayerMove,
            game.resolveRequested
        );
    }

    /// @notice Get player's encrypted move handle
    /// @param gameId Game ID
    /// @return Encrypted player move
    function getPlayerEncryptedMove(uint256 gameId) external view returns (euint8) {
        require(gameId < gameIdCounter, "Game does not exist");
        return games[gameId].encryptedPlayerMove;
    }

    /// @notice Get player's stats
    /// @param player Player address
    function getPlayerStats(address player) external view returns (
        uint256 wins,
        uint256 losses,
        uint256 draws,
        uint256 totalGames
    ) {
        PlayerStats storage stats = playerStats[player];
        return (stats.wins, stats.losses, stats.draws, stats.totalGames);
    }

    /// @notice Get player's active game ID
    /// @param player Player address
    /// @return Active game ID (0 if no active game)
    function getPlayerActiveGame(address player) external view returns (uint256) {
        return playerActiveGame[player];
    }

    /// @notice Get total number of games created
    /// @return Total game count
    function getTotalGames() external view returns (uint256) {
        return gameIdCounter - 1;
    }
}
