"use client";

import { useState } from "react";

export function CopyValue({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);
  const short =
    value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <span className="copy-value">
      <code title={value}>{short}</code>
      <button
        type="button"
        className="copy-value__btn"
        onClick={copy}
        aria-label={copied ? `${label} copiado` : `Copiar ${label}`}
      >
        {copied ? "Copiado" : "Copiar"}
      </button>
    </span>
  );
}
