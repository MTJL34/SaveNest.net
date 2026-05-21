from __future__ import annotations

import datetime as dt
import os
import struct
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape


EMU_PER_INCH = 914400
SLIDE_WIDTH = 12192000
SLIDE_HEIGHT = 6858000

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "presentation"
OUTPUT_FILE = OUTPUT_DIR / "SaveNest_soutenance_DWWM.pptx"
NOTES_FILE = OUTPUT_DIR / "SaveNest_soutenance_notes.md"


def inches(value: float) -> int:
    return int(value * EMU_PER_INCH)


def png_size(path: Path) -> tuple[int, int]:
    with path.open("rb") as file:
        signature = file.read(24)
    if signature[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"Unsupported image format for {path}")
    width, height = struct.unpack(">II", signature[16:24])
    return width, height


def fit_image(path: Path, box_x: int, box_y: int, box_w: int, box_h: int) -> tuple[int, int, int, int]:
    img_w, img_h = png_size(path)
    img_ratio = img_w / img_h
    box_ratio = box_w / box_h

    if img_ratio > box_ratio:
        final_w = box_w
        final_h = int(box_w / img_ratio)
    else:
        final_h = box_h
        final_w = int(box_h * img_ratio)

    final_x = box_x + (box_w - final_w) // 2
    final_y = box_y + (box_h - final_h) // 2
    return final_x, final_y, final_w, final_h


def solid_fill(color: str) -> str:
    return f"<a:solidFill><a:srgbClr val=\"{color}\"/></a:solidFill>"


def paragraph_xml(text: str, font_size: int = 2000, color: str = "4A2F1F", bold: bool = False) -> str:
    text = escape(text)
    bold_attr = ' b="1"' if bold else ""
    return (
        "<a:p>"
        f"<a:r><a:rPr lang=\"fr-FR\" sz=\"{font_size}\"{bold_attr} dirty=\"0\" smtClean=\"0\">"
        f"<a:solidFill><a:srgbClr val=\"{color}\"/></a:solidFill>"
        "</a:rPr>"
        f"<a:t>{text}</a:t></a:r>"
        "<a:endParaRPr lang=\"fr-FR\" sz=\"{font_size}\" dirty=\"0\"/>"
        "</a:p>"
    ).replace("{font_size}", str(font_size))


def textbox_xml(shape_id: int, name: str, x: int, y: int, w: int, h: int, paragraphs: list[str], font_size: int = 2000,
                color: str = "4A2F1F", bold_first: bool = False) -> str:
    paragraph_chunks = []
    for index, paragraph in enumerate(paragraphs):
        paragraph_chunks.append(
            paragraph_xml(
                paragraph,
                font_size=font_size,
                color=color,
                bold=bold_first and index == 0,
            )
        )

    tx_body = "".join(paragraph_chunks)

    return (
        "<p:sp>"
        "<p:nvSpPr>"
        f"<p:cNvPr id=\"{shape_id}\" name=\"{escape(name)}\"/>"
        "<p:cNvSpPr txBox=\"1\"/>"
        "<p:nvPr/>"
        "</p:nvSpPr>"
        "<p:spPr>"
        "<a:xfrm>"
        f"<a:off x=\"{x}\" y=\"{y}\"/>"
        f"<a:ext cx=\"{w}\" cy=\"{h}\"/>"
        "</a:xfrm>"
        "<a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom>"
        "<a:noFill/>"
        "<a:ln><a:noFill/></a:ln>"
        "</p:spPr>"
        "<p:txBody>"
        "<a:bodyPr wrap=\"square\" lIns=\"91440\" tIns=\"45720\" rIns=\"91440\" bIns=\"45720\" anchor=\"t\"/>"
        "<a:lstStyle/>"
        f"{tx_body}"
        "</p:txBody>"
        "</p:sp>"
    )


