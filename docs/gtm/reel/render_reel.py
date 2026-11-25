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
FOOT_H = 228

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


def frame_open() -> Path:
    img = cream_canvas()
    draw_nav(img)
    paste_logo(img, ((W - 240) // 2, NAV_H + 28), 240)
    d = ImageDraw.Draw(img)
    y = badge(d, "Piloto abierto cierre 2026  ·  3 cupos", PAD, NAV_H + 288)
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
    y = eyebrow(d, "El problema", PAD, NAV_H + 40)
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
    y = eyebrow(d, "Demo en vivo", PAD, NAV_H + 40)
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
    y = eyebrow(d, "Cómo funciona", PAD, NAV_H + 40)
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
    y = eyebrow(d, "Piloto gratuito  ·  cierre 2026", PAD, NAV_H + 120)
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
    paste_logo(img, ((W - 200) // 2, NAV_H + 24), 200)
    d = ImageDraw.Draw(img)
    y = eyebrow(d, "Asegura uno de 3 lugares", PAD, NAV_H + 244)
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


def assemble(stills: list[tuple[Path, float]], dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    work = Path("/tmp/tia-reel")
    work.mkdir(parents=True, exist_ok=True)
    clips: list[Path] = []
    for i, (path, seconds) in enumerate(stills):
        frames = int(round(seconds * FPS))
        clip = work / f"clip{i:02d}.mp4"
        zoom = "min(1.0+0.00045*on,1.035)" if i % 2 == 0 else "max(1.035-0.00035*on,1.0)"
        vf = (
            f"zoompan=z='{zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
            f":d={frames}:s=1080x1920:fps={FPS},"
            f"fade=t=in:st=0:d=0.14,fade=t=out:st={max(seconds - 0.18, 0):.2f}:d=0.18"
        )
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", str(path), "-vf", vf,
                "-frames:v", str(frames), "-c:v", "libx264", "-pix_fmt", "yuv420p",
                "-crf", "17", "-preset", "medium", str(clip),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        clips.append(clip)
    listing = work / "concat.txt"
    listing.write_text("".join(f"file '{c}'\n" for c in clips), encoding="utf-8")
    subprocess.run(
        [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listing),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17",
            "-movflags", "+faststart", str(dest),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def export_stills(stills: list[tuple[Path, float]], artifacts: Path) -> None:
    artifacts.mkdir(parents=True, exist_ok=True)
    names = {
        "01-open.png": "tia-reel-01-open.jpg",
        "05-offer.png": "tia-reel-05-offer.jpg",
        "06-cta.png": "tia-reel-06-cta.jpg",
    }
    for path, _ in stills:
        dest_name = names.get(path.name)
        if dest_name:
            Image.open(path).convert("RGB").save(artifacts / dest_name, "JPEG", quality=92)
    cta = Image.open(stills[-1][0]).convert("RGB")
    side = 1080
    sq = cta.crop((0, (H - side) // 2, W, (H - side) // 2 + side))
    sq.save(artifacts / "tia-piloto-baf-linkedin-1x1.jpg", "JPEG", quality=92)


def main() -> None:
    stills = [
        (frame_open(), 3.6),
        (frame_problem(), 4.4),
        (frame_corridor(), 4.6),
        (frame_product(), 5.0),
        (frame_offer(), 4.8),
        (frame_cta(), 4.4),
    ]
    artifacts = Path("/opt/cursor/artifacts")
    assemble(stills, artifacts / "tia-piloto-baf-reel.mp4")
    export_stills(stills, artifacts)
    print("frames", [p.name for p, _ in stills])
    print("duration", sum(s for _, s in stills))


if __name__ == "__main__":
    main()
