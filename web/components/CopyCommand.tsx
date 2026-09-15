"use client";

import { useState } from "react";

export function CopyCommand({
  command,
  label,
}: {
  command: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="copy-command">
      <pre>
        <code>{command}</code>
      </pre>
      <button
        type="button"
        className="copy-value__btn"
        onClick={copy}
        aria-label={copied ? `${label} copiado` : `Copiar ${label}`}
      >
        {copied ? "Copiado" : "Copiar curl"}
      </button>
    </div>
  );
}
