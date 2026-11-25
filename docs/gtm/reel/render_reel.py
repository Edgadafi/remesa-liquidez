#!/usr/bin/env python3
"""Render a 9:16 reel that mirrors holatia.app (cream, cards, circular logo)."""
from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
OUT = ROOT / "frames"
LOGO = REPO / "site" / "logo.png"
W, H = 1080, 1920
FPS = 30
PAD = 56
NAV_H = 96
HOOK_BAND = 68
CONTENT_TOP = NAV_H + HOOK_BAND
FOOT_H = 228
XFADE = 0.26

# holatia.app tokens (site/index.html :root)
FOREST = (15, 35, 24)
INST = (26, 74, 46)
CREAM = (245, 240, 232)
GROVE = (42, 106, 62)
CALOR = (201, 168, 76)
SECONDARY = (45, 90, 60)
LINE = (201, 191, 168)
CARD = (255, 253, 248)
BADGE_BG = (255, 248, 230)
TH_BG = (239, 232, 216)
SOFT = (238, 246, 239)

SERIF = "/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf"
SANS = "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"
SANS_B = "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"


def fnt(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (
        int(a[0] + (b[0] - a[0]) * t),
        int(a[1] + (b[1] - a[1]) * t),
        int(a[2] + (b[2] - a[2]) * t),
    )


def wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        trial = word if not cur else f"{cur} {word}"
        if draw.textlength(trial, font=font) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.FreeTypeFont,
    x: int,
    y: int,
    fill: tuple[int, int, int],
    max_w: int,
    leading: float = 1.18,
) -> int:
    for line in wrap(draw, text, font, max_w):
        draw.text((x, y), line, font=font, fill=fill)
        y += int(font.size * leading)
    return y


