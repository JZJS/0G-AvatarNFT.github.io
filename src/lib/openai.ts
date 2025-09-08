export async function generatePersona(text: string) {
  const key = (import.meta as any).env.VITE_OPENAI_KEY;
  if (!key) throw new Error("Missing VITE_OPENAI_KEY");

  const prompt = `You are a character builder for an NFT avatar project.
Convert the user's rough description into a concise persona object.

Return ONLY valid JSON with fields:
- name (string; 1-4 words; striking and brandable)
- tagline (string; one punchy sentence ≤120 chars)
- tags (array of 3-6 short keywords)
- longDescription (string; 100-150 words; include background, personality, signature traits, and a short lore hook)

Rules:
- English only.
- No empty fields.
- Avoid sensitive content, illegal topics, medical/financial advice.

USER_INPUT: <<<${text}>>>`;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!r.ok) throw new Error(`OpenAI error ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return data.choices?.[0]?.message?.content ?? "";
} 