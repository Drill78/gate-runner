# 灰烬之门 · 1.2.0 发布交接已完成

2026-09-08。当前正式版为 **1.2.0 · 登神远征**，已在原地址上线。

- 正式游戏：https://gate-runner-seven.vercel.app
- GitHub：https://github.com/Drill78/gate-runner；固定内容提交 `2a0152b1457d906de0fd95e7c19a863db4a2cd7b`，标签 `v1.2.0`。
- Vercel 部署 `dpl_5pFPTy6JkaZGiNndkc6bDad66rt8`，READY，原域名已绑定。
- 公共史册与同版镜像：https://ashen-gates-zhour.green-salnut.chatgpt.site，访问模式 public。
- Sites 版本5：`appgprj_6a9e636d67b0819191dcf937245fdd08~appgver_b412bf296c5c819188100d2715b16ff3`；部署 `appgdep_6a9fdf96ba3481919e0677a7fd6df5e7`，succeeded。两端使用相同内容提交。

本次完成困难王二命、六轮长夜阵容与难度曲线、四种常规异化、天使复生与碎翼、第99关登神王、第100关主神及第101关祝福尾声。百关为正式结算，尾声结束后不再刷关。加入章节50%恢复与叙事、实际采样的结算曲线、39项成就中的新引导与隐藏「登神」、永久星印和金色界面、三枚归魂币与46／91关固定誓装续战、分起点排行榜，以及独立开发者演武场。七张新增AI美术、135秒登神配乐及扩展中文字体已接入；原八首MP3保持不变。

**人工入口：设置 → 开发者演武场 → `721604`。** 推荐先选择「登神长阶·完整流程」从91关走到101关，再分别测试第90关终夜连战、困难复燃王、主神与归魂币。演练可调职业、生命、火力与兵力，不写正式存档、排行榜或成就；退出可回到之前的远征。完整入口说明见[1.2发布说明](V1_2_RELEASE.md)。

用户设计原文意图保存在[设计约定](V1_2_ASCENSION_DESIGN.md)；[难度报告](V1_2_BALANCE_AUDIT.md)、[美术配乐记录](V1_2_MEDIA.md)、[完整数值册](BALANCE_REFERENCE.md)、[75项奖励](balance/rewards.csv)、[前100关曲线](balance/endless-curve.csv)、[交互查看器](balance/lab.html)已更新。

验证：197项自动测试、TypeScript、lint、静态与Worker生产构建通过。36组实际引擎样本中，困难6组、完整无尽12组、46／91预设6组、关键首领9组均达成目标；站桩3组在92／93关失败。另有22组服务端渲染结构核验。第99关自然路线约48秒，第100关约72秒，不含冻结突入。没有浏览器交互测试或真人试听，不把自动驾驶当作真人胜率。

线上41/41资源通过，其中39项SHA-256完全一致；HTML只映射构建文件名，CSS只接受已核实的Windows/Linux OKLab舍入差异。19项线上API检查通过，包含三模式榜、收藏权限、分起点登神榜、未解锁篝火拒绝、开发者登记拒绝。线上只写入明确命名的零关失败私人连通性记录，没有构造公共通关或登神荣誉。

报告：[资源](releases/v1.2-verification.json)、[接口](releases/v1.2-chronicle-verification.json)、[结构](releases/v1.2-ui-structure.json)、[平衡样本](releases/v1.2-balance.json)。

兼容处理：数据库新增 `0003` 的 `start_room`／`ruleset`，旧迁移和旧战绩保留；新无尽公共榜只比较登神纪元。旧本地无尽深度移到 `legacyEndlessDepth`，不会直接解锁新成就或续战；旧构筑换新远征ID，以私人续接重新挑战新版45／90关后才授予篝火。离线百关结算快照及自填称号幂等保存，101关不会覆盖；归魂币消费即时保存，刷新不返还。

发布仍采用Vercel静态前端＋Sites Worker/D1。复用 `artifacts/vercel-v12-bootstrap/` 固定SHA构建入口、`artifacts/prepare-release-v12.mjs`、`artifacts/verify-release-vercel-v12.mjs` 和 `artifacts/verify-chronicle-live-v12.mjs`；发布IDs在 `artifacts/release-v12-ids.json`。先部署兼容API，再发布前端。官方打包包含全部迁移，本版包为117文件、45,137,920字节。保留两个固定的跨平台 `@emnapi` 依赖。GitHub推送仍不会自动部署；后续文档归档提交不改变本次内容SHA。

3D重构仍是独立工程，最新原型行为应同时参考本文和1.2设计约定，本轮没有创建真实3D模型。

---

## 1.1.1 历史发布记录

以下为历史归档，当前部署以本文顶部的1.2.0为准。

2026-09-08。当前正式版为 **1.1.1 · 誓术觉醒与无垠军势**，已在原地址上线。

