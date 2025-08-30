// Select MetaMask provider explicitly to avoid other injected wallets (e.g., OKX) hijacking window.ethereum
export const getMetaMaskProvider = () => {
	const eth: any = (window as any).ethereum;
	if (!eth) return null;
	if (eth.isMetaMask) return eth;
	if (Array.isArray(eth.providers)) {
		const mm = eth.providers.find((p: any) => p && p.isMetaMask);
		if (mm) return mm;
	}
	return null;
}; 