def rectangle_xml(shape_id: int, name: str, x: int, y: int, w: int, h: int, fill: str, radius: str = "rect") -> str:
    return (
        "<p:sp>"
        "<p:nvSpPr>"
        f"<p:cNvPr id=\"{shape_id}\" name=\"{escape(name)}\"/>"
        "<p:cNvSpPr/>"
        "<p:nvPr/>"
        "</p:nvSpPr>"
        "<p:spPr>"
        "<a:xfrm>"
        f"<a:off x=\"{x}\" y=\"{y}\"/>"
        f"<a:ext cx=\"{w}\" cy=\"{h}\"/>"
        "</a:xfrm>"
        f"<a:prstGeom prst=\"{radius}\"><a:avLst/></a:prstGeom>"
        f"{solid_fill(fill)}"
        "<a:ln><a:noFill/></a:ln>"
        "</p:spPr>"
        "<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>"
        "</p:sp>"
    )


def picture_xml(shape_id: int, name: str, rel_id: str, x: int, y: int, w: int, h: int) -> str:
    return (
        "<p:pic>"
        "<p:nvPicPr>"
        f"<p:cNvPr id=\"{shape_id}\" name=\"{escape(name)}\"/>"
        "<p:cNvPicPr><a:picLocks noChangeAspect=\"1\"/></p:cNvPicPr>"
        "<p:nvPr/>"
        "</p:nvPicPr>"
        "<p:blipFill>"
        f"<a:blip r:embed=\"{rel_id}\"/>"
        "<a:stretch><a:fillRect/></a:stretch>"
        "</p:blipFill>"
        "<p:spPr>"
        "<a:xfrm>"
        f"<a:off x=\"{x}\" y=\"{y}\"/>"
        f"<a:ext cx=\"{w}\" cy=\"{h}\"/>"
        "</a:xfrm>"
        "<a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom>"
        "</p:spPr>"
        "</p:pic>"
    )


def group_shape_prefix() -> str:
    return (
        "<p:nvGrpSpPr>"
        "<p:cNvPr id=\"1\" name=\"\"/>"
        "<p:cNvGrpSpPr/>"
        "<p:nvPr/>"
        "</p:nvGrpSpPr>"
        "<p:grpSpPr>"
        "<a:xfrm>"
        "<a:off x=\"0\" y=\"0\"/>"
        "<a:ext cx=\"0\" cy=\"0\"/>"
        "<a:chOff x=\"0\" y=\"0\"/>"
        "<a:chExt cx=\"0\" cy=\"0\"/>"
        "</a:xfrm>"
        "</p:grpSpPr>"
    )


