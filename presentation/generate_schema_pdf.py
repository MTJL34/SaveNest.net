from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


PAGE_WIDTH = 842
PAGE_HEIGHT = 595
MARGIN = 28


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

        parts.append(
            (
                f"trailer\n<< /Size {len(self.objects) + 1} /Root {root_id} 0 R >>\n"
                f"startxref\n{xref_offset}\n%%EOF\n"
            ).encode("ascii")
        )
        return b"".join(parts)


@dataclass
class Box:
    x: int
    y: int
    w: int
    h: int
    title: str
    lines: list[str]


def draw_box(box: Box) -> str:
    top = PAGE_HEIGHT - box.y
    bottom = top - box.h
    title_bottom = top - 24
    cmds = [
        "0 0 0 RG 1 w",
        f"{box.x} {bottom} {box.w} {box.h} re S",
        f"{box.x} {title_bottom} {box.w} 24 re S",
        "BT /F2 15 Tf",
        f"{box.x + 8} {top - 17} Td ({pdf_escape(box.title)}) Tj",
        "ET",
    ]
    current_y = top - 42
    for line in box.lines:
        cmds.extend(
            [
                "BT /F1 11 Tf",
                f"{box.x + 8} {current_y} Td ({pdf_escape(line)}) Tj",
                "ET",
            ]
        )
        current_y -= 14
    return "\n".join(cmds)


def draw_relation(cx: int, cy: int, label: str, w: int = 118, h: int = 26) -> str:
    top = PAGE_HEIGHT - cy
    bottom = top - h
    radius = 13
    x0 = cx - w // 2
    y0 = bottom
    cmds = [
        "0 0 0 RG 1 w",
        f"{x0 + radius} {y0} m",
        f"{x0 + w - radius} {y0} l",
        f"{x0 + w} {y0} {x0 + w} {y0} {x0 + w} {y0 + radius} c",
        f"{x0 + w} {y0 + h - radius} l",
        f"{x0 + w} {y0 + h} {x0 + w} {y0 + h} {x0 + w - radius} {y0 + h} c",
        f"{x0 + radius} {y0 + h} l",
        f"{x0} {y0 + h} {x0} {y0 + h} {x0} {y0 + h - radius} c",
        f"{x0} {y0 + radius} l",
        f"{x0} {y0} {x0} {y0} {x0 + radius} {y0} c",
        "S",
        "BT /F2 12 Tf",
        f"{x0 + 12} {top - 17} Td ({pdf_escape(label)}) Tj",
        "ET",
    ]
    return "\n".join(cmds)


def draw_line(x1: int, y1: int, x2: int, y2: int, label: str | None = None, lx: int | None = None, ly: int | None = None) -> str:
    cmds = [
        "0 0 0 RG 1 w",
        f"{x1} {PAGE_HEIGHT - y1} m {x2} {PAGE_HEIGHT - y2} l S",
    ]
    if label and lx is not None and ly is not None:
        cmds.extend(
            [
                "BT /F1 10 Tf",
                f"{lx} {PAGE_HEIGHT - ly} Td ({pdf_escape(label)}) Tj",
                "ET",
            ]
        )
    return "\n".join(cmds)


def page_header(title: str, subtitle: str) -> str:
    return "\n".join(
        [
            "BT /F2 20 Tf",
            f"{MARGIN} {PAGE_HEIGHT - 30} Td ({pdf_escape(title)}) Tj",
            "ET",
            "BT /F1 10 Tf",
            f"{MARGIN} {PAGE_HEIGHT - 46} Td ({pdf_escape(subtitle)}) Tj",
            "ET",
        ]
    )


def build_mcd_page() -> str:
    boxes = [
        Box(30, 95, 150, 118, "favori", ["id_favs", "title_favs", "url_favs", "added_date", "logo"]),
        Box(55, 335, 168, 105, "categorie", ["id_category", "category_name", "confidentiality", "password"]),
        Box(360, 310, 160, 115, "utilisateur", ["id_user", "pseudo", "mail", "password"]),
        Box(325, 68, 128, 76, "role", ["id_role", "role_code", "role_label"]),
        Box(560, 65, 156, 76, "langue", ["id_language", "language_name", "language_icon"]),
        Box(690, 255, 125, 60, "savenest", ["id_savenest", "date_inscription"]),
    ]
    relations = [
        draw_relation(108, 255, "contenir"),
        draw_relation(278, 255, "posseder"),
        draw_relation(260, 378, "partager"),
        draw_relation(425, 205, "avoir_role"),
        draw_relation(565, 205, "parler"),
        draw_relation(667, 338, "avoir_savenest", 140, 26),
        draw_relation(420, 470, "avoir_categorie_defaut", 190, 26),
    ]
    lines = [
        draw_line(108, 214, 108, 242, "1,1", 85, 227),
        draw_line(108, 281, 136, 335, "0,n", 74, 307),
        draw_line(223, 360, 219, 360, "1,1", 230, 353),
        draw_line(337, 267, 360, 325, "0,n", 313, 292),
        draw_line(223, 388, 201, 388, "0,n", 227, 382),
        draw_line(319, 388, 360, 378, "0,n", 324, 382),
        draw_line(425, 144, 425, 192, "0,n", 404, 167),
        draw_line(425, 231, 425, 310, "1,1", 438, 272),
        draw_line(638, 141, 578, 192, "0,n", 598, 163),
        draw_line(565, 231, 565, 310, "0,n", 577, 273),
        draw_line(690, 315, 520, 350, "0,n", 628, 320),
        draw_line(520, 350, 520, 350, "1,1", 502, 338),
        draw_line(420, 438, 420, 426, None),
        draw_line(325, 470, 223, 404, "0,1", 265, 454),
        draw_line(515, 470, 520, 426, "1,1", 520, 452),
    ]
    footnote = "\n".join(
        [
            "BT /F1 9 Tf",
            f"{MARGIN} 28 Td (Regle metier : la categorie par defaut doit etre une categorie deja possedee par l'utilisateur.) Tj",
            "ET",
        ]
    )
    return "\n".join([page_header("Schema MCD - SaveNest", "Version avec categorie par defaut"), *(draw_box(box) for box in boxes), *relations, *lines, footnote])


