# Gemunu Legacy

`gemunu-legacy.woff2` and `gemunu-legacy-bold.woff2` are FM-encoded webfonts
generated from a hash-pinned Gemunu Libre variable font instantiated at weights
400 and 700. All imported character outlines from Gemunu Libre. Forms unavailable
as reusable source glyphs are reconstructed as static compatibility paths. No
installed or original FM font file is read or bundled.

Licensing and source notices are recorded in `OFL.txt`. Regenerate both faces
from the repository root:

```powershell
python -m pip install fonttools brotli uharfbuzz
python scripts/generate-fm-fonts-compatible.py
```

The generated WOFF2 files are committed assets, not build-time outputs.
