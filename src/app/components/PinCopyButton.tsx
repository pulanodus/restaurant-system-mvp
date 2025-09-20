'use client';

import { useState } from 'react';

interface PinCopyButtonProps {
  pin: string;
}

export default function PinCopyButton({ pin }: PinCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy PIN:', error);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="text-blue-600 hover:text-blue-800 text-xs transition-colors"
      title={copied ? "Copied!" : "Copy PIN"}
    >
      {copied ? "✅" : "📋"}
    </button>
  );
}
