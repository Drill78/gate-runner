# 灰烬之门 · 1.2.3 发布交接

2026-09-09。**1.2.3 · 灰潮与无垠军势** 已发布到原网址，公共史册和镜像同步为同版。

- 正式游戏：https://gate-runner-seven.vercel.app
- 内容提交 `2df1648942a847fc7bd86b46a55505f63e1276e7`，标签 `v1.2.3`；GitHub https://github.com/Drill78/gate-runner。
- Vercel `dpl_PT1yjnLLjsn8c8taiw2LnKeMB83H`，READY，原域名已绑定。
- Sites公共镜像/API：https://ashen-gates-zhour.green-salnut.chatgpt.site，版本7：`appgprj_6a9e636d67b0819191dcf937245fdd08~appgver_a00fc2c4ce74819191f4f980abc7167c`。
- Sites部署 `appgdep_6aa0bd2aaff481918a7995443a1e4cb6`，succeeded；与Vercel使用同一内容提交。没有新增或修改数据库迁移。

本轮修复GIF提前消失（原片18.2秒，显示18.4秒后淡出1.4秒，最多六张分区播放），101平方门改为4.05秒一扇，前几次真实平方，再进入中文“无限大”。奖励段的增长不覆盖百关结算。普通道路逐步加入每波2—9只兵潮，控制新增怪物收益；稀有门提供大量援军、×2或×5，荆棘外形与实际边界更清晰。

新增对数军势防御，2.55×10^136约减伤33.90%，理论上限40%，与装备相乘。精英18%—40%护甲，第16—90关有三秒开场承伤保护，之后完全解除额外限制。提高中后期敌方数值及91—99压力；100继续保留演出空间。重复首领突入可跳过，首次、新形态、每轮最终战和91—100保持完整。

完整内容见[1.2.3说明](V1_2_3_CHANGES.md)，可调公式、具体倍率及模拟限制见[数值审计](V1_2_3_BALANCE.md)。**250项自动测试、TypeScript、lint、静态及Worker构建通过**。三职业有／无钥匙六条自然路线均到达100，另一个种子的无钥匙骑士也通过；最终六个精英专项均完成1—2次出招。程序样本不等于真人通关率。

浏览器实际验证：101真实增长至1e1344后显示“无限大”，分散GIF播放到后续画面，随后正常显示指定致谢页并可返回演武场；46关地图与普通怪潮运行。正式首页确认1.2.3，查询未返回error级控制台消息。未人工完整游玩1—100，也未进行设备性能基准。该浏览器声音关闭，本轮没有声称真人试听。

线上55/55运行资源通过，53项SHA-256完全一致；HTML仅映射构建文件名，CSS仅接受已核实的Windows/Linux OKLab舍入差异。7项只读API检查通过，包含三模式榜、46／91起点榜及匿名私人历史拒绝；此次没有写入线上测试战绩。

报告：[资源](releases/v1.2.3-verification.json)、[只读接口](releases/v1.2.3-chronicle-verification.json)、[浏览器](releases/v1.2.3-browser-verification.json)、[自然路线](releases/v1.2.3-natural-balance.json)、[固定构筑](releases/v1.2.3-focused-balance.json)、[最终精英](releases/v1.2.3-final-elites.json)。自然路线与固定样本在解除精英三秒后的残留单击限制之前完成；最后解除该限制后单独重跑六精英，详细版本区别保留在数值文档中。

部署复用 `artifacts/vercel-v123-bootstrap/`、`artifacts/prepare-release-v123.mjs`、`artifacts/verify-release-vercel-v123.mjs`、`artifacts/verify-chronicle-readonly-v123.mjs`；IDs在 `artifacts/release-v123-ids.json`。GitHub和Sites源分支已推送内容提交，Git推送不自动部署。后续文档归档提交不改变这次上线的内容SHA。原始用户GIF在项目根目录保持未跟踪，运行用副本在public/art，勿误删原文件。

## 1.2.2 历史发布记录

