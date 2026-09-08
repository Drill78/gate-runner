# 灰烬之门 · 1.1 发布交接已完成

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

以下是上一正式版的归档，当前部署以本文顶部的 1.1 为准。

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
