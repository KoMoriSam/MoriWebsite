# Third-party notices

A Simplified Chinese translation is available in
[`THIRD_PARTY_NOTICES.zh-CN.md`](./THIRD_PARTY_NOTICES.zh-CN.md). It is
provided for convenience; if the two versions differ, this English version
controls.

The MIT License in [`LICENSE`](./LICENSE) applies only to the original software
source code in this repository unless a file states otherwise. It does not
relicense third-party libraries, fonts, icons, photographs, articles, fiction,
personal media, trademarks, or other assets.

## Bundled software dependencies

The production site bundles software from the production dependency graph
rooted at the packages listed in `package.json`. Those packages remain under
their respective licenses. The post-build notice generator recursively
collects the license files shipped with the exact installed runtime dependency
versions into
`dist/legal/THIRD_PARTY_LICENSES.txt` and prerenders the same data on the
site's `/licenses` page.

## Fonts

The following font software is distributed under the SIL Open Font License
1.1. Copyright notices remain with the named upstream projects. See
[`licenses/OFL-1.1.txt`](./licenses/OFL-1.1.txt).

| Font | Copyright / source | Notes |
| --- | --- | --- |
| Fraunces | The Fraunces Project Authors | Distributed through Fontsource |
| Manrope | The Manrope Project Authors | Distributed through Fontsource |
| Noto Sans SC and Noto Serif SC | Google Inc. / The Noto Project Authors | Distributed through Fontsource |
| Noto Sans Sinhala and Noto Serif Sinhala | The Noto Project Authors | Distributed through Fontsource |
| Maname | The Maname Project Authors | Distributed through Fontsource |
| Zhuque Fangsong | Copyright (c) 2023, Zhejiang JadeFoci Techonology Co. LTD / TrionesType | Vendored webfont |
| Kaiming Sans/Serif Punctuation | Derived from Noto Sans SC and Noto Serif SC | Modified, subsetted, and renamed; remains OFL-1.1 |
| LXGW Neo ZhiSong, LXGW Neo XiHei, and LXGW WenKai GB | Their respective upstream authors | Loaded from jsDelivr; remain under their upstream licenses |

The font files and their derivatives are not licensed under this project's MIT
License.

## Icons and archived styles

- The `@giscus/vue` integration is part of the giscus-component project and is
  distributed under the MIT License. The npm package does not include a
  top-level license file, so its upstream license and attribution are preserved
  separately in
  [`licenses/GISCUS-COMPONENT-MIT.txt`](./licenses/GISCUS-COMPONENT-MIT.txt).
- Remix Icon 4.9.1 is governed by the Remix Icon License v1.0, not by this
  project's MIT License. See
  [`licenses/REMIX-ICON-LICENSE-v1.0.txt`](./licenses/REMIX-ICON-LICENSE-v1.0.txt).
- Archived pages load Gitalk, including its Octicons-based styles, from the
  upstream CDN. Gitalk and GitHub Octicons are distributed under their
  respective MIT licenses.
- Brand icons and names remain subject to the trademark rights of their
  respective owners. Their inclusion does not imply endorsement.

## Images and other content

- The fallback mountain photograph is by `florianhoellmueller` and is used
  under the Pixabay Content License. Its source page is linked from the site.
- Images returned by the Pixabay API remain subject to the Pixabay Content
  License and any applicable third-party rights.
- Unless a file or accompanying notice says otherwise, articles, fiction,
  avatars, profile photographs, cover art, emotes, and other non-software
  content in this repository are **not** offered under the MIT License. All
  rights are reserved by their respective copyright holders.

## Minecraft archive

The former archived Minecraft fan page contained redistributed game and music
assets whose redistribution rights could not be verified. Those assets have
been removed. The remaining notice page is unofficial and is not approved by
or associated with Mojang or Microsoft.

## No endorsement

Third-party names, product names, and trademarks are used only to identify the
corresponding works or services. No affiliation, sponsorship, or endorsement
is claimed.
