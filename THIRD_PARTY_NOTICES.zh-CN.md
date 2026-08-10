# 第三方声明

英文原版见 [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)。本中文版本为方便阅读而提供；如两个版本存在差异，以英文版本为准。

除非文件中另有说明，[`LICENSE`](./LICENSE) 中的 MIT License 仅适用于本仓库的原创软件源代码。该许可证不会将第三方程序库、字体、图标、照片、文章、小说、个人媒体、商标或其他素材重新许可为 MIT。

## 已打包的软件依赖

生产站点会打包以 `package.json` 所列软件包为根节点的生产依赖图。这些软件包继续适用各自的许可证。构建后的声明生成器会递归收集实际安装的运行时依赖版本所附带的许可证文件，生成 `dist/legal/THIRD_PARTY_LICENSES.txt`，并将相同数据预渲染到站点的 `/licenses` 页面。

## 字体

下列字体软件依据 SIL Open Font License 1.1 分发。版权声明仍归相应的上游项目所有，许可证全文见 [`licenses/OFL-1.1.txt`](./licenses/OFL-1.1.txt)。

| 字体                                               | 版权所有者／来源                                                        | 说明                                                                         |
| -------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Fraunces                                           | The Fraunces Project Authors                                            | 通过 Fontsource 分发                                                         |
| JetBrains Mono                                     | The JetBrains Mono Project Authors                                      | 通过 Fontsource 分发                                                         |
| Manrope                                            | The Manrope Project Authors                                             | 通过 Fontsource 分发                                                         |
| Noto Sans SC 与 Noto Serif SC                      | Google Inc. / The Noto Project Authors                                  | 通过 Fontsource 分发                                                         |
| Noto Sans Sinhala 与 Noto Serif Sinhala            | The Noto Project Authors                                                | 通过 Fontsource 分发                                                         |
| Maname                                             | The Maname Project Authors                                              | 通过 Fontsource 分发                                                         |
| 朱雀仿宋                                           | Copyright (c) 2023, Zhejiang JadeFoci Techonology Co. LTD / TrionesType | 随站点分发的网页字体                                                         |
| 开明式标点黑体／宋体                               | 衍生自 Noto Sans SC 与 Noto Serif SC                                    | 已修改、子集化并重命名；仍适用 OFL-1.1；从 `raw.komori.cc/kaiming/` 在线加载 |
| LXGW Neo ZhiSong、LXGW Neo XiHei 与 LXGW WenKai GB | 各上游作者                                                              | 通过 jsDelivr 加载；继续适用各自的上游许可证                                 |

上述字体文件及其衍生版本不适用本项目的 MIT License。

## 图标与归档样式

- `@giscus/vue` 集成属于 giscus-component 项目，依据 MIT License 分发。由于 npm 软件包未附带顶层许可证文件，其上游许可证与署名已单独保存在 [`licenses/GISCUS-COMPONENT-MIT.txt`](./licenses/GISCUS-COMPONENT-MIT.txt)。
- Remix Icon 4.9.1 适用 Remix Icon License v1.0，而非本项目的 MIT License。许可证全文见 [`licenses/REMIX-ICON-LICENSE-v1.0.txt`](./licenses/REMIX-ICON-LICENSE-v1.0.txt)。
- 归档页面通过上游 CDN 加载 Gitalk 及其基于 Octicons 的样式。Gitalk 与 GitHub Octicons 分别依据各自的 MIT License 分发。
- 品牌图标与名称仍受相应权利人的商标权约束。收录这些标识不代表获得背书。

## 图片与其他内容

- 备用山景照片由 `florianhoellmueller` 创作，并依据 Pixabay Content License 使用；站点中提供了其来源页面链接。
- Pixabay API 返回的图片继续适用 Pixabay Content License 及任何相关第三方权利。
- 除非文件或随附声明另有说明，本仓库中的文章、小说、头像、个人照片、封面、美术素材、动画 GIF 素材、表情及其他非软件内容**不依据 MIT License 提供**，相关权利由各自权利人保留。

## Minecraft 归档页

原 Minecraft 玩家专题归档页包含无法核实再分发权利的游戏与音乐素材，这些素材现已移除。保留的说明页面属于非官方内容，未经 Mojang 或 Microsoft 批准，亦与其不存在关联。

## 无背书关系

第三方名称、产品名称与商标仅用于识别相应作品或服务。本项目不主张与相关权利人存在关联、赞助或背书关系。