SLIDES = [
    {
        "type": "cover",
        "title": "SaveNest",
        "subtitle": [
            "Application web de gestion de favoris",
            "Titre Professionnel Developpeur Web et Web Mobile",
            "Nom Prenom : a completer sur cette slide",
        ],
        "notes": "Slide 1 : afficher le nom du projet, le titre vise et ton nom/prenom. Tu peux aussi ajouter la date ou le centre de formation si besoin. Cette slide pose le cadre de la soutenance des les premieres secondes.",
    },
    {
        "type": "text",
        "title": "Qui Suis-Je ?",
        "bullets": [
            "Parcours professionnel : a personnaliser avec tes experiences principales.",
            "Parcours de vie : ce qui t'a amene vers le developpement web.",
            "Pourquoi je suis ici : valider le titre et concretiser ma progression.",
            "Ce projet represente ma capacite a concevoir une application complete.",
        ],
        "notes": "Sur cette slide, parle de ton parcours pro, de ton parcours de vie et de ce qui t'a conduit a cette formation. Le plus important est de relier ton histoire personnelle a ta motivation actuelle.",
    },
    {
        "type": "text",
        "title": "Pourquoi Ce Projet ?",
        "bullets": [
            "Les favoris du navigateur deviennent vite disperses et peu lisibles.",
            "Il manquait une solution simple pour classer les liens par categorie.",
            "Le projet permet aussi de distinguer des contenus publics et prives.",
            "SaveNest est ne d'un besoin concret d'organisation et de confidentialite.",
        ],
        "notes": "Explique pourquoi vous avez cree ce projet. Mets en avant le besoin concret : centraliser des liens utiles, mieux les ranger et proteger certaines donnees. Le jury doit comprendre qu'il y a une vraie logique derriere le choix du sujet.",
    },
    {
        "type": "text",
        "title": "Objectif Du Projet",
        "bullets": [
            "Creer une application web de gestion de favoris personnels.",
            "Permettre l'ajout, la modification, le classement et la suppression de liens.",
            "Organiser les favoris dans des categories publiques ou privees.",
            "Proposer une solution full stack claire, fonctionnelle et evolutive.",
        ],
        "notes": "Ici, tu presentes la fonction du projet. SaveNest sert a gerer des favoris via une interface web, avec gestion utilisateur, categories, favoris et confidentialite.",
    },
    {
        "type": "text",
        "title": "Technologies Utilisees - Frontend",
        "bullets": [
            "HTML5 pour structurer les pages de l'application.",
            "CSS3 pour la mise en forme et l'adaptation responsive.",
            "JavaScript natif pour gerer l'affichage, les formulaires et les interactions.",
            "Modules scripts separes par page pour garder une logique lisible.",
        ],
        "notes": "Presente ici le frontend. Tu peux expliquer que le choix du JavaScript natif t'a permis de bien travailler les bases du Web sans masquer la logique avec un framework.",
    },
    {
        "type": "text",
        "title": "Technologies Utilisees - Backend",
        "bullets": [
            "Node.js et Express pour construire le serveur et les routes API.",
            "Postman pour tester les routes HTTP et valider les reponses JSON.",
            "Architecture en routes, controleurs et middlewares.",
            "MySQL2 pour dialoguer avec une base de donnees relationnelle.",
            "JWT et bcrypt pour l'authentification et la securisation des mots de passe.",
        ],
        "notes": "Sur cette slide, insiste sur le backend et sur la notion d'API. Tu peux aussi citer Postman comme outil de test des endpoints et parler de la base relationnelle deja des cette partie.",
    },
    {
        "type": "text",
        "title": "Technologies Utilisees - Base De Donnees",
        "bullets": [
            "Base de donnees MySQL relationnelle.",
            "Tables principales : utilisateurs, roles, categories, favoris, langues.",
            "Relations entre les entites pour garantir la coherence des donnees.",
            "Utilisation de jointures SQL pour renvoyer au frontend des donnees deja enrichies.",
        ],
        "notes": "Cette slide doit bien faire apparaitre l'idee de base relationnelle. Explique que les tables ne sont pas isolees : elles sont reliees entre elles pour modeliser proprement les utilisateurs, categories et favoris.",
    },
    {
        "type": "two_images",
        "title": "MCD / MLD Et Methode MERISE",
        "bullets": [
            "Le MCD represente les entites metier et leurs relations.",
            "Le MLD traduit cette modelisation en structure exploitable pour la base SQL.",
            "La methode MERISE aide a passer du besoin fonctionnel au schema relationnel.",
        ],
        "images": [
            ROOT / "FrontEnd/looping/bdd 2/mcd_2.png",
            ROOT / "FrontEnd/looping/bdd 2/mld_2.png",
        ],
        "caption": "A gauche : MCD. A droite : MLD. Ces schemas structurent la conception de la base SaveNest.",
        "notes": "Montre les deux schemas a l'ecran et explique la logique MERISE. Tu peux dire que le MCD sert a decrire le metier et que le MLD prepare directement l'implementation dans MySQL.",
    },
    {
        "type": "text",
        "title": "Les 3 Formes De Normalisation",
        "bullets": [
            "1FN : chaque champ contient une valeur simple, sans repetition dans une meme colonne.",
            "2FN : chaque attribut depend bien de la cle primaire complete.",
            "3FN : les attributs ne dependent pas d'autres attributs non cles.",
            "Dans SaveNest, cette normalisation aide a separer proprement utilisateurs, roles, categories et favoris.",
        ],
        "notes": "Explique simplement chaque forme normale. Le but est de montrer que tu comprends l'interet de limiter les doublons, d'eviter les incoherences et de garder une base evolutive.",
    },
    {
        "type": "text",
        "title": "API RESTful",
        "bullets": [
            "Une API RESTful expose des ressources via des routes HTTP claires.",
            "Chaque ressource possede des actions adaptees : GET, POST, PATCH, DELETE.",
            "Dans SaveNest : /api/auth, /api/categories et /api/favs.",
            "L'utilite : separer le frontend, le traitement metier et l'acces aux donnees.",
        ],
        "notes": "Tu peux definir simplement une API RESTful puis montrer son utilite dans ton projet. L'important est de faire comprendre que le frontend ne parle pas directement a la base mais passe par des routes bien structurees.",
    },
    {
        "type": "text",
        "title": "Fetch, Async / Await Et Echanges Client Serveur",
        "bullets": [
            "Le frontend utilise fetch() pour envoyer des requetes au backend.",
            "Les donnees circulent en JSON entre le navigateur et Express.",
            "async / await rend le code asynchrone plus lisible qu'avec des callbacks.",
            "Exemple concret : chargement des categories et favoris apres authentification.",
        ],
        "notes": "Explique le chemin complet : l'utilisateur clique, le frontend envoie une requete fetch, le backend traite, interroge MySQL puis renvoie du JSON. Cite async/await pour expliquer la gestion propre de l'asynchrone.",
    },
    {
        "type": "text",
        "title": "JOIN / VIEW Et Leur Utilite",
        "bullets": [
            "Les JOIN servent a recuperer des donnees liees entre plusieurs tables.",
            "Dans SaveNest, des requetes jointes reconstruisent le contexte d'un utilisateur ou d'un favori.",
            "Exemple : favSelectQuery joint favs et category pour connaitre le proprietaire et la confidentialite.",
            "VIEW : meme sans vue SQL materialisee, le projet suit une logique de vue de donnees prêtes pour le frontend.",
        ],
        "notes": "Sur cette slide, parle de l'utilite des jointures dans le projet. Pour VIEW, tu peux expliquer le principe : preparer une lecture plus simple des donnees, meme si dans SaveNest cela passe surtout par des requetes SQL jointes plutot que par une vue SQL persistante.",
    },
    {
        "type": "text",
        "title": "Difficultes Rencontrees",
        "bullets": [
            "Gerer plusieurs etats d'interface en JavaScript natif.",
            "Mettre en place la confidentialite sur certaines categories.",
            "Verifier les droits d'acces selon l'utilisateur et le role.",
            "Structurer un code full stack lisible tout en ajoutant des cas metiers.",
        ],
        "notes": "Choisis 2 ou 3 difficultes reelles et explique surtout comment elles ont ete resolues. Le jury valorise la capacite a analyser un probleme puis a mettre en place une solution technique propre.",
    },
    {
        "type": "text",
        "title": "Demo",
        "bullets": [
            "Connexion a l'application avec un compte existant.",
            "Creation d'une categorie puis ajout d'un favori.",
            "Consultation, modification ou deplacement d'un favori.",
            "Ouverture d'une categorie privee.",
            "Suppression puis restauration d'une categorie si tu veux montrer ce point.",
        ],
        "notes": "Cette slide prepare la demonstration. Garde un parcours simple et fluide, avec peu d'actions mais bien choisies pour montrer l'authentification, le CRUD et la confidentialite.",
    },
    {
        "type": "text",
        "title": "Pistes D Evolution",
        "bullets": [
            "Ajouter des tests automatises front et back.",
            "Prevoir un vrai deploiement de production.",
            "Ajouter la recuperation de mot de passe par email.",
            "Ameliorer l'accessibilite et l'experience mobile.",
            "Faire evoluer le frontend si le perimetre devient plus large.",
        ],
        "notes": "Ici, montre que tu sais prendre du recul. Les evolutions parlent autant du produit que de ta posture de developpeur : tests, deploiement, securite, accessibilite, experience utilisateur.",
    },
    {
        "type": "text",
        "title": "Merci",
        "bullets": [
            "Merci pour votre attention.",
            "Cette formation m'a permis de structurer mes competences techniques et ma methode de travail.",
            "L'obtention du titre represente une etape importante dans mon evolution professionnelle.",
            "Je suis disponible pour la demonstration et pour repondre a vos questions.",
        ],
        "notes": "Termine sur une note personnelle et professionnelle. Tu peux parler de l'importance du titre pour ton parcours et de ce que cette formation t'a apporte en autonomie, en rigueur et en confiance.",
    },
]


