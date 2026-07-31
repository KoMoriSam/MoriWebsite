"""Build the site's sans and serif Kaiming punctuation font families.

Each visual family is emitted at nine static weights. Static instances let us
make the ink boundary exact at every shipped weight, which a non-variable GPOS
lookup cannot guarantee inside a variable font.

Rules baked into the output:

* pauses and brackets have a 0.5-em base advance;
* stops have a 1-em base advance;
* ``。？！`` expose a ``halt`` adjustment that removes their trailing 0.5 em
  when CSS line layout trims fullwidth punctuation at a line end;
* every closing-opening pair is two natural half-em forms, for a 1-em logical
  advance with the source typeface's normal contour gap;
* adjacent stops are compressed from 2 em to 1.5 em;
* an em dash is centered against the CJK em box and ``——`` becomes one
  continuous 2-em ligature whose outer side bearings match the brackets;
* ellipsis pairs remain 2 em and long-mark pairs receive no kerning.

Requires Python packages ``fonttools`` and ``brotli``. Generated WOFF2 files
are committed assets and only need rebuilding after a Fontsource update or a
punctuation-rule change.
"""

from copy import deepcopy
from pathlib import Path

from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables._c_m_a_p import CmapSubtable
from fontTools.varLib.instancer import instantiateVariableFont


ROOT = Path(__file__).resolve().parents[1]
FONT_ROOT = ROOT / "node_modules" / "@fontsource-variable"
OUTPUT_ROOT = ROOT / "public" / "assets" / "fonts" / "kaiming"
WEIGHTS = tuple(range(100, 1000, 100))
WEIGHT_NAMES = {
    100: "Thin",
    200: "ExtraLight",
    300: "Light",
    400: "Regular",
    500: "Medium",
    600: "SemiBold",
    700: "Bold",
    800: "ExtraBold",
    900: "Black",
}

FAMILIES = {
    "sans": "noto-sans-sc",
    "serif": "noto-serif-sc",
}

SOURCE_PARTS = {
    "latin": (0x2018, 0x2019),
    "5": (0xFF5B, 0xFF5D),
    "100": (0x3008,),
    "101": (0x3009, 0x3016, 0x3017),
    "102": (0xFF3B, 0xFF3D),
    "103": (0x3014, 0x3015),
    "106": (0x300E, 0x300F),
    "110": (0x300C, 0x300D),
    "114": (0x2026,),
    "115": (0xFF1B,),
    "116": (0x300A, 0x300B),
    "117": (0x201C, 0x201D, 0x3010, 0x3011, 0xFF1F),
    "118": (0xFF01, 0xFF08, 0xFF09),
    "119": (0x2014, 0x3001, 0x3002, 0xFF0C, 0xFF1A),
}

OPENING = {
    0x2018,
    0x201C,
    0x3008,
    0x300A,
    0x300C,
    0x300E,
    0x3010,
    0x3014,
    0x3016,
    0xFF08,
    0xFF3B,
    0xFF5B,
}

CLOSING = {
    0x2019,
    0x201D,
    0x3009,
    0x300B,
    0x300D,
    0x300F,
    0x3011,
    0x3015,
    0x3017,
    0xFF09,
    0xFF3D,
    0xFF5D,
}

PAUSE_MARKS = {0x3001, 0xFF0C, 0xFF1A, 0xFF1B}
FULL_STOPS = {0x3002, 0xFF01, 0xFF1F}
LONG_MARKS = {0x2014, 0x2026}
HALF_WIDTH = OPENING | CLOSING | PAUSE_MARKS
ALL_CODEPOINTS = set().union(*SOURCE_PARTS.values())
BRACKET_SIDE_REFERENCES = (
    (0xFF08, 0xFF09),
    (0x201C, 0x201D),
    (0x300C, 0x300D),
    (0x300A, 0x300B),
)


def source_path(package: str, part: str) -> Path:
    return (
        FONT_ROOT
        / package
        / "files"
        / f"{package}-{part}-wght-normal.woff2"
    )


