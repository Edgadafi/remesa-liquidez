#!/usr/bin/env python3
"""Render TIA 9:16 BAF / Stellar ambassador reel stills and assemble MP4."""
from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "frames"
W, H = 1080, 1920
FPS = 30

FOREST = (15, 35, 24)
CREAM = (245, 240, 232)
CALOR = (201, 168, 76)
INST = (26, 74, 46)
SECONDARY = (45, 90, 60)

SERIF = "/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf"
SERIF_REG = "/usr/share/fonts/truetype/noto/NotoSerif-Regular.ttf"
SANS = "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"
SANS_B = "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def cover(path: Path) -> Image.Image:
    img = Image.open(path).convert("RGB")
    src_w, src_h = img.size
    scale = max(W / src_w, H / src_h)
    img = img.resize((int(src_w * scale), int(src_h * scale)), Image.Resampling.LANCZOS)
    left = (img.width - W) // 2
    top = (img.height - H) // 2
    return img.crop((left, top, left + W, top + H))


def wash(base: Image.Image, color: tuple[int, int, int], alpha: int) -> Image.Image:
    overlay = Image.new("RGBA", base.size, color + (alpha,))
    out = base.convert("RGBA")
    out = Image.alpha_composite(out, overlay)
    return out.convert("RGB")


