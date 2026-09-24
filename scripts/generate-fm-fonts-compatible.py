"""Generate FM-encoded display fonts from OFL Google Fonts sources.

Builds legacy-encoding display fonts whose outlines come from open Google
Fonts Sinhala families but whose character map follows the legacy FM encoding
used by the Sinhala converter:
  * Abhaya Legacy (Regular and Bold, instantiated from the Abhaya Libre
    variable font committed under scripts/font-sources/abhaya-libre)
  * Gemunu Legacy (Regular and Bold, instantiated from the Gemunu Libre
    variable font committed under scripts/font-sources/gemunu-libre)

Every imported outline comes from the hash-pinned OFL sources above or XITS.
Where a Libre source already contains a suitable alternate, the required
component contours are extracted directly from that open source glyph.  A
small remaining set of legacy-only forms is stored as hand-authored path data
that visually reconstructs the corresponding FM Abhaya/FM Gemunu forms.  No
installed FM font or FM font binary is read by the generator.

Requirements: fonttools[brotli] and uharfbuzz.
The generated fonts are committed as web assets; this script is not part of the
normal site build.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import subprocess
import unicodedata
from dataclasses import dataclass
from pathlib import Path

import uharfbuzz as hb
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.recordingPen import DecomposingRecordingPen, RecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables._c_m_a_p import CmapSubtable
from fontTools.varLib.instancer import instantiateVariableFont


ROOT = Path(__file__).resolve().parents[1]

# Google Fonts variable builds committed locally and hash-pinned.  Each output
# face is instantiated at its requested weight before legacy remapping begins.
ABHAYA_SOURCE_BASENAME = "AbhayaLibre[wght].ttf"
ABHAYA_SOURCE_SHA256 = {
    "Regular": "9bf82638d8fcc6f832a8e8f7d703f8b7e2d81decd32306a8d785b05a46888384",
    "Bold": "9bf82638d8fcc6f832a8e8f7d703f8b7e2d81decd32306a8d785b05a46888384",
}

GEMUNU_SOURCE_BASENAME = "GemunuLibre[wght].ttf"
GEMUNU_SOURCE_SHA256 = {
    "Regular": "0cf4e302dfec35dfa42b7429215f136adde45e25a57f81be2cf88106507e0bed",
    "Bold": "0cf4e302dfec35dfa42b7429215f136adde45e25a57f81be2cf88106507e0bed",
}

XITS_SOURCE_BASENAME = "XITS-{weight}.otf"
XITS_SOURCE_SHA256 = {
    "Regular": "9cd5e6b9bac7647cc714c17d7c9e2e5087f8551cf1bec48a8e753172dbc641b8",
    "Bold": "6076d16614af00f81163b6a5886811bbb2db6dee8ee81827212c8029042693de",
}

FM_ABHAYA_X_ZERO_ADVANCE = 454
FM_ABHAYA_X_W_SLOT_ADVANCE = 651
FM_GEMUNU_REFERENCE_CONSONANT_ADVANCE = 547
# Keep the author mark identical across every face.  This is the visual center
# of the Abhaya Legacy hhea line box: (860 + -348) / 2.
AUTHOR_MARK_CENTER_Y = 256
FM_GEMUNU_ISPILLA_X_BOUNDS = {
    "s": (-524, -30),
    "S": (-525, -30),
}
XITS_SYMBOL_FALLBACKS = {
    # XITS Bold omits STAR OPERATOR but carries the equivalent bold
    # ASTERISK OPERATOR outline.
    0x22C6: 0x2217,
}
GEMUNU_SYMBOL_FALLBACKS = {
    # Gemunu Libre has no STAR OPERATOR, so keep the slot in-family by using
    # its own asterisk outline rather than importing an XITS symbol.
    0x22C6: 0x002A,
}

# FM fonts expose these equivalent input code points through one shared glyph.
# Reassign cmap entries after importing outlines so duplicate source glyphs are
# discarded by the subsetter.
SHARED_LEGACY_GLYPH_SLOTS = {
    "μ": "µ",
    "‐": "-",
}

# FM Abhaya x stores several ordinary symbols and Roman numerals in unrelated
# Windows-1252 slots.  Abhaya Legacy uses compatible Times-style XITS outlines;
# Gemunu Legacy instead reuses its own Latin letter outlines for Roman numerals.
XITS_LEGACY_GLYPH_SOURCES = {
    "Ÿ": 0x00B0,  # °
    "»": 0x0049,  # Ⅰ
    "¼": 0x0056,  # Ⅴ
    "½": 0x0058,  # Ⅹ
    "¸": 0x0069,  # ⅰ
    "¹": 0x0076,  # ⅴ
    "º": 0x0078,  # ⅹ
}
ROMAN_LEGACY_LATIN_SOURCES = {
    "»": 0x0049,  # Ⅰ -> I
    "¼": 0x0056,  # Ⅴ -> V
    "½": 0x0058,  # Ⅹ -> X
    "¸": 0x0069,  # ⅰ -> i
    "¹": 0x0076,  # ⅴ -> v
    "º": 0x0078,  # ⅹ -> x
}
XITS_LEGACY_ADVANCES = {
    "Ÿ": 263,
    "»": 301,
    "¼": 654,
    "½": 654,
    "¸": 301,
    "¹": 470,
    "º": 462,
}
ABHAYA_LEGACY_TARGET_METRICS = {
    "Regular": {
        "Ÿ": (263, (31, 540, 211, 716)),
        "»": (301, (37, -1, 261, 612)),
        "¼": (654, (31, -13, 616, 611)),
        "½": (654, (31, -1, 614, 613)),
        "¸": (301, (48, 0, 247, 577)),
        "¹": (470, (33, -5, 435, 411)),
        "º": (462, (25, 0, 411, 412)),
    },
    "Bold": {
        "Ÿ": (248, (31, 547, 199, 711)),
        "»": (301, (37, -1, 261, 612)),
        "¼": (654, (31, -13, 616, 611)),
        "½": (654, (31, -1, 614, 613)),
        "¸": (301, (48, 0, 247, 582)),
        "¹": (470, (33, -5, 435, 411)),
        "º": (462, (25, 0, 411, 412)),
    },
}

# FM Abhaya x has no GSUB/GPOS tables: ordinary vowel signs and contextual
# pieces are laid out directly from their legacy slots.  Keep rlig narrowly
# scoped to structural cores that the Unicode source fonts cannot reproduce as
# independent legacy glyphs with compatible advances.  Longer vowel-bearing
# sequences are intentionally left as these cores plus ordinary slot glyphs.
REQUIRED_LEGACY_LIGATURES = frozenset(
    {
        "Cj",  # ක්‍ව
        "CI",  # ක්‍ෂ
        "CO",  # ඣ
        "Cè",  # ඣ්
        "F:",  # ත්‍ථ
        "Fj",  # ත්‍ව
        "J:",  # න්‍ථ
        "Jo",  # න්‍ද
        "JO",  # න්‍ධ
        "Jj",  # න්‍ව
        "Jú",  # න්‍වි
        "Jÿ",  # න්‍දු
        "J¥",  # න්‍දූ
    }
)


@dataclass(frozen=True)
class FontSpec:
    """Everything the generator needs for one FM legacy display font."""

    family: str
    source_sha256: str
    source_filename: str
    digit_source_sha256: str | None
    digit_source_filename: str | None
    use_xits_digits: bool
    output: Path
    license_source: Path
    license_output: Path
    glyph_overrides: dict[str, str]
    glyph_offsets: dict[str, tuple[int, int]]
    glyph_advance_sources: dict[str, str]
    alternate_shape_legacy: frozenset[str]
    # Legacy weight of the generated face; used for font naming only.
    weight: str = "Regular"
    weight_class: int = 400

    @property
    def ps_name(self) -> str:
        return f"{''.join(self.family.split())}-{self.weight}"


ABHAYA_SPECS: dict[str, FontSpec] = {
    weight: FontSpec(
        family="Abhaya Legacy",
        source_sha256=ABHAYA_SOURCE_SHA256[weight],
        source_filename=ABHAYA_SOURCE_BASENAME,
        digit_source_sha256=XITS_SOURCE_SHA256[weight],
        digit_source_filename=XITS_SOURCE_BASENAME.format(weight=weight),
        use_xits_digits=True,
        output=ROOT
        / "src/assets/font/abhaya-libre"
        / (
            "abhaya-legacy.woff2"
            if weight == "Regular"
            else f"abhaya-legacy-{weight.lower()}.woff2"
        ),
        license_source=ROOT / "node_modules/@fontsource/abhaya-libre/LICENSE",
        license_output=ROOT / "src/assets/font/abhaya-libre/OFL.txt",
        glyph_overrides={
            # Contextual consonant pieces.
            "%": "sinRakar",
            "H": "sinYansaya",
            # Complete FM single-slot forms, not ordinary glyph compositions.
            "\\": "sinNdAa.ss01",
            "Ì": "sinLVocalic",
            "Þ": "sinDAa.ss01",
            "±": "sinDAe.ss01",
            "ƒ": "sinNdAe.ss01",
            "ˆ": "sinNDAa.ss01",
            "_": "sinReph",
            "–": "sinReph",
            "œ": "sinYansaya.reph",
            "µ": "sinDaYa.post.ss01",
            "μ": "sinDaYa.post.ss01",
            "Ø": "sinNyAa.ss01",
            "×": "sinJnyAa.ss01",
        },
        glyph_offsets={
            "_": (0, -5),
            "–": (0, 117),
        },
        glyph_advance_sources={},
        alternate_shape_legacy=frozenset({"\\", "Þ", "±", "ƒ", "ˆ"}),
        weight=weight,
        weight_class=400 if weight == "Regular" else 700,
    )
    for weight in ("Regular", "Bold")
}

GEMUNU_SPECS: dict[str, FontSpec] = {
    weight: FontSpec(
        family="Gemunu Legacy",
        source_sha256=GEMUNU_SOURCE_SHA256[weight],
        source_filename=GEMUNU_SOURCE_BASENAME,
        digit_source_sha256=None,
        digit_source_filename=None,
        use_xits_digits=False,
        output=ROOT
        / "src/assets/font/gemunu-libre"
        / (
            "gemunu-legacy.woff2"
            if weight == "Regular"
            else f"gemunu-legacy-{weight.lower()}.woff2"
        ),
        license_source=ROOT / "node_modules/@fontsource/gemunu-libre/LICENSE",
        license_output=ROOT / "src/assets/font/gemunu-libre/OFL.txt",
        glyph_overrides={
            # Gemunu uses different names for the equivalent source glyphs.
            "%": "sinRakar",
            "H": "sinYansaya",
            "=": "sinMatraU.alt",
            "+": "sinMatraUu.alt",
            "\\": "sinNdAa.ss01",
            "Ì": "sinLVocalic",
            "Þ": "sinDAa.ss01",
            "±": "sinDAe.ss01",
            "ƒ": "sinNdAe.ss01",
            "ˆ": "sinNDAa.ss01",
            "_": "sinReph",
            "–": "sinReph",
            "œ": "sinYansaya.reph",
            "µ": "sinDaYa.post.ss01",
            "μ": "sinDaYa.post.ss01",
            "Ø": "sinNyAa.ss01",
            "×": "sinJnyAa.ss01",
        },
        glyph_offsets={
            "–": (0, 117),
        },
        glyph_advance_sources={
            "=": "sinMatraU",
            "+": "sinMatraUu",
        },
        alternate_shape_legacy=frozenset({"\\", "Þ", "±", "ƒ", "ˆ"}),
        weight=weight,
        weight_class=400 if weight == "Regular" else 700,
    )
    for weight in ("Regular", "Bold")
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--abhaya-source-dir",
        type=Path,
        default=ROOT / "scripts" / "font-sources" / "abhaya-libre",
        help=(
            "Directory containing the local Abhaya Libre variable font "
            "(AbhayaLibre[wght].ttf)."
        ),
    )
    parser.add_argument(
        "--gemunu-source-dir",
        type=Path,
        default=ROOT / "scripts" / "font-sources" / "gemunu-libre",
        help=(
            "Directory containing the local Gemunu Libre variable font "
            "(GemunuLibre[wght].ttf)."
        ),
    )
    parser.add_argument(
        "--xits-source-dir",
        type=Path,
        default=ROOT / "scripts" / "font-sources" / "xits",
        help="Directory containing XITS-Regular.otf and XITS-Bold.otf.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Override the output directory for the generated WOFF2 files.",
    )
    return parser.parse_args()


def ensure_source_font(spec: FontSpec, source_font: Path) -> Path:
    path = source_font.resolve()
    if not path.exists():
        raise RuntimeError(
            f"Missing source font for {spec.family} {spec.weight}: {path}"
        )
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != spec.source_sha256:
        raise RuntimeError(
            f"Unexpected {spec.family} {spec.weight} source hash: {digest}; "
            f"expected {spec.source_sha256}"
        )
    return path


def ensure_digit_source(spec: FontSpec, source_font: Path) -> Path:
    if spec.digit_source_sha256 is None:
        raise RuntimeError(f"{spec.family} does not use an XITS source")
    path = source_font.resolve()
    if not path.exists():
        raise RuntimeError(f"Missing XITS digit source: {path}")
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != spec.digit_source_sha256:
        raise RuntimeError(
            f"Unexpected XITS digit source hash: {digest}; "
            f"expected {spec.digit_source_sha256}"
        )
    return path


def load_weighted_source(source: Path, weight_class: int) -> TTFont:
    font = TTFont(source, recalcBBoxes=True, recalcTimestamp=False)
    if "fvar" not in font:
        raise RuntimeError(f"Expected a variable source font: {source}")
    return instantiateVariableFont(
        font,
        {"wght": weight_class},
        inplace=True,
        optimize=True,
    )


def load_legacy_mapping() -> list[dict[str, str]]:
    output = subprocess.check_output(
        ["node", str(ROOT / "scripts/get-fm-abhaya-map.mjs")],
        cwd=ROOT,
        text=True,
        encoding="utf-8",
    )
    return json.loads(output)


def set_font_name(font: TTFont, spec: FontSpec) -> None:
    name_table = font["name"]
    source_description = (
        "Abhaya Libre and XITS"
        if spec.use_xits_digits
        else "Gemunu Libre"
    )
    values = {
        1: spec.family,
        2: spec.weight,
        3: f"{spec.family} {spec.weight} 1.000",
        4: spec.family,
        5: "Version 1.000",
        6: spec.ps_name,
        13: (
            f"{spec.family} uses outlines from {source_description} under "
            f"the SIL Open Font License 1.1. "
            f"Selected legacy-only glyphs either reuse contours from Libre "
            f"alternates or use hand-authored visual reconstructions modeled "
            f"on FM legacy forms; no FM font file is imported at build time."
        ),
        14: "https://openfontlicense.org/",
    }
    for name_id, value in values.items():
        name_table.setName(value, name_id, 3, 1, 0x409)
        name_table.setName(value, name_id, 1, 0, 0)


def make_cmap(mapping: dict[int, str]):
    table = newTable("cmap")
    table.tableVersion = 0
    table.tables = []
    for platform_id, encoding_id in ((0, 3), (3, 1)):
        subtable = CmapSubtable.newSubtable(4)
        subtable.platformID = platform_id
        subtable.platEncID = encoding_id
        subtable.language = 0
        subtable.cmap = mapping.copy()
        table.tables.append(subtable)
    return table


def shape_target(
    hb_font: hb.Font,
    glyph_order: list[str],
    target: str,
    features: dict[str, int] | None = None,
) -> list[tuple[str, int, int, int, int]]:
    buffer = hb.Buffer()
    buffer.add_str(target)
    buffer.guess_segment_properties()
    if any(0x0D80 <= ord(character) <= 0x0DFF for character in target) or "\u200d" in target:
        buffer.script = "sinh"
        buffer.language = "si"
    buffer.flags = hb.BufferFlags.DO_NOT_INSERT_DOTTED_CIRCLE
    hb.shape(hb_font, buffer, features)
    return [
        (
            glyph_order[info.codepoint],
            position.x_advance,
            position.y_advance,
            position.x_offset,
            position.y_offset,
        )
        for info, position in zip(buffer.glyph_infos, buffer.glyph_positions)
    ]



def add_legacy_features(
    font: TTFont,
    rules: list[tuple[tuple[str, ...], str]],
    reph_glyphs: tuple[str, str],
    ispilla_glyphs: tuple[str, ...],
    base_glyphs: set[str],
) -> None:
    """Install legacy ligatures and position reusable overlay marks."""
    feature_lines = [
        "languagesystem DFLT dflt;",
        "languagesystem latn dflt;",
    ]

    if rules:
        feature_lines.append("feature rlig {")
        for input_glyphs, output_glyph in rules:
            feature_lines.append(
                f"  sub {' '.join(input_glyphs)} by {output_glyph};"
            )
        feature_lines.append("} rlig;")

    glyf = font["glyf"]
    for glyph_name in reph_glyphs:
        glyph = glyf[glyph_name]
        glyph.recalcBounds(glyf)
        center_x = round((glyph.xMin + glyph.xMax) / 2)
        feature_lines.append(
            f"markClass {glyph_name} <anchor {center_x} 0> @FM_REPH;"
        )

    for glyph_name in ispilla_glyphs:
        glyph = glyf[glyph_name]
        glyph.recalcBounds(glyf)
        center_x = round((glyph.xMin + glyph.xMax) / 2)
        feature_lines.append(
            f"markClass {glyph_name} <anchor {center_x} 0> @FM_ISPILLA;"
        )

    mark_glyphs = set(reph_glyphs) | set(ispilla_glyphs)
    reph_bases_by_center: dict[int, list[str]] = {}
    ispilla_bases_by_center: dict[int, list[str]] = {}
    for glyph_name in sorted(base_glyphs - mark_glyphs):
        advance, _ = font["hmtx"].metrics[glyph_name]
        if advance <= 0:
            continue
        reph_bases_by_center.setdefault(round(advance / 2), []).append(
            glyph_name
        )
        glyph = glyf[glyph_name]
        glyph.recalcBounds(glyf)
        if hasattr(glyph, "xMin") and hasattr(glyph, "xMax"):
            visible_center = round((glyph.xMin + glyph.xMax) / 2)
            ispilla_bases_by_center.setdefault(visible_center, []).append(
                glyph_name
            )

    feature_lines.append("feature mark {")
    for center_x, glyph_names in sorted(reph_bases_by_center.items()):
        feature_lines.append(
            f"  pos base [{' '.join(glyph_names)}] "
            f"<anchor {center_x} 0> mark @FM_REPH;"
        )
    if ispilla_glyphs:
        for center_x, glyph_names in sorted(
            ispilla_bases_by_center.items()
        ):
            feature_lines.append(
                f"  pos base [{' '.join(glyph_names)}] "
                f"<anchor {center_x} 0> mark @FM_ISPILLA;"
            )
    feature_lines.append("} mark;")
    addOpenTypeFeaturesFromString(font, "\n".join(feature_lines))


def add_composite_glyph(
    font: TTFont,
    glyph_name: str,
    shaped: list[tuple[str, int, int, int, int]],
) -> str:
    glyph_set = font.getGlyphSet()
    pen = TTGlyphPen(glyph_set)
    cursor_x = 0
    cursor_y = 0
    for component_name, x_advance, y_advance, x_offset, y_offset in shaped:
        transformed = TransformPen(
            pen,
            (1, 0, 0, 1, cursor_x + x_offset, cursor_y + y_offset),
        )
        glyph_set[component_name].draw(transformed)
        cursor_x += x_advance
        cursor_y += y_advance

    font["glyf"].glyphs[glyph_name] = pen.glyph()
    font.setGlyphOrder([*font.getGlyphOrder(), glyph_name])
    font["hmtx"].metrics[glyph_name] = (max(cursor_x, 0), 0)
    return glyph_name


def add_transformed_glyph(
    font: TTFont,
    source_name: str,
    glyph_name: str,
    x_offset: int,
    y_offset: int,
) -> str:
    """Copy one source outline with a legacy-slot-specific position."""
    glyph_set = font.getGlyphSet()
    pen = TTGlyphPen(glyph_set)
    transformed = TransformPen(
        pen,
        (1, 0, 0, 1, x_offset, y_offset),
    )
    glyph_set[source_name].draw(transformed)

    font["glyf"].glyphs[glyph_name] = pen.glyph()
    font.setGlyphOrder([*font.getGlyphOrder(), glyph_name])
    advance, left_side_bearing = font["hmtx"].metrics[source_name]
    font["hmtx"].metrics[glyph_name] = (
        advance,
        left_side_bearing + x_offset,
    )
    return glyph_name


def add_braid_glyph(
    font: TTFont,
    glyph_name: str,
    *,
    gemunu_style: bool = False,
    bold: bool = False,
) -> str:
    """Draw the standalone prefix braid in an OFL source-family style."""
    pen = TTGlyphPen(None)
    if gemunu_style:
        # sanyakadayanna-sinh (sinNda) keeps the universal prefix braid as
        # its first, fully separate contour, so reuse that Gemunu Libre
        # contour directly instead of approximating it with a new outline.
        source_pen = RecordingPen()
        font.getGlyphSet()["sinNda"].draw(source_pen)
        contour: list[tuple[str, tuple]] = []
        contours: list[list[tuple[str, tuple]]] = []
        for operator, operands in source_pen.value:
            contour.append((operator, operands))
            if operator in {"closePath", "endPath"}:
                contours.append(contour)
                contour = []
        if contour or len(contours) < 2:
            raise ValueError("Unexpected contour layout in Gemunu sinNda")
        for operator, operands in contours[0]:
            getattr(pen, operator)(*operands)
        metrics = (136, 22)
    else:
        # Abhaya Libre-inspired rounded prefix form.
        pen.moveTo((270, 396))
        pen.qCurveTo((236, 406), (208, 406))
        pen.qCurveTo((143, 406), (95, 349))
        pen.qCurveTo((57, 305), (57, 218))
        pen.qCurveTo((57, 97), (135, 29))
        pen.lineTo((135, 0))
        pen.qCurveTo((81, 27), (52, 93))
        pen.qCurveTo((27, 150), (27, 221))
        pen.qCurveTo((27, 285), (67, 369), (138, 427), (177, 431))
        pen.qCurveTo((237, 437), (279, 419))
        pen.closePath()
        metrics = (113, 27)

    font["glyf"].glyphs[glyph_name] = pen.glyph()
    font.setGlyphOrder([*font.getGlyphOrder(), glyph_name])
    # The narrow advance deliberately lets this universal prefix overlap the
    # following consonant, matching the legacy prefix behavior.
    font["hmtx"].metrics[glyph_name] = metrics
    return glyph_name


def add_author_mark_glyph(
    font: TTFont,
    glyph_name: str,
    source_font: TTFont,
    source_hb_font: hb.Font,
    source_glyph_order: list[str],
) -> str:
    """Build the centered U+00DB mark from Gemunu Libre Regular text."""
    source_glyph_set = source_font.getGlyphSet()
    mark_pen = RecordingPen()
    line_boxes = (
        ("KOMORI", 520, 760),
        ("WISHWALUO", 250, 490),
        ("2026", -20, 220),
    )

    for text, box_bottom, box_top in line_boxes:
        shaped = shape_target(source_hb_font, source_glyph_order, text)
        if any(component_name == ".notdef" for component_name, *_ in shaped):
            raise RuntimeError(f"Missing source outline for author mark: {text}")

        bounds_pen = BoundsPen(source_glyph_set)
        cursor_x = 0
        cursor_y = 0
        for component_name, x_advance, y_advance, x_offset, y_offset in shaped:
            transformed = TransformPen(
                bounds_pen,
                (1, 0, 0, 1, cursor_x + x_offset, cursor_y + y_offset),
            )
            source_glyph_set[component_name].draw(transformed)
            cursor_x += x_advance
            cursor_y += y_advance

        if bounds_pen.bounds is None:
            raise RuntimeError(f"Empty source outline for author mark: {text}")
        x_min, y_min, x_max, y_max = bounds_pen.bounds
        width = x_max - x_min
        height = y_max - y_min
        scale = min(900 / width, 210 / height)
        x_shift = (1008 - width * scale) / 2 - x_min * scale
        y_shift = (
            box_bottom
            + (box_top - box_bottom - height * scale) / 2
            - y_min * scale
        )

        cursor_x = 0
        cursor_y = 0
        for component_name, x_advance, y_advance, x_offset, y_offset in shaped:
            source_pen = DecomposingRecordingPen(source_glyph_set)
            source_glyph_set[component_name].draw(source_pen)
            transformed = TransformPen(
                mark_pen,
                (
                    scale,
                    0,
                    0,
                    scale,
                    x_shift + (cursor_x + x_offset) * scale,
                    y_shift + (cursor_y + y_offset) * scale,
                ),
            )
            source_pen.replay(transformed)
            cursor_x += x_advance
            cursor_y += y_advance

    mark_bounds_pen = BoundsPen(None)
    mark_pen.replay(mark_bounds_pen)
    if mark_bounds_pen.bounds is None:
        raise RuntimeError("Empty author mark outline")
    x_min, y_min, x_max, y_max = mark_bounds_pen.bounds
    x_center_offset = 1008 / 2 - (x_min + x_max) / 2
    y_center_offset = AUTHOR_MARK_CENTER_Y - (y_min + y_max) / 2

    output_pen = TTGlyphPen(None)
    mark_pen.replay(
        TransformPen(
            output_pen,
            (1, 0, 0, 1, x_center_offset, y_center_offset),
        )
    )
    font["glyf"].glyphs[glyph_name] = output_pen.glyph()
    font.setGlyphOrder([*font.getGlyphOrder(), glyph_name])
    font["hmtx"].metrics[glyph_name] = (
        1008,
        round(x_min + x_center_offset),
    )
    return glyph_name


def add_legacy_symbol_glyph(
    font: TTFont,
    legacy: str,
    glyph_name: str,
    *,
    gemunu_style: bool,
    bold: bool,
) -> str:
    """Draw FM-only symbol variants that have no exact Unicode outline."""
    pen = TTGlyphPen(None)

    def rectangle(x_min: int, y_min: int, x_max: int, y_max: int) -> None:
        pen.moveTo((x_min, y_min))
        pen.lineTo((x_min, y_max))
        pen.lineTo((x_max, y_max))
        pen.lineTo((x_max, y_min))
        pen.closePath()

    if legacy == "\u00a0":
        # The legacy non-breaking-space slot is a raised black small square.
        rectangle(18, 349, 159, 522)
        metrics = (180, 18)
    elif legacy == "¡":
        # SMALL FULL STOP, visibly smaller than the regular FM period.
        pen.moveTo((68, -4))
        pen.qCurveTo((32, -4), (32, 31))
        pen.qCurveTo((32, 66), (68, 66))
        pen.qCurveTo((104, 66), (104, 31))
        pen.qCurveTo((104, -4), (68, -4))
        pen.closePath()
        metrics = (137, 32)
    elif legacy == "¤":
        # The legacy target is a short low line rather than a centred dash.
        rectangle(37, -2, 177, 16)
        metrics = (238, 37)
    elif legacy == "¶":
        if gemunu_style:
            # Keep the outer silhouette stable and vary the internal opening
            # by the same counter-shrinking strategy used by Gemunu Libre.
            stem_inner = 124 if bold else 96
            notch_left = 144 if bold else 116
            notch_mid = 174 if bold else 210
            notch_right = 189 if bold else 228
            notch_top = 288 if bold else 241
            notch_curve_y = 304 if bold else 257
            inner_curve_y = 374 if bold else 405
            inner_top = 394 if bold else 425
            pen.moveTo((stem_inner, -1))
            pen.lineTo((23, -1))
            pen.lineTo((23, 432))
            pen.qCurveTo((23, 478), (71, 478))
            pen.lineTo((256, 478))
            pen.qCurveTo((301, 478), (301, 435))
            pen.lineTo((301, 230))
            pen.qCurveTo((301, 211), (276, 188), (259, 188))
            pen.lineTo((notch_left, 188))
            pen.lineTo((notch_left, notch_top))
            pen.lineTo((notch_mid, notch_top))
            pen.qCurveTo(
                (notch_right, notch_top),
                (notch_right, notch_curve_y),
            )
            pen.lineTo((notch_right, inner_curve_y))
            pen.qCurveTo((notch_right, inner_top), (notch_mid, inner_top))
            pen.lineTo((notch_left, inner_top))
            pen.qCurveTo(
                (stem_inner + 5, inner_top),
                (stem_inner, 354),
            )
            pen.closePath()
            metrics = (332, 22)
        else:
            # Hand-authored reconstruction of the compact rounded FM form.
            pen.moveTo((61, 0))
            pen.lineTo((34, 0))
            pen.lineTo((34, 269))
            pen.qCurveTo((34, 414), (149, 407))
            pen.qCurveTo((196, 404), (216, 356))
            pen.qCurveTo((221, 344), (221, 325))
            pen.qCurveTo((221, 292), (207, 272))
            pen.qCurveTo((186, 242), (131, 242))
            pen.qCurveTo((112, 242), (94, 247))
            pen.lineTo((94, 269))
            if bold:
                pen.qCurveTo((146, 265), (155, 301))
                pen.qCurveTo((158, 314), (140, 347), (119, 347))
                pen.qCurveTo((61, 347), (61, 268))
            else:
                pen.qCurveTo((101, 267), (109, 267))
                pen.qCurveTo((131, 267), (163, 292), (163, 312))
                pen.qCurveTo((163, 353), (121, 353))
                pen.qCurveTo((61, 353), (61, 268))
            pen.closePath()
            metrics = (249, 33)
    elif legacy in {"·", "∙"}:
        # Hand-authored reconstructions of the family's narrow double-loop
        # legacy form.  The two historical input slots intentionally share it.
        if gemunu_style:
            lower_left = 126 if bold else 90
            lower_right = 196 if bold else 232
            lower_inner_top = 123 if bold else 147
            lower_inner_bottom = 105 if bold else 65
            pen.moveTo((202, 296))
            pen.qCurveTo((174, 296), (161, 300))
            pen.lineTo((284, 228))
            pen.qCurveTo((301, 218), (301, 180))
            pen.lineTo((301, 46))
            pen.qCurveTo((301, 30), (291, 16))
            pen.qCurveTo((277, 0), (254, 0))
            pen.lineTo((70, 0))
            pen.qCurveTo((52, 0), (23, 28), (23, 52))
            pen.lineTo((23, 165))
            pen.lineTo((lower_left, 165))
            pen.lineTo((lower_left, lower_inner_top))
            pen.qCurveTo(
                (lower_left, lower_inner_bottom),
                (lower_left + 17, lower_inner_bottom),
            )
            pen.lineTo((lower_right - 14, lower_inner_bottom))
            pen.qCurveTo(
                (lower_right, lower_inner_bottom),
                (lower_right, lower_inner_top),
            )
            pen.lineTo((lower_right, 159))
            pen.qCurveTo((lower_right, 174), (176, 186))
            pen.lineTo((70, 250))
            pen.qCurveTo((44, 265), (39, 270))
            pen.qCurveTo((23, 285), (23, 305))
            pen.lineTo((23, 432))
            pen.qCurveTo((23, 478), (71, 478))
            pen.lineTo((256, 478))
            pen.qCurveTo((301, 478), (301, 435))
            pen.lineTo((301, 338))
            pen.qCurveTo((301, 319), (276, 296), (259, 296))
            pen.closePath()
            counter_left = 132 if bold else 95
            counter_right = 202 if bold else 239
            counter_top = 412 if bold else 445
            counter_bottom = 358 if bold else 325
            pen.moveTo((counter_left + 13, counter_top))
            pen.qCurveTo(
                (counter_left, counter_top),
                (counter_left, counter_top - 14),
            )
            pen.lineTo((counter_left, counter_bottom + 13))
            pen.qCurveTo(
                (counter_left, counter_bottom),
                (counter_left + 15, counter_bottom),
            )
            pen.lineTo((counter_right - 14, counter_bottom))
            pen.qCurveTo(
                (counter_right, counter_bottom),
                (counter_right, counter_bottom + 13),
            )
            pen.lineTo((counter_right, counter_top - 15))
            pen.qCurveTo(
                (counter_right, counter_top),
                (counter_right - 9, counter_top),
            )
            pen.closePath()
            metrics = (332, 22)
        else:
            pen.moveTo((70, 269))
            pen.qCurveTo((69, 237), (120, 208))
            pen.qCurveTo((197, 165), (199, 163))
            pen.qCurveTo((222, 142), (222, 94))
            pen.qCurveTo((222, 70), (216, 54))
            pen.qCurveTo((192, -3), (128, -3))
            pen.qCurveTo((120, -3), (112, -2))
            pen.qCurveTo((74, 3), (51, 33))
            pen.qCurveTo((30, 60), (30, 96))
            pen.qCurveTo((30, 110), (34, 123))
            pen.lineTo((59, 123))
            if bold:
                pen.qCurveTo((60, 105), (97, 82), (123, 82))
                pen.qCurveTo((142, 82), (170, 103), (170, 122))
                pen.qCurveTo((170, 153), (118, 177))
            else:
                pen.qCurveTo((55, 99), (94, 64), (122, 62))
                pen.qCurveTo((144, 61), (181, 86), (182, 107))
                pen.qCurveTo((183, 147), (118, 177))
            pen.qCurveTo((48, 210), (37, 274))
            pen.qCurveTo((35, 288), (35, 302))
            pen.qCurveTo((35, 351), (62, 379))
            pen.qCurveTo((93, 411), (152, 408))
            pen.qCurveTo((198, 405), (219, 355))
            pen.qCurveTo((223, 345), (223, 328))
            pen.qCurveTo((223, 294), (208, 273))
            pen.qCurveTo((187, 245), (142, 245))
            pen.qCurveTo((126, 245), (109, 249))
            pen.qCurveTo((99, 252), (70, 269))
            pen.closePath()
            if bold:
                pen.moveTo((91, 359))
                pen.qCurveTo((81, 345), (81, 327))
                pen.qCurveTo((81, 299), (103, 283))
                pen.qCurveTo((117, 273), (135, 273))
                pen.qCurveTo((164, 273), (181, 296))
                pen.qCurveTo((191, 310), (191, 327))
                pen.qCurveTo((191, 355), (168, 371))
                pen.qCurveTo((154, 381), (136, 381))
                pen.qCurveTo((107, 381), (91, 359))
            else:
                pen.moveTo((81, 354))
                pen.qCurveTo((73, 340), (73, 327))
                pen.qCurveTo((73, 302), (98, 282))
                pen.qCurveTo((115, 268), (139, 268))
                pen.qCurveTo((169, 268), (187, 291))
                pen.qCurveTo((198, 305), (198, 323))
                pen.qCurveTo((198, 359), (168, 377))
                pen.qCurveTo((153, 386), (135, 386))
                pen.qCurveTo((95, 386), (81, 354))
            pen.closePath()
            metrics = (255, 30)
    elif legacy == "Ã":
        # Unified FM-style BLACK UP-POINTING TRIANGLE.  The historical shape
        # fills a full symbol cell, so U+25B2 is a closer semantic match than
        # the deliberately smaller U+25B4 BLACK UP-POINTING SMALL TRIANGLE.
        pen.moveTo((210, 371))
        pen.lineTo((25, -1))
        pen.lineTo((397, -1))
        pen.closePath()
        metrics = (445, 25)
    elif legacy == "”":
        # Unified FM shadowed white square.  Its first contour joins the left
        # and lower shadow to the upper-right frame; the second is the counter.
        pen.moveTo((369, -3))
        pen.lineTo((36, -3))
        pen.lineTo((36, 328))
        pen.lineTo((90, 328))
        pen.lineTo((90, 380))
        pen.lineTo((420, 380))
        pen.lineTo((420, 48))
        pen.lineTo((369, 48))
        pen.closePath()
        pen.moveTo((107, 361))
        pen.lineTo((107, 64))
        pen.lineTo((405, 64))
        pen.lineTo((405, 361))
        pen.closePath()
        metrics = (466, 36)
    elif legacy == "•":
        # Unified FM solid square.
        pen.moveTo((33, 342))
        pen.lineTo((33, 0))
        pen.lineTo((372, 0))
        pen.lineTo((372, 342))
        pen.closePath()
        metrics = (416, 33)
    else:
        raise ValueError(f"Unsupported custom FM symbol: {legacy!r}")

    font["glyf"].glyphs[glyph_name] = pen.glyph()
    font.setGlyphOrder([*font.getGlyphOrder(), glyph_name])
    font["hmtx"].metrics[glyph_name] = metrics
    return glyph_name


def add_xits_glyph(
    font: TTFont,
    xits_font: TTFont,
    source_codepoint: int,
    glyph_name: str,
    scale: float,
    *,
    target_advance: int | None = None,
    target_bounds: tuple[int, int, int, int] | None = None,
) -> str:
    """Copy one XITS character, optionally fitting legacy slot geometry."""
    source_name = xits_font.getBestCmap()[source_codepoint]
    transform = (scale, 0, 0, scale, 0, 0)
    left_side_bearing: int
    if target_bounds is not None:
        bounds_pen = BoundsPen(xits_font.getGlyphSet())
        xits_font.getGlyphSet()[source_name].draw(bounds_pen)
        if bounds_pen.bounds is None:
            raise ValueError(f"XITS glyph {source_name} has no bounds")
        source_x_min, source_y_min, source_x_max, source_y_max = (
            bounds_pen.bounds
        )
        target_x_min, target_y_min, target_x_max, target_y_max = (
            target_bounds
        )
        x_scale = (target_x_max - target_x_min) / (
            source_x_max - source_x_min
        )
        y_scale = (target_y_max - target_y_min) / (
            source_y_max - source_y_min
        )
        transform = (
            x_scale,
            0,
            0,
            y_scale,
            target_x_min - source_x_min * x_scale,
            target_y_min - source_y_min * y_scale,
        )
        left_side_bearing = target_x_min
    else:
        _, source_lsb = xits_font["hmtx"].metrics[source_name]
        left_side_bearing = round(source_lsb * scale)

    pen = TTGlyphPen(None)
    quadratic_pen = Cu2QuPen(
        pen,
        max_err=1.0,
        reverse_direction=True,
    )
    output_pen = TransformPen(quadratic_pen, transform)
    xits_font.getGlyphSet()[source_name].draw(output_pen)

    font["glyf"].glyphs[glyph_name] = pen.glyph()
    font.setGlyphOrder([*font.getGlyphOrder(), glyph_name])
    source_advance, _ = xits_font["hmtx"].metrics[source_name]
    font["hmtx"].metrics[glyph_name] = (
        target_advance
        if target_advance is not None
        else round(source_advance * scale),
        left_side_bearing,
    )
    return glyph_name


def add_retroflex_i_glyph(
    font: TTFont,
    glyph_name: str,
    *,
    long_vowel: bool,
) -> str:
    """Draw Abhaya Libre-inspired i/ii marks for retroflex letters."""
    pen = TTGlyphPen(None)
    pen.moveTo((-315, 501))
    pen.qCurveTo((-376, 484), (-432, 491))
    pen.qCurveTo((-478, 497), (-501, 524))
    pen.qCurveTo((-520, 545), (-520, 572))
    pen.qCurveTo((-520, 640), (-446, 675))
    pen.qCurveTo((-385, 703), (-296, 703))

    if long_vowel:
        pen.qCurveTo((-45, 703), (-50, 574))
        pen.qCurveTo((-51, 536), (-81, 516))
        pen.qCurveTo((-107, 499), (-143, 502))
        pen.qCurveTo((-161, 503), (-206, 536), (-214, 555))
        pen.qCurveTo((-218, 565), (-218, 579))
        pen.qCurveTo((-218, 612), (-195, 634))
        pen.qCurveTo((-233, 642), (-298, 639))
        pen.qCurveTo((-477, 631), (-480, 569))
        pen.qCurveTo((-482, 527), (-426, 518))
        pen.qCurveTo((-362, 508), (-308, 530))
        pen.closePath()

        pen.moveTo((-176, 606))
        pen.qCurveTo((-185, 593), (-185, 578))
        pen.qCurveTo((-185, 551), (-162, 536))
        pen.qCurveTo((-149, 528), (-134, 528))
        pen.qCurveTo((-106, 528), (-91, 550))
        pen.qCurveTo((-82, 563), (-82, 578))
        pen.qCurveTo((-82, 606), (-105, 620))
        pen.qCurveTo((-118, 628), (-133, 628))
        pen.qCurveTo((-161, 628), (-176, 606))
        pen.closePath()
    else:
        pen.qCurveTo((-209, 703), (-147, 672))
        pen.qCurveTo((-76, 636), (-76, 573))
        pen.qCurveTo((-76, 540), (-131, 495), (-160, 500))
        pen.lineTo((-180, 524))
        pen.qCurveTo((-174, 523), (-167, 523))
        pen.qCurveTo((-144, 523), (-112, 546), (-112, 563))
        pen.qCurveTo((-112, 603), (-176, 621))
        pen.qCurveTo((-224, 635), (-295, 635))
        pen.qCurveTo((-473, 635), (-481, 568))
        pen.qCurveTo((-486, 529), (-424, 519))
        pen.qCurveTo((-362, 509), (-310, 530))
        pen.closePath()

    font["glyf"].glyphs[glyph_name] = pen.glyph()
    font.setGlyphOrder([*font.getGlyphOrder(), glyph_name])
    font["hmtx"].metrics[glyph_name] = (8, -520)
    return glyph_name


def add_extracted_overlay_glyph(
    font: TTFont,
    glyph_name: str,
    *,
    source_name: str,
    selected_contours: set[int],
    reference_base_name: str,
    y_offset: int = 0,
) -> str:
    """Extract selected source contours as a post-base overlay glyph."""
    source_pen = RecordingPen()
    font.getGlyphSet()[source_name].draw(source_pen)

    contours: list[list[tuple[str, tuple]]] = []
    contour: list[tuple[str, tuple]] = []
    for operator, operands in source_pen.value:
        if operator == "moveTo" and contour:
            raise ValueError(f"Unclosed contour in source glyph {source_name}")
        contour.append((operator, operands))
        if operator in {"closePath", "endPath"}:
            contours.append(contour)
            contour = []
    if contour:
        raise ValueError(f"Unclosed contour in source glyph {source_name}")
    if max(selected_contours) >= len(contours):
        raise ValueError(f"Unexpected contour layout in source glyph {source_name}")

    reference_advance, _ = font["hmtx"].metrics[reference_base_name]
    pen = TTGlyphPen(None)
    overlay_pen = TransformPen(
        pen,
        (1, 0, 0, 1, -reference_advance, y_offset),
    )
    selected_x: list[float] = []
    for contour_index in sorted(selected_contours):
        for operator, operands in contours[contour_index]:
            getattr(overlay_pen, operator)(*operands)
            selected_x.extend(
                point[0]
                for point in operands
                if point is not None
            )

    font["glyf"].glyphs[glyph_name] = pen.glyph()
    font.setGlyphOrder([*font.getGlyphOrder(), glyph_name])
    font["hmtx"].metrics[glyph_name] = (
        4,
        round(min(selected_x) - reference_advance),
    )
    return glyph_name


def add_fixed_source_overlay_glyph(
    font: TTFont,
    glyph_name: str,
    *,
    source_name: str,
    reference_base_name: str,
    legacy_x_bounds: tuple[int, int],
    y_offset: int = 0,
) -> str:
    """Fit one reusable source mark to FM's nominal fixed overlay width."""
    glyf = font["glyf"]
    source_glyph = glyf[source_name]
    source_glyph.recalcBounds(glyf)
    reference_advance, _ = font["hmtx"].metrics[reference_base_name]
    legacy_x_min, legacy_x_max = legacy_x_bounds
    target_x_min = round(
        legacy_x_min
        * reference_advance
        / FM_GEMUNU_REFERENCE_CONSONANT_ADVANCE
    )
    target_x_max = round(
        legacy_x_max
        * reference_advance
        / FM_GEMUNU_REFERENCE_CONSONANT_ADVANCE
    )
    x_scale = (target_x_max - target_x_min) / (
        source_glyph.xMax - source_glyph.xMin
    )
    x_offset = target_x_min - source_glyph.xMin * x_scale

    pen = TTGlyphPen(font.getGlyphSet())
    transformed = TransformPen(
        pen,
        (x_scale, 0, 0, 1, x_offset, y_offset),
    )
    font.getGlyphSet()[source_name].draw(transformed)
    font["glyf"].glyphs[glyph_name] = pen.glyph()
    font.setGlyphOrder([*font.getGlyphOrder(), glyph_name])
    font["hmtx"].metrics[glyph_name] = (
        4,
        target_x_min,
    )
    return glyph_name


