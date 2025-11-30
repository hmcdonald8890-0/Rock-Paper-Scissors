// Contract Configuration
export const CONTRACT_ADDRESS = '0x7bB5aB954294d93166DA88540584e3cF46322ee2'

// Network Configuration
export const SEPOLIA_CHAIN_ID = 11155111

export const CHAIN_CONFIG = {
  chainId: '0xaa36a7', // 11155111 in hex
  chainName: 'Sepolia Test Network',
  nativeCurrency: {
    name: 'SepoliaETH',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['https://sepolia.infura.io/v3/'],
  blockExplorerUrls: ['https://sepolia.etherscan.io']
}

// Move constants (must match contract)
export const MOVE = {
  ROCK: 1,
  PAPER: 2,
  SCISSORS: 3
} as const

// Result constants (must match contract)
export const RESULT = {
  DRAW: 0,
  WIN: 1,
  LOSS: 2
} as const
