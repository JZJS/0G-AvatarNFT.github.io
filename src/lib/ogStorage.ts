import { Indexer, Blob as ZgBlob } from '@0glabs/0g-ts-sdk';
import { ethers, keccak256, toUtf8Bytes } from 'ethers';
import { getMetaMaskProvider } from './provider';

const RPC_URL = import.meta.env.VITE_OG_RPC_URL || 'https://evmrpc-testnet.0g.ai/';
const INDEXER_RPC = import.meta.env.VITE_OG_INDEXER_RPC || 'https://indexer-storage-testnet-turbo.0g.ai';
const INDEXER_RPC_FALLBACKS: string[] = [
	INDEXER_RPC,
	import.meta.env.VITE_OG_INDEXER_RPC_ALT || 'https://indexer-storage-testnet.0g.ai'
];
const RPC_URL_FALLBACKS: string[] = [
	RPC_URL,
	import.meta.env.VITE_OG_RPC_URL_ALT || 'https://evmrpc-testnet.0g.ai/'
];

async function getMetaMaskSigner(ethOverride?: any) {
	const eth: any = ethOverride || getMetaMaskProvider();
	if (!eth) throw new Error('MetaMask not found');
	const provider = new ethers.BrowserProvider(eth);
	return provider.getSigner();
}

export async function uploadBlobTo0G(blob: Blob, filename: string, ethOverride?: any, onProgress?: (info: Record<string, any>) => void): Promise<{ rootHash: string; txHash: string; }> {
	if (!blob || typeof blob.size !== 'number' || blob.size <= 0) {
		throw new Error('Image blob is empty or invalid');
	}
	const file = new (ZgBlob as any)(blob);
	const [tree, treeErr] = await file.merkleTree();
	if (treeErr) {
		await file.close?.();
		throw new Error(`Merkle error: ${treeErr}`);
	}
	const rootHash = String(tree!.rootHash());

	// Note about mixed content: some storage nodes may be HTTP-only.
	// If your app is served over HTTPS, consider proxying uploads via your server.

	const signer = await getMetaMaskSigner(ethOverride);

	// Retry across multiple Indexer/RPC endpoints
	const errors: string[] = [];
	for (const idxUrl of INDEXER_RPC_FALLBACKS) {
		const indexer = new (Indexer as any)(idxUrl);
		for (const rpcUrl of RPC_URL_FALLBACKS) {
			onProgress?.({ stage: 'upload_start', indexer: idxUrl, rpc: rpcUrl });
			try {
				const uploadPromise = indexer.upload(file as any, rpcUrl, (await signer) as any);
				const [tx, uploadErr] = await Promise.race([
					uploadPromise,
					new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('Upload timeout. Network slow or node unreachable.')), 60000))
				]) as any[];
				if (uploadErr) throw new Error(String(uploadErr));
				onProgress?.({ stage: 'upload_ok', tx, indexer: idxUrl });
				await file.close?.();
				return { rootHash, txHash: tx };
			} catch (e: any) {
				errors.push(`[${idxUrl} -> ${rpcUrl}] ${e?.message || e}`);
				onProgress?.({ stage: 'upload_retry', error: e?.message || String(e) });
			}
		}
	}

	await file.close?.();
	throw new Error(`Upload failed after retries. Details: ${errors.join(' | ')}`);
}

export async function uploadImageAndMetadata(
	imageBlob: Blob,
	agentMeta: Record<string, any>,
	ethOverride?: any,
	onProgress?: (phase: 'image' | 'metadata', info?: Record<string, any>) => void
): Promise<{
	metadataURI: string;
	metadataHash: string;
	imageRoot: string;
	rawMetadata: any;
	imageTxHash: string;
	metadataTxHash: string;
}> {
	onProgress?.('image');
	const { rootHash: imageRoot, txHash: imageTxHash } = await uploadBlobTo0G(imageBlob, 'image.bin', ethOverride, (info) => {
		// Bubble up granular stages for UI logs
		if (info?.stage) onProgress?.('image', info);
	});

	const metadata = {
		image: `zg://${imageRoot}`,
		imageRoot,
		agent: {
			...agentMeta,
			version: agentMeta?.version ?? '1.0'
		},
		createdAt: Date.now()
	};

	const metaJson = JSON.stringify(metadata);
	const metadataHash = keccak256(toUtf8Bytes(metaJson));
	const metaBlob = new Blob([metaJson], { type: 'application/json' });

	onProgress?.('metadata', { metadataPreview: metadata });
	const { rootHash: metaRoot, txHash: metadataTxHash } = await uploadBlobTo0G(metaBlob, 'metadata.json', ethOverride, (info) => {
		if (info?.stage) onProgress?.('metadata', info);
	});

	return {
		metadataURI: `zg://${metaRoot}`,
		metadataHash,
		imageRoot,
		rawMetadata: metadata,
		imageTxHash,
		metadataTxHash
	};
}

function base64ToBlob(base64: string): Blob {
	// Support data URL directly
	if (base64.startsWith('data:')) {
		const arr = base64.split(',');
		const mimeMatch = arr[0].match(/data:(.*);base64/);
		const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
		const bstr = atob(arr[1]);
		const n = bstr.length;
		const u8arr = new Uint8Array(n);
		for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
		return new Blob([u8arr], { type: mime });
	}
	// Plain base64 without data URL
	const bstr = atob(base64);
	const n = bstr.length;
	const u8arr = new Uint8Array(n);
	for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
	return new Blob([u8arr], { type: 'application/octet-stream' });
}

// Wrapper used by MintButton
export async function uploadTo0GStorage(payload: {
	imageBase64?: string;
	imageUrl?: string;
	agentMeta: Record<string, any>;
}, ethOverride?: any, onProgress?: (phase: 'image' | 'metadata', info?: Record<string, any>) => void): Promise<{ metadataURI: string; metadataHash: string; imageRoot: string; rawMetadata?: any; imageTxHash?: string; metadataTxHash?: string; }> {
	let imageBlob: Blob | null = null;
	if (payload.imageBase64) {
		imageBlob = base64ToBlob(payload.imageBase64);
	} else if (payload.imageUrl) {
		const res = await fetch(payload.imageUrl);
		if (!res.ok) throw new Error('Failed to fetch imageUrl');
		imageBlob = await res.blob();
	}
	if (!imageBlob) throw new Error('No image provided');
	if (imageBlob.size <= 0) throw new Error('Fetched/converted image is empty');

	const { metadataURI, metadataHash, imageRoot, rawMetadata, imageTxHash, metadataTxHash } = await uploadImageAndMetadata(imageBlob, payload.agentMeta || {}, ethOverride, onProgress);
	return { metadataURI, metadataHash, imageRoot, rawMetadata, imageTxHash, metadataTxHash };
} 