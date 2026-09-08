# 灰烬之门 · 发布交接已完成

2026-09-08。用户最初要求的v0.6发布，以及随后追加的v0.7优化均已完成。**当前线上是v0.7，无待执行发布步骤。**

- 试玩：https://gate-runner-seven.vercel.app
- GitHub：https://github.com/Drill78/gate-runner，main
- v0.7内容提交：`1ef41a9647e77f066707d6e7e115f3b02ccf2697`
- 成功生产部署：`dpl_3ocFb7EMRnSZM2Ex4hA2fixPbSc6`，READY，已绑定原域名。
- 项目：`prj_XEFqWJRsn9qzTWLMHHbSZXb5pQdm`；团队：`team_F5BQUB6GOyFZcJCMV436JWNr`。

134项测试、TypeScript、lint、生产构建通过。204局难度模拟验证三个职业均有普通和困难通关路径，游侠困难容错较低；29项线上运行资源状态、MIME与内容核验通过。禁忌之门MP3与v0.6完全相同。本轮没有浏览器或真机试玩证据。

完整改动见[V0_7_UPDATE.md](V0_7_UPDATE.md)，部署细节见[DEPLOYMENT.md](DEPLOYMENT.md)，难度见[BALANCE_AUDIT.md](BALANCE_AUDIT.md)，音乐见[MUSIC.md](MUSIC.md)，美术和字体见[ART_ASSETS.md](ART_ASSETS.md)。用户明确把真实3D主角与怪物建模留待下一版，本版尚未实现。

后续发布可复用工作区的`artifacts/vercel-v07-bootstrap/`：更新固定Git提交，通过Vercel连接器上传两个小型构建文件。构建入口用git init、git fetch固定SHA、git checkout处理可能存在的缓存目录，再运行npm ci和npm run build，输出release/dist；直接git clone到release会与Vercel旧缓存冲突。字体路径已排除在SPA重写之外。项目尚未连接Git自动部署。

发布验证入口为`artifacts/verify-release-vercel-v07.mjs`；更新manifest、提交与部署ID后，对原公开域名匿名核对资源，不能把HTTP哈希检查表述为真人试玩。失败的第一次v0.7部署已被后续成功发布替代，不需要继续重试它。

## Netlify试部署补充

用户随后要求尝试Netlify。已创建同一v0.7的临时站点 `https://unrivaled-malasada-3e1166.netlify.app`，用生成的临时站点密码核验29项运行文件全部200且哈希一致。免登录站点创建时认领截止2026-09-08 03:29:28 UTC，永久归属需要用户认领；本记录不代表它在截止后仍可用。

认领入口和临时密码保存在本地忽略文件 `artifacts/netlify-deploy-v07.json`，不要提交该文件或把认领凭据写入公开文档。公开核验明细见 `docs/releases/v0.7-netlify-verification.json`。现有Vercel正式地址仍为当前长期试玩入口。