THEME_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="SaveNest Theme">
  <a:themeElements>
    <a:clrScheme name="SaveNest Colors">
      <a:dk1><a:srgbClr val="3E2416"/></a:dk1>
      <a:lt1><a:srgbClr val="FFF8F0"/></a:lt1>
      <a:dk2><a:srgbClr val="5A3A27"/></a:dk2>
      <a:lt2><a:srgbClr val="F5E5D2"/></a:lt2>
      <a:accent1><a:srgbClr val="7A4A2A"/></a:accent1>
      <a:accent2><a:srgbClr val="D8B07A"/></a:accent2>
      <a:accent3><a:srgbClr val="A86F43"/></a:accent3>
      <a:accent4><a:srgbClr val="C99359"/></a:accent4>
      <a:accent5><a:srgbClr val="EBD0A9"/></a:accent5>
      <a:accent6><a:srgbClr val="8D5F3C"/></a:accent6>
      <a:hlink><a:srgbClr val="7A4A2A"/></a:hlink>
      <a:folHlink><a:srgbClr val="C99359"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="SaveNest Fonts">
      <a:majorFont>
        <a:latin typeface="Aptos Display"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:majorFont>
      <a:minorFont>
        <a:latin typeface="Aptos"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="SaveNest Format">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="50000"/><a:satMod val="300000"/></a:schemeClr></a:gs>
            <a:gs pos="35000"><a:schemeClr val="phClr"><a:tint val="37000"/><a:satMod val="300000"/></a:schemeClr></a:gs>
            <a:gs pos="100000"><a:schemeClr val="phClr"><a:tint val="15000"/><a:satMod val="350000"/></a:schemeClr></a:gs>
          </a:gsLst>
          <a:lin ang="16200000" scaled="1"/>
        </a:gradFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="25400" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="38100" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/><a:satMod val="170000"/></a:schemeClr></a:solidFill>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="93000"/><a:satMod val="150000"/></a:schemeClr></a:gs>
            <a:gs pos="50000"><a:schemeClr val="phClr"><a:tint val="98000"/><a:satMod val="130000"/></a:schemeClr></a:gs>
            <a:gs pos="100000"><a:schemeClr val="phClr"><a:tint val="90000"/><a:satMod val="120000"/></a:schemeClr></a:gs>
          </a:gsLst>
          <a:path path="circle"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path>
        </a:gradFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
  <a:objectDefaults/>
  <a:extraClrSchemeLst/>
