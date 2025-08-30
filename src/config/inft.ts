export const OG_CHAIN = {
	// Resolve chainId from env and convert to 0x-prefixed, unpadded hex
	chainId: (() => {
		const dec = Number(import.meta.env.VITE_OG_CHAIN_ID || 16601);
		return '0x' + dec.toString(16);
	})(),
	chainName: import.meta.env.VITE_OG_CHAIN_NAME || '0G Galileo Testnet',
	nativeCurrency: { name: 'OG', symbol: 'OG', decimals: 18 },
	rpcUrls: [import.meta.env.VITE_OG_RPC_URL || 'https://evmrpc-testnet.0g.ai'],
	blockExplorerUrls: [import.meta.env.VITE_OG_EXPLORER_URL || 'https://explorer.0g.ai/galileo']
};

export const INFT_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'; // TODO: replace with deployed address

export const INFT_CONTRACT_ABI = [
	// Preferred signature per INFT guide
	"function mint(address to,string encryptedURI,bytes32 metadataHash) returns (uint256)",
	// Fallback placeholder used earlier
	"function mintINFT(address to,string storageURI,string agentURI) returns (uint256)"
]; 