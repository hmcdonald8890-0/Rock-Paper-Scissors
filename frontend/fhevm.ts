// FHEVM SDK utilities for Rock Paper Scissors
// Based on Zama Relayer SDK 0.3.0-5

let fhevmInstance: any = null

/**
 * Initialize FHEVM SDK after wallet connection
 * Must be called after user connects their wallet
 */
export const initFhevm = async () => {
  if (fhevmInstance) {
    return fhevmInstance
  }

  // Access Relayer SDK from CDN
  const sdk = (window as any).RelayerSDK || (window as any).relayerSDK

  if (!sdk) {
    throw new Error('Relayer SDK not loaded. Make sure CDN script is included in HTML.')
  }

  const { initSDK, createInstance, SepoliaConfig } = sdk

  // Initialize SDK
  await initSDK()

  // Create instance with Sepolia config and user's wallet
  const config = {
    ...SepoliaConfig,
    network: (window as any).ethereum
  }

  fhevmInstance = await createInstance(config)
  console.log('FHEVM SDK initialized successfully')

  return fhevmInstance
}

/**
 * Get the FHEVM instance
 */
export const getFhevmInstance = () => {
  if (!fhevmInstance) {
    throw new Error('FHEVM not initialized. Call initFhevm() first.')
  }
  return fhevmInstance
}

/**
 * Set FHEVM instance (for external state management)
 */
export const setFhevmInstance = (instance: any) => {
  fhevmInstance = instance
}

/**
 * Create encrypted input for contract
 */
export const createEncryptedInput = async (contractAddress: string, userAddress: string) => {
  const instance = getFhevmInstance()
  return instance.createEncryptedInput(contractAddress, userAddress)
}

/**
 * Encrypt a move (1=Rock, 2=Paper, 3=Scissors)
 * Returns encrypted value and proof for contract submission
 */
export const encryptMove = async (move: number, contractAddress: string, userAddress: string) => {
  const instance = getFhevmInstance()

  // Create encrypted input
  const input = await createEncryptedInput(contractAddress, userAddress)

  // Add the move as euint8
  input.add8(move)

  // Encrypt and get proof
  const encryptedData = await input.encrypt()

  return {
    data: encryptedData.handles[0], // First encrypted value handle
    proof: encryptedData.inputProof  // Encryption proof
  }
}

/**
 * Public decryption for multiple handles
 * Used after calling makePubliclyDecryptable in contract
 */
export const publicDecrypt = async (handles: string[]) => {
  const instance = getFhevmInstance()

  if (!handles || handles.length === 0) {
    throw new Error('Handles array cannot be empty')
  }

  console.log('🔐 Starting public decryption, handles:', handles)

  // Call SDK's publicDecrypt method
  const result = await instance.publicDecrypt(handles)

  console.log('🔐 Decryption result structure:', {
    hasClearValues: !!result?.clearValues,
    hasAbiEncoded: !!result?.abiEncodedClearValues,
    hasProof: !!result?.decryptionProof,
  })

  // Extract decrypted values in order
  const values = handles.map(handle => {
    let decrypted

    // SDK 0.3.0-5 format: clearValues contains BigInt values
    if (result?.clearValues && typeof result.clearValues === 'object') {
      decrypted = result.clearValues[handle]
      console.log(`Decrypted ${handle}: ${decrypted} (type: ${typeof decrypted})`)
    } else {
      throw new Error(`Cannot decrypt handle: ${handle}`)
    }

    if (decrypted === undefined || decrypted === null) {
      throw new Error(`Decryption result for handle ${handle} is empty`)
    }

    // Convert BigInt to Number
    const numberValue = typeof decrypted === 'bigint'
      ? Number(decrypted)
      : Number(decrypted)

    if (isNaN(numberValue)) {
      throw new Error(`Invalid decrypted value for handle ${handle}: ${decrypted}`)
    }

    return numberValue
  })

  // Get ABI-encoded cleartext and proof
  const abiEncodedClearValues = result?.abiEncodedClearValues
  const decryptionProof = result?.decryptionProof

  if (!decryptionProof) {
    throw new Error('Decryption proof does not exist')
  }

  // If SDK doesn't provide ABI encoding, manually encode
  let cleartexts = abiEncodedClearValues
  if (!cleartexts) {
    const { AbiCoder } = await import('ethers')
    const abiCoder = new AbiCoder()
    // Generate type array based on number of handles
    const types = handles.map(() => 'uint8') // For moves, use uint8
    cleartexts = abiCoder.encode(types, values)
    console.log('🔐 Manual ABI encoding completed')
  }

  console.log('✅ Decryption completed:', values)

  return {
    cleartexts,        // ABI-encoded data for contract submission
    decryptionProof,   // Decryption proof
    values             // Array of decrypted numbers
  }
}
