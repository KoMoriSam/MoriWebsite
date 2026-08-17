# FM Abhaya Libre Legacy

`fm-abhaya-libre-legacy.woff2` (Regular) and
`fm-abhaya-libre-bold-legacy.woff2` (Bold) are modified display fonts
generated from the static Abhaya Libre fonts. Their character maps follow the
legacy FM encoding used by the Sinhala converter, while the outlines come from
Abhaya Libre.

The fonts are licensed under the SIL Open Font License 1.1. See `OFL.txt`.

Regenerate them from the repository root with:

```powershell
python -m pip install fonttools brotli uharfbuzz
python scripts/generate-fm-fonts-compatible.py
```

The static Abhaya Libre source fonts (`AbhayaLibre-Regular.ttf` and
`AbhayaLibre-Bold.ttf`) are committed under `scripts/font-sources/abhaya-libre`
and hash-pinned in the generator.

The same script also generates `FM Gemunu Libre Legacy` (Regular and Bold)
from the static Gemunu Libre 1.100 fonts
(see `src/assets/font/gemunu-libre/GENERATED.md`). All faces share the legacy
FM character map; only the outlines differ. The generated WOFF2 assets are
committed and intentionally not part of the regular site build.