def halt_values(font: TTFont) -> dict[str, tuple[int, int]]:
    """Return cumulative (x placement, x advance) values from GPOS halt."""
    gpos = font["GPOS"].table
    feature = next(
        record
        for record in gpos.FeatureList.FeatureRecord
        if record.FeatureTag == "halt"
    )
    values: dict[str, list[int]] = {}

    for lookup_index in feature.Feature.LookupListIndex:
        lookup = gpos.LookupList.Lookup[lookup_index]
        if lookup.LookupType != 1:
            raise ValueError(f"Unsupported halt lookup type: {lookup.LookupType}")

        for positioning in lookup.SubTable:
            if positioning.Format == 1:
                records = [positioning.Value] * len(positioning.Coverage.glyphs)
            elif positioning.Format == 2:
                records = positioning.Value
            else:
                raise ValueError(f"Unsupported SinglePos format: {positioning.Format}")

            for glyph_name, record in zip(positioning.Coverage.glyphs, records):
                current = values.setdefault(glyph_name, [0, 0])
                current[0] += getattr(record, "XPlacement", 0) or 0
                current[1] += getattr(record, "XAdvance", 0) or 0

    return {glyph: (value[0], value[1]) for glyph, value in values.items()}


def expand_simple_glyph(glyph, glyf) -> None:
    if glyph.isComposite():
        raise ValueError("Unexpected composite punctuation glyph")
    glyph.expand(glyf)


def shift_glyph(glyph, glyf, distance: int) -> None:
    if not distance:
        return
    expand_simple_glyph(glyph, glyf)
    if glyph.numberOfContours:
        for index, (x, y) in enumerate(glyph.coordinates):
            glyph.coordinates[index] = (x + distance, y)
        glyph.recalcBounds(glyf)


def fit_dash_to_em(
    glyph,
    glyf,
    units_per_em: int,
    target_center_sum: int,
    pair_side_bearing: int,
) -> None:
    """Center a dash with half the final pair's side bearing in each 1-em cell."""
    expand_simple_glyph(glyph, glyf)
    glyph.recalcBounds(glyf)
    ink_width = glyph.xMax - glyph.xMin
    if ink_width <= 0:
        raise ValueError("Em dash has no horizontal ink extent")

    x_min = glyph.xMin
    y_shift = round((target_center_sum - glyph.yMin - glyph.yMax) / 2)
    single_side_bearing = round(pair_side_bearing / 2)
    target_width = units_per_em - single_side_bearing * 2
    for index, (x, y) in enumerate(glyph.coordinates):
        stretched_x = single_side_bearing + round(
            (x - x_min) * target_width / ink_width
        )
        glyph.coordinates[index] = (stretched_x, y + y_shift)
    glyph.recalcBounds(glyf)


def double_dash_glyph(glyph, glyf):
    """Return one continuous two-em outline for the required dash pair."""
    pair = deepcopy(glyph)
    expand_simple_glyph(pair, glyf)
    for index, (x, y) in enumerate(pair.coordinates):
        pair.coordinates[index] = (x * 2, y)
    pair.recalcBounds(glyf)
    return pair


def bracket_side_bearing(glyphs, mapping: dict[int, str], half_em: int) -> int:
    """Average the outward side bearings of representative bracket pairs."""
    bearings = []
    for opening, closing in BRACKET_SIDE_REFERENCES:
        opening_glyph = glyphs[mapping[opening]]
        closing_glyph = glyphs[mapping[closing]]
        bearings.append(opening_glyph.xMin)
        bearings.append(half_em - closing_glyph.xMax)
    return round(sum(bearings) / len(bearings))


def build_cmap(mapping: dict[int, str]):
    cmap = newTable("cmap")
    cmap.tableVersion = 0
    cmap.tables = []
    subtable = CmapSubtable.newSubtable(4)
    subtable.platformID = 3
    subtable.platEncID = 1
    subtable.language = 0
    subtable.cmap = mapping
    cmap.tables.append(subtable)

    unicode_subtable = CmapSubtable.newSubtable(4)
    unicode_subtable.platformID = 0
    unicode_subtable.platEncID = 3
    unicode_subtable.language = 0
    unicode_subtable.cmap = mapping.copy()
    cmap.tables.append(unicode_subtable)
    return cmap


