declare module '0g-indexer' {
	export class Indexer {
		constructor(url: string)
		upload(file: any, rpc: string, signer: any): Promise<[string, any]>
	}
	const _default: any
	export default _default
}

declare module '0g-blob' {
	export class Blob {
		constructor(blob: globalThis.Blob)
		merkleTree(): Promise<[ { rootHash(): string }, any ]>
		close?: () => Promise<void>
	}
	const _default: any
	export default _default
} 