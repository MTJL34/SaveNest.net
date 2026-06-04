from __future__ import annotations

from pathlib import Path


PAGE_WIDTH = 595
PAGE_HEIGHT = 842
MARGIN = 38


def pdf_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


class PdfBuilder:
    def __init__(self) -> None:
        self.objects: list[bytes] = []

    def add_object(self, content: bytes) -> int:
        self.objects.append(content)
        return len(self.objects)

    def build(self, root_id: int) -> bytes:
        parts = [b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"]
        offsets = [0]

        for index, obj in enumerate(self.objects, start=1):
            offsets.append(sum(len(part) for part in parts))
            parts.append(f"{index} 0 obj\n".encode("ascii"))
            parts.append(obj)
            if not obj.endswith(b"\n"):
                parts.append(b"\n")
            parts.append(b"endobj\n")

        xref_offset = sum(len(part) for part in parts)
        parts.append(f"xref\n0 {len(self.objects) + 1}\n".encode("ascii"))
        parts.append(b"0000000000 65535 f \n")
        for offset in offsets[1:]:
            parts.append(f"{offset:010d} 00000 n \n".encode("ascii"))

        trailer = (
            f"trailer\n<< /Size {len(self.objects) + 1} /Root {root_id} 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF\n"
        ).encode("ascii")
        parts.append(trailer)
        return b"".join(parts)


def block_text(text: str, x: int, y: int, size: int = 11, leading: int = 15, font: str = "F1") -> str:
    lines = text.splitlines()
    commands = [f"BT /{font} {size} Tf {leading} TL {x} {y} Td"]
    first = True
    for line in lines:
        if not first:
            commands.append("T*")
        first = False
        commands.append(f"({pdf_escape(line)}) Tj")
    commands.append("ET")
    return "\n".join(commands)


def rect(x: int, y: int, w: int, h: int, stroke_rgb: tuple[float, float, float], fill_rgb: tuple[float, float, float] | None = None, radius: int = 0) -> str:
    py = PAGE_HEIGHT - y - h
    sr, sg, sb = stroke_rgb
    cmds = [f"{sr:.3f} {sg:.3f} {sb:.3f} RG", "1 w"]
    if fill_rgb is not None:
        fr, fg, fb = fill_rgb
        cmds.append(f"{fr:.3f} {fg:.3f} {fb:.3f} rg")
    paint = "B" if fill_rgb is not None else "S"
    if radius <= 0:
        cmds.append(f"{x} {py} {w} {h} re {paint}")
        return "\n".join(cmds)

    r = min(radius, w / 2, h / 2)
    x0 = x
    y0 = py
    x1 = x + w
    y1 = py + h
    cmds.extend(
        [
            f"{x0 + r} {y0} m",
            f"{x1 - r} {y0} l",
            f"{x1} {y0} {x1} {y0} {x1} {y0 + r} c",
            f"{x1} {y1 - r} l",
            f"{x1} {y1} {x1} {y1} {x1 - r} {y1} c",
            f"{x0 + r} {y1} l",
            f"{x0} {y1} {x0} {y1} {x0} {y1 - r} c",
            f"{x0} {y0 + r} l",
            f"{x0} {y0} {x0} {y0} {x0 + r} {y0} c",
            paint,
        ]
    )
    return "\n".join(cmds)


def line(x1: int, y1: int, x2: int, y2: int, rgb: tuple[float, float, float], width: float = 1.0) -> str:
    return "\n".join(
        [
            f"{rgb[0]:.3f} {rgb[1]:.3f} {rgb[2]:.3f} RG",
            f"{width:.2f} w",
            f"{x1} {PAGE_HEIGHT - y1} m {x2} {PAGE_HEIGHT - y2} l S",
        ]
    )


def rgb(hex_color: str) -> tuple[float, float, float]:
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i : i + 2], 16) / 255 for i in (0, 2, 4))


BRAND = rgb("#5A3A24")
SURFACE = rgb("#F1E0CF")
SURFACE_SOFT = rgb("#F7EDE2")
TEXT = rgb("#3B1F10")
LINE = rgb("#D9B997")
ACCENT = rgb("#CDA77A")