def set_font_identity(font: TTFont, style: str, weight: int) -> None:
    """Make internal names and weight bits agree with the CSS face."""
    style_name = "Sans" if style == "sans" else "Serif"
    family = f"Kaiming {style_name} Punctuation"
    subfamily = WEIGHT_NAMES[weight]
    postscript_family = f"Kaiming{style_name}Punctuation"
    postscript_name = f"{postscript_family}-{subfamily}"
    full_name = f"{family} {subfamily}"
    unique_id = f"1.000;Kaiming;{postscript_name}"

    name_table = font["name"]
    name_table.names = []
    values = {
        1: family,
        2: subfamily,
        3: unique_id,
        4: full_name,
        5: "Version 1.000",
        6: postscript_name,
        16: family,
        17: subfamily,
    }
    for name_id, value in values.items():
        name_table.setName(value, name_id, 3, 1, 0x0409)
        name_table.setName(value, name_id, 0, 4, 0)

    os2 = font["OS/2"]
    os2.usWeightClass = weight
    os2.fsSelection &= ~((1 << 0) | (1 << 5) | (1 << 6))
    if weight >= 700:
        os2.fsSelection |= 1 << 5
    elif weight == 400:
        os2.fsSelection |= 1 << 6

    font["head"].macStyle &= ~0b11
    if weight >= 700:
        font["head"].macStyle |= 1
    font["post"].italicAngle = 0


def feature_source(
    mapping: dict[int, str],
    dash_pair_name: str,
    half_em: int,
) -> str:
    lines = [
        "languagesystem DFLT dflt;",
        "feature halt {",
    ]
    for full_stop in sorted(FULL_STOPS):
        lines.append(f"  pos {mapping[full_stop]} <0 0 -{half_em} 0>;")
    lines.extend(
        [
            "} halt;",
            "feature ccmp {",
            f"  sub {mapping[0x2014]} {mapping[0x2014]} by {dash_pair_name};",
            "} ccmp;",
            "feature kern {",
        ]
    )

    full_stops = " ".join(
        mapping[codepoint] for codepoint in sorted(FULL_STOPS)
    )
    lines.extend(
        (
            f"  @full_stops = [{full_stops}];",
            "  pos @full_stops @full_stops -500;",
            "} kern;",
        )
    )
    return "\n".join(lines)


def build_instance(style: str, package: str, weight: int) -> Path:
    fonts: dict[str, TTFont] = {}
    sources: dict[int, tuple[TTFont, str]] = {}

    for part, codepoints in SOURCE_PARTS.items():
        variable = TTFont(source_path(package, part), recalcBBoxes=True)
        font = instantiateVariableFont(
            variable, {"wght": weight}, inplace=False, optimize=True
        )
        fonts[part] = font
        cmap = font.getBestCmap()
        for codepoint in codepoints:
            sources[codepoint] = (font, cmap[codepoint])

    base = fonts["119"]
    units_per_em = base["head"].unitsPerEm
    half_em = units_per_em // 2
    glyph_order = [".notdef"]
    glyphs = {".notdef": deepcopy(base["glyf"][".notdef"])}
    metrics = {".notdef": base["hmtx"].metrics[".notdef"]}
    mapping: dict[int, str] = {}
    halt_cache: dict[int, dict[str, tuple[int, int]]] = {}

    reference_name = base.getBestCmap()[0x4E2D]
    reference_glyph = base["glyf"][reference_name]
    reference_glyph.recalcBounds(base["glyf"])
    reference_center_sum = reference_glyph.yMin + reference_glyph.yMax

    for codepoint in sorted(ALL_CODEPOINTS):
        source_font, source_name = sources[codepoint]
        glyf = source_font["glyf"]
        source_glyph = glyf[source_name]
        expand_simple_glyph(source_glyph, glyf)
        glyph = deepcopy(source_glyph)
        width, lsb = source_font["hmtx"].metrics[source_name]

        if codepoint in HALF_WIDTH:
            cache_key = id(source_font)
            if cache_key not in halt_cache:
                halt_cache[cache_key] = halt_values(source_font)
            x_placement, x_advance = halt_cache[cache_key][source_name]
            shift_glyph(glyph, glyf, x_placement)
            width += x_advance
            lsb += x_placement
            if width != half_em:
                raise ValueError(
                    f"U+{codepoint:04X} became {width}; expected {half_em}"
                )
        elif codepoint == 0x2014:
            width = units_per_em
            lsb = 0
        elif codepoint in FULL_STOPS | {0x2026} and width != units_per_em:
            raise ValueError(
                f"U+{codepoint:04X} has width {width}; expected {units_per_em}"
            )

        glyph_name = f"u{codepoint:04X}"
        glyph_order.append(glyph_name)
        glyphs[glyph_name] = glyph
        metrics[glyph_name] = (width, lsb)
        mapping[codepoint] = glyph_name

    dash_name = mapping[0x2014]
    dash_glyph = glyphs[dash_name]
    dash_side_bearing = bracket_side_bearing(glyphs, mapping, half_em)
    fit_dash_to_em(
        dash_glyph,
        base["glyf"],
        units_per_em,
        reference_center_sum,
        dash_side_bearing,
    )
    metrics[dash_name] = (units_per_em, dash_glyph.xMin)

    dash_pair_name = "emDash_pair"
    dash_pair = double_dash_glyph(dash_glyph, base["glyf"])
    glyph_order.append(dash_pair_name)
    glyphs[dash_pair_name] = dash_pair
    metrics[dash_pair_name] = (units_per_em * 2, dash_pair.xMin)

    base.flavor = None
    base.setGlyphOrder(glyph_order)
    base["glyf"].glyphs = glyphs
    base["hmtx"].metrics = metrics
    base["cmap"] = build_cmap(mapping)
    base["maxp"].numGlyphs = len(glyph_order)
    base["hhea"].numberOfHMetrics = len(glyph_order)
    base["OS/2"].usFirstCharIndex = min(mapping)
    base["OS/2"].usLastCharIndex = max(mapping)

    for table in (
        "BASE",
        "GDEF",
        "GPOS",
        "GSUB",
        "HVAR",
        "STAT",
        "avar",
        "fvar",
        "gvar",
        "vhea",
        "vmtx",
    ):
        if table in base:
            del base[table]

    addOpenTypeFeaturesFromString(
        base, feature_source(mapping, dash_pair_name, half_em)
    )
    set_font_identity(base, style, weight)

    output = OUTPUT_ROOT / f"kaiming-{style}-{weight}.woff2"
    base.flavor = "woff2"
    base.save(output)
    return output