2026-09-08，Vercel曾发布内容 `0afe7c1177e6e8ea9e152bedc8210ea5cd11d511`，部署 `dpl_DMBSS95C6ikEc6ekR73t385ywim1`，55项资源通过。包含长阶、99、100的日式RPG配乐与用户提供的完整祝福MP3/GIF、中文无限大和指定结尾文本。配乐方案见[JRPG终章配乐](JRPG_FINALE_SCORE.md)。当时Sites归档上传超时，镜像仍停在1.2.1；本次1.2.3已将镜像与API同步更新，不能把1.2.2记作两端同时发布。

---

## 1.2.1 历史发布记录

2026-09-08。当前正式版 **1.2.1 · 真人反馈修复** 已发布到原网址。

- 正式游戏：https://gate-runner-seven.vercel.app
- 内容提交 `9a89c870dc4aa154bb63699fe24a613a9ee9c6e4`，发布标签 `v1.2.1`；GitHub https://github.com/Drill78/gate-runner。
- Vercel 部署 `dpl_GK4WgFrd2Gzb182uD2NAKMJgvqxc`，READY，原域名已绑定。
- 公共史册与镜像：https://ashen-gates-zhour.green-salnut.chatgpt.site，public；Sites版本6：`appgprj_6a9e636d67b0819191dcf937245fdd08~appgver_9069b22d405081918f1f6c84f853864b`，部署 `appgdep_6a9ffcd9a7bc8191b3330d5a27ab6d90`，succeeded。两端同一内容提交。

三位新首领的战斗形象恢复为程序模型；98天使王碎翼后正确衔接复燃，99蚀日阶段有独立六招与移位，主神增加五招至十一招。双／三首领和同时复生分别排队突入。强化天使80%减伤与91—99压力，保持100相对宽松。删除误导装饰圆圈，保留真实危险区域。

修复结算滚动、101入口和演武场返回；默认游戏文本不再提前暴露命数与结尾。指定首领演练直达交锋，完整路线照常。设置口令仍为 `721604`；先用默认1倍测试难度。66,666秘钥保留，已以真实路线证实87关买到；删除更高档和无用残章。另修契约池耗尽产生重复奖励、导致存档恢复失败的问题，并兼容已写出的相应旧存档。

验证：**216项自动测试、TypeScript、lint、静态及Worker构建通过**。12组最终引擎复核包含三职业独立99关通过、三职业站桩失败、三职业91预设长阶通过、三职业自然构筑续长阶通过。自然经济样本从正常开局实际跑至90，未注入金币。详见[修复说明](V1_2_1_FIXES.md)与[数值复核](V1_2_FEEDBACK_BALANCE_AUDIT.md)。确定性程序样本不等同真人胜率。

本版经用户授权做了浏览器交互验证：默认及390×640窄屏结算能滚到底，101实际完成并显示30宝箱与制作者署名；战斗／结算返回演武场可用；90关实际看到守望者和巫妖分别完整突入，期间战斗倒计时不动；程序模型与五招演出对比页通过目视核验。未声称人工完整游玩1—100；98／99全阶段和主神11招由引擎测试覆盖。线上浏览器确认版本1.2.1，未观察到error级控制台消息。

线上**41/41资源**通过，39项SHA-256完全一致；HTML仅映射构建文件名，CSS仅接受已核实的跨平台OKLab舍入差异。**19项API检查**通过，包含三模式榜、私人收藏与分起点榜。只写明确标记的零关私人校验记录，没有伪造公开通关或荣誉。

报告：[资源](releases/v1.2.1-verification.json)、[接口](releases/v1.2.1-chronicle-verification.json)、[浏览器](releases/v1.2.1-browser-verification.json)、[战斗样本](releases/v1.2-feedback-combat.json)、[经济](releases/v1.2-feedback-economy.json)、[自然长阶](releases/v1.2-feedback-natural-stair.json)。完整数值册、75项奖励与100关曲线同步刷新。

本版没有数据库迁移或音乐更换。继续使用Vercel前端＋Sites Worker/D1。发布工具复用 `artifacts/vercel-v121-bootstrap/`、`artifacts/verify-release-vercel-v121.mjs`、`artifacts/verify-chronicle-live-v121.mjs`，IDs见 `artifacts/release-v121-ids.json`。官方发布包117文件，45,178,880字节。后续文档归档提交不改变已上线内容提交；GitHub推送仍不会自动部署。

---

## 1.2.0 历史发布记录

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