def add_abhaya_u_tail_glyph(
    font: TTFont,
    glyph_name: str,
    legacy: str,
) -> str:
    """Extract Abhaya's compact post-base u/uu tail from its combined form."""
    source_name = "sinKU" if legacy == "=" else "sinKUu"
    advance_source = "sinMatraU" if legacy == "=" else "sinMatraUu"
    result = add_extracted_overlay_glyph(
        font,
        glyph_name,
        source_name=source_name,
        selected_contours={0},
        reference_base_name="sinKa",
    )
    advance, _ = font["hmtx"].metrics[advance_source]
    _, left_side_bearing = font["hmtx"].metrics[result]
    font["hmtx"].metrics[result] = (advance, left_side_bearing)
    return result


def add_gemunu_i_overlay_glyph(
    font: TTFont,
    glyph_name: str,
    legacy: str,
) -> str:
    """Build Gemunu Libre ispilla overlays at FM-compatible positions."""
    if legacy == "s":
        return add_fixed_source_overlay_glyph(
            font,
            glyph_name,
            source_name="sinMatraI",
            reference_base_name="sinPa",
            legacy_x_bounds=FM_GEMUNU_ISPILLA_X_BOUNDS[legacy],
            y_offset=-1,
        )
    if legacy == "S":
        return add_fixed_source_overlay_glyph(
            font,
            glyph_name,
            source_name="sinMatraIi",
            reference_base_name="sinPa",
            legacy_x_bounds=FM_GEMUNU_ISPILLA_X_BOUNDS[legacy],
            y_offset=-1,
        )
    if legacy == "‘":
        # Upstream source glyph name:
        # mahaapraanatayanna_vowelsignkettiispillacomb-sinh.abvs -> sinThI
        return add_extracted_overlay_glyph(
            font,
            glyph_name,
            source_name="sinThI",
            selected_contours={0},
            reference_base_name="sinTtha",
        )
    if legacy == "’":
        # Upstream source glyph name:
        # mahaapraanattayanna_vowelsigndigaispillacomb-sinh.abvs -> sinTthIi
        # The source component is raised to the FM slot's 747-unit top.
        return add_extracted_overlay_glyph(
            font,
            glyph_name,
            source_name="sinTthIi",
            selected_contours={1, 3},
            reference_base_name="sinDdha",
            y_offset=75,
        )
    raise ValueError(f"Unsupported Gemunu i-overlay slot: {legacy!r}")