def pair_values(font: TTFont, left: str, right: str) -> tuple[int, int, int, int]:
    """Return (place1, advance1, place2, advance2) from generated kern."""
    gpos = font["GPOS"].table
    feature = next(
        record
        for record in gpos.FeatureList.FeatureRecord
        if record.FeatureTag == "kern"
    )
    totals = [0, 0, 0, 0]

    for lookup_index in feature.Feature.LookupListIndex:
        for positioning in gpos.LookupList.Lookup[lookup_index].SubTable:
            if left not in positioning.Coverage.glyphs:
                continue

            record = None
            if positioning.Format == 1:
                coverage_index = positioning.Coverage.glyphs.index(left)
                pair_set = positioning.PairSet[coverage_index]
                record = next(
                    (
                        candidate
                        for candidate in pair_set.PairValueRecord
                        if candidate.SecondGlyph == right
                    ),
                    None,
                )
            elif positioning.Format == 2:
                class1 = positioning.ClassDef1.classDefs.get(left, 0)
                class2 = positioning.ClassDef2.classDefs.get(right, 0)
                record = positioning.Class1Record[class1].Class2Record[class2]

            if record is None:
                continue

            value1 = getattr(record, "Value1", None)
            value2 = getattr(record, "Value2", None)
            totals[0] += getattr(value1, "XPlacement", 0) or 0
            totals[1] += getattr(value1, "XAdvance", 0) or 0
            totals[2] += getattr(value2, "XPlacement", 0) or 0
            totals[3] += getattr(value2, "XAdvance", 0) or 0

    return tuple(totals)


def glyph_bounds(font: TTFont, glyph_name: str) -> tuple[int, int]:
    glyf = font["glyf"]
    glyph = glyf[glyph_name]
    glyph.recalcBounds(glyf)
    return glyph.xMin, glyph.xMax


def ligature_glyph(font: TTFont, feature_tag: str, first: str, second: str) -> str:
    """Return the output glyph for a two-glyph ligature substitution."""
    gsub = font["GSUB"].table
    feature = next(
        record
        for record in gsub.FeatureList.FeatureRecord
        if record.FeatureTag == feature_tag
    )
    for lookup_index in feature.Feature.LookupListIndex:
        lookup = gsub.LookupList.Lookup[lookup_index]
        if lookup.LookupType != 4:
            continue
        for substitution in lookup.SubTable:
            for ligature in substitution.ligatures.get(first, []):
                if ligature.Component == [second]:
                    return ligature.LigGlyph
    raise ValueError(f"Missing {feature_tag} ligature for {first} {second}")