- 正式游戏：https://gate-runner-seven.vercel.app
- GitHub：https://github.com/Drill78/gate-runner；内容提交 `51a1cc7de96a8c29c89008a295812829ff7e912c`，发布标签 `v1.1.1`。
- Vercel 部署 `dpl_8L6VJDmbjd2VopdKYyNksTrMHxBt`，READY，原域名已绑定。
- 公共史册与同版镜像：https://ashen-gates-zhour.green-salnut.chatgpt.site，访问模式 public。
- Sites 版本 4：`appgprj_6a9e636d67b0819191dcf937245fdd08~appgver_15fb3f679d008191a3fbd276cf247f46`；部署 `appgdep_6a9fbf64fff48191bc308a54b780f3a9`，succeeded。两端均使用上述内容提交。

本次完成三职业主动技能及强化符文、实际门倍率显示、事件收益与新奇遇、私人战绩收藏、超大兵力算术与战绩排序。无尽单位严格采用用户确认的 **一层五关、三层十五关**；难度以十五关为一档，初期平缓，中后期递增。兵力采用约十五位有效数字的尾数和指数；兼容字段的 `1e300` 不是实际兵力上限。保留 v4 存档和八首音乐。完整内容见 [1.1.1 说明](V1_1_1_RELEASE.md)。

用户调试入口：[数值调试册](BALANCE_REFERENCE.md)、[交互查看器](balance/lab.html)、[75 项奖励 CSV](balance/rewards.csv)、[兵力曲线](balance/troop-curve.csv)、[前 150 关曲线](balance/endless-curve.csv)、[完整 JSON](balance/catalog.json)。运行 `node scripts/export-balance.mjs` 可按实际代码重新导出。兵力伤害公式仍是 `1 + log2(1 + N / 12)`；高兵力翻倍仅让倍率增加约 1，平方则约翻倍。

验证：160 项测试、TypeScript、lint、静态与 Worker 生产构建通过。12 次普通/困难回归、12 次无尽 150 关对照和 12 次固定起点的 15 关平方窗口探针全部达到目标；平方组后三层的章节首领交战时间合计减少 45.5%。这是自动驾驶对照，不是玩家胜率，也没有浏览器交互或真人试玩。线上 33/33 资源通过；31 项 SHA-256 完全一致，HTML 仅映射构建文件名，CSS 仅已确认的 Windows/Linux OKLab 舍入差异。13 项在线接口检查通过，包括收藏的归属权限、筛选、取消与旧战绩请求的科学计数存储。

报告：[资源核验](releases/v1.1.1-verification.json)、[接口核验](releases/v1.1.1-chronicle-verification.json)、[平衡样本](releases/v1.1.1-balance.json)。线上校验只写入明确标注的零关陨落记录，不进入公共排行。

部署架构仍为 Vercel 静态前端代理 Sites Worker/D1。已增量应用 `0001` 收藏迁移和 `0002` 兵力尾数/指数迁移，旧数据保留；不得修改已应用的迁移。下次可复用 `artifacts/vercel-v111-bootstrap/` 固定 SHA 构建入口、`artifacts/verify-release-vercel-v111.mjs` 与 `artifacts/verify-chronicle-live-v111.mjs`。先发布兼容 API，再发布前端；Sites 保存前必须推送对应源码，并以官方脚本打包 Worker 和全部迁移。保留两个固定的 `@emnapi` 跨平台依赖。Git 推送不会自动部署；后续文档归档提交不改变本次内容 SHA。

3D 重构文档仍是独立项目的历史原型交接；若新项目需要吸收最新玩法，应同时阅读本节与数值调试册。

---

## 1.1 历史发布记录

以下为历史归档，当前部署以本文顶部的 1.1.1 为准。

2026-09-08。当前正式游戏为 **1.1 · 长夜无尽与灰烬史册**，已完成部署与匿名核验。

- 正式地址：https://gate-runner-seven.vercel.app
- 游戏／构建依赖提交：`d0174432272a62d0649d48f67733a362051abb28`，发布标签 `v1.1.0`。
- Vercel 部署：`dpl_Hg5KcEE1frKQGpa5wPPhxDrZ23ib`，READY，原域名已绑定。
- 公共史册与同版镜像：https://ashen-gates-zhour.green-salnut.chatgpt.site；访问模式 public。
- Sites 版本 3：`appgprj_6a9e636d67b0819191dcf937245fdd08~appgver_cecafb38f4e48191b5d0d1a8cfa241f5`；部署 `appgdep_6a9f907f70448191bd69c36a34e2ab76`，succeeded。
- Sites 源提交 `59e8bee7bb3b6cf446acb61c9a38fa954c70e0fd`；之后的 Vercel 提交只补齐两个跨平台构建 peer 依赖，生成的本地游戏文件逐字节相同。

新增：无限循环地图、20 层起的双首领／连续追猎／双灰烬之王／黯化、血月、空冠与合葬首领；每五层契约；焚印重铸；两位可招募首领盟友；666→6666→66666 等禁钥层级；三模式公共排行、姓名／称号、个人履历。普通／困难原有规则与八首音乐保留。

验证：143 项测试，TypeScript、lint 和两套生产构建通过；36 局常规／无尽模拟、6 局深层模拟、8 个预设构筑机制探针；正式域名 33/33 资源通过，31 项 SHA-256 完全一致，HTML 仅映射构建文件名，CSS 仅已确认的 Windows／Linux OKLab 舍入差异；线上 9 项数据库/API 检查通过。没有浏览器交互测试或真人试玩，不把自动驾驶结果当作真人胜率。

