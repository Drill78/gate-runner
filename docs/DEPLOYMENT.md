# 灰烬之门部署

## 当前线上版本（1.1.1 正式版）

正式入口 https://gate-runner-seven.vercel.app 已发布 1.1.1。Vercel 部署 `dpl_8L6VJDmbjd2VopdKYyNksTrMHxBt`，READY；内容提交 `51a1cc7de96a8c29c89008a295812829ff7e912c`，标签 `v1.1.1`。公共史册仍经 `/api/chronicle/:path*` 代理到 https://ashen-gates-zhour.green-salnut.chatgpt.site。Sites 版本 4、部署 `appgdep_6a9fbf64fff48191bc308a54b780f3a9` 已成功，使用相同源提交。

增量迁移 `0001` 增加私人收藏，`0002` 增加科学计数兵力并回填旧记录。没有删除旧数据或重写历史迁移。33 项运行资源和 13 项在线接口检查通过，详见 [发布交接](RELEASE_HANDOFF.md)、[资源报告](releases/v1.1.1-verification.json)、[接口报告](releases/v1.1.1-chronicle-verification.json)。未进行浏览器交互测试。

复用 `artifacts/vercel-v111-bootstrap/` 的固定 SHA 构建入口；Node.js 24、`npm ci`、`npm run build`，输出 `release/dist`。更新版本时先部署兼容的 Sites API，再部署 Vercel。保留 `@emnapi/core`、`@emnapi/runtime` 的固定跨平台依赖。GitHub main 已推送；推送仍不会自动发布。

## 历史线上版本（1.1 正式版）

正式入口 https://gate-runner-seven.vercel.app 已发布 1.1。Vercel 部署 `dpl_Hg5KcEE1frKQGpa5wPPhxDrZ23ib`，提交 `d0174432272a62d0649d48f67733a362051abb28`。公共史册经 Vercel `/api/chronicle/:path*` 转发到 https://ashen-gates-zhour.green-salnut.chatgpt.site 的 Sites Worker 与 `DB` 数据库。33 项资源与 9 项线上接口检查均通过，详情见 [发布交接](RELEASE_HANDOFF.md) 和 [1.1 说明](V1_1_RELEASE.md)。

复用 `artifacts/vercel-v11-bootstrap/` 固定 SHA 构建入口；Sites 迁移位于 `drizzle/`，发布时保留既有战绩与迁移历史。已将构建 peer 依赖 `@emnapi/core`、`@emnapi/runtime` 固定为 1.11.3，避免跨平台 npm ci 缺项。Git 推送仍不会自动发布。

## 历史线上版本（1.0 正式版）