def build_font(
    spec: FontSpec,
    source: Path,
    digit_source: Path | None,
    author_source: Path,
    output: Path,
) -> tuple[int, int, int]:
    font = load_weighted_source(source, spec.weight_class)
    author_font = load_weighted_source(author_source, 400)
    xits_font = (
        TTFont(digit_source, recalcBBoxes=True, recalcTimestamp=False)
        if digit_source is not None
        else None
    )
    # Shape against the same instantiated outline the rest of the build uses.
    saved = io.BytesIO()
    font.save(saved)
    hb_face = hb.Face(saved.getvalue())
    hb_font = hb.Font(hb_face)
    hb_font.scale = (hb_face.upem, hb_face.upem)
    source_glyph_order = font.getGlyphOrder()
    source_cmap = font.getBestCmap()
    author_saved = io.BytesIO()
    author_font.save(author_saved)
    author_hb_face = hb.Face(author_saved.getvalue())
    author_hb_font = hb.Font(author_hb_face)
    author_hb_font.scale = (author_hb_face.upem, author_hb_face.upem)
    author_glyph_order = author_font.getGlyphOrder()
    xits_scale = None
    if xits_font is not None:
        simulated_w_advance = sum(
            item[1]
            for item in shape_target(
                hb_font,
                source_glyph_order,
                "උ",
            )
        )
        target_digit_advance = round(
            FM_ABHAYA_X_ZERO_ADVANCE
            * simulated_w_advance
            / FM_ABHAYA_X_W_SLOT_ADVANCE
        )
        xits_zero_name = xits_font.getBestCmap()[ord("0")]
        xits_zero_advance, _ = xits_font["hmtx"].metrics[xits_zero_name]
        xits_scale = target_digit_advance / xits_zero_advance
    cmap: dict[int, str] = {}
    composites = 0

    glyph_overrides = spec.glyph_overrides

    raw_entries = load_legacy_mapping()
    single_targets: dict[str, str] = {}
    explicit_sequence_targets: dict[str, tuple[str, list[str] | None]] = {}

    # First collect semantic mappings.  Supporting legacy strings longer than
    # one code point makes this generator compatible with richer mapping files
    # without changing the rest of the font-building logic.
    for entry in raw_entries:
        legacy = entry["legacy"]
        target = entry["unicode"]
        if not legacy:
            continue
        if len(legacy) == 1:
            single_targets[legacy] = target
        else:
            explicit_sequence_targets[legacy] = (
                target,
                entry.get("shapeTargets"),
            )

    # Û is a display-only author-mark slot. Keep it in the cmap without
    # treating it as a Sinhala component or manufacturing contextual ligatures.
    single_targets.setdefault("Û", "Û")

    target_glyph_cache: dict[
        tuple[tuple[str, ...], tuple[tuple[str, int], ...]],
        str,
    ] = {}

    def glyph_for_target(
        target: str,
        glyph_name: str,
        shape_targets: list[str] | None = None,
        shape_features: dict[str, int] | None = None,
    ) -> str | None:
        nonlocal composites
        segments = tuple(shape_targets or [target])
        feature_key = tuple(sorted((shape_features or {}).items()))
        cache_key = (segments, feature_key)
        cached = target_glyph_cache.get(cache_key)
        if cached is not None:
            return cached

        shaped = []
        for segment in segments:
            segment_glyphs = shape_target(
                hb_font,
                source_glyph_order,
                segment,
                shape_features,
            )
            if segment.strip():
                segment_glyphs = [
                    item for item in segment_glyphs if item[0] != "space"
                ]
            shaped.extend(segment_glyphs)
        if any(item[0] == ".notdef" for item in shaped):
            return None

        if not shaped:
            result = "space"
        elif (
            len(shaped) == 1
            and shaped[0][3] == 0
            and shaped[0][4] == 0
        ):
            result = shaped[0][0]
        else:
            composites += 1
            result = add_composite_glyph(font, glyph_name, shaped)

        target_glyph_cache[cache_key] = result
        return result

    # Build the single-code-point cmap first; sequence GSUB rules refer to these
    # glyphs as their inputs.
    for index, (legacy, target) in enumerate(single_targets.items()):
        codepoint = ord(legacy)
        if spec.family == "Abhaya Legacy" and legacy in {"=", "+"}:
            cmap[codepoint] = add_abhaya_u_tail_glyph(
                font,
                f"fmlegacy.abhaya-u-tail.{codepoint:04X}.{index}",
                legacy,
            )
            continue
        if legacy == "`":
            cmap[codepoint] = add_braid_glyph(
                font,
                f"fmlegacy.braid.{codepoint:04X}.{index}",
                gemunu_style=spec.family == "Gemunu Legacy",
                bold=spec.weight == "Bold",
            )
            continue
        if (
            spec.family == "Gemunu Legacy"
            and legacy in {"s", "S", "‘", "’"}
        ):
            cmap[codepoint] = add_gemunu_i_overlay_glyph(
                font,
                f"fmlegacy.gemunu-i-overlay.{codepoint:04X}.{index}",
                legacy,
            )
            continue
        if legacy in {"‘", "’"}:
            cmap[codepoint] = add_retroflex_i_glyph(
                font,
                f"fmlegacy.retroflex-i.{codepoint:04X}.{index}",
                long_vowel=legacy == "’",
            )
            continue
        if legacy == "Û":
            cmap[codepoint] = add_author_mark_glyph(
                font,
                f"fmlegacy.author-mark.{codepoint:04X}.{index}",
                author_font,
                author_hb_font,
                author_glyph_order,
            )
            composites += 1
            continue
        if legacy in {
            "\u00a0",
            "¡",
            "¤",
            "¶",
            "·",
            "∙",
            "Ã",
            "”",
            "•",
        }:
            cmap[codepoint] = add_legacy_symbol_glyph(
                font,
                legacy,
                f"fmlegacy.symbol.{codepoint:04X}.{index}",
                gemunu_style=spec.family == "Gemunu Legacy",
                bold=spec.weight == "Bold",
            )
            continue
        gemunu_roman_source = (
            ROMAN_LEGACY_LATIN_SOURCES.get(legacy)
            if spec.family == "Gemunu Legacy"
            else None
        )
        if gemunu_roman_source is not None:
            cmap[codepoint] = source_cmap[gemunu_roman_source]
            continue
        if spec.family == "Gemunu Legacy" and len(target) == 1:
            target_codepoint = ord(target)
            gemunu_fallback = GEMUNU_SYMBOL_FALLBACKS.get(target_codepoint)
            if (
                target_codepoint not in source_cmap
                and gemunu_fallback is not None
            ):
                cmap[codepoint] = source_cmap[gemunu_fallback]
                continue

        source_codepoint = (
            XITS_LEGACY_GLYPH_SOURCES.get(legacy)
            if spec.use_xits_digits
            else None
        )
        if (
            source_codepoint is None
            and spec.use_xits_digits
            and len(target) == 1
        ):
            target_codepoint = ord(target)
            if (
                target.isdigit()
                or unicodedata.category(target)[0] in {"P", "S"}
            ):
                xits_cmap = xits_font.getBestCmap()
                if target_codepoint in xits_cmap:
                    source_codepoint = target_codepoint
                else:
                    fallback = XITS_SYMBOL_FALLBACKS.get(target_codepoint)
                    if fallback in xits_cmap:
                        source_codepoint = fallback
        if source_codepoint is not None:
            if xits_font is None:
                raise RuntimeError(
                    f"Missing XITS source for {spec.family} {spec.weight}"
                )
            source_name = xits_font.getBestCmap()[source_codepoint]
            source_advance, _ = xits_font["hmtx"].metrics[source_name]
            target_metrics = ABHAYA_LEGACY_TARGET_METRICS.get(
                spec.weight,
                {},
            ).get(legacy)
            legacy_advance = (
                target_metrics[0]
                if target_metrics is not None
                else XITS_LEGACY_ADVANCES.get(legacy)
            )
            glyph_scale = (
                legacy_advance / source_advance
                if legacy_advance is not None
                else xits_scale
            )
            cmap[codepoint] = add_xits_glyph(
                font,
                xits_font,
                source_codepoint,
                (
                    f"fmlegacy.xits.{source_codepoint:04X}."
                    f"{codepoint:04X}.{index}"
                ),
                glyph_scale,
                target_advance=(
                    target_metrics[0]
                    if target_metrics is not None
                    else None
                ),
                target_bounds=(
                    target_metrics[1]
                    if target_metrics is not None
                    else None
                ),
            )
            continue
        if legacy in glyph_overrides:
            glyph_name = glyph_overrides[legacy]
            offset = spec.glyph_offsets.get(legacy)
            if offset is not None:
                glyph_name = add_transformed_glyph(
                    font,
                    glyph_name,
                    f"fmlegacy.override.{codepoint:04X}.{index}",
                    *offset,
                )
            advance_source = spec.glyph_advance_sources.get(legacy)
            if advance_source is not None:
                advance, _ = font["hmtx"].metrics[advance_source]
                _, left_side_bearing = font["hmtx"].metrics[glyph_name]
                font["hmtx"].metrics[glyph_name] = (
                    advance,
                    left_side_bearing,
                )
            cmap[codepoint] = glyph_name
            continue

        glyph_name = glyph_for_target(
            target,
            f"fmlegacy.{codepoint:04X}.{index}",
        )
        if glyph_name is not None:
            cmap[codepoint] = glyph_name

    for alias, primary in SHARED_LEGACY_GLYPH_SLOTS.items():
        cmap[ord(alias)] = cmap[ord(primary)]

    # Text conversion recognizes every complete legacy sequence, but the font
    # must not turn that conversion table into thousands of redundant glyphs.
    # Ordinary signs (for example d/e/E/D for ා/ැ/ෑ/ෘ) retain their original
    # direct legacy layout; only inseparable structural cores become ligatures.
    missing_ligatures = REQUIRED_LEGACY_LIGATURES - explicit_sequence_targets.keys()
    if missing_ligatures:
        raise RuntimeError(
            "Required legacy ligatures are absent from the conversion map: "
            + ", ".join(sorted(missing_ligatures))
        )
    sequence_targets = {
        legacy: target
        for legacy, target in explicit_sequence_targets.items()
        if legacy in REQUIRED_LEGACY_LIGATURES
    }

    sequence_rules: list[tuple[tuple[str, ...], str]] = []
    seen_inputs: set[tuple[str, ...]] = set()
    output_glyphs: set[str] = set()

    # Longest sequences first so a future mapping file can safely contain both
    # a short prefix and a more specific longer combination.
    ordered_sequences = sorted(
        sequence_targets.items(),
        key=lambda item: (-len(item[0]), item[0]),
    )
    for sequence_index, (
        legacy_sequence,
        (target, shape_targets),
    ) in enumerate(ordered_sequences):
        try:
            input_glyphs = tuple(cmap[ord(character)] for character in legacy_sequence)
        except KeyError:
            continue
        if len(input_glyphs) < 2 or input_glyphs in seen_inputs:
            continue

        output_glyph = glyph_for_target(
            target,
            f"fmseq.{sequence_index:04d}",
            shape_targets,
            (
                {"ss01": 1}
                if any(
                    character in spec.alternate_shape_legacy
                    for character in legacy_sequence
                )
                else None
            ),
        )
        if output_glyph is None:
            continue

        seen_inputs.add(input_glyphs)
        output_glyphs.add(output_glyph)
        sequence_rules.append((input_glyphs, output_glyph))

    font["cmap"] = make_cmap(cmap)

    # The source font's Sinhala layout tables target Unicode input.  Legacy FM
    # input is ASCII/Windows-1252, so discard those tables and install our own
    # required-ligature table for legacy character sequences.  STAT (which can
    # survive instancing a variable source) has no meaning once the variable
    # axes are gone and is removed too.
    for table_tag in ("GDEF", "GPOS", "GSUB", "STAT"):
        if table_tag in font:
            del font[table_tag]
    reph_glyphs = (cmap[ord("_")], cmap[ord("–")])
    ispilla_glyphs = (
        (cmap[ord("s")], cmap[ord("S")])
        if spec.family == "Gemunu Legacy"
        else ()
    )
    add_legacy_features(
        font,
        sequence_rules,
        reph_glyphs,
        ispilla_glyphs,
        set(cmap.values()) | output_glyphs,
    )

    set_font_name(font, spec)
    font["OS/2"].usWeightClass = spec.weight_class
    font["OS/2"].ulCodePageRange1 = 1
    font["OS/2"].ulCodePageRange2 = 0

    options = Options()
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
    options.name_legacy = True
    options.layout_features = ["rlig", "mark"]
    subsetter = Subsetter(options=options)
    subsetter.populate(unicodes=cmap.keys(), glyphs=output_glyphs)
    subsetter.subset(font)

    output.parent.mkdir(parents=True, exist_ok=True)
    font.flavor = "woff2"
    font.save(output)
    return len(cmap), composites, len(sequence_rules)


