# 继续发布灰烬之门 v0.6

## 已完成（2026-09-07）

本次交接已经完成：v0.6 已发布至 https://gate-runner-seven.vercel.app，生产部署 `dpl_2RibGiTfx2sxJMfXmDpQabvcLEqU` 为 READY。23 项匿名资源检查通过；21 项 SHA256 完全相同，首页仅构建文件名变化，CSS 仅已确认的 OKLab 微小舍入差异。完整结果见 [部署记录](DEPLOYMENT.md) 与 [验证明细](releases/v0.6-verification.json)。以下为发布前交接历史，不代表当前状态，也不需要再次执行。

用户已明确授权发布至原试玩地址，并在自动审批上下文容量错误后批准新建任务继续。旧任务连 create_thread 也被相同技术错误拒绝，用户需要手动打开新任务。本说明用于恢复工作，不要求绕过任何新的审批。

## 已完成

- 源码、15张页面WebP、四首MP3与合成脚本、完整设计/平衡文档已推送 https://github.com/Drill78/gate-runner 的 main，内容提交 `680a91afc1327a0ee4b850d3d4f17a674e85e566`。
- 游戏v0.6包括三幕各5关的非交叉显式路线、钥匙强化现有精英、圣门入口、5精英/5首领、永久图鉴与18项成就、精英三选一保底史诗或传说、三阶段最终王、四首无歌词中世纪金属配乐。
- 最终王297321生命，70%/35%换阶段，王冠火环、错时陨火、交叉焚风、可打断或走绿区的敕令；独立压力17秒后每6秒24+6n。
- 114项测试、TypeScript、lint、生产构建全部通过。四首MP3编码/循环检查通过，总3.78MB。6局数值烟测见 BALANCE_AUDIT.md，配乐见 MUSIC.md。

## 发布状态

**尚未上线。** 两次Vercel请求（内联静态文件、Git提交构建）均在自动审批时失败，没有生成部署。失败原因是旧任务历史过长导致审批上下文无法压缩，不是项目构建错误。随后自动创建新任务也被同一错误拒绝。

线上仍为 https://gate-runner-seven.vercel.app 的旧v0.5，旧部署 `dpl_CeuXHXQpmr9qfh8WWTfLjH7VJFb6`。

## 继续操作

1. 确认工作树包含上述内容提交，保持游戏逻辑和素材。先读本项目适用技能与部署文档。
2. Vercel连接器项目 `gate-runner`，project `prj_XEFqWJRsn9qzTWLMHHbSZXb5pQdm`，team `team_F5BQUB6GOyFZcJCMV436JWNr`。GitHub公开仓库ID `1359937697`，已确认用户有admin/push权限。
3. 优先使用Git提交构建，以小体积请求重新正常审批：gitSource type github、repoId 1359937697、ref 上述完整提交；target production、framework vite、installCommand npm ci、buildCommand npm run build、outputDirectory dist、Node24。项目此前未连接Git自动部署，按实际工具响应处理所需连接权限。
4. 如果需要文件部署，使用正式文件上传/引用流程，避免一次请求内联约9MB base64导致审批再次溢出。不能绕过新的审批拒绝，也不要搜索或提取无关凭据。
5. 等待READY，匿名HTTP核验首页、JS/CSS、15张WebP、4首MP3和favicon共23项资源的状态/MIME/SHA256。核验成功后更新DEPLOYMENT.md实际部署ID与验证结果，提交推送文档，再报告真正上线。

## 原工作区已有产物

原目录为 `C:\Users\zhour\Documents\learning\Project\gate runner`：

- `dist/`：完成构建。
- `artifacts/ashen-gates-v06.zip`：6,335,775字节；23个条目已逐项校验与构建SHA256一致。
- `artifacts/release-manifest.json`：公开文件哈希。
- `artifacts/deployment-v06.json`：24项静态部署输入，包括部署配置。
- `artifacts/verify-release.mjs`：发布后匿名资源核验脚本。
- `docs/DEPLOYMENT.md`：未提交的待发布状态补充，成功发布后应改成实际状态再提交。
- 本交接说明也未提交；在新worktree中可从上述绝对路径读取。

用户没有要求浏览器视觉QA，保留项目Sites技能的相关限制；机制测试和HTTP哈希检查不能被描述成真实手机试玩。用户已经授权部署和新任务，无需再询问是否愿意发布。
