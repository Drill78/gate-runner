# 灰烬之门 · 1.0 发布交接已完成

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
