# 🪨📄✂️ Rock Paper Scissors DApp with FHEVM

A decentralized Rock Paper Scissors game built with **Zama FHEVM** (Fully Homomorphic Encryption Virtual Machine). This DApp demonstrates privacy-preserving gameplay where player moves are encrypted on-chain using fully homomorphic encryption.

## ✨ Features

- 🔐 **Encrypted Moves**: Player moves are encrypted using FHEVM before being submitted to the blockchain
- 🎲 **Random Opponent**: Opponent moves are generated on-chain using pseudo-random number generation
- 📊 **Player Statistics**: Track wins, losses, draws, and total games played
- 🎮 **Game History**: View your complete game history with results
- 🔓 **Privacy-Preserving Resolution**: Moves are only revealed when the player requests resolution
- ⚡ **Real-time Updates**: React-based frontend with real-time game state updates

## 🏗️ Architecture

### Smart Contract

The `RockPaperScissors` contract implements the game logic:

- **Encrypted Player Moves**: Uses `euint8` (encrypted uint8) to store player moves
- **Random Opponent**: Generates opponent moves on-chain using block data
- **Game Resolution**: Two-step process:
  1. `requestResolve()`: Makes the encrypted move publicly decryptable
  2. `resolveGame()`: Verifies decryption proof and determines winner

### Frontend

- **React + TypeScript**: Modern React application with TypeScript
- **Wagmi + RainbowKit**: Wallet connection and Web3 integration
- **FHEVM SDK**: Client-side encryption and decryption
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Modern UI styling

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MetaMask or compatible Web3 wallet
- Sepolia testnet ETH (for testing)

### 1. Install Dependencies

```bash
# Install root dependencies (Hardhat, FHEVM Solidity)
npm install

# Install frontend dependencies
cd frontend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

For the frontend, update `frontend/src/config.ts` with your deployed contract address:

```typescript
export const CONTRACT_ADDRESS = "0xYourContractAddress";
```

### 3. Compile Contracts

```bash
npm run compile
```

### 4. Deploy to Sepolia

```bash
npm run deploy:sepolia
```

After deployment, copy the contract address and update `frontend/src/config.ts`.

### 5. Start Frontend

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 📖 How It Works

### Game Flow

1. **Player Selects Move**: Player chooses Rock, Paper, or Scissors
2. **Encryption**: Frontend encrypts the move using FHEVM SDK
3. **Submit to Contract**: Encrypted move is submitted to `playGame()` function
4. **Opponent Move Generated**: Contract generates a random opponent move (1-3)
5. **Game Created**: Game state is stored on-chain with encrypted player move
6. **Request Resolution**: Player calls `requestResolve()` to make move decryptable
7. **Decrypt & Resolve**: Frontend decrypts the move and submits proof to `resolveGame()`
8. **Winner Determined**: Contract verifies proof and updates player statistics

### Encryption Details

- **Encryption**: Uses FHEVM SDK's `createEncryptedInput()` to encrypt player moves
- **Decryption**: Uses EIP-712 signature-based decryption with the relayer
- **Privacy**: Player moves remain encrypted until resolution is requested

### Smart Contract Functions

#### Core Functions

- `playGame(externalEuint8 encryptedMove, bytes calldata proof)`: Create a new game with encrypted move
- `requestResolve(uint256 gameId)`: Request game resolution (makes move decryptable)
- `resolveGame(uint256 gameId, bytes memory cleartexts, bytes memory decryptionProof)`: Resolve game with decrypted move
- `cancelGame()`: Cancel an active game

#### View Functions

- `getGame(uint256 gameId)`: Get game details
- `getPlayerStats(address player)`: Get player statistics
- `getPlayerActiveGame(address player)`: Get player's active game ID
- `getTotalGames()`: Get total number of games created

## 🛠️ Development

### Project Structure

```
Rock-Paper-Scissors/
├── contracts/
│   └── RockPaperScissors.sol    # Main game contract
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── config.ts             # Contract configuration
│   │   ├── fhevm.ts             # FHEVM SDK integration
│   │   └── App.tsx              # Main app component
│   └── package.json
├── scripts/
│   └── deploy.js                # Deployment script
├── hardhat.config.js           # Hardhat configuration
└── package.json
```

### Testing Locally

1. Start a local Hardhat node:
```bash
npm run node
```

2. Deploy to localhost:
```bash
npm run deploy:localhost
```

3. Update frontend config with localhost contract address

4. Start frontend:
```bash
cd frontend
npm run dev
```

### Building for Production

```bash
cd frontend
npm run build
```

The production build will be in `frontend/dist/`

## 🔧 Configuration

### Contract Configuration

The contract uses Zama's FHEVM configuration:

```solidity
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
```

### Frontend Configuration

Update `frontend/src/config.ts`:

```typescript
export const CONTRACT_ADDRESS = "0x..."; // Your deployed contract
export const SEPOLIA_CHAIN_ID = 11155111;
```

### FHEVM SDK

The frontend uses the FHEVM Relayer SDK from CDN. Ensure the SDK script is loaded in `frontend/index.html`:

```html
<script src="https://cdn.jsdelivr.net/npm/@zama-fhe/relayer-sdk@0.3.0-5/dist/relayer-sdk.umd.js"></script>
```

## 📚 Technology Stack

### Smart Contracts
- **Solidity 0.8.24**: Smart contract language
- **Hardhat 2.22.0**: Development environment
- **FHEVM Solidity 0.9.1**: Zama's FHE library for Solidity
- **Zama Relayer SDK 0.3.0-5**: Encryption/decryption SDK

### Frontend
- **React 19.2.0**: UI framework
- **TypeScript 5.8.2**: Type safety
- **Vite 6.2.0**: Build tool
- **Wagmi 2.19.5**: React Hooks for Ethereum
- **RainbowKit 2.2.9**: Wallet connection UI
- **Tailwind CSS**: Styling
- **Framer Motion**: Animations

## 🔐 Security Considerations

- **Encryption**: Player moves are encrypted before submission
- **Randomness**: Opponent moves use block data for pseudo-randomness (not cryptographically secure)
- **Decryption Proof**: Moves are only revealed with valid decryption proofs
- **Access Control**: Only the player can request resolution for their games

## 🐛 Troubleshooting

### Common Issues

1. **"FHEVM not initialized"**
   - Ensure the Relayer SDK CDN script is loaded
   - Check browser console for SDK errors
   - Verify wallet is connected

2. **"Transaction failed"**
   - Check you have enough Sepolia ETH
   - Verify contract address is correct
   - Check network is set to Sepolia

3. **"Encryption failed"**
   - Ensure wallet is connected
   - Check FHEVM SDK is loaded
   - Verify relayer URL is accessible

## 📝 License

MIT

## 🙏 Acknowledgments

- [Zama](https://www.zama.ai/) for FHEVM technology
- [RainbowKit](https://www.rainbowkit.com/) for wallet connection UI
- [Wagmi](https://wagmi.sh/) for Ethereum React Hooks

## 📧 Support

For issues and questions, please open an issue on the repository.

---

**Note**: This is a demonstration project. The random number generation for opponent moves is pseudo-random and not suitable for production use cases requiring cryptographically secure randomness.

