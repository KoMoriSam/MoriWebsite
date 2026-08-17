"""Generate an FM-encoded display font from the OFL Abhaya Libre font.

Requirements: fonttools[brotli] and uharfbuzz.
The generated font is committed as a web asset; this script is not part of the
normal site build.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import tempfile
import urllib.request
from pathlib import Path

import uharfbuzz as hb
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables._c_m_a_p import CmapSubtable


ROOT = Path(__file__).resolve().parents[1]
SOURCE_URL = (
    "https://raw.githubusercontent.com/google/fonts/main/ofl/abhayalibre/"
    "AbhayaLibre-Regular.ttf"
)
SOURCE_SHA256 = "d4279d38a0012fa54d340979694e70e3235266220dedc0d7000131345fb33bd4"
DEFAULT_OUTPUT = (
    ROOT / "src/assets/font/abhaya-libre/fm-abhaya-libre-legacy.woff2"
)
LICENSE_SOURCE = ROOT / "node_modules/@fontsource/abhaya-libre/LICENSE"
LICENSE_OUTPUT = ROOT / "src/assets/font/abhaya-libre/OFL.txt"
FONT_FAMILY = "FM Abhaya Libre Legacy"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-font",
        type=Path,
        help="Use an existing official AbhayaLibre-Regular.ttf instead of downloading it.",
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def ensure_source_font(source_font: Path | None) -> Path:
    if source_font:
        path = source_font.resolve()
    else:
        path = Path(tempfile.gettempdir()) / "AbhayaLibre-Regular.ttf"
        if not path.exists():
            urllib.request.urlretrieve(SOURCE_URL, path)

    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != SOURCE_SHA256:
        raise RuntimeError(
            f"Unexpected Abhaya Libre source hash: {digest}; expected {SOURCE_SHA256}"
        )
    return path


def load_legacy_mapping() -> list[dict[str, str]]:
    output = subprocess.check_output(
        ["node", str(ROOT / "scripts/get-fm-abhaya-map.mjs")],
        cwd=ROOT,
        text=True,
        encoding="utf-8",
    )
    return json.loads(output)


def set_font_name(font: TTFont) -> None:
    name_table = font["name"]
    values = {
        1: FONT_FAMILY,
        2: "Regular",
        3: f"{FONT_FAMILY} Regular 1.000",
        4: FONT_FAMILY,
        5: "Version 1.000",
        6: "FMAbhayaLibreLegacy-Regular",
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
) -> list[tuple[str, int, int, int, int]]:
    buffer = hb.Buffer()
    buffer.add_str(target)
    buffer.guess_segment_properties()
    if any(0x0D80 <= ord(character) <= 0x0DFF for character in target) or "\u200d" in target:
        buffer.script = "sinh"
        buffer.language = "si"
    buffer.flags = hb.BufferFlags.DO_NOT_INSERT_DOTTED_CIRCLE
    hb.shape(hb_font, buffer)
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



def add_required_ligatures(
    font: TTFont,
    rules: list[tuple[tuple[str, ...], str]],
) -> None:
    """Install legacy sequence substitutions as an always-on rlig feature."""
    if not rules:
        return

    feature_lines = [
        "languagesystem DFLT dflt;",
        "languagesystem latn dflt;",
        "feature rlig {",
    ]
    for input_glyphs, output_glyph in rules:
        feature_lines.append(
            f"  sub {' '.join(input_glyphs)} by {output_glyph};"
        )
    feature_lines.append("} rlig;")
    addOpenTypeFeaturesFromString(font, "\n".join(feature_lines))


def add_composite_glyph(
    font: TTFont,
    glyph_name: str,
    shaped: list[tuple[str, int, int, int, int]],
) -> str:
    glyph_set = font.getGlyphSet()
    pen = TTGlyphPen(None)
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


def build_font(source: Path, output: Path) -> tuple[int, int, int]:
    font = TTFont(source, recalcBBoxes=True, recalcTimestamp=False)
    source_bytes = source.read_bytes()
    hb_face = hb.Face(source_bytes)
    hb_font = hb.Font(hb_face)
    hb_font.scale = (hb_face.upem, hb_face.upem)
    source_glyph_order = font.getGlyphOrder()
    cmap: dict[int, str] = {}
    composites = 0

    # These two FM slots are contextual pieces rather than independent Unicode
    # characters.  Keeping the original Abhaya component glyphs also preserves
    # the old single-code-point behaviour when no sequence rule fires.
    glyph_overrides = {
        "%": "si_Rakar",
        "H": "si_Ya.post",
    }

    raw_entries = load_legacy_mapping()
    single_targets: dict[str, str] = {}
    explicit_sequence_targets: dict[str, str] = {}

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
            explicit_sequence_targets[legacy] = target

    target_glyph_cache: dict[str, str] = {}

    def glyph_for_target(target: str, glyph_name: str) -> str | None:
        nonlocal composites
        cached = target_glyph_cache.get(target)
        if cached is not None:
            return cached

        shaped = shape_target(hb_font, source_glyph_order, target)
        if target.strip():
            shaped = [item for item in shaped if item[0] != "space"]
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

        target_glyph_cache[target] = result
        return result

    # Build the single-code-point cmap first; sequence GSUB rules refer to these
    # glyphs as their inputs.
    for index, (legacy, target) in enumerate(single_targets.items()):
        codepoint = ord(legacy)
        if legacy in glyph_overrides:
            cmap[codepoint] = glyph_overrides[legacy]
            continue

        glyph_name = glyph_for_target(
            target,
            f"fmlegacy.{codepoint:04X}.{index}",
        )
        if glyph_name is not None:
            cmap[codepoint] = glyph_name

    # The JS mapping generator already emits every complete legacy sequence,
    # including compositionally derived forms such as ls -> කි, l%s -> ක්‍රි,
    # .= -> ගු and ;= -> තු.  Consume that single source of truth directly.
    sequence_targets = explicit_sequence_targets.copy()

    sequence_rules: list[tuple[tuple[str, ...], str]] = []
    seen_inputs: set[tuple[str, ...]] = set()
    output_glyphs: set[str] = set()

    # Longest sequences first so a future mapping file can safely contain both
    # a short prefix and a more specific longer combination.
    ordered_sequences = sorted(
        sequence_targets.items(),
        key=lambda item: (-len(item[0]), item[0]),
    )
    for sequence_index, (legacy_sequence, target) in enumerate(ordered_sequences):
        try:
            input_glyphs = tuple(cmap[ord(character)] for character in legacy_sequence)
        except KeyError:
            continue
        if len(input_glyphs) < 2 or input_glyphs in seen_inputs:
            continue

        output_glyph = glyph_for_target(
            target,
            f"fmseq.{sequence_index:04d}",
        )
        if output_glyph is None:
            continue

        seen_inputs.add(input_glyphs)
        output_glyphs.add(output_glyph)
        sequence_rules.append((input_glyphs, output_glyph))

    font["cmap"] = make_cmap(cmap)

    # The source font's Sinhala layout tables target Unicode input.  Legacy FM
    # input is ASCII/Windows-1252, so discard those tables and install our own
    # required-ligature table for legacy character sequences.
    for table_tag in ("GDEF", "GPOS", "GSUB"):
        if table_tag in font:
            del font[table_tag]
    add_required_ligatures(font, sequence_rules)

    set_font_name(font)
    font["OS/2"].ulCodePageRange1 = 1
    font["OS/2"].ulCodePageRange2 = 0

    options = Options()
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
    options.name_legacy = True
    options.layout_features = ["rlig"]
    subsetter = Subsetter(options=options)
    subsetter.populate(unicodes=cmap.keys(), glyphs=output_glyphs)
    subsetter.subset(font)

    output.parent.mkdir(parents=True, exist_ok=True)
    font.flavor = "woff2"
    font.save(output)
    return len(cmap), composites, len(sequence_rules)


def main() -> None:
    args = parse_args()
    source = ensure_source_font(args.source_font)
    mapping_count, composite_count, sequence_count = build_font(
        source, args.output.resolve()
    )
    LICENSE_OUTPUT.write_text(LICENSE_SOURCE.read_text(encoding="utf-8"), encoding="utf-8")
    print(
        f"Generated {args.output} with {mapping_count} FM code points "
        f"({composite_count} composite glyphs, {sequence_count} sequence rules)."
    )


if __name__ == "__main__":
    main()