def build_mld_page() -> str:
    tables = [
        Box(34, 82, 185, 128, "ROLE", ["PK id_role", "role_code", "role_label"]),
        Box(250, 82, 210, 128, "LANGUE", ["PK id_language", "language_name", "language_icon"]),
        Box(590, 82, 190, 112, "SAVENEST", ["PK id_savenest", "date_inscription"]),
        Box(28, 260, 245, 170, "CATEGORIE", ["PK id_category", "category_name", "confidentiality", "password", "FK id_user -> UTILISATEUR.id_user"]),
        Box(300, 230, 245, 214, "UTILISATEUR", ["PK id_user", "pseudo", "mail", "password", "FK id_role -> ROLE.id_role", "FK id_savenest -> SAVENEST.id_savenest", "FK id_default_category -> CATEGORIE.id_category"]),
        Box(578, 250, 225, 140, "FAVORI", ["PK id_favs", "title_favs", "url_favs", "added_date", "logo", "FK id_category -> CATEGORIE.id_category"]),
        Box(60, 465, 260, 95, "PARTAGER", ["PK/FK id_user -> UTILISATEUR.id_user", "PK/FK id_category -> CATEGORIE.id_category", "access_level", "shared_at"]),
        Box(430, 470, 230, 80, "PARLER", ["PK/FK id_user -> UTILISATEUR.id_user", "PK/FK id_language -> LANGUE.id_language"]),
    ]
    note = [
        "BT /F1 10 Tf",
        f"{MARGIN} 42 Td (Conseil SQL : ajouter une verification applicative pour s'assurer que id_default_category appartient bien a l'utilisateur.) Tj",
        "ET",
    ]
    return "\n".join([page_header("Schema MLD - SaveNest", "Projection relationnelle avec cle de categorie par defaut"), *(draw_box(box) for box in tables), *note])


def make_stream(commands: str) -> bytes:
    body = commands.encode("latin-1")
    return f"<< /Length {len(body)} >>\nstream\n".encode("ascii") + body + b"\nendstream\n"


def build_pdf(output_path: Path) -> None:
    pdf = PdfBuilder()

    font1 = pdf.add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    font2 = pdf.add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

    page1_stream = pdf.add_object(make_stream(build_mcd_page()))
    page2_stream = pdf.add_object(make_stream(build_mld_page()))

    page_ids: list[int] = []
    pages_placeholder = len(pdf.objects) + 3

    page1 = pdf.add_object(
        (
            f"<< /Type /Page /Parent {pages_placeholder} 0 R /MediaBox [0 0 {PAGE_WIDTH} {PAGE_HEIGHT}] "
            f"/Resources << /Font << /F1 {font1} 0 R /F2 {font2} 0 R >> >> /Contents {page1_stream} 0 R >>"
        ).encode("ascii")
    )
    page_ids.append(page1)
    page2 = pdf.add_object(
        (
            f"<< /Type /Page /Parent {pages_placeholder} 0 R /MediaBox [0 0 {PAGE_WIDTH} {PAGE_HEIGHT}] "
            f"/Resources << /Font << /F1 {font1} 0 R /F2 {font2} 0 R >> >> /Contents {page2_stream} 0 R >>"
        ).encode("ascii")
    )
    page_ids.append(page2)

    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    pages = pdf.add_object(f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode("ascii"))
    catalog = pdf.add_object(f"<< /Type /Catalog /Pages {pages} 0 R >>".encode("ascii"))

    output_path.write_bytes(pdf.build(catalog))


if __name__ == "__main__":
    destination = Path(__file__).with_name("schema_mcd_mld_savenest.pdf")
    build_pdf(destination)
    print(destination)
