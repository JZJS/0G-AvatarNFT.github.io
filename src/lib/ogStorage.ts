import { Indexer } from '0g-indexer';
import { Blob as ZgBlob } from '0g-blob';
import { ethers, keccak256, toUtf8Bytes } from 'ethers';
import { getMetaMaskProvider } from './provider';

const RPC_URL = import.meta.env.VITE_OG_RPC_URL || 'https://evmrpc-testnet.0g.ai/';
const INDEXER_RPC =
        import.meta.env.VITE_OG_INDEXER_RPC || 'https://indexer-storage-testnet-turbo.0g.ai';

// Number of times to retry a failed upload. Helps mitigate occasional
// `missing revert data` errors from the network.
const UPLOAD_RETRIES = 2; // total attempts = retries + 1

async function getMetaMaskSigner(ethOverride?: any) {
	const eth: any = ethOverride || getMetaMaskProvider();
	if (!eth) throw new Error('MetaMask not found');
	const provider = new ethers.BrowserProvider(eth);
	return provider.getSigner();
}

export async function uploadBlobTo0G(
        blob: Blob,
        filename: string,
        ethOverride?: any
): Promise<{ rootHash: string; txHash: string }> {
        // Pre-compute Merkle root once; this value is reused on retries.
        const initialFile = new (ZgBlob as any)(blob);
        const [tree, treeErr] = await initialFile.merkleTree();
        if (treeErr) {
                await initialFile.close?.();
                throw new Error(`Merkle error: ${treeErr}`);
        }
        const rootHash = String(tree!.rootHash());

        const signer = await getMetaMaskSigner(ethOverride);
        const indexer = new (Indexer as any)(INDEXER_RPC);

        let lastErr: any;
        for (let attempt = 0; attempt <= UPLOAD_RETRIES; attempt++) {
                const file = attempt === 0 ? initialFile : new (ZgBlob as any)(blob);
                const [tx, uploadErr] = await indexer.upload(
                        file as any,
                        RPC_URL,
                        (await signer) as any
                );
                await file.close?.();
                if (!uploadErr) {
                        return { rootHash, txHash: tx };
                }
                lastErr = uploadErr;
                // Small delay before retrying to avoid immediate repeat failure
                if (attempt < UPLOAD_RETRIES) {
                        await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)));
                }
        }

        const reason =
                (lastErr?.reason || lastErr?.message || lastErr)?.toString() || 'Unknown error';
        throw new Error(`Upload error: ${reason}`);
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
	const { rootHash: imageRoot, txHash: imageTxHash } = await uploadBlobTo0G(imageBlob, 'image.bin', ethOverride);

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
	const { rootHash: metaRoot, txHash: metadataTxHash } = await uploadBlobTo0G(metaBlob, 'metadata.json', ethOverride);

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

	const { metadataURI, metadataHash, imageRoot, rawMetadata, imageTxHash, metadataTxHash } = await uploadImageAndMetadata(imageBlob, payload.agentMeta || {}, ethOverride, onProgress);
	return { metadataURI, metadataHash, imageRoot, rawMetadata, imageTxHash, metadataTxHash };
} 