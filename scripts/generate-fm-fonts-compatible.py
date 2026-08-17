"""Generate FM-encoded display fonts from OFL Google Fonts sources.

Builds legacy-encoding display fonts whose outlines come from open Google
Fonts Sinhala families but whose character map follows the legacy FM encoding
used by the Sinhala converter:
  * FM Abhaya Libre Legacy (Regular and Bold, from the static Abhaya Libre
    fonts committed under scripts/font-sources/abhaya-libre)
  * FM Gemunu Libre Legacy (Regular and Bold, from the static Gemunu Libre
    1.100 fonts committed under scripts/font-sources/gemunu-libre)

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
from dataclasses import dataclass
from pathlib import Path

import uharfbuzz as hb
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables._c_m_a_p import CmapSubtable


ROOT = Path(__file__).resolve().parents[1]

# Static Google Fonts builds committed locally (hash-pinned).  Abhaya Libre is
# published as static weights upstream; Gemunu Libre 1.100 static fonts were
# supplied by the project maintainer because Google Fonts only publishes the
# variable build.
ABHAYA_SOURCE_BASENAME = "AbhayaLibre-{weight}.ttf"
ABHAYA_SOURCE_SHA256 = {
    "Regular": "d4279d38a0012fa54d340979694e70e3235266220dedc0d7000131345fb33bd4",
    "Bold": "01fb4cd74841c5f108372737a74cfedeaf0a722ca23e2275dc69f411dc0ad5a6",
}

GEMUNU_SOURCE_BASENAME = "GemunuLibre-{weight}.ttf"
GEMUNU_SOURCE_SHA256 = {
    "Regular": "76e776da632f19cc180563c96cd90e7f597e1b107120fbed69a82decefc87e8f",
    "Bold": "7150feaadef0135739f1b5137ed74621912cad006d864b8344c2ed172273fd2c",
}


@dataclass(frozen=True)
class FontSpec:
    """Everything the generator needs for one FM legacy display font."""

    family: str
    source_sha256: str
    source_filename: str
    output: Path
    license_source: Path
    license_output: Path
    glyph_overrides: dict[str, str]
    # Legacy weight of the generated face; used for font naming only.
    weight: str = "Regular"
    weight_class: int = 400

    @property
    def ps_name(self) -> str:
        return f"{''.join(self.family.split())}-{self.weight}"


ABHAYA_SPECS: dict[str, FontSpec] = {
    weight: FontSpec(
        family="FM Abhaya Libre Legacy",
        source_sha256=ABHAYA_SOURCE_SHA256[weight],
        source_filename=ABHAYA_SOURCE_BASENAME.format(weight=weight),
        output=ROOT
        / "src/assets/font/abhaya-libre"
        / (
            "fm-abhaya-libre-legacy.woff2"
            if weight == "Regular"
            else f"fm-abhaya-libre-{weight.lower()}-legacy.woff2"
        ),
        license_source=ROOT / "node_modules/@fontsource/abhaya-libre/LICENSE",
        license_output=ROOT / "src/assets/font/abhaya-libre/OFL.txt",
        glyph_overrides={
            # These two FM slots are contextual pieces rather than independent
            # Unicode characters.  Keeping the original Abhaya component glyphs
            # also preserves the old single-code-point behaviour when no
            # sequence rule fires.
            "%": "si_Rakar",
            "H": "si_Ya.post",
        },
        weight=weight,
        weight_class=400 if weight == "Regular" else 700,
    )
    for weight in ("Regular", "Bold")
}

GEMUNU_SPECS: dict[str, FontSpec] = {
    weight: FontSpec(
        family="FM Gemunu Libre Legacy",
        source_sha256=GEMUNU_SOURCE_SHA256[weight],
        source_filename=GEMUNU_SOURCE_BASENAME.format(weight=weight),
        output=ROOT
        / "src/assets/font/gemunu-libre"
        / (
            "fm-gemunu-libre-legacy.woff2"
            if weight == "Regular"
            else f"fm-gemunu-libre-{weight.lower()}-legacy.woff2"
        ),
        license_source=ROOT / "node_modules/@fontsource/gemunu-libre/LICENSE",
        license_output=ROOT / "src/assets/font/gemunu-libre/OFL.txt",
        glyph_overrides={
            # Gemunu names its rakar and post-base ya components sinRakar and
            # sinYansaya respectively, unlike Abhaya's si_Rakar / si_Ya.post.
            "%": "sinRakar",
            "H": "sinYansaya",
        },
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
            "Directory containing the local Abhaya Libre static fonts "
            "(AbhayaLibre-Regular.ttf and AbhayaLibre-Bold.ttf)."
        ),
    )
    parser.add_argument(
        "--gemunu-source-dir",
        type=Path,
        default=ROOT / "scripts" / "font-sources" / "gemunu-libre",
        help=(
            "Directory containing the local Gemunu Libre 1.100 static fonts "
            "(GemunuLibre-Regular.ttf and GemunuLibre-Bold.ttf)."
        ),
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
    values = {
        1: spec.family,
        2: spec.weight,
        3: f"{spec.family} {spec.weight} 1.000",
        4: spec.family,
        5: "Version 1.000",
        6: spec.ps_name,
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


def build_font(spec: FontSpec, source: Path, output: Path) -> tuple[int, int, int]:
    font = TTFont(source, recalcBBoxes=True, recalcTimestamp=False)
    # Shape against the same static outline the rest of the build uses.
    saved = io.BytesIO()
    font.save(saved)
    hb_face = hb.Face(saved.getvalue())
    hb_font = hb.Font(hb_face)
    hb_font.scale = (hb_face.upem, hb_face.upem)
    source_glyph_order = font.getGlyphOrder()
    cmap: dict[int, str] = {}
    composites = 0

    glyph_overrides = spec.glyph_overrides

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
    # required-ligature table for legacy character sequences.  STAT (which can
    # survive instancing a variable source) has no meaning once the variable
    # axes are gone and is removed too.
    for table_tag in ("GDEF", "GPOS", "GSUB", "STAT"):
        if table_tag in font:
            del font[table_tag]
    add_required_ligatures(font, sequence_rules)

    set_font_name(font, spec)
    font["OS/2"].usWeightClass = spec.weight_class
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

    source_dirs = {
        "abhaya": args.abhaya_source_dir.resolve(),
        "gemunu": args.gemunu_source_dir.resolve(),
    }
    all_specs = {
        **ABHAYA_SPECS,
        **GEMUNU_SPECS,
    }
    output_dir = args.output

    jobs: list[tuple[FontSpec, Path, Path]] = []
    for family in ("abhaya", "gemunu"):
        specs = ABHAYA_SPECS if family == "abhaya" else GEMUNU_SPECS
        for spec in specs.values():
            output = spec.output if output_dir is None else output_dir / spec.output.name
            jobs.append((spec, source_dirs[family] / spec.source_filename, output))

    for spec, source_font, output in jobs:
        source = ensure_source_font(spec, source_font)
        mapping_count, composite_count, sequence_count = build_font(
            spec, source, output.resolve()
        )
        spec.license_output.write_text(
            spec.license_source.read_text(encoding="utf-8"), encoding="utf-8"
        )
        print(
            f"Generated {output} with {mapping_count} FM code points "
            f"({composite_count} composite glyphs, {sequence_count} sequence rules)."
        )


if __name__ == "__main__":
    main()