def circle_logo(size: int) -> Image.Image:
    src = Image.open(LOGO).convert("RGBA")
    src = src.resize((size, size), Image.Resampling.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((1, 1, size - 2, size - 2), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(src, (0, 0), src)
    out.putalpha(mask)
    ring = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(ring).ellipse((1, 1, size - 2, size - 2), outline=(*CALOR, 115), width=3)
    return Image.alpha_composite(out, ring)


_LOGO_CACHE: dict[int, Image.Image] = {}


def logo_cached(size: int) -> Image.Image:
    if size not in _LOGO_CACHE:
        _LOGO_CACHE[size] = circle_logo(size)
    return _LOGO_CACHE[size]


def paste_logo(img: Image.Image, xy: tuple[int, int], size: int) -> None:
    logo = logo_cached(size)
    base = img.convert("RGBA")
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(sh)
    sdraw.ellipse(
        (xy[0] + 10, xy[1] + 22, xy[0] + size - 10, xy[1] + size + 14),
        fill=(15, 35, 24, 40),
    )
    sh = sh.filter(ImageFilter.GaussianBlur(20))
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    layer.paste(logo, xy, logo)
    composed = Image.alpha_composite(Image.alpha_composite(base, sh), layer)
    img.paste(composed.convert("RGB"))


_CREAM_BG: Image.Image | None = None


def cream_canvas() -> Image.Image:
    """Site cream with paper grain, a warm radial, and a faint TIA watermark."""
    global _CREAM_BG
    if _CREAM_BG is not None:
        return _CREAM_BG.copy()
    img = Image.new("RGB", (W, H), CREAM)

    # Warm paper wash: card-white in the hero, slightly deeper cream at the footer.
    wash = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    wdraw = ImageDraw.Draw(wash)
    for y in range(H):
        t = y / (H - 1)
        a = int(28 + 18 * t)
        color = lerp((255, 253, 248), (236, 228, 214), t)
        wdraw.line([(0, y), (W, y)], fill=(*color, a))
    img = Image.alpha_composite(img.convert("RGBA"), wash).convert("RGB")

    radial = Image.new("L", (W, H), 0)
    rdraw = ImageDraw.Draw(radial)
    rdraw.ellipse((-180, -40, W + 180, 980), fill=255)
    radial = radial.filter(ImageFilter.GaussianBlur(90))
    glow = Image.new("RGBA", (W, H), (*CARD, 0))
    glow.putalpha(radial.point(lambda v: int(v * 0.48)))
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")

    vig = Image.new("L", (W, H), 0)
    vdraw = ImageDraw.Draw(vig)
    vdraw.rectangle([0, 0, W, H], fill=0)
    vdraw.rounded_rectangle([40, 30, W - 40, H - 30], radius=80, fill=255)
    vig = ImageChops.invert(vig.filter(ImageFilter.GaussianBlur(70)))
    forest_wash = Image.new("RGBA", (W, H), (*FOREST, 0))
    forest_wash.putalpha(vig.point(lambda v: int(v * 0.10)))
    img = Image.alpha_composite(img.convert("RGBA"), forest_wash).convert("RGB")

    grain = Image.effect_noise((W, H), 16).convert("L")
    grain_rgba = Image.merge(
        "RGBA",
        (
            Image.new("L", (W, H), 15),
            Image.new("L", (W, H), 35),
            Image.new("L", (W, H), 24),
            grain.point(lambda v: 16 if v < 122 else 0),
        ),
    )
    img = Image.alpha_composite(img.convert("RGBA"), grain_rgba).convert("RGB")

    mark = logo_cached(820).copy()
    mark.putalpha(mark.getchannel("A").point(lambda a: int(a * 0.07)))
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.paste(mark, ((W - 820) // 2, 780), mark)
    img = Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")

    gold = Image.new("L", (W, H), 0)
    ImageDraw.Draw(gold).ellipse((120, 860, W - 120, 1680), fill=255)
    gold = gold.filter(ImageFilter.GaussianBlur(80))
    calor_wash = Image.new("RGBA", (W, H), (*CALOR, 0))
    calor_wash.putalpha(gold.point(lambda v: int(v * 0.07)))
    img = Image.alpha_composite(img.convert("RGBA"), calor_wash).convert("RGB")
    _CREAM_BG = img
    return img.copy()


def draw_nav(img: Image.Image) -> None:
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, NAV_H], fill=(245, 240, 232))
    d.line([(0, NAV_H), (W, NAV_H)], fill=LINE, width=1)
    logo = logo_cached(40)
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    layer.paste(logo, (PAD, (NAV_H - 40) // 2), logo)
    img.paste(Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB"))
    d = ImageDraw.Draw(img)
    d.text((PAD + 52, 32), "TIA", font=fnt(SERIF, 26), fill=FOREST)
    btn_w, btn_h = 236, 44
    bx, by = W - PAD - btn_w, (NAV_H - btn_h) // 2
    d.rounded_rectangle([bx, by, bx + btn_w, by + btn_h], radius=8, fill=FOREST)
    label = "Solicitar piloto"
    font = fnt(SANS_B, 18)
    tw = d.textlength(label, font=font)
    d.text((bx + (btn_w - tw) / 2, by + 11), label, font=font, fill=CREAM)


def draw_footer(img: Image.Image, text: str) -> None:
    top = H - FOOT_H
    d = ImageDraw.Draw(img)
    d.rectangle([0, top, W, H], fill=TH_BG)
    d.line([(0, top), (W, top)], fill=LINE, width=1)
    logo = logo_cached(40)
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    layer.paste(logo, (PAD, top + 28), logo)
    img.paste(Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB"))
    d = ImageDraw.Draw(img)
    d.text((PAD + 52, top + 34), "TIA", font=fnt(SERIF, 26), fill=FOREST)
    y = draw_wrapped(
        d,
        "Prototipo: compara y cotiza USD a MXN. No ejecuta pagos, no custodia fondos, 0 clientes de pago. Recibos en IPFS, no on-chain.",
        fnt(SANS, 22),
        PAD,
        top + 84,
        SECONDARY,
        W - PAD * 2,
        1.28,
    )
    d.text((PAD, y + 12), text, font=fnt(SANS_B, 22), fill=GROVE)


def badge(draw: ImageDraw.ImageDraw, text: str, x: int, y: int) -> int:
    font = fnt(SANS_B, 20)
    label = text.upper()
    pad_x, pad_y = 16, 10
    tw = int(draw.textlength(label, font=font))
    w, h = tw + pad_x * 2, 20 + pad_y * 2
    draw.rounded_rectangle([x, y, x + w, y + h], radius=999, fill=BADGE_BG, outline=CALOR, width=2)
    draw.text((x + pad_x, y + pad_y), label, font=font, fill=INST)
    return y + h


def primary_btn(draw: ImageDraw.ImageDraw, text: str, x: int, y: int, width: int) -> int:
    h = 68
    draw.rounded_rectangle([x, y, x + width, y + h], radius=8, fill=FOREST)
    font = fnt(SANS_B, 26)
    tw = draw.textlength(text, font=font)
    draw.text((x + (width - tw) / 2, y + 18), text, font=font, fill=CREAM)
    return y + h


def ghost_btn(draw: ImageDraw.ImageDraw, text: str, x: int, y: int, width: int) -> int:
    h = 68
    draw.rounded_rectangle([x, y, x + width, y + h], radius=8, outline=INST, width=2)
    font = fnt(SANS_B, 24)
    tw = draw.textlength(text, font=font)
    draw.text((x + (width - tw) / 2, y + 19), text, font=font, fill=FOREST)
    return y + h


def text_h(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_w: int, leading: float) -> int:
    return max(1, len(wrap(draw, text, font, max_w))) * int(font.size * leading)


def card(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    w: int,
    title: str,
    body: str,
    step: str | None = None,
) -> int:
    inner = w - 48
    title_font, body_font = fnt(SANS_B, 30), fnt(SANS, 24)
    h = 24
    if step:
        h += 50
    h += text_h(draw, title, title_font, inner, 1.14) + 8
    h += text_h(draw, body, body_font, inner, 1.28) + 24
    draw.rounded_rectangle([x, y, x + w, y + h], radius=12, fill=CARD, outline=LINE, width=2)
    cy = y + 22
    if step:
        draw.rounded_rectangle([x + 24, cy, x + 64, cy + 40], radius=6, fill=FOREST)
        tw = draw.textlength(step, font=fnt(SANS_B, 20))
        draw.text((x + 24 + (40 - tw) / 2, cy + 8), step, font=fnt(SANS_B, 20), fill=CREAM)
        cy += 50
    cy = draw_wrapped(draw, title, title_font, x + 24, cy, FOREST, inner, 1.14)
    draw_wrapped(draw, body, body_font, x + 24, cy + 8, SECONDARY, inner, 1.28)
    return y + h


def metric(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, kicker: str, label: str) -> int:
    inner = w - 48
    h = 18 + 36 + 8 + text_h(draw, label, fnt(SANS, 22), inner, 1.2) + 18
    draw.rounded_rectangle([x, y, x + w, y + h], radius=8, fill=CARD, outline=LINE, width=2)
    draw.rectangle([x, y + 12, x + 6, y + h - 12], fill=CALOR)
    draw.text((x + 24, y + 16), kicker, font=fnt(SANS_B, 30), fill=FOREST)
    draw_wrapped(draw, label, fnt(SANS, 22), x + 24, y + 56, SECONDARY, inner, 1.2)
    return y + h


def note(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, title: str, body: str) -> int:
    inner = w - 48
    h = 22 + text_h(draw, title, fnt(SANS_B, 26), inner, 1.14)
    h += 8 + text_h(draw, body, fnt(SANS, 22), inner, 1.28) + 22
    draw.rounded_rectangle([x, y, x + w, y + h], radius=12, fill=CARD, outline=INST, width=2)
    cy = draw_wrapped(draw, title, fnt(SANS_B, 26), x + 24, y + 20, FOREST, inner, 1.14)
    draw_wrapped(draw, body, fnt(SANS, 22), x + 24, cy + 8, SECONDARY, inner, 1.28)
    return y + h


def field(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], label: str, value: str) -> None:
    x0, y0, x1, y1 = box
    draw.text((x0, y0), label.upper(), font=fnt(SANS_B, 16), fill=SECONDARY)
    draw.rounded_rectangle([x0, y0 + 28, x1, y1], radius=8, fill=(255, 255, 255), outline=LINE, width=2)
    draw.text((x0 + 16, y0 + 42), value, font=fnt(SANS, 24), fill=FOREST)


def eyebrow(draw: ImageDraw.ImageDraw, text: str, x: int, y: int) -> int:
    font = fnt(SANS_B, 22)
    label = text.upper()
    draw.text((x, y), label, font=font, fill=GROVE)
    tw = int(draw.textlength(label, font=font))
    draw.line([(x, y + 34), (x + min(tw, 220), y + 34)], fill=CALOR, width=3)
    return y + 48


def save(img: Image.Image, name: str) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    img.save(path, "PNG", optimize=True)
    return path


def captions_png(hook: str, sub: str, name: str) -> Path:
    """Hook under the TIA nav + subtitle above the footer. Does not cover CTAs."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    hook_font = fnt(SANS_B, 26)
    max_w = W - PAD * 2 - 48
    hook_lines = wrap(d, hook, hook_font, max_w)
    pad_x, pad_y, gap = 26, 12, 4
    line_h = int(hook_font.size * 1.12)
    bw = min(W - PAD * 2, int(max(d.textlength(line, font=hook_font) for line in hook_lines)) + pad_x * 2)
    bh = pad_y * 2 + line_h * len(hook_lines) + gap * (len(hook_lines) - 1)
    x = (W - bw) // 2
    y = NAV_H + 10
    d.rounded_rectangle([x + 4, y + 6, x + bw + 4, y + bh + 6], radius=18, fill=(15, 35, 24, 45))
    d.rounded_rectangle([x, y, x + bw, y + bh], radius=18, fill=(*FOREST, 246))
    d.rounded_rectangle([x, y, x + bw, y + bh], radius=18, outline=(*CALOR, 230), width=2)
    ty = y + pad_y - 1
    for line in hook_lines:
        tw = d.textlength(line, font=hook_font)
        d.text((x + (bw - tw) / 2, ty), line, font=hook_font, fill=(*CREAM, 255))
        ty += line_h + gap

    sub_font = fnt(SANS_B, 31)
    sub_lines = wrap(d, sub, sub_font, W - PAD * 2 - 56)
    s_line = int(sub_font.size * 1.16)
    s_pad_x, s_pad_y = 32, 16
    sw = min(W - PAD * 2, int(max(d.textlength(line, font=sub_font) for line in sub_lines)) + s_pad_x * 2)
    sh = s_pad_y * 2 + s_line * len(sub_lines)
    sx = (W - sw) // 2
    sy = H - FOOT_H - sh - 20
    d.rounded_rectangle([sx + 4, sy + 6, sx + sw + 4, sy + sh + 6], radius=14, fill=(15, 35, 24, 40))
    d.rounded_rectangle([sx, sy, sx + sw, sy + sh], radius=14, fill=(*FOREST, 236))
    d.rounded_rectangle([sx, sy, sx + sw, sy + sh], radius=14, outline=(*CALOR, 200), width=2)
    sty = sy + s_pad_y - 1
    for line in sub_lines:
        tw = d.textlength(line, font=sub_font)
        d.text((sx + (sw - tw) / 2, sty), line, font=sub_font, fill=(*CREAM, 255))
        sty += s_line
    path = OUT / name
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG")
    return path


def synth_bed(path: Path, seconds: float) -> Path:
    """Original low-volume instrumental bed (pad + arpeggio). No third-party sample."""
    import wave

    import numpy as np

    sr = 44100
    n = int(round(seconds * sr))
    t = np.arange(n, dtype=np.float64) / sr
    bpm = 94
    beat = 60.0 / bpm
    y = np.zeros(n, dtype=np.float64)
    roots = [130.81, 174.61, 196.00, 146.83]  # C F G D
    for i, f0 in enumerate(roots * 24):
        t0 = i * 4 * beat
        if t0 >= seconds:
            break
        dur = 4 * beat + 0.55
        idx = (t >= t0) & (t < t0 + dur)
        tt = t[idx] - t0
        e = np.minimum(tt / 0.2, 1.0) * np.exp(-0.28 * tt)
        e *= np.clip((dur - tt) / 0.55, 0, 1)
        for mul, amp in ((1.0, 0.10), (1.5, 0.045), (2.0, 0.028), (3.0, 0.012)):
            y[idx] += amp * e * np.sin(2 * np.pi * f0 * mul * t[idx])
    pent = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]
    for i in range(int(seconds / (beat * 0.5)) + 1):
        t0 = i * beat * 0.5
        if t0 >= seconds:
            break
        f = pent[(i * 2) % len(pent)] if i % 4 else pent[(i * 3) % len(pent)]
        idx = (t >= t0) & (t < t0 + 0.32)
        tt = t[idx] - t0
        e = np.exp(-6.5 * tt) * np.minimum(tt / 0.012, 1.0)
        y[idx] += 0.038 * e * np.sin(2 * np.pi * f * t[idx])
        y[idx] += 0.012 * e * np.sin(2 * np.pi * f * 2.0 * t[idx])
    rng = np.random.default_rng(11)
    y += 0.0035 * rng.standard_normal(n)
    fade_in = 0.85
    fade_out = min(1.5, max(0.8, seconds * 0.08))
    y *= np.clip(t / fade_in, 0, 1) * np.clip((seconds - t) / fade_out, 0, 1)
    y = np.tanh(y * 1.35)
    peak = float(np.max(np.abs(y))) or 1.0
    y = 0.22 * y / peak
    stereo = np.column_stack((y, y * 0.96))
    pcm = np.int16(np.clip(stereo, -1.0, 1.0) * 32767)
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "w") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(sr)
        wav.writeframes(pcm.tobytes())
    return path


def frame_open() -> Path:
    img = cream_canvas()
    draw_nav(img)
    paste_logo(img, ((W - 240) // 2, CONTENT_TOP + 56), 240)
    d = ImageDraw.Draw(img)
    y = badge(d, "Piloto abierto cierre 2026  ·  3 cupos", PAD, CONTENT_TOP + 312)
    y = draw_wrapped(
        d,
        "Inteligencia de rutas USD a MXN y recibos verificables.",
        fnt(SERIF, 50),
        PAD,
        y + 20,
        FOREST,
        W - PAD * 2,
        1.12,
    )
    y = draw_wrapped(
        d,
        "Capa de inteligencia para fintechs, wallets y agentes. TIA compara y cotiza: no ejecuta pagos, no custodia fondos ni sustituye un SPEI.",
        fnt(SANS, 28),
        PAD,
        y + 16,
        SECONDARY,
        W - PAD * 2,
        1.3,
    )
    y = primary_btn(d, "Aplicar al Piloto de 30 días", PAD, y + 28, W - PAD * 2)
    y = ghost_btn(d, "Probar comparación en vivo", PAD, y + 14, W - PAD * 2)
    y += 28
    y = metric(d, PAD, y, W - PAD * 2, "~4.54%", "Costo promedio de mercado (World Bank, no es una medición de TIA)")
    y = metric(d, PAD, y + 14, W - PAD * 2, "Bitso", "FX de referencia: bid, ask y spread")
    metric(d, PAD, y + 14, W - PAD * 2, "IPFS", "Recibos firmados (ed25519), no anclados on-chain")
    draw_footer(img, "holatia.app  ·  BAF Builders Elite  ·  Stellar")
    return save(img, "01-open.png")


def frame_problem() -> Path:
    img = cream_canvas()
    draw_nav(img)
    d = ImageDraw.Draw(img)
    y = eyebrow(d, "El problema", PAD, CONTENT_TOP + 8)
    y = draw_wrapped(
        d,
        "Spreads opacos y sin rastro auditable.",
        fnt(SERIF, 50),
        PAD,
        y + 8,
        FOREST,
        W - PAD * 2,
        1.12,
    )
    y = draw_wrapped(
        d,
        "Las fintechs del corredor pierden margen cuando el costo real vive en el tipo de cambio, no en la comisión visible, y no queda un recibo verificable de cada decisión.",
        fnt(SANS, 28),
        PAD,
        y + 16,
        SECONDARY,
        W - PAD * 2,
        1.3,
    )
    cards = [
        ("Precios opacos", "Fees y spreads mezclados: difícil saber qué cuesta de verdad un USD a MXN."),
        ("Sin auditoría de la cotización", "Cuando compliance pregunta con qué tipo de cambio decidimos, no hay un hash que mostrar."),
        ("Cero custodia", "Integrar un riel que custodia fondos implica licencias. TIA no toca el dinero."),
    ]
    y += 24
    for title, body in cards:
        y = card(d, PAD, y, W - PAD * 2, title, body) + 16
    note(
        d,
        PAD,
        y + 8,
        W - PAD * 2,
        "Capa de inteligencia, no un procesador",
        "TIA opera sobre tus rieles actuales. No sustituye al procesador de pagos ni a un SPEI.",
    )
    draw_footer(img, "Corredor EE. UU. a México  ·  ~US$63.3B anuales")
    return save(img, "02-problem.png")


def frame_corridor() -> Path:
    img = cream_canvas()
    draw_nav(img)
    d = ImageDraw.Draw(img)
    y = eyebrow(d, "Demo en vivo", PAD, CONTENT_TOP + 8)
    y = draw_wrapped(
        d,
        "Compara rutas USD a MXN.",
        fnt(SERIF, 52),
        PAD,
        y + 8,
        FOREST,
        W - PAD * 2,
        1.12,
    )
    y = draw_wrapped(
        d,
        "Monto de referencia: US$412 (remesa promedio Banxico). Las cifras por ruta son supuestos del modelo TIA, no un pago ejecutado.",
        fnt(SANS, 26),
        PAD,
        y + 16,
        SECONDARY,
        W - PAD * 2,
        1.3,
    )
    y += 24
    y = metric(d, PAD, y, W - PAD * 2, "~4.54%", "Costo promedio de mercado (World Bank, no es una medición de TIA)")
    y = metric(d, PAD, y + 14, W - PAD * 2, "Bitso", "FX de referencia: bid, ask y spread")
    y = metric(d, PAD, y + 14, W - PAD * 2, "IPFS", "Recibos firmados (ed25519), no anclados on-chain") + 20
    # Live-demo table chrome from the site
    th, row = 56, 72
    table_h = th + row * 3
    d.rounded_rectangle([PAD, y, W - PAD, y + table_h], radius=12, fill=CARD, outline=LINE, width=2)
    d.rectangle([PAD + 2, y + 2, W - PAD - 2, y + th], fill=TH_BG)
    d.text((PAD + 24, y + 18), "RIEL", font=fnt(SANS_B, 18), fill=SECONDARY)
    d.text((PAD + 360, y + 18), "TIEMPO", font=fnt(SANS_B, 18), fill=SECONDARY)
    d.text((PAD + 640, y + 18), "NOTA", font=fnt(SANS_B, 18), fill=SECONDARY)
    rows = [
        (SOFT, "SPEI", "Minutos", "Mejor ruta"),
        (CARD, "Stablecoin", "Horas", "Modelo TIA"),
        (CARD, "Bitso", "Mismo día", "FX referencia"),
    ]
    for i, (bg, riel, tiempo, nota) in enumerate(rows):
        top = y + th + i * row
        d.rectangle([PAD + 2, top, W - PAD - 2, top + row - (1 if i < 2 else 0)], fill=bg)
        d.text((PAD + 24, top + 22), riel, font=fnt(SANS_B, 24), fill=FOREST)
        d.text((PAD + 360, top + 22), tiempo, font=fnt(SANS, 22), fill=SECONDARY)
        if i == 0:
            d.rounded_rectangle([PAD + 620, top + 18, PAD + 780, top + 52], radius=999, fill=FOREST)
            d.text((PAD + 640, top + 24), nota, font=fnt(SANS_B, 16), fill=CREAM)
        else:
            d.text((PAD + 640, top + 22), nota, font=fnt(SANS, 22), fill=SECONDARY)
    draw_footer(img, "Demo en vivo en holatia.app")
    return save(img, "03-corridor.png")


def frame_product() -> Path:
    img = cream_canvas()
    draw_nav(img)
    d = ImageDraw.Draw(img)
    y = eyebrow(d, "Cómo funciona", PAD, CONTENT_TOP + 8)
    y = draw_wrapped(
        d,
        "Cuatro pasos. Tú ejecutas el pago.",
        fnt(SERIF, 50),
        PAD,
        y + 8,
        FOREST,
        W - PAD * 2,
        1.12,
    )
    y = draw_wrapped(
        d,
        "El flujo termina en una señal y un recibo. La liquidación ocurre en los rieles de la fintech, no en TIA.",
        fnt(SANS, 26),
        PAD,
        y + 14,
        SECONDARY,
        W - PAD * 2,
        1.28,
    )
    steps = [
        ("1", "Cotizar", "Tipo de cambio USD/MXN de referencia Bitso: bid, ask y spread."),
        ("2", "Comparar rutas", "Costos y tiempos entre rieles. No es una cotización ejecutable."),
        ("3", "Decidir", "Tu tesorería ejecuta sobre tus rieles, en el momento que elija."),
        ("4", "Auditar", "Recibo ed25519 anclado en IPFS (Nirium). Header X-TIA-Audit-Hash."),
    ]
    y += 22
    for n, title, body in steps:
        y = card(d, PAD, y, W - PAD * 2, title, body, step=n) + 14
    draw_footer(img, "La liquidación ocurre en los rieles de la fintech, no en TIA.")
    return save(img, "04-product.png")


def frame_offer() -> Path:
    img = cream_canvas()
    draw_nav(img)
    d = ImageDraw.Draw(img)
    y = eyebrow(d, "Piloto gratuito  ·  cierre 2026", PAD, CONTENT_TOP + 36)
    y = draw_wrapped(
        d,
        "Por qué unirse (3 fintechs, cierre 2026)",
        fnt(SERIF, 48),
        PAD,
        y + 8,
        FOREST,
        W - PAD * 2,
        1.12,
    )
    cards = [
        ("0% durante 30 días", "Acceso sin cargos a cotización, ruteo y auditoría. Fuera del piloto, las llamadas se liquidan en USDC vía x402."),
        ("Cero custodia y sin PII", "No movemos fondos ni datos personales. Opera como capa de inteligencia sobre tus rieles actuales."),
        ("Soporte y OpenAPI", "Especificación OpenAPI en x402.holatia.app y acompañamiento del equipo fundador."),
    ]
    y += 24
    for title, body in cards:
        y = card(d, PAD, y, W - PAD * 2, title, body) + 16
    y = primary_btn(d, "Asegura uno de 3 lugares", PAD, y + 12, W - PAD * 2)
    draw_footer(img, "Verificación en /v1/audit sigue siendo gratuita.")
    return save(img, "05-offer.png")


def frame_cta() -> Path:
    img = cream_canvas()
    draw_nav(img)
    paste_logo(img, ((W - 180) // 2, CONTENT_TOP + 4), 180)
    d = ImageDraw.Draw(img)
    y = eyebrow(d, "Asegura uno de 3 lugares", PAD, CONTENT_TOP + 200)
    y = draw_wrapped(
        d,
        "Piloto Q4 2026. Confirmamos por correo.",
        fnt(SERIF, 44),
        PAD,
        y + 8,
        FOREST,
        W - PAD * 2,
        1.12,
    )
    y = draw_wrapped(
        d,
        "BAF Builders Elite x Stellar. Aplica en holatia.app.",
        fnt(SANS, 26),
        PAD,
        y + 12,
        SECONDARY,
        W - PAD * 2,
        1.28,
    )
    gap = 16
    fw = (W - PAD * 2 - gap) // 2
    top = y + 28
    field(d, (PAD, top, PAD + fw, top + 92), "Nombre completo", "Tu nombre")
    field(d, (PAD + fw + gap, top, W - PAD, top + 92), "Correo corporativo", "tu@fintech.com")
    top += 108
    field(d, (PAD, top, PAD + fw, top + 92), "Fintech / Empresa", "Nombre de la empresa")
    field(d, (PAD + fw + gap, top, W - PAD, top + 92), "Rol", "Founder  ·  CTO  ·  Product")
    top += 108
    field(d, (PAD, top, W - PAD, top + 92), "Volumen mensual, corredor EE. UU. a México", "US$100k  a  US$1M")
    top += 120
    y = primary_btn(d, "Enviar solicitud", PAD, top, W - PAD * 2)
    note(
        d,
        PAD,
        y + 22,
        W - PAD * 2,
        "Prototipo honesto",
        "TIA compara y cotiza el corredor USD a MXN. No ejecuta pagos, no custodia fondos, 0 clientes de pago. Recibos en IPFS, no on-chain.",
    )
    draw_footer(img, "Compara y cotiza. No ejecuta. No custodia.")
    return save(img, "06-cta.png")


def frame_close() -> Path:
    img = cream_canvas()
    draw_nav(img)
    paste_logo(img, ((W - 220) // 2, CONTENT_TOP + 24), 220)
    d = ImageDraw.Draw(img)
    y = CONTENT_TOP + 268
    inner = W - PAD * 2
    d.rounded_rectangle([PAD, y, W - PAD, y + 168], radius=16, fill=FOREST)
    d.rounded_rectangle([PAD, y, W - PAD, y + 168], radius=16, outline=CALOR, width=3)
    y = draw_wrapped(
        d,
        "30 días gratis  ·  3 cupos  ·  Cero custodia",
        fnt(SANS_B, 32),
        PAD + 28,
        y + 36,
        CREAM,
        inner - 56,
        1.16,
    )
    draw_wrapped(
        d,
        "El piloto cierra 2026. Confirmamos por correo.",
        fnt(SANS, 24),
        PAD + 28,
        y + 12,
        (212, 232, 216),
        inner - 56,
        1.25,
    )
    y = CONTENT_TOP + 268 + 168 + 28
    y = draw_wrapped(
        d,
        "Aplica ahora. Un enlace, dos puertas.",
        fnt(SERIF, 44),
        PAD,
        y,
        FOREST,
        inner,
        1.12,
    )
    y += 20
    for url, label in (
        ("holatia.app", "Landing del piloto"),
        ("stellar.holatia.app", "Misma oferta en Stellar"),
    ):
        d.rounded_rectangle([PAD, y, W - PAD, y + 96], radius=12, fill=CARD, outline=LINE, width=2)
        d.rectangle([PAD, y + 14, PAD + 6, y + 82], fill=CALOR)
        d.text((PAD + 28, y + 16), url, font=fnt(SANS_B, 30), fill=FOREST)
        d.text((PAD + 28, y + 54), label, font=fnt(SANS, 22), fill=SECONDARY)
        y += 112
    primary_btn(d, "Aplicar al Piloto de 30 días", PAD, y + 8, inner)
    draw_footer(img, "holatia.app  ·  stellar.holatia.app")
    return save(img, "07-close.png")


def _run_ffmpeg(args: list[str]) -> None:
    proc = subprocess.run(args, capture_output=True, text=True)
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "")[-2000:]
        raise RuntimeError(f"ffmpeg failed ({proc.returncode}): {err}")


def still_to_clip(path: Path, seconds: float, dest: Path, zoom: str | None) -> int:
    frames = int(round(seconds * FPS))
    if zoom:
        if zoom == "hero":
            z, y = "min(1.0+0.00062*on,1.07)", "max(0\\,ih/2-(ih/zoom/2)-70)"
        elif zoom == "table":
            z, y = "min(1.0+0.00058*on,1.065)", "min(ih-ih/zoom\\,ih/2-(ih/zoom/2)+90)"
        else:
            z, y = "min(1.0+0.0005*on,1.055)", "ih/2-(ih/zoom/2)"
        vf = (
            f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='{y}'"
            f":d={frames}:s=1080x1920:fps={FPS}"
        )
        _run_ffmpeg(
            [
                "ffmpeg", "-y", "-i", str(path), "-vf", vf,
                "-frames:v", str(frames), "-r", str(FPS),
                "-c:v", "libx264", "-pix_fmt", "yuv420p",
                "-crf", "17", "-preset", "medium", str(dest),
            ]
        )
        return frames
    _run_ffmpeg(
        [
            "ffmpeg", "-y", "-loop", "1", "-i", str(path),
            "-frames:v", str(frames), "-r", str(FPS),
            "-vf", "scale=1080:1920,format=yuv420p",
            "-c:v", "libx264", "-crf", "17", "-preset", "medium",
            str(dest),
        ]
    )
    return frames


def burn_captions(clip: Path, overlay: Path, dest: Path, seconds: float) -> None:
    fade_out_at = max(seconds - 0.34, 0.9)
    fc = (
        f"[1]format=rgba,fade=t=in:st=0:d=0.18:alpha=1,"
        f"fade=t=out:st={fade_out_at:.2f}:d=0.26:alpha=1[h];"
        f"[0][h]overlay=0:0"
    )
    _run_ffmpeg(
        [
            "ffmpeg", "-y", "-i", str(clip),
            "-loop", "1", "-i", str(overlay),
            "-filter_complex", fc, "-an",
            "-t", f"{seconds:.3f}", "-r", str(FPS),
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-crf", "17", "-preset", "medium", str(dest),
        ]
    )


def assemble(
    shots: list[tuple[Path, float, str | None, Path | None]],
    dest: Path,
) -> float:
    dest.parent.mkdir(parents=True, exist_ok=True)
    work = Path("/tmp/tia-reel")
    work.mkdir(parents=True, exist_ok=True)
    clips: list[Path] = []
    durs: list[float] = []
    for i, (path, seconds, zoom, hook) in enumerate(shots):
        raw = work / f"raw{i:02d}.mp4"
        still_to_clip(path, seconds, raw, zoom)
        hooked = work / f"clip{i:02d}.mp4"
        if hook is not None:
            burn_captions(raw, hook, hooked, seconds)
        else:
            hooked.write_bytes(raw.read_bytes())
        clips.append(hooked)
        durs.append(seconds)

    # xfade slideup = scroll down the landing. First/last get a short dissolve edge.
    if len(clips) == 1:
        chained = clips[0]
    else:
        ins = []
        for i, c in enumerate(clips):
            ins += ["-i", str(c)]
        parts = [f"[0][1]xfade=transition=slideup:duration={XFADE}:offset={durs[0] - XFADE:.3f}[v1]"]
        acc = durs[0] - XFADE
        last = "v1"
        for i in range(2, len(clips)):
            acc += durs[i - 1] - XFADE
            nxt = f"v{i}"
            parts.append(
                f"[{last}][{i}]xfade=transition=slideup:duration={XFADE}:offset={acc:.3f}[{nxt}]"
            )
            last = nxt
        total = sum(durs) - XFADE * (len(clips) - 1)
        parts.append(
            f"[{last}]fade=t=in:st=0:d=0.12,fade=t=out:st={max(total - 0.32, 0):.2f}:d=0.32[vout]"
        )
        silent = work / "silent.mp4"
        _run_ffmpeg(
            [
                "ffmpeg", "-y", *ins,
                "-filter_complex", ";".join(parts),
                "-map", "[vout]", "-an",
                "-c:v", "libx264", "-pix_fmt", "yuv420p",
                "-crf", "17", "-preset", "medium", str(silent),
            ]
        )
        chained = silent

    total = sum(durs) - XFADE * max(len(clips) - 1, 0)
    bed = synth_bed(work / "bed.wav", total + 0.15)
    _run_ffmpeg(
        [
            "ffmpeg", "-y", "-i", str(chained), "-i", str(bed),
            "-filter_complex",
            f"[1:a]volume=-8dB,afade=t=in:st=0:d=0.8,afade=t=out:st={max(total - 1.35, 0):.2f}:d=1.3[a]",
            "-map", "0:v:0", "-map", "[a]",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
            "-t", f"{total:.3f}", "-movflags", "+faststart", str(dest),
        ]
    )
    return total


def export_stills(paths: list[Path], artifacts: Path) -> None:
    artifacts.mkdir(parents=True, exist_ok=True)
    names = {
        "01-open.png": "tia-reel-01-open.jpg",
        "03-corridor.png": "tia-reel-03-table.jpg",
        "05-offer.png": "tia-reel-05-offer.jpg",
        "06-cta.png": "tia-reel-06-cta.jpg",
        "07-close.png": "tia-reel-07-close.jpg",
    }
    for path in paths:
        dest_name = names.get(path.name)
        if dest_name:
            Image.open(path).convert("RGB").save(artifacts / dest_name, "JPEG", quality=92)
    close = Image.open(paths[-1]).convert("RGB")
    side = 1080
    sq = close.crop((0, (H - side) // 2, W, (H - side) // 2 + side))
    sq.save(artifacts / "tia-piloto-baf-linkedin-1x1.jpg", "JPEG", quality=92)


def main() -> None:
    # Clip lengths chosen so xfade 0.28s lands near the requested windows
    # (~0-4, 4-8, 8-13, 13-18, 18-22, 22-26).
    caps = [
        ("Inteligencia USD a MXN sin custodia", "Cotiza, compara y audita sin mover dinero", "cap-01.png"),
        ("¿Respaldas cada tasa que cotizas?", "Sin custodia · Sin PII · Sin fricción regulatoria", "cap-02.png"),
        ("Compara rieles antes de ejecutar", "SPEI · Stablecoin · Bitso FX en un vistazo", "cap-03.png"),
        ("Tú ejecutas. TIA deja la prueba", "Cotiza · Compara · Decide · Audita en IPFS", "cap-04.png"),
        ("30 días gratis · Solo 3 fintechs", "Cero custodia y verificación en /v1/audit gratis", "cap-05.png"),
        ("Asegura tu lugar en el piloto", "Aplica en holatia.app · Cierre 2026", "cap-06.png"),
    ]
    overlays = [captions_png(hook, sub, name) for hook, sub, name in caps]
    shots: list[tuple[Path, float, str | None, Path | None]] = [
        (frame_open(), 4.0, "hero", overlays[0]),
        (frame_problem(), 4.2, None, overlays[1]),
        (frame_corridor(), 5.0, "table", overlays[2]),
        (frame_product(), 5.2, None, overlays[3]),
        (frame_offer(), 4.2, "offer", overlays[4]),
        (frame_close(), 5.0, "close", overlays[5]),
    ]
    artifacts = Path("/opt/cursor/artifacts")
    duration = assemble(shots, artifacts / "tia-piloto-baf-reel.mp4")
    export_stills([p for p, *_ in shots], artifacts)
    print("frames", [p.name for p, *_ in shots])
    print("duration", round(duration, 2))


if __name__ == "__main__":
    main()