</a:theme>
"""


SLIDE_MASTER_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld name="Master">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="1" r:id="rId1"/>
  </p:sldLayoutIdLst>
  <p:txStyles>
    <p:titleStyle/>
    <p:bodyStyle/>
    <p:otherStyle/>
  </p:txStyles>
</p:sldMaster>
"""


SLIDE_LAYOUT_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:sldLayout>
"""


def content_types_xml(slide_count: int, media_exts: set[str]) -> str:
    media_defaults = []
    for ext in sorted(media_exts):
        content_type = {
            "png": "image/png",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "gif": "image/gif",
        }[ext]
        media_defaults.append(f'<Default Extension="{ext}" ContentType="{content_type}"/>')

    slide_overrides = []
    for index in range(1, slide_count + 1):
        slide_overrides.append(
            f'<Override PartName="/ppt/slides/slide{index}.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
        )

    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        + "".join(media_defaults) +
        '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>'
        '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>'
        '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>'
        '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>'
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
        '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
        + "".join(slide_overrides) +
        "</Types>"
    )


def root_rels_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
"""


def app_xml(slide_count: int) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Office PowerPoint</Application>
  <PresentationFormat>On-screen Show (16:9)</PresentationFormat>
  <Slides>{slide_count}</Slides>
  <Notes>0</Notes>
  <HiddenSlides>0</HiddenSlides>
  <MMClips>0</MMClips>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs>
    <vt:vector size="2" baseType="variant">
      <vt:variant><vt:lpstr>Slides</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>{slide_count}</vt:i4></vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="{slide_count}" baseType="lpstr">
      {''.join(f'<vt:lpstr>Slide {index}</vt:lpstr>' for index in range(1, slide_count + 1))}
    </vt:vector>
  </TitlesOfParts>
  <Company></Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>