def build_page_one() -> str:
    cmds: list[str] = []
    cmds.append(block_text("Guide Figma - Header SaveNest", MARGIN, PAGE_HEIGHT - 54, size=20, leading=22, font="F2"))
    cmds.append(block_text("Reconstruction simplifiee a partir du code du projet", MARGIN, PAGE_HEIGHT - 78, size=10, leading=12))

    header_x = MARGIN
    header_y = 110
    header_w = PAGE_WIDTH - (MARGIN * 2)
    header_h = 124
    cmds.append(rect(header_x, header_y, header_w, header_h, BRAND, BRAND, radius=16))

    left_w = 180
    center_w = 72
    right_w = header_w - left_w - center_w
    cmds.append(line(header_x + left_w, header_y + 14, header_x + left_w, header_y + header_h - 14, SURFACE_SOFT, 0.8))
    cmds.append(line(header_x + left_w + center_w, header_y + 14, header_x + left_w + center_w, header_y + header_h - 14, SURFACE_SOFT, 0.8))

    brand_y = header_y + 34
    cmds.append(rect(header_x + 22, brand_y, 58, 58, SURFACE, SURFACE, radius=14))
    cmds.append(block_text("logo", header_x + 35, PAGE_HEIGHT - (brand_y + 35), size=12, font="F2"))
    cmds.append(block_text("SaveNest", header_x + 92, PAGE_HEIGHT - (header_y + 67), size=24, leading=24, font="F2"))

    egg_x = header_x + left_w + 14
    egg_y = header_y + 40
    cmds.append(rect(egg_x, egg_y, 44, 44, SURFACE_SOFT, None, radius=22))
    cmds.append(block_text("oeuf", egg_x + 8, PAGE_HEIGHT - (egg_y + 27), size=11, font="F2"))

    nav_x = header_x + left_w + center_w + 20
    pill_y = header_y + 45
    pills = [("FR", 38), ("Accueil", 62), ("Favoris", 60), ("Categories", 74)]
    cursor = nav_x
    for index, (label, width) in enumerate(pills):
        fill = (0.969, 0.929, 0.886) if index == 1 else (0.380, 0.255, 0.173)
        stroke = SURFACE_SOFT
        text_color = TEXT if index == 1 else SURFACE
        cmds.append(rect(cursor, pill_y, width, 34, stroke, fill, radius=17))
        py = PAGE_HEIGHT - (pill_y + 22)
        r, g, b = text_color
        cmds.append(f"{r:.3f} {g:.3f} {b:.3f} rg")
        cmds.append(block_text(label, cursor + 10, py, size=10, font="F2" if index == 1 else "F1"))
        cursor += width + 12

    caption = (
        "Structure Figma conseillee : 1 frame Header en Auto Layout horizontal, "
        "avec 3 zones Left / Center / Right pour retrouver la grille CSS 1fr auto 1fr."
    )
    cmds.append(block_text(caption, MARGIN, PAGE_HEIGHT - 292, size=11, leading=15))

    cmds.append(block_text("Plan de construction", MARGIN, PAGE_HEIGHT - 340, size=14, font="F2"))
    plan = [
        "1. Cree une frame desktop de 1440 px de large.",
        "2. Ajoute une frame Header de 124 px de haut.",
        "3. Donne au header un fond #5A3A24 et un rayon de 16 px si tu veux une maquette douce.",
        "4. Active Auto Layout horizontal avec alignement vertical centre.",
        "5. Cree trois sous-frames : Left en Fill, Center en Hug, Right en Fill.",
        "6. Place le logo SaveNest a gauche, le bouton oeuf au centre, la navigation a droite.",
    ]
    cmds.append(block_text("\n".join(plan), MARGIN, PAGE_HEIGHT - 362, size=11, leading=16))
    return "\n".join(cmds)