**[打开灰烬之门 1.0](https://gate-runner-seven.vercel.app)**。2026-09-08 已发布到原 Vercel 生产地址，结束 Early Access。部署 `dpl_4t1DBxNFDrT3Gmh1Dno4kBuC1qx1` 状态 READY；内容提交 `b17463f18d6721066404b7bd025bcbf3217203bd` 已推送 GitHub main。完整内容见 [1.0 发布说明](V1_0_RELEASE.md)。

本版重作三首战斗曲、新增四首场景曲、保留禁忌配乐，并将困难双首领血条左右并排。玩法与存档不变。按用户要求没有重跑玩法测试、难度模拟或浏览器测试；TypeScript、lint、生产构建和音频导出检查已完成。

发布后匿名核对 33 项运行资源：首页、脚本、样式、19 张 WebP、八首 MP3、字体、授权和 favicon 全部返回 200，MIME 与内容通过。31 项 SHA256 与本地完全一致；首页仅构建文件名不同，CSS 仅已确认的 Windows/Linux OKLab 舍入差异，精确比较未忽略其他内容。详见 [1.0 部署核验](releases/v1.0-verification.json)。七首新曲使用 v=1.0 查询标识，禁忌文件与历史版本相同。静态资源核验不代表浏览器或真人听测。

沿用固定 Git 提交的 Vercel 构建入口，Node.js 24、npm ci、npm run build，输出 release/dist。本地复用入口为 artifacts/vercel-v1-bootstrap/，核验脚本为 artifacts/verify-release-vercel-v1.mjs。Git 自动部署仍未接通；Netlify 仍是下文记录的历史临时试部署，本轮正式发布使用 Vercel。

## 历史部署（v0.7）

**[打开灰烬之门](https://gate-runner-seven.vercel.app)**。v0.7于2026-09-08 02:21:44 UTC达到READY，原域名已指向生产部署`dpl_3ocFb7EMRnSZM2Ex4hA2fixPbSc6`。内容提交`1ef41a9647e77f066707d6e7e115f3b02ccf2697`已推送GitHub main。完整改动见[v0.7说明](V0_7_UPDATE.md)。

134项机制测试、TypeScript、lint与Vite生产构建通过；204局难度模拟见[审计](BALANCE_AUDIT.md)。本版包含困难双首领、25级武器、生命成长、事件轮抽、29项成就、三幕AI地形与同主题交响金属配乐。存档继续兼容v4，旧通关收藏解锁困难。

2026-09-08T02:22:12.470Z完成匿名HTTP检查：首页、脚本、样式、19张WebP、四首MP3、字体、授权文件与favicon，共29项运行资源全部200且MIME正确。27项SHA256完全一致；首页仅构建文件名不同，CSS仅已确认的OKLab微小舍入差异。精确比较没有忽略其他内容，完整结果见[v0.7验证记录](releases/v0.7-verification.json)。前三首音乐使用v0.7查询标识，禁忌音乐与v0.6逐字节相同。未执行浏览器或真机试玩；本部署error/fatal日志查询无记录，不代表浏览器错误检测。

通过两个小型构建文件部署，Vercel检出固定公开Git提交，执行npm ci与npm run build，发布release/dist。首次尝试`dpl_FP2eND1NhNxPifcgDDhM33qJkuwo`因旧缓存中release目录已存在而失败；最终构建入口改成git init、固定SHA浅抓取与检出，可复用缓存目录，重试成功。工作区保留`artifacts/vercel-v07-bootstrap/`与`artifacts/verify-release-vercel-v07.mjs`。当前仍未接通Git自动部署，后续源码推送不会自动替换线上版本。

## 历史部署（v0.6）

2026-09-07，v0.6 全部代码、15 张页面 WebP 与四首 MP3 已推送到 GitHub `main`，提交 `680a91afc1327a0ee4b850d3d4f17a674e85e566`。114 项机制测试、TypeScript、lint 与生产构建全部通过。最终数值烟测与音乐编码检查分别见 [平衡审计](BALANCE_AUDIT.md) 和 [配乐文档](MUSIC.md)。

**v0.6 已发布：[打开试玩](https://gate-runner-seven.vercel.app)**。Vercel production 部署 `dpl_2RibGiTfx2sxJMfXmDpQabvcLEqU` 于 2026-09-07 13:36:19 UTC 达到 READY，原地址已指向新版，构建约 33 秒。内容来自上述固定提交。

2026-09-07 13:38:50 UTC 完成匿名检查：首页、JavaScript、CSS、15 张 WebP、4 首 MP3 与 favicon 共 23 项全部返回 200，MIME 正确。游戏 JavaScript 与 20 项素材的 SHA256 和本地构建完全一致。云端 CSS 仅有已逐项核对的 OKLab 浮点舍入差异（`.105807 .0479122` 与 `.105806 .0479124`），首页仅对应构建文件名不同，其余内容完全一致。完整线上哈希及比较方法见 [v0.6 验证记录](releases/v0.6-verification.json)。未执行浏览器或真机试玩；本部署的 Vercel error/fatal 日志查询没有记录，不能据此代表浏览器无错误。

本次连接器不接受纯 Git 来源部署，因此上传两个小型构建文件，由 Vercel 克隆公开仓库并检出固定提交，再执行 `npm ci`、`npm run build`，发布 `release/dist`；未上传大体积内联素材。项目仍为 `gate-runner`（`prj_XEFqWJRsn9qzTWLMHHbSZXb5pQdm`），团队 `team_F5BQUB6GOyFZcJCMV436JWNr`，Node.js 24。这不等于已接通 Git 自动部署。可复用的本地构建入口保存在 `artifacts/vercel-v06-bootstrap/`，验证脚本为 `artifacts/verify-release-vercel-v06.mjs`；直接 Git 导入时仍使用仓库根目录、`npm ci`、`npm run build`、`dist`。

v0.6 存档格式为 v4。旧 v2/v3 进度回到对应幕起点，保留构筑、金币、生命、兵力、经验和待领奖励；本版每幕五关，总十五关。收藏、声音和双击技能偏好独立保存，新开远征不会清空收藏。

## 历史部署（v0.5，已由 v0.6 替换）

v0.5 于 2026-09-07 发布至 Vercel production，部署状态 READY，现已被 v0.6 替换。发布当时首页、脚本、样式、九张 WebP（含五种 Boss 立绘）与 favicon 共 13 项资源均经匿名 HTTP 检查返回 200，文件哈希与本地构建一致。

本次为已编译静态文件部署，项目名 `gate-runner`，代码提交 `7e74a70`，部署 ID `dpl_CeuXHXQpmr9qfh8WWTfLjH7VJFb6`。GitHub 源码已上传；尚未把该 Vercel 项目连接到 Git 自动部署。后续改代码需再次发布，或在项目设置连接 GitHub 后使用下述构建配置。

v0.5 的 58 项机制测试、类型检查、静态检查和生产构建通过，包含真实弹幕碰撞、禁术钥印来源、五道必经削减门、单局一次试炼、原兵力火力公式和商店购买边界。最终独立审计包含72次移动远征与12次站定对照，详见 [平衡审计](BALANCE_AUDIT.md)。线上验证是匿名 HTTP 与文件哈希核对，没有执行浏览器点击、截图或真机测试。

本版输出可移植静态站点，游戏逻辑、界面、美术、音效均在浏览器侧运行，不需要数据库或环境变量。Vercel 和 Netlify 配置已放在仓库根目录。

## 本地运行

使用 Node.js 24 与 npm：

```sh
npm ci
npm run dev
```

生产构建与本地查看：

```sh
npm run build
npm start
```

构建输出为 `dist/`。测试使用 `npm test`，类型检查 `npm run typecheck`，代码检查 `npm run lint`；难度模拟为 `npm run test:balance -- 64`，结果写入被 Git 忽略的 `artifacts/balance-results.json`。

## Vercel

导入 `Drill78/gate-runner`，项目根目录保持仓库根目录，Framework 选择 Vite，构建命令 `npm run build`，输出目录 `dist`，Node.js 24，安装命令 `npm ci`。`vercel.json` 已配置静态资源缓存与单页路由。

也可在已登录的命令行执行：

```sh
vercel link
vercel --prod
```

本次若通过连接器发布编译后的静态文件，源代码仍完整保存在 GitHub；后续是否自动随 Git 提交发布，以 Vercel 项目里的 Git 连接状态为准，文件部署本身不等于已经接通 Git 自动部署。

## Netlify

2026-09-08已按用户要求试部署同一v0.7构建：[Netlify试部署](https://unrivaled-malasada-3e1166.netlify.app)。项目ID `370f209c-e80c-4b18-98fc-af19afc43d26`，部署ID `6a9f73098b1aa6fd2b39c2bd`。采用Netlify官方CLI 27.5.0的免登录预构建上传，本次没有接通Git自动部署。

这是带临时密码的可认领站点，创建时认领截止为 **2026-09-08 03:29:28 UTC**（日本12:29、北京11:29）；未认领会过期，不能当成永久发布地址。认领入口与访问密码只提供在用户会话和本地忽略产物中，不写入公开仓库。Netlify的[官方说明](https://docs.netlify.com/deploy/create-deploys/)记录了免登录项目一小时认领规则。

使用该站点生成的临时访问密码登录后，29项运行文件全部返回200，SHA256与本地v0.7构建完全一致。字体响应采用历史WOFF MIME别名application/font-woff，校验按[W3C类型说明](https://www.w3.org/Fonts/REC-WOFF-20121213-errata.html)单独识别，未忽略文件内容差异。见[Netlify核验记录](releases/v0.7-netlify-verification.json)。本次验证不等于浏览器或真机试玩，也未测量不同运营商的访问速度。

本地已准备可再次手动上传的 `artifacts/ashen-gates-v07-netlify.zip`（8,988,254字节，29项运行文件与_redirects/_headers），不包含账号信息。长期使用时，认领项目并连接下述Git仓库构建配置。

从同一 GitHub 仓库创建站点，构建 `npm run build`，发布目录 `dist`。`netlify.toml` 设置 Node.js 24、单页 fallback 和缓存。也可把构建得到的 `dist` 文件夹交给 Netlify 静态部署。

## 中国大陆访问

暂时没有自定义域名，先使用托管平台提供的试玩地址。图片和字体不再从额外海外站点加载，降低依赖数量；这不能代替对托管平台本身的连通性验证。

Vercel 官方说明其没有中国大陆节点，默认 `vercel.app` 域名可能遇到封锁或性能问题，自定义域名能改善部分情况但不保证结果：[Vercel 官方说明](https://vercel.com/kb/guide/accessing-vercel-hosted-sites-from-mainland-china)。不能承诺 Netlify 默认域名在大陆一定更稳定。需要稳定公开运营时，再根据实际运营商测试选择域名与静态镜像托管。

## 存档与旧版本

存档在当前浏览器的 localStorage，换域名、设备或浏览器后不会自动同步。v0.5 沿用 v0.3 存档格式和 v0.2 存储键，已有经验与进度保留；新加入的禁术试炼开启标记在旧存档中默认未开启。v0.2 存档仍自动迁移并把经验设为零，不追补历史击杀经验。首次教程记录单独保存，不覆盖远征。v0.1 远征不迁移；最远层数记录沿用原键。

仓库保留原 Sites 配置与 `npm run build:sites`，但默认 `build` 已改为 Vite 静态构建。旧 Sites 地址不会因为这次上传 GitHub 自动更新。嵌套的本地 `gate-runner/` 初始克隆已被根项目忽略，不能把它当作网站构建根目录。