运行报告：[v1.1 资源核验](releases/v1.1-verification.json)、[v1.1 接口核验](releases/v1.1-chronicle-verification.json)、[v1.1 平衡样本](releases/v1.1-balance.json)。内容与限制见 [V1_1_RELEASE.md](V1_1_RELEASE.md)，设计见 [V1_1_DESIGN.md](V1_1_DESIGN.md)。首次通关后解锁无尽；契约与焚印收益只在当前无尽远征内保留。1.0 旧存档可以继续，但旧远征没有 1.1 的服务器启程记录，公共排行请从新版重新启程。

架构：Vercel 静态游戏将 `/api/chronicle/:path*` 转发给 Sites Worker，D1 逻辑绑定名 `DB`；实际三表为 `travellers`、`expeditions`、`chronicle_limits`。不要删除数据库、修改已应用的迁移或提交旅人令牌。线上校验只写入明确标注的零关陨落记录，该记录不进入公共榜；公共榜没有填造示例成绩。

后续发布：使用 `artifacts/vercel-v11-bootstrap/`，更新固定 Git SHA；跨平台构建需要 package.json 中固定的 `@emnapi/core` 和 `@emnapi/runtime`，不要改用跳过锁文件的安装。先部署兼容的 Sites API，再发布 Vercel 前端。保存 Sites 版本前需要将对应提交推送至该站点的源仓库，并用官方脚本打包 Worker 和 Drizzle 迁移。GitHub main 已推送，Vercel 尚未接通 Git 自动部署。

3D 项目仍在独立目录与仓库推进，交接已补充 1.1 的无尽与史册机制；本次没有新建 3D 工程或模型。

---

## 1.0 历史发布记录

以下是旧正式版的归档，当前部署以本文顶部的 1.1.1 为准。

> 后续方向：用户决定以 1.0 为原型，在独立文件夹、Git 仓库与新对话中开展完整 3D 重构。请阅读 [3D 重构交接](3D_REBUILD_HANDOFF.md)、[美术与模型清单](3D_ASSET_PLAN.md) 和 [新对话启动指令](3D_NEW_THREAD_PROMPT.md)。这不改变本文件记录的已发布 1.0 状态。

2026-09-08。当前正式地址已发布 1.0，结束 Early Access，无待执行发布步骤。

- 正式地址：https://gate-runner-seven.vercel.app
- GitHub：https://github.com/Drill78/gate-runner，main
- 1.0 内容提交：b17463f18d6721066404b7bd025bcbf3217203bd
- Vercel 生产部署：dpl_4t1DBxNFDrT3Gmh1Dno4kBuC1qx1，READY，原域名已绑定。
- 项目：prj_XEFqWJRsn9qzTWLMHHbSZXb5pQdm；团队：team_F5BQUB6GOyFZcJCMV436JWNr。

本轮完成七首新配乐：三首战斗曲采用独立曲式，最终战含 10 秒一次性前奏；主界面、地图、事件、商店各有曲目。禁忌 MP3 原样保留。双首领血条改为左右并排，低矮屏幕压缩上方 HUD。正式版标识与包版本统一为 1.0。

玩法数值、战斗机制、成就和存档代码没有改动。按用户要求没有重跑玩法测试、难度模拟或浏览器测试；完成 TypeScript、lint、生产构建、音频导出检查与 33 项线上运行资源核验。v0.7 的 134 项测试、204 局模拟是历史记录，不是本轮新测试。未进行主观听测或真机试玩。

完整说明见 [V1_0_RELEASE.md](V1_0_RELEASE.md)，配乐见 [MUSIC.md](MUSIC.md)，部署见 [DEPLOYMENT.md](DEPLOYMENT.md)。本地母带与回读 WAV 位于 artifacts/music-v1/，实际游戏 MP3 位于 public/audio/。后续重做音乐使用 scripts/generate-score-v1.py，此入口始终只读校验禁忌音乐。

后续发布可复用 artifacts/vercel-v1-bootstrap/：更新固定 Git SHA，通过 Vercel 连接器上传两个小型构建文件。构建使用 git init、git fetch 固定 SHA、git checkout 处理缓存目录，然后 npm ci、npm run build，输出 release/dist。项目尚未连接 Git 自动部署。

发布核验入口为 artifacts/verify-release-vercel-v1.mjs；更新 manifest、提交与部署 ID 后匿名核对原域名资源。线上报告位于 docs/releases/v1.0-verification.json。

## Netlify 历史试部署

先前试部署的是 v0.7 临时镜像 https://unrivaled-malasada-3e1166.netlify.app。本轮没有更新该临时站点，也没有证据确认用户已认领。创建时认领截止 2026-09-08 03:29:28 UTC；不得假定截止后仍可使用。

认领入口和临时密码只保存在本地忽略文件 artifacts/netlify-deploy-v07.json，不要提交或公开凭据。长期正式入口以 Vercel 为准。
