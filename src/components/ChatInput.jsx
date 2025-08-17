import React, { useState } from "react";

export default function ChatInput({ onSend, disabled, placeholder = "Type your message..." }) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = () => {
    if (inputValue.trim() && !disabled) {
      onSend(inputValue.trim());
      setInputValue("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 rounded border border-[#2F3548] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#5EE616]"
        disabled={disabled}
      />
      <button
        onClick={handleSubmit}
        disabled={!inputValue.trim() || disabled}
        className="px-4 py-2 text-sm font-semibold text-white rounded bg-[#5EE616] hover:bg-[#4dd415] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send
      </button>
    </div>
  );
} 