def main() -> None:
    args = parse_args()

    source_dirs = {
        "abhaya": args.abhaya_source_dir.resolve(),
        "gemunu": args.gemunu_source_dir.resolve(),
    }
    xits_source_dir = args.xits_source_dir.resolve()
    output_dir = args.output
    author_spec = GEMUNU_SPECS["Regular"]
    author_source = ensure_source_font(
        author_spec,
        source_dirs["gemunu"] / author_spec.source_filename,
    )

    jobs: list[tuple[FontSpec, Path, Path | None, Path]] = []
    for family in ("abhaya", "gemunu"):
        specs = ABHAYA_SPECS if family == "abhaya" else GEMUNU_SPECS
        for spec in specs.values():
            output = spec.output if output_dir is None else output_dir / spec.output.name
            jobs.append(
                (
                    spec,
                    source_dirs[family] / spec.source_filename,
                    (
                        xits_source_dir / spec.digit_source_filename
                        if spec.use_xits_digits
                        else None
                    ),
                    output,
                )
            )

    for spec, source_font, digit_source_font, output in jobs:
        source = ensure_source_font(spec, source_font)
        digit_source = (
            ensure_digit_source(spec, digit_source_font)
            if digit_source_font is not None
            else None
        )
        mapping_count, composite_count, sequence_count = build_font(
            spec,
            source,
            digit_source,
            author_source,
            output.resolve(),
        )
        base_license = spec.license_source.read_text(encoding="utf-8")
        imported_sources = (
            "Abhaya Libre, Gemunu Libre Regular, and XITS"
            if spec.use_xits_digits
            else "Gemunu Libre"
        )
        reconstruction_notice = (
            "Generated-font provenance notice:\n"
            f"Imported outlines come from {imported_sources}. "
            "Selected legacy-only glyphs either reuse contours from Libre "
            "alternates or use hand-authored visual reconstructions modeled "
            "on FM Abhaya/FM Gemunu forms; no original FM font file is loaded "
            "or bundled by the generator.\n\n"
        )
        output_license = f"{reconstruction_notice}{base_license.rstrip()}\n"
        if spec.use_xits_digits:
            xits_license = (xits_source_dir / "OFL.txt").read_text(
                encoding="utf-8"
            )
            xits_notice = xits_license.split(
                "\n\nThis Font Software is licensed",
                maxsplit=1,
            )[0]
            output_license += (
                f"\nXITS numeral and symbol outline notices:\n"
                f"{xits_notice}\n"
            )
            gemunu_license = (
                source_dirs["gemunu"] / "OFL.txt"
            ).read_text(encoding="utf-8")
            gemunu_notice = gemunu_license.split(
                "\n\nThis Font Software is licensed",
                maxsplit=1,
            )[0]
            output_license += (
                "\nGemunu Libre author-mark outline notices:\n"
                f"{gemunu_notice}\n"
            )
        spec.license_output.write_text(output_license, encoding="utf-8")
        print(
            f"Generated {output} with {mapping_count} FM code points "
            f"({composite_count} composite glyphs, {sequence_count} sequence rules)."
        )


if __name__ == "__main__":
    main()
