import React, { useMemo, useState, useCallback } from "react";
import AvatarDropzone from "./components/AvatarDropzone.jsx";
import ChatInput from "./components/ChatInput.jsx";
import MintModal from "./components/MintModal.jsx";
import MintButton from "@/components/MintButton";
import { useNavigate, useSearchParams } from "react-router-dom";
import { generatePersona } from "./lib/openai.js";

function classNames(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default function Explore() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Left pane state
  const [avatarFile, setAvatarFile] = useState(null);
  const [tab, setTab] = useState("url"); // url | text
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");

  // Async state
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Right pane state
  const [persona, setPersona] = useState(null);
  const [storagePointers, setStoragePointers] = useState(null);

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Mint state
  const [isMinted, setIsMinted] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);
  const [avatarBase64, setAvatarBase64] = useState(null);

  // UX controls
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);
  const [logs, setLogs] = useState([]);

  const appendLog = useCallback((line) => {
    const stamped = `[${new Date().toLocaleTimeString()}] ${line}`;
    setLogs(prev => [...prev, stamped].slice(-200));
  }, []);

  const canSubmit = useMemo(() => {
    const hasRequired = (url && url.trim().length > 0) || (text && text.trim().length > 0);
    return hasRequired && !isGenerating;
  }, [url, text, isGenerating]);

  const onGenerate = async () => {
    if (!canSubmit) return;

    // If generated once already, confirm before regenerating
    if (hasGeneratedOnce) {
      const ok = window.confirm("You have already generated a persona. Regenerate and discard current one?");
      if (!ok) return;
    }

    setIsGenerating(true);
    setError(null);
    appendLog("Generating persona...");
    try {
      const inputText = text || url;
      const jsonStr = await generatePersona(inputText);
      const persona = JSON.parse(jsonStr);

      setPersona(persona);
      setStoragePointers(null);
      setIsMinted(false); // Reset mint status for new persona
      setHasGeneratedOnce(true);
      appendLog(`Persona generated: ${persona?.name || 'Unnamed'}`);

      // Generate draftId for URL
      const draftId = Math.random().toString(36).slice(2, 10);
      searchParams.set("draftId", draftId);
      setSearchParams(searchParams, { replace: true });
    } catch (e) {
      setError(e?.message || "Unknown error");
      appendLog(`Generate error: ${e?.message || e}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBack = () => {
    if (hasGeneratedOnce || persona) {
      const ok = window.confirm("You have generated content. Leave this page and discard it?");
      if (!ok) return;
    }
    navigate('/');
  };

  const handleMint = () => {
    // Deprecated by on-chain mint flow; kept for backward compatibility
    setIsMinted(true);
    setShowMintModal(true);
  };

  const closeMintModal = () => {
    setShowMintModal(false);
  };

  const handleTryChat = () => {
    if (!isMinted) return; // Only allow chat if minted
    setIsChatOpen(!isChatOpen);
  };

  const sendChatMessage = useCallback(async (userMessage) => {
    if (!userMessage || !persona) return;

    // Add user message to chat
    const newUserMessage = { role: "user", content: userMessage, timestamp: new Date() };
    setChatMessages(prev => [...prev, newUserMessage]);

    setIsChatLoading(true);

    try {
      // Create context-aware prompt with persona metadata
      const contextPrompt = `You are ${persona.name}, a character with the following background:

Name: ${persona.name}
Tagline: ${persona.tagline}
Tags: ${persona.tags.join(", ")}
Background: ${persona.longDescription}

Please respond as this character. Keep responses in character and engaging. The user is chatting with you directly.

User message: ${userMessage}`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_OPENAI_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: contextPrompt }],
          temperature: 0.8,
          max_tokens: 300
        })
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || "Sorry, I couldn't respond properly.";

      // Add AI response to chat
      const newAiMessage = { role: "assistant", content: aiResponse, timestamp: new Date() };
      setChatMessages(prev => [...prev, newAiMessage]);

    } catch (error) {
      const errorMessage = { role: "system", content: `Error: ${error.message}`, timestamp: new Date() };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  }, [persona]);

  // Separate function to handle chat input changes
  const handleChatInputChange = useCallback((e) => {
    setChatInput(e.target.value);
  }, []);

  const RightEmpty = () => (
    <div className="h-full w-full flex flex-col items-center justify-center gap-4 text-center">
      <img src="/assets/nft/infynft/illustration.png" alt="empty" className="w-40 opacity-70" />
      <div className="text-sm md:text-base opacity-80">Generate your Persona to see preview and actions here</div>
    </div>
  );

  const RightLoading = () => (
    <div className="flex flex-col gap-4">
      <div className="animate-pulse h-32 bg-[#1E2230] rounded" />
      <div className="animate-pulse h-24 bg-[#1E2230] rounded" />
      <div className="h-2 bg-[#2F3548] rounded overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-[#5EE616] to-[#209B72] animate-[progress_2s_ease-in-out_infinite]" style={{ width: "40%" }} />
      </div>
    </div>
  );

  React.useEffect(() => {
    if (!avatarFile) { setAvatarBase64(null); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const commaIdx = result.indexOf(',');
        setAvatarBase64(commaIdx > -1 ? result.slice(commaIdx + 1) : result);
      }
    };
    reader.readAsDataURL(avatarFile);
  }, [avatarFile]);

  const RightCard = () => {
    const metaSize = avatarFile ? `${(avatarFile.size / 1024).toFixed(0)} KB` : "-";
    return (
      <div className="rounded-lg border border-[#2F3548] p-4 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <img
            src={avatarFile ? URL.createObjectURL(avatarFile) : "/assets/nft/infynft/avatar1.png"}
            alt="avatar"
            className="w-16 h-16 rounded-md object-cover border border-[#2F3548]"
          />
          <div className="flex-1 min-w-0">
            <div className="text-lg font-semibold truncate">{persona?.name || "Unnamed Persona"}</div>
            <div className="text-sm opacity-80 line-clamp-2">{persona?.tagline || ""}</div>
            {Array.isArray(persona?.tags) && persona.tags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {persona.tags.map((t, idx) => (
                  <span key={idx} className="text-xs px-2 py-1 rounded-full border border-[#2F3548] bg-[#1E2230]">
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        
        {persona?.longDescription ? (
          <div className="text-sm bg-[#0e152f] border border-[#2F3548] rounded p-3 overflow-auto max-h-40 leading-relaxed">
            {persona.longDescription}
          </div>
        ) : null}
        
        <div className="text-xs opacity-80">
          metadata: {metaSize}
        </div>
        
        <div className="flex gap-3">
          <MintButton
            imageBase64={avatarBase64 || undefined}
            agentMeta={persona || {}}
            onMinted={() => { setIsMinted(true); appendLog('Minted successfully.'); }}
            // pass logger
            logFn={appendLog}
          />
          <button
            className={classNames(
              "px-3 py-2 text-sm font-semibold rounded border",
              isMinted 
                ? "bg-gradient-to-r from-[#5EE616] via-[#209B72] to-teal-500 text-white hover:border-white hover:border border-transparent" 
                : "border-[#2F3548] text-gray-400 cursor-not-allowed opacity-60"
            )}
            onClick={handleTryChat}
            disabled={!isMinted}
          >
            {isChatOpen ? "Close Chat" : "Try Chat"}
          </button>
        </div>

        {/* Chat Interface */}
        {isChatOpen && isMinted && (
          <div className="mt-4 border-t border-[#2F3548] pt-4">
            <div className="text-sm font-medium mb-3">Chat with {persona?.name}</div>
            
            {/* Chat Messages */}
            <div className="h-64 overflow-y-auto bg-[#0e152f] rounded border border-[#2F3548] p-3 mb-3">
              {chatMessages.length === 0 ? (
                <div className="text-center text-sm opacity-70 py-8">
                  Start chatting with your AI persona!
                </div>
              ) : (
                <div className="space-y-3">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === "user" 
                          ? "bg-[#5EE616] text-black" 
                          : msg.role === "assistant"
                          ? "bg-[#2F3548] text-white"
                          : "bg-red-900/20 text-red-400"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[#2F3548] text-white rounded-lg px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                          Thinking...
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chat Input */}
            <ChatInput
              onSend={sendChatMessage}
              disabled={isChatLoading}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[#050C24] font-interfont min-h-screen">
      <div className="relative mx-auto pt-6 flex flex-col items-center justify-start text-[#D2DADF] bg-[url('/assets/nft/infynft/gradient.svg')] bg-cover w-full">
        <div className="absolute top-0 opacity-10 w-full pointer-events-none select-none">
          <img src="/assets/nft/infynft/back.png" alt="backimg" className="mx-auto" />
        </div>
        <section id="explore" className="container mx-auto px-4 md:px-0">
          <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 py-8">
            {/* LeftPane */}
            <div id="left-pane" className="md:col-span-5 flex flex-col gap-6">
              <div className="text-2xl font-semibold">Explore</div>

              {/* Avatar Upload */}
              <div className="flex flex-col gap-2">
                <div className="text-sm opacity-80">Avatar Upload</div>
                <AvatarDropzone id="avatar-drop" onChange={setAvatarFile} />
              </div>

              {/* Character Source Tabs */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 text-sm">
                  <button
                    type="button"
                    className={classNames(
                      "px-3 py-1 rounded border",
                      tab === "url" ? "border-[#5EE616]" : "border-[#2F3548]"
                    )}
                    onClick={() => setTab("url")}
                  >
                    From URL
                  </button>
                  <button
                    type="button"
                    className={classNames(
                      "px-3 py-1 rounded border",
                      tab === "text" ? "border-[#5EE616]" : "border-[#2F3548]"
                    )}
                    onClick={() => setTab("text")}
                  >
                    From Text
                  </button>
                </div>

                {/* URL Input */}
                <div className={tab === "url" ? "block" : "hidden"}>
                  <input
                    id="persona-url"
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Enter source URL"
                    className="w-full rounded border border-[#2F3548] bg-transparent px-3 py-2 outline-none focus:border-[#5EE616]"
                  />
                  {!url && !text ? (
                    <div className="text-xs text-red-400 mt-1">Please fill in either URL or Text</div>
                  ) : null}
                </div>

                {/* Text Input */}
                <div className={tab === "text" ? "block" : "hidden"}>
                  <textarea
                    id="persona-text"
                    rows={6}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Describe your character..."
                    className="w-full rounded border border-[#2F3548] bg-transparent px-3 py-2 outline-none focus:border-[#5EE616]"
                  />
                  {!url && !text ? (
                    <div className="text-xs text-red-400 mt-1">Please fill in either URL or Text</div>
                  ) : null}
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={handleBack}
                  className="px-4 py-2 rounded text-sm font-semibold text-white bg-gradient-to-r from-[#5EE616] via-[#209B72] to-teal-500 hover:border-white hover:border border border-transparent"
                >
                  Back
                </button>
                <button
                  id="btn-generate"
                  disabled={!canSubmit}
                  onClick={onGenerate}
                  className={classNames(
                    "px-4 py-2 rounded text-sm font-semibold",
                    "text-white",
                    canSubmit ? "bg-gradient-to-r from-[#5EE616] via-[#209B72] to-teal-500" : "bg-[#2F3548] opacity-60 cursor-not-allowed"
                  )}
                >
                  {isGenerating ? "Generating..." : (hasGeneratedOnce ? "Regenerate" : "Generate")}
                </button>
              </div>

              {error ? (
                <div className="text-sm text-red-400">{error}</div>
              ) : null}

              {/* Logs panel bottom-left */}
              <div className="mt-4 h-40 overflow-y-auto bg-[#0e152f] rounded border border-[#2F3548] p-3 text-xs">
                {logs.length === 0 ? (
                  <div className="opacity-70">Logs will appear here.</div>
                ) : (
                  <pre className="whitespace-pre-wrap break-words">{logs.join("\n")}</pre>
                )}
              </div>
            </div>

            {/* RightPane */}
            <div id="right-pane" className="md:col-span-7 min-h-[320px] w-full">
              {error ? (
                // Top toast (placeholder)
                <div className="mb-3 rounded border border-red-500/40 bg-red-900/20 px-3 py-2 text-sm">{error}</div>
              ) : null}
              {isGenerating ? <RightLoading /> : persona ? <RightCard /> : <RightEmpty />}
            </div>
          </div>
        </section>
      </div>

      {/* Mint Modal */}
      <MintModal 
        isOpen={showMintModal} 
        onClose={closeMintModal} 
        personaName={persona?.name || "Unknown Persona"}
      />
    </div>
  );
}

/* progress bar animation */
// tailwind 无内置关键帧，使用内联样式类名时可在全局样式中定义 keyframes。如需更精细可移至 CSS。 