"""


def core_xml() -> str:
    created = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>SaveNest - Soutenance DWWM</dc:title>
  <dc:subject>Présentation projet web et web mobile</dc:subject>
  <dc:creator>OpenAI Codex</dc:creator>
  <cp:keywords>SaveNest;DWWM;PowerPoint</cp:keywords>
  <dc:description>Présentation générée à partir du projet SaveNest.</dc:description>
  <cp:lastModifiedBy>OpenAI Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{created}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{created}</dcterms:modified>
</cp:coreProperties>
"""


def presentation_xml(slide_count: int) -> str:
    slide_ids = []
    for index in range(1, slide_count + 1):
        slide_ids.append(f'<p:sldId id="{255 + index}" r:id="rId{index + 1}"/>')

    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
        'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
        '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>'
        f'<p:sldIdLst>{"".join(slide_ids)}</p:sldIdLst>'
        f'<p:sldSz cx="{SLIDE_WIDTH}" cy="{SLIDE_HEIGHT}" type="screen16x9"/>'
        '<p:notesSz cx="6858000" cy="9144000"/>'
        '<p:defaultTextStyle/>'
        "</p:presentation>"
    )


def presentation_rels_xml(slide_count: int) -> str:
    slide_rels = []
    for index in range(1, slide_count + 1):
        slide_rels.append(
            f'<Relationship Id="rId{index + 1}" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" '
            f'Target="slides/slide{index}.xml"/>'
        )

    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>'
        + "".join(slide_rels) +
        "</Relationships>"
    )


def slide_master_rels_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>
"""


def slide_layout_rels_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>
"""


