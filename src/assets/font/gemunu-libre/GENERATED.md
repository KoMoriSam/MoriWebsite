# FM Gemunu Libre Legacy

`fm-gemunu-libre-legacy.woff2` (Regular) and
`fm-gemunu-libre-bold-legacy.woff2` (Bold) are modified display fonts
generated from the Gemunu Libre 1.100 **static** fonts. Their character maps
follow the legacy FM encoding used by the Sinhala converter, while the
outlines come from Gemunu Libre.

The fonts are licensed under the SIL Open Font License 1.1. See `OFL.txt`.

Regenerate them from the repository root with:

```powershell
python -m pip install fonttools brotli uharfbuzz
python scripts/generate-fm-fonts-compatible.py
```

The static Gemunu Libre 1.100 source fonts (`GemunuLibre-Regular.ttf` and
`GemunuLibre-Bold.ttf`) are committed under `scripts/font-sources/gemunu-libre`
and hash-pinned in the generator. Google Fonts only publishes the variable
build, so the static sources are kept locally. The generated WOFF2 assets are
committed and intentionally not part of the regular site build.
