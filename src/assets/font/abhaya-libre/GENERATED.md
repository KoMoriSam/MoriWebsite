# FM Abhaya Libre Legacy

`fm-abhaya-libre-legacy.woff2` is a modified display font generated from
Abhaya Libre Regular. Its character map follows the legacy FM encoding used by
the Sinhala converter, while the outlines come from Abhaya Libre.

The font is licensed under the SIL Open Font License 1.1. See `OFL.txt`.

Regenerate it from the repository root with:

```powershell
python -m pip install fonttools brotli uharfbuzz
python scripts/generate-fm-abhaya-compatible.py
```

The generator downloads a hash-pinned Abhaya Libre source font from the
official Google Fonts repository. It is intentionally not part of the regular
site build because the generated WOFF2 asset is committed.