def slide_xml(slide: dict, slide_index: int, media_rel_targets: list[tuple[str, str]]) -> str:
    background = "F8E8D2"
    if slide["type"] == "cover":
        background = "5D3823"

    shapes = []
    current_id = 2

    if slide["type"] == "cover":
        shapes.append(rectangle_xml(current_id, "Cover band", inches(0.7), inches(0.9), inches(6.7), inches(0.32), "D8B07A", "roundRect"))
        current_id += 1
        shapes.append(textbox_xml(current_id, "Cover title", inches(0.85), inches(1.2), inches(6.2), inches(1.4), [slide["title"]], 3000, "FFF8F0", True))
        current_id += 1
        shapes.append(textbox_xml(current_id, "Cover subtitle", inches(0.9), inches(2.35), inches(5.4), inches(2.8), slide["subtitle"], 1700, "F7E9D8"))
        current_id += 1
        shapes.append(textbox_xml(current_id, "Cover footer", inches(0.9), inches(6.25), inches(5.7), inches(0.45), ["Application de gestion de favoris en catégories publiques et privées"], 1200, "EBD0A9"))
        current_id += 1

        image_rel_id = "rId2"
        image_path = ROOT / "FrontEnd/img/logoeggwhite.png"
        x, y, w, h = fit_image(image_path, inches(8.1), inches(1.0), inches(4.3), inches(5.0))
        shapes.append(picture_xml(current_id, "SaveNest logo", image_rel_id, x, y, w, h))
    else:
        shapes.append(textbox_xml(current_id, "Slide title", inches(0.75), inches(0.45), inches(11.5), inches(0.7), [slide["title"]], 2400, "4A2F1F", True))
        current_id += 1
        shapes.append(rectangle_xml(current_id, "Title underline", inches(0.75), inches(1.1), inches(2.1), inches(0.08), "D8B07A", "rect"))
        current_id += 1

        if slide["type"] == "text":
            bullet_lines = [f"• {line}" for line in slide["bullets"]]
            shapes.append(textbox_xml(current_id, "Body", inches(0.85), inches(1.45), inches(11.1), inches(4.9), bullet_lines, 1850, "4A2F1F"))
        elif slide["type"] == "image_right":
            bullet_lines = [f"• {line}" for line in slide["bullets"]]
            shapes.append(textbox_xml(current_id, "Body", inches(0.85), inches(1.45), inches(5.8), inches(4.9), bullet_lines, 1700, "4A2F1F"))
            current_id += 1
            shapes.append(rectangle_xml(current_id, "Image frame", inches(7.0), inches(1.5), inches(5.0), inches(4.75), "FFF8F0", "roundRect"))
            current_id += 1
            image_rel_id = "rId2"
            x, y, w, h = fit_image(slide["image"], inches(7.2), inches(1.7), inches(4.6), inches(4.35))
            shapes.append(picture_xml(current_id, slide["image"].name, image_rel_id, x, y, w, h))
        elif slide["type"] == "full_image":
            current_id += 0
            shapes.append(rectangle_xml(current_id, "Image frame", inches(0.85), inches(1.55), inches(11.0), inches(4.7), "FFF8F0", "roundRect"))
            current_id += 1
            image_rel_id = "rId2"
            x, y, w, h = fit_image(slide["image"], inches(1.05), inches(1.72), inches(10.6), inches(4.25))
            shapes.append(picture_xml(current_id, slide["image"].name, image_rel_id, x, y, w, h))
            current_id += 1
            shapes.append(textbox_xml(current_id, "Caption", inches(0.95), inches(6.1), inches(10.9), inches(0.45), [slide["caption"]], 1200, "6C4A33"))
        elif slide["type"] == "two_images":
            bullet_lines = [f"• {line}" for line in slide["bullets"]]
            shapes.append(textbox_xml(current_id, "Body", inches(0.85), inches(1.45), inches(4.3), inches(4.9), bullet_lines, 1650, "4A2F1F"))
            current_id += 1
            shapes.append(rectangle_xml(current_id, "Image frame 1", inches(5.35), inches(1.6), inches(3.0), inches(4.45), "FFF8F0", "roundRect"))
            current_id += 1
            x1, y1, w1, h1 = fit_image(slide["images"][0], inches(5.5), inches(1.75), inches(2.7), inches(4.15))
            shapes.append(picture_xml(current_id, slide["images"][0].name, "rId2", x1, y1, w1, h1))
            current_id += 1
            shapes.append(rectangle_xml(current_id, "Image frame 2", inches(8.7), inches(1.6), inches(3.0), inches(4.45), "FFF8F0", "roundRect"))
            current_id += 1
            x2, y2, w2, h2 = fit_image(slide["images"][1], inches(8.85), inches(1.75), inches(2.7), inches(4.15))
            shapes.append(picture_xml(current_id, slide["images"][1].name, "rId3", x2, y2, w2, h2))
        else:
            raise ValueError(f"Unsupported slide type: {slide['type']}")

    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
        'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
        "<p:cSld>"
        f"<p:bg><p:bgPr>{solid_fill(background)}<a:effectLst/></p:bgPr></p:bg>"
        "<p:spTree>"
        f"{group_shape_prefix()}{''.join(shapes)}"
        "</p:spTree>"
        "</p:cSld>"
        "<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>"
        "</p:sld>"
    )


