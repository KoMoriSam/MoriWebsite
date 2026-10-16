# Gemunu Legacy

`gemunu-legacy[wght].woff2` is an FM-encoded variable webfont with a `wght`
axis from 200 to 800 (default 400), generated from hash-pinned Gemunu Libre.
All imported character outlines derive from Gemunu Libre; forms unavailable as
reusable source glyphs use hand-authored compatibility paths. No
installed or original FM font file is read or bundled.

Licensing and source notices are recorded in `OFL.txt`. Regenerate the fonts
from the repository root:

```powershell
python -m pip install fonttools brotli uharfbuzz
python scripts/generate-fm-fonts-compatible.py
```

The generated WOFF2 is a committed asset, not a build-time output.
