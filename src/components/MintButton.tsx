import React, { useState } from 'react';
import { ethers } from 'ethers';
import { getMetaMaskProvider } from '@/lib/provider';
import { OG_CHAIN, INFT_CONTRACT_ADDRESS, INFT_CONTRACT_ABI } from '@/config/inft';
import { uploadTo0GStorage } from '@/lib/ogStorage';

export default function MintButton({ imageBase64, imageUrl, agentMeta, onMinted, logFn }: {
	imageBase64?: string;
	imageUrl?: string;
	agentMeta: any;
	onMinted?: (txHash: string) => void;
	logFn?: (line: string) => void;
}) {
	const [minting, setMinting] = useState(false);
	const [txHash, setTxHash] = useState<string>('');
	const [err, setErr] = useState<string>('');
	const [stage, setStage] = useState<'idle' | 'upload_image' | 'upload_metadata' | 'mint'>('idle');

	const ensureOGChain = async (eth: any) => {
		try {
			await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: OG_CHAIN.chainId }] });
		} catch (e: any) {
			if (e?.code === 4902) {
				await eth.request({ method: 'wallet_addEthereumChain', params: [OG_CHAIN] });
			} else {
				throw e;
			}
		}
	};

	const mintAsINFT = async () => {
		setErr(''); setTxHash(''); setStage('idle');
		const eth = getMetaMaskProvider();
		if (!eth) { alert('Please enable MetaMask'); return; }

		try {
			// 1) connect accounts if needed
			const accounts = await eth.request({ method: 'eth_requestAccounts' });
			const account = accounts[0];
			logFn?.(`Using account: ${account}`);

			// 2) ensure chain
			await ensureOGChain(eth);
			logFn?.(`Switched to chain ${OG_CHAIN.chainName} (${OG_CHAIN.chainId}).`);

			// 3) upload to 0G Storage (image + metadata)
			setStage('upload_image');
			logFn?.('Step 1: Uploading image to 0G Storage...');
			const { metadataURI, metadataHash, imageRoot, rawMetadata, imageTxHash, metadataTxHash } = await uploadTo0GStorage(
				{ imageBase64, imageUrl, agentMeta },
				eth,
				(phase, info) => {
					if (phase === 'image') logFn?.('Image merkle tree built. Submitting transaction...');
					if (phase === 'metadata') {
						logFn?.('Step 2: Uploading metadata.json to 0G Storage...');
						if (info?.metadataPreview) {
							try { logFn?.(`metadata preview: ${JSON.stringify(info.metadataPreview)}`); } catch {}
						}
					}
				}
			);
			if (imageTxHash) logFn?.(`Image tx: ${imageTxHash}`);
			setStage('upload_metadata');
			if (metadataTxHash) logFn?.(`Metadata tx: ${metadataTxHash}`);
			logFn?.(`imageRoot: ${imageRoot}`);
			logFn?.(`metadataURI: ${metadataURI}`);
			logFn?.(`metadataHash: ${metadataHash}`);

			// 4) call INFT contract
			setMinting(true);
			setStage('mint');
			logFn?.('Step 3: Calling INFT contract...');
			const provider = new ethers.BrowserProvider(eth);
			const signer = await provider.getSigner();
			const inft = new ethers.Contract(INFT_CONTRACT_ADDRESS, INFT_CONTRACT_ABI, signer);

			// Try different method names depending on ABI
			let tx;
			if (typeof inft.mint === 'function') {
				tx = await inft.mint(account, metadataURI, metadataHash);
			} else if (typeof inft.mintINFT === 'function') {
				// fallback to older placeholder
				tx = await inft.mintINFT(account, metadataURI, metadataURI);
			} else {
				throw new Error('Mint method not found on INFT contract');
			}

			setTxHash(tx.hash);
			logFn?.(`INFT tx: ${tx.hash}`);
			await tx.wait();
			logFn?.('Mint transaction confirmed.');

			if (onMinted) onMinted(tx.hash);
			alert('Minted successfully!');
		} catch (e: any) {
			console.error(e);
			if (e?.code === 4001) setErr('User rejected the transaction.');
			else if (e?.code === -32000) setErr('Insufficient funds or gas.');
			else setErr(e?.message || 'Mint failed');
			logFn?.(`Error: ${e?.message || e}`);
		} finally {
			setMinting(false);
			setStage('idle');
		}
	};

	const renderMintButtonText = () => {
		if (!minting) return 'Mint as INFT';
		if (stage === 'upload_image') return 'Uploading image to 0G Storage...';
		if (stage === 'upload_metadata') return 'Uploading metadata.json to 0G Storage...';
		if (stage === 'mint') return 'Calling INFT contract...';
		return 'Minting...';
	};

	return (
		<div className="flex items-center gap-3">
			<button
				onClick={mintAsINFT}
				disabled={minting}
				className="hover:border-white hover:border border border-transparent px-3 py-2 text-sm font-semibold text-white rounded bg-gradient-to-r from-[#5EE616] via-[#209B72] to-teal-500 disabled:opacity-60"
			>
				{renderMintButtonText()}
			</button>
			{txHash && (
				<a className="text-xs underline"
					href={`${OG_CHAIN.blockExplorerUrls[0]}/tx/${txHash}`} target="_blank" rel="noreferrer">
					View Tx
				</a>
			)}
			{err && <span className="text-xs text-red-300">{err}</span>}
		</div>
	);
} 