/// <reference types="vite/client" />

interface ImportMetaEnv {
        readonly VITE_OPENAI_KEY: string
        readonly VITE_OG_RPC_URL?: string
        readonly VITE_OG_INDEXER_RPC?: string
        readonly VITE_OG_STORAGE_URL?: string
        readonly VITE_OG_COMPUTE_URL?: string
        readonly VITE_OG_CHAIN_ID?: string
        readonly VITE_OG_CHAIN_NAME?: string
        readonly VITE_OG_EXPLORER_URL?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
} 