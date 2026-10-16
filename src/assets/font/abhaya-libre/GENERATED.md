# Abhaya Legacy

`abhaya-legacy[wght].woff2` is an FM-encoded variable webfont with a `wght`
axis from 400 to 800 (default 400), generated from hash-pinned OFL sources.
Sinhala outlines and reusable legacy components derive from Abhaya Libre;
digits, Roman numerals, and compatible general symbols derive from STIX Two Text. Forms unavailable
in those sources use hand-authored compatibility paths. STIX Two Text uses its
native 400–700 variable weights, clamped to 700 for heavier Abhaya weights.
Digit proportions follow the legacy reference. Weights retain STIX
advance variations. Fitted Roman-numeral geometry and the degree-sign position are
preserved. Weight-dependent compatibility paths interpolate between their Regular
and Bold designs. No installed or original FM font file is read or bundled.

Licensing and source notices are recorded in `OFL.txt`. Regenerate the fonts
from the repository root:

```powershell
python -m pip install fonttools brotli uharfbuzz
python scripts/generate-fm-fonts-compatible.py
```

The generated WOFF2 is a committed asset, not a build-time output.
