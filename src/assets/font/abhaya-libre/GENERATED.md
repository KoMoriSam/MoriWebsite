# Abhaya Legacy

`abhaya-legacy.woff2` and `abhaya-legacy-bold.woff2` are FM-encoded webfonts
generated from hash-pinned OFL variable fonts instantiated at weights 400 and 700.
Sinhala outlines and reusable legacy components derive from Abhaya Libre;
digits, Roman numerals, and compatible general symbols derive from XITS. The
`Û` author mark uses Gemunu Libre weight-400 outlines. Forms unavailable
in those sources are reconstructed as static compatibility paths. No installed
or original FM font file is read or bundled.

Licensing and source notices are recorded in `OFL.txt`. Regenerate both faces
from the repository root:

```powershell
python -m pip install fonttools brotli uharfbuzz
python scripts/generate-fm-fonts-compatible.py
```

The generated WOFF2 files are committed assets, not build-time outputs.