def verify(output: Path) -> None:
    font = TTFont(output)
    cmap = font.getBestCmap()
    if set(cmap) != ALL_CODEPOINTS:
        raise ValueError(f"{output.name}: cmap does not match the configured set")

    for codepoint, glyph_name in cmap.items():
        width = font["hmtx"].metrics[glyph_name][0]
        expected = 500 if codepoint in HALF_WIDTH else 1000
        if width != expected:
            raise ValueError(
                f"{output.name}: U+{codepoint:04X} has width {width}, "
                f"expected {expected}"
            )

    for closing in CLOSING:
        close_name = cmap[closing]
        _, close_x_max = glyph_bounds(font, close_name)
        for opening in OPENING:
            open_name = cmap[opening]
            open_x_min, _ = glyph_bounds(font, open_name)
            place1, advance1, place2, advance2 = pair_values(
                font, close_name, open_name
            )
            pair_width = 1000 + advance1 + advance2
            ink_gap = 500 + advance1 + open_x_min + place2 - (
                close_x_max + place1
            )
            if pair_width != 1000 or ink_gap <= 0:
                raise ValueError(
                    f"U+{closing:04X} U+{opening:04X}: "
                    f"width={pair_width}, ink_gap={ink_gap}"
                )

    generated_halt = halt_values(font)
    for full_stop in FULL_STOPS:
        halt = generated_halt.get(cmap[full_stop])
        if halt != (0, -500):
            raise ValueError(
                f"{output.name}: U+{full_stop:04X} halt={halt}, expected (0, -500)"
            )

    for first in FULL_STOPS:
        for second in FULL_STOPS:
            values = pair_values(font, cmap[first], cmap[second])
            pair_width = 2000 + values[1] + values[3]
            if pair_width != 1500:
                raise ValueError(
                    f"U+{first:04X} U+{second:04X}: {pair_width}, expected 1500"
                )

    expected_pair_side = bracket_side_bearing(font["glyf"].glyphs, cmap, 500)
    expected_single_side = round(expected_pair_side / 2)
    dash_min, dash_max = glyph_bounds(font, cmap[0x2014])
    if (
        abs(dash_min - expected_single_side) > 2
        or abs(dash_max - (1000 - expected_single_side)) > 2
    ):
        raise ValueError(
            f"{output.name}: em dash side bearings do not match brackets: "
            f"{dash_min}..{dash_max}, reference={expected_pair_side}"
        )

    dash_name = cmap[0x2014]
    dash_pair_name = ligature_glyph(font, "ccmp", dash_name, dash_name)
    dash_pair_width = font["hmtx"].metrics[dash_pair_name][0]
    dash_pair_min, dash_pair_max = glyph_bounds(font, dash_pair_name)
    if (
        dash_pair_width != 2000
        or abs(dash_pair_min - expected_pair_side) > 4
        or abs(dash_pair_max - (2000 - expected_pair_side)) > 4
    ):
        raise ValueError(
            f"{output.name}: em-dash ligature width={dash_pair_width}, "
            f"bounds={dash_pair_min}..{dash_pair_max}"
        )

    for long_mark in LONG_MARKS:
        glyph_name = cmap[long_mark]
        values = pair_values(font, glyph_name, glyph_name)
        pair_width = 2000 + values[1] + values[3]
        if pair_width != 2000:
            raise ValueError(
                f"U+{long_mark:04X} pair is {pair_width}, expected 2000"
            )


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    outputs = [
        build_instance(style, package, weight)
        for style, package in FAMILIES.items()
        for weight in WEIGHTS
    ]

    for output in outputs:
        verify(output)

    expected = {output.resolve() for output in outputs}
    for old_output in OUTPUT_ROOT.glob("kaiming-*.woff2"):
        if old_output.resolve() not in expected:
            old_output.unlink()

    total = sum(output.stat().st_size for output in outputs)
    print(f"Built and verified {len(outputs)} WOFF2 files ({total / 1024:.1f} KiB).")
    print("All closing-opening pairs are 1 em with positive contour gaps.")
    print("Fullwidth sentence stops expose a trailing 0.5-em halt adjustment.")
    print("Em-dash pairs are centered 2-em ligatures with bracket-matched side space.")


if __name__ == "__main__":
    main()
