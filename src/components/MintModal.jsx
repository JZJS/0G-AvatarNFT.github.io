import React from "react";

export default function MintModal({ isOpen, onClose, personaName }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1E2230] border border-[#2F3548] rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          {/* Success Message */}
          <h3 className="text-xl font-semibold text-white mb-2">Mint Successful!</h3>
          <p className="text-gray-300 mb-6">
            Your INFT "{personaName}" has been successfully minted on the blockchain.
          </p>
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#5EE616] text-black font-semibold rounded hover:bg-[#4dd415] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 