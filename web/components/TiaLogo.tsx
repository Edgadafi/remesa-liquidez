import Link from "next/link";
import { TIA_FONT, TIA_TAGLINE_ES, TIA } from "@/lib/tia-brand";

type Variant = "light" | "dark" | "monogram";

interface Props {
  variant?: Variant;
  showTagline?: boolean;
  href?: string;
  height?: number;
}

const SRC: Record<Variant, string> = {
  light: "/brand/tia-logo-horizontal-light.svg",
  dark: "/brand/tia-logo-horizontal-dark.svg",
  monogram: "/brand/tia-monogram.svg",
};

export function TiaLogo({
  variant = "light",
  showTagline = false,
  href = "/",
  height = variant === "monogram" ? 48 : 56,
}: Props) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={SRC[variant]}
      alt="TIA"
      height={height}
      style={{ height, width: "auto", maxWidth: "100%", display: "block" }}
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {href ? (
        <Link href={href} style={{ display: "inline-block", lineHeight: 0 }}>
          {img}
        </Link>
      ) : (
        img
      )}
      {showTagline && variant !== "monogram" && (
        <p
          className="text-tagline"
          style={{
            margin: 0,
            color: TIA.textSecondary,
            fontFamily: TIA_FONT.ui,
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {TIA_TAGLINE_ES}
        </p>
      )}
    </div>
  );
}