def slide_rels_xml(image_targets: list[str]) -> str:
    rels = [
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>'
    ]

    for index, target in enumerate(image_targets, start=2):
        rels.append(
            f'<Relationship Id="rId{index}" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" '
            f'Target="../media/{escape(target)}"/>'
        )

    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + "".join(rels) +
        "</Relationships>"
    )


def collect_media() -> tuple[dict[Path, str], set[str]]:
    media_map: dict[Path, str] = {}
    media_exts: set[str] = set()
    counter = 1

    for slide in SLIDES:
        image_paths = []
        if slide["type"] == "cover":
            image_paths.append(ROOT / "FrontEnd/img/logoeggwhite.png")
        if "image" in slide:
            image_paths.append(slide["image"])
        if "images" in slide:
            image_paths.extend(slide["images"])

        for path in image_paths:
            if path not in media_map:
                ext = path.suffix.lower().lstrip(".")
                media_map[path] = f"image{counter}.{ext}"
                media_exts.add(ext)
                counter += 1

    return media_map, media_exts


def build_notes() -> str:
    lines = [
        "# Notes de présentation SaveNest",
        "",
        "Ce document accompagne le PowerPoint généré automatiquement.",
        "",
    ]

    for index, slide in enumerate(SLIDES, start=1):
        lines.append(f"## Slide {index} - {slide['title']}")
        lines.append(slide["notes"])
        lines.append("")

    return "\n".join(lines)


def generate() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    media_map, media_exts = collect_media()

    with zipfile.ZipFile(OUTPUT_FILE, "w", compression=zipfile.ZIP_DEFLATED) as pptx:
        pptx.writestr("[Content_Types].xml", content_types_xml(len(SLIDES), media_exts))
        pptx.writestr("_rels/.rels", root_rels_xml())
        pptx.writestr("docProps/app.xml", app_xml(len(SLIDES)))
        pptx.writestr("docProps/core.xml", core_xml())
        pptx.writestr("ppt/presentation.xml", presentation_xml(len(SLIDES)))
        pptx.writestr("ppt/_rels/presentation.xml.rels", presentation_rels_xml(len(SLIDES)))
        pptx.writestr("ppt/theme/theme1.xml", THEME_XML)
        pptx.writestr("ppt/slideMasters/slideMaster1.xml", SLIDE_MASTER_XML)
        pptx.writestr("ppt/slideMasters/_rels/slideMaster1.xml.rels", slide_master_rels_xml())
        pptx.writestr("ppt/slideLayouts/slideLayout1.xml", SLIDE_LAYOUT_XML)
        pptx.writestr("ppt/slideLayouts/_rels/slideLayout1.xml.rels", slide_layout_rels_xml())

        for index, slide in enumerate(SLIDES, start=1):
            image_paths = []
            if slide["type"] == "cover":
                image_paths.append(ROOT / "FrontEnd/img/logoeggwhite.png")
            if "image" in slide:
                image_paths.append(slide["image"])
            if "images" in slide:
                image_paths.extend(slide["images"])

            image_targets = [media_map[path] for path in image_paths]
            pptx.writestr(f"ppt/slides/slide{index}.xml", slide_xml(slide, index, []))
            pptx.writestr(f"ppt/slides/_rels/slide{index}.xml.rels", slide_rels_xml(image_targets))

        for path, target_name in media_map.items():
            pptx.write(path, f"ppt/media/{target_name}")

    NOTES_FILE.write_text(build_notes(), encoding="utf-8")


if __name__ == "__main__":
    generate()
