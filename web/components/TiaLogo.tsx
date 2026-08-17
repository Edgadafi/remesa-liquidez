import Link from "next/link";
import { TIA, TIA_FONT, TIA_TAGLINE_ES } from "@/lib/tia-brand";

type Variant = "light" | "dark" | "monogram";

interface Props {
  variant?: Variant;
  showTagline?: boolean;
  href?: string;
  height?: number;
}

function Wordmark({
  variant,
  height,
  decorative,
}: {
  variant: Variant;
  height: number;
  decorative?: boolean;
}) {
  const isDark = variant === "dark";
  const shield = isDark ? TIA.cream : TIA.institution;
  const letter = isDark ? TIA.forest : TIA.cream;
  const word = isDark ? TIA.cream : TIA.textDark;
  const w = variant === "monogram" ? height : Math.round(height * (200 / 48));
  const a11y = decorative
    ? { "aria-hidden": true as const }
    : { role: "img" as const, "aria-label": "TIA" };

  if (variant === "monogram") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        width={height}
        height={height}
        {...a11y}
      >
        <path
          d="M10 2h20c8 0 14 6 14 14v12c0 8-6 14-14 14H20l-6 12V42C5 42 0 36 0 28V16C0 8 5 2 10 2z"
          fill={shield}
        />
        <text
          x="22"
          y="28"
          textAnchor="middle"
          fontFamily={TIA_FONT.display}
          fontSize="18"
          fontWeight="700"
          fill={letter}
        >
          T
        </text>
        <circle cx="40" cy="10" r="4" fill={TIA.calor} aria-hidden="true" />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 48"
      width={w}
      height={height}
      {...a11y}
    >
      <path
        d="M8 2h18c7 0 12 5 12 12v10c0 7-5 12-12 12H16l-5 10V36C4 36 0 31 0 24V14C0 7 4 2 8 2z"
        fill={shield}
      />
      <text
        x="19"
        y="24"
        textAnchor="middle"
        fontFamily={TIA_FONT.display}
        fontSize="16"
        fontWeight="700"
        fill={letter}
      >
        T
      </text>
      <circle cx="35" cy="8" r="3.5" fill={TIA.calor} aria-hidden="true" />
      <text
        x="52"
        y="32"
        fontFamily={TIA_FONT.display}
        fontSize="28"
        fontWeight="700"
        fill={word}
        letterSpacing="0.06em"
      >
        TIA
      </text>
    </svg>
  );
}

export function TiaLogo({
  variant = "light",
  showTagline = false,
  href = "/",
  height = variant === "monogram" ? 40 : 40,
}: Props) {
  const mark = <Wordmark variant={variant} height={height} decorative={Boolean(href)} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {href ? (
        <Link href={href} style={{ display: "inline-flex", lineHeight: 0 }} aria-label="TIA — inicio">
          {mark}
        </Link>
      ) : (
        mark
      )}
      {showTagline && variant !== "monogram" && (
        <p
          className="text-tagline"
          style={{
            margin: 0,
            color: variant === "dark" ? TIA.onDarkMuted : TIA.textSecondary,
            fontFamily: TIA_FONT.ui,
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {TIA_TAGLINE_ES}
        </p>
      )}
    </div>
  );
}
