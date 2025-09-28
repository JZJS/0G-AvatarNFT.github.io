// 0G Compute（Broker）接入：通过 Broker 动态发现 provider endpoint，并为每次请求生成一次性 headers
import { BrowserProvider, ethers } from 'ethers';
import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker';

const PREFERRED_PROVIDER = (import.meta as any).env.VITE_OG_COMPUTE_PROVIDER || '';
// 官方示例（文档）提供者地址：
// llama-3.3-70b-instruct
const PROVIDER_LLAMA = '0xf07240Efa67755B5311bc75784a061eDB47165Dd';
// deepseek-r1-70b
const PROVIDER_DEEPSEEK = '0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3';

async function getBroker() {
	if (typeof (window as any).ethereum === 'undefined') {
		throw new Error('Please install MetaMask');
	}
    const provider = new BrowserProvider((window as any).ethereum);
    // 覆盖 feeData 为 legacy gas，避免 eth_maxPriorityFeePerGas/1559 报错
    (provider as any).getFeeData = async () => ({
        gasPrice: ethers.parseUnits('1', 'gwei'),
        maxFeePerGas: null,
        maxPriorityFeePerGas: null
    });
	const signer = await provider.getSigner();
	const broker = await createZGComputeNetworkBroker(signer as any);
	return broker;
}

function pickProviderAddress() {
	if (PREFERRED_PROVIDER && /^0x[0-9a-fA-F]{40}$/.test(PREFERRED_PROVIDER)) return PREFERRED_PROVIDER;
	// 默认优先 DeepSeek（可通过 env 覆盖）
	return PROVIDER_DEEPSEEK;
}

// 仅首次确认 provider 签名，避免频繁触发 MetaMask 熔断
const acknowledgedProviders = new Set<string>();
async function ensureProviderAcknowledged(broker: any, providerAddr: string) {
	if (acknowledgedProviders.has(providerAddr)) return;
	try {
		await broker.inference.acknowledgeProviderSigner(providerAddr);
		acknowledgedProviders.add(providerAddr);
	} catch {
		// 已确认或链上报错可忽略
	}
}

async function callChatCompletions(question: string) {
	const broker = await getBroker();
	const providerAddr = pickProviderAddress();
	await ensureProviderAcknowledged(broker, providerAddr);

	const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddr);
	// 使用固定 seed，避免每次内容不同导致频繁链上/签名调用
	const headers = await broker.inference.getRequestHeaders(providerAddr, 'chat');
	// 调试：可在控制台查看实际请求目标
	try { console.debug('[0G Compute] endpoint:', endpoint, 'model:', model); } catch {}

	const r = await fetch(`${endpoint}/chat/completions`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		body: JSON.stringify({
			messages: [{ role: 'user', content: question }],
			model,
			// 可按需添加：temperature, max_tokens 等
		})
	});
	if (!r.ok) throw new Error(`Compute error ${r.status}: ${await r.text().catch(() => '')}`);
	return r.json();
}

export async function generatePersona(text: string) {
	const prompt = `You are a character builder for an NFT avatar project.\nConvert the user's rough description into a concise persona object.\n\nReturn ONLY valid JSON with fields:\n- name (string; 1-4 words; striking and brandable)\n- tagline (string; one punchy sentence ≤120 chars)\n- tags (array of 3-6 short keywords)\n- longDescription (string; 100-150 words; include background, personality, signature traits, and a short lore hook)\n\nRules:\n- English only.\n- No empty fields.\n- Avoid sensitive content, illegal topics, medical/financial advice.\n\nUSER_INPUT: <<<${text}>>>`;
	const data = await callChatCompletions(prompt);
	return data.choices?.[0]?.message?.content ?? '';
}

export async function chatAsPersona(persona: any, userMessage: string) {
	const contextPrompt = `You are ${persona?.name}, a character with the following background:\n\nName: ${persona?.name}\nTagline: ${persona?.tagline}\nTags: ${(Array.isArray(persona?.tags) ? persona.tags.join(', ') : '')}\nBackground: ${persona?.longDescription}\n\nPlease respond as this character. Keep responses in character and engaging. The user is chatting with you directly.\n\nUser message: ${userMessage}`;
	const data = await callChatCompletions(contextPrompt);
	return data.choices?.[0]?.message?.content || "Sorry, I couldn't respond properly.";
}


