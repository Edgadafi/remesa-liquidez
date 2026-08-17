import { TIA } from "@/lib/tia-brand";

interface Props {
  label: string;
  /** Solo para contextos técnicos — morado Solana */
  technical?: boolean;
}

export function TiaPill({ label, technical }: Props) {
  if (technical) {
    return (
      <span
        style={{
          display: "inline-block",
          padding: "4px 10px",
          borderRadius: 3,
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.03em",
          background: `${TIA.solana}18`,
          color: "#6B21A8",
          border: `1px solid ${TIA.solana}44`,
        }}
      >
        {label}
      </span>
    );
  }

  return <span className="pill">{label}</span>;
}