def gradient_bottom(base: Image.Image, color: tuple[int, int, int], height: int = 980) -> Image.Image:
    out = base.convert("RGBA")
    band = Image.new("RGBA", (W, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(band)
    for y in range(height):
        a = int(230 * (y / (height - 1)) ** 1.15)
        draw.line([(0, y), (W, y)], fill=color + (a,))
    out.paste(band, (0, H - height), band)
    return out.convert("RGB")


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        trial = word if not cur else f"{cur} {word}"
        if draw.textlength(trial, font=fnt) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def draw_lines(
    draw: ImageDraw.ImageDraw,
    lines: list[str],
    fnt: ImageFont.FreeTypeFont,
    x: int,
    y: int,
    fill: tuple[int, int, int],
    gap: int,
) -> int:
    for line in lines:
        draw.text((x, y), line, font=fnt, fill=fill)
        y += int(fnt.size * 1.12) + gap
    return y


def rule(draw: ImageDraw.ImageDraw, x: int, y: int, width: int = 92, color: tuple[int, int, int] = CALOR) -> None:
    draw.rectangle([x, y, x + width, y + 4], fill=color)


def eyebrow(draw: ImageDraw.ImageDraw, text: str, x: int, y: int, fill: tuple[int, int, int]) -> None:
    draw.text((x, y), text.upper(), font=font(SANS_B, 26), fill=fill)


def save(img: Image.Image, name: str) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    img.save(path, "PNG", optimize=True)
    return path


def frame_open() -> Path:
    img = cover(ROOT / "bg" / "seal.jpg")
    img = wash(img, FOREST, 48)
    d = ImageDraw.Draw(img)
    eyebrow(d, "BAF Builders Elite  ·  Stellar", 72, 96, CREAM)
    rule(d, 72, 148)
    y = 1480
    y = draw_lines(
        d,
        wrap(d, "Inteligencia de rutas USD a MXN", font(SERIF, 64), W - 144),
        font(SERIF, 64),
        72,
        y,
        CREAM,
        4,
    )
    d.text((72, y + 18), "holatia.app actualizado", font=font(SANS, 32), fill=CALOR)
    return save(img, "01-open.png")


def frame_corridor() -> Path:
    img = cover(ROOT / "bg" / "forest.jpg")
    img = gradient_bottom(img, FOREST, 1100)
    d = ImageDraw.Draw(img)
    eyebrow(d, "Corredor EE. UU. a México", 72, 1080, CALOR)
    rule(d, 72, 1132)
    y = draw_lines(
        d,
        wrap(d, "El costo se esconde en el tipo de cambio.", font(SERIF, 70), W - 144),
        font(SERIF, 70),
        72,
        1160,
        CREAM,
        6,
    )
    d.text((72, y + 22), "~US$63.3B anuales  ·  ~4.54% costo promedio*", font=font(SANS, 28), fill=(212, 232, 218))
    d.text((72, y + 68), "*World Bank · no es una medición de TIA", font=font(SANS, 22), fill=(168, 196, 176))
    return save(img, "02-corridor.png")


def frame_problem() -> Path:
    img = cover(ROOT / "bg" / "cream.jpg")
    img = wash(img, CREAM, 92)
    d = ImageDraw.Draw(img)
    eyebrow(d, "Auditoría y cumplimiento", 72, 420, GROVE := (42, 106, 62))
    rule(d, 72, 474)
    y = draw_lines(
        d,
        wrap(d, "¿Con qué tipo de cambio decidimos?", font(SERIF, 72), W - 144),
        font(SERIF, 72),
        72,
        510,
        FOREST,
        4,
    )
    y = draw_lines(
        d,
        wrap(
            d,
            "Sin un recibo independiente, compliance y aclaraciones de clientes se quedan en logs internos.",
            font(SERIF_REG, 36),
            W - 160,
        ),
        font(SERIF_REG, 36),
        72,
        y + 36,
        INST,
        8,
    )
    return save(img, "03-problem.png")


def frame_product() -> Path:
    img = cover(ROOT / "bg" / "forest.jpg")
    img = wash(img, FOREST, 150)
    d = ImageDraw.Draw(img)
    eyebrow(d, "Qué hace TIA", 72, 360, CALOR)
    rule(d, 72, 412)
    y = draw_lines(
        d,
        wrap(d, "Compara y cotiza. No ejecuta. No custodia.", font(SERIF, 68), W - 144),
        font(SERIF, 68),
        72,
        450,
        CREAM,
        4,
    )
    items = [
        ("01", "Cotización USD/MXN con Bitso de referencia"),
        ("02", "Comparación de rutas en el corredor"),
        ("03", "Recibo firmado ed25519 en IPFS"),
        ("04", "Sin PII ni hashes de pagos privados"),
    ]
    y += 48
    for num, line in items:
        d.text((72, y), num, font=font(SANS_B, 26), fill=CALOR)
        d.text((160, y - 2), line, font=font(SANS, 30), fill=CREAM)
        y += 78
    d.text((72, 1680), "No sustituye un SPEI ni un libro mayor.", font=font(SANS, 26), fill=(196, 214, 200))
    return save(img, "04-product.png")


def frame_offer() -> Path:
    img = cover(ROOT / "bg" / "cream.jpg")
    img = wash(img, CREAM, 100)
    d = ImageDraw.Draw(img)
    eyebrow(d, "Piloto gratuito  ·  cierre 2026", 72, 380, (42, 106, 62))
    rule(d, 72, 434)
    y = draw_lines(
        d,
        wrap(d, "3 fintechs. 30 días. 0%.", font(SERIF, 76), W - 144),
        font(SERIF, 76),
        72,
        470,
        FOREST,
        2,
    )
    cards = [
        ("Cotizar, rutear, auditar", "Sin cargos durante el piloto."),
        ("Cero custodia", "Opera sobre tus rieles actuales."),
        ("OpenAPI + soporte", "x402.holatia.app y el equipo fundador."),
    ]
    y += 56
    for title, body in cards:
        d.rectangle([72, y, W - 72, y + 168], outline=(201, 191, 168), width=2)
        d.rectangle([72, y, 78, y + 168], fill=CALOR)
        d.text((108, y + 28), title, font=font(SANS_B, 30), fill=FOREST)
        d.text((108, y + 82), body, font=font(SANS, 26), fill=INST)
        y += 188
    return save(img, "05-offer.png")


def frame_cta() -> Path:
    img = cover(ROOT / "bg" / "seal.jpg")
    img = wash(img, FOREST, 70)
    d = ImageDraw.Draw(img)
    eyebrow(d, "Solicita uno de 3 cupos", 72, 118, CREAM)
    rule(d, 72, 170)
    y = draw_lines(
        d,
        wrap(d, "Aplica al piloto en holatia.app", font(SERIF, 64), W - 144),
        font(SERIF, 64),
        72,
        1488,
        CREAM,
        4,
    )
    d.text((72, y + 16), "BAF Builders Elite  ×  Stellar", font=font(SANS, 28), fill=CALOR)
    return save(img, "06-cta.png")


def assemble(stills: list[tuple[Path, float]], dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    work = Path("/tmp/tia-reel")
    work.mkdir(parents=True, exist_ok=True)
    clips: list[Path] = []
    for i, (path, seconds) in enumerate(stills):
        frames = int(round(seconds * FPS))
        clip = work / f"clip{i:02d}.mp4"
        zoom = "min(1.0+0.0009*on,1.06)" if i % 2 == 0 else "max(1.06-0.0007*on,1.0)"
        vf = (
            f"zoompan=z='{zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
            f":d={frames}:s=1080x1920:fps={FPS},"
            f"fade=t=in:st=0:d=0.16,fade=t=out:st={max(seconds-0.2, 0):.2f}:d=0.2"
        )
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(path),
                "-vf",
                vf,
                "-frames:v",
                str(frames),
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-crf",
                "17",
                "-preset",
                "medium",
                str(clip),
            ],
            check=True,
        )
        clips.append(clip)
    listing = work / "concat.txt"
    listing.write_text("".join(f"file '{c}'\n" for c in clips), encoding="utf-8")
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(listing),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-crf",
            "17",
            "-movflags",
            "+faststart",
            str(dest),
        ],
        check=True,
    )


def main() -> None:
    stills = [
        (frame_open(), 3.4),
        (frame_corridor(), 4.4),
        (frame_problem(), 4.6),
        (frame_product(), 5.2),
        (frame_offer(), 4.8),
        (frame_cta(), 4.2),
    ]
    artifacts = Path("/opt/cursor/artifacts")
    assemble(stills, artifacts / "tia-piloto-baf-reel.mp4")
    # Square still for LinkedIn / BAF feed
    cta = Image.open(stills[-1][0]).convert("RGB")
    side = 1080
    sq = cta.crop((0, (H - side) // 2, W, (H - side) // 2 + side))
    sq.save(artifacts / "tia-piloto-baf-linkedin-1x1.jpg", "JPEG", quality=92)
    print("frames", [p.name for p, _ in stills])
    print("duration", sum(s for _, s in stills))


if __name__ == "__main__":
    main()