def build_page_two() -> str:
    cmds: list[str] = []
    cmds.append(block_text("Reglages Figma detail", MARGIN, PAGE_HEIGHT - 54, size=20, leading=22, font="F2"))
    cmds.append(block_text("Correspondance directe avec ton HTML/CSS", MARGIN, PAGE_HEIGHT - 78, size=10, leading=12))

    cmds.append(block_text("Bloc logo", MARGIN, PAGE_HEIGHT - 126, size=14, font="F2"))
    logo_specs = [
        "Frame Brand en Auto Layout horizontal",
        "Gap : 11 px",
        "Alignement : Center",
        "Image : 58 x 58 px",
        "Texte SaveNest : 25 px, 700, line-height 100 %, letter spacing -2 %",
        "Texte : couleur #F1E0CF",
    ]
    cmds.append(block_text("\n".join(f"- {item}" for item in logo_specs), MARGIN, PAGE_HEIGHT - 146, size=11, leading=16))

    cmds.append(block_text("Navigation", MARGIN, PAGE_HEIGHT - 278, size=14, font="F2"))
    nav_specs = [
        "Liens alignes horizontalement avec 24 px d'espace visuel environ",
        "Couleur des liens : #F1E0CF",
        "Poids texte standard : 500",
        "Element actif : pill arrondie, fond translucide clair, texte plus fort",
        "Select langue : pill 34 px de haut, rayon 999 px, bordure claire, fond brun transparent",
    ]
    cmds.append(block_text("\n".join(f"- {item}" for item in nav_specs), MARGIN, PAGE_HEIGHT - 298, size=11, leading=16))

    cmds.append(block_text("Palette a creer dans Figma", MARGIN, PAGE_HEIGHT - 410, size=14, font="F2"))
    palette = [
        ("Brand Dark", "#5A3A24"),
        ("Surface", "#F1E0CF"),
        ("Surface Soft", "#F7EDE2"),
        ("Text Dark", "#3B1F10"),
        ("Accent", "#CDA77A"),
    ]

    start_y = 432
    for index, (name, value) in enumerate(palette):
        y = start_y + (index * 42)
        color_rgb = rgb(value)
        cmds.append(rect(MARGIN, y, 28, 28, color_rgb, color_rgb, radius=8))
        cmds.append(block_text(f"{name}  {value}", MARGIN + 42, PAGE_HEIGHT - (y + 18), size=11, font="F1"))

    cmds.append(block_text("Recette rapide", MARGIN, PAGE_HEIGHT - 655, size=14, font="F2"))
    recipe = [
        "1. Dessine d'abord le fond du header.",
        "2. Reproduis ensuite le bloc logo a gauche.",
        "3. Ajoute les pills de navigation a droite.",
        "4. Termine par le bouton oeuf au centre.",
        "5. Cree un composant Header Desktop pour le reutiliser partout.",
    ]
    cmds.append(block_text("\n".join(recipe), MARGIN, PAGE_HEIGHT - 675, size=11, leading=16))

    footer = (
        "Sources du projet : FrontEnd/scripts/layout.js lignes 418 a 463, "
        "FrontEnd/css/layout.css lignes 54 a 107 et 173 a 258."
    )
    cmds.append(block_text(footer, MARGIN, 58, size=9, leading=12))
    return "\n".join(cmds)


def make_stream(commands: str) -> bytes:
    body = commands.encode("latin-1")
    return f"<< /Length {len(body)} >>\nstream\n".encode("ascii") + body + b"\nendstream\n"


def build_pdf(output_path: Path) -> None:
    pdf = PdfBuilder()
    font_regular = pdf.add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    font_bold = pdf.add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

    stream1 = pdf.add_object(make_stream(build_page_one()))
    stream2 = pdf.add_object(make_stream(build_page_two()))

    pages_placeholder = len(pdf.objects) + 3
    page1 = pdf.add_object(
        (
            f"<< /Type /Page /Parent {pages_placeholder} 0 R /MediaBox [0 0 {PAGE_WIDTH} {PAGE_HEIGHT}] "
            f"/Resources << /Font << /F1 {font_regular} 0 R /F2 {font_bold} 0 R >> >> /Contents {stream1} 0 R >>"
        ).encode("ascii")
    )
    page2 = pdf.add_object(
        (
            f"<< /Type /Page /Parent {pages_placeholder} 0 R /MediaBox [0 0 {PAGE_WIDTH} {PAGE_HEIGHT}] "
            f"/Resources << /Font << /F1 {font_regular} 0 R /F2 {font_bold} 0 R >> >> /Contents {stream2} 0 R >>"
        ).encode("ascii")
    )
    pages = pdf.add_object(f"<< /Type /Pages /Kids [{page1} 0 R {page2} 0 R] /Count 2 >>".encode("ascii"))
    catalog = pdf.add_object(f"<< /Type /Catalog /Pages {pages} 0 R >>".encode("ascii"))
    output_path.write_bytes(pdf.build(catalog))


if __name__ == "__main__":
    destination = Path(__file__).with_name("guide_figma_header_savenest.pdf")
    build_pdf(destination)
    print(destination)
