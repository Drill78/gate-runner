# 试玩版部署

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

从同一 GitHub 仓库创建站点，构建 `npm run build`，发布目录 `dist`。`netlify.toml` 设置 Node.js 24、单页 fallback 和缓存。也可把构建得到的 `dist` 文件夹交给 Netlify 静态部署。

## 中国大陆访问

暂时没有自定义域名，先使用托管平台提供的试玩地址。图片和字体不再从额外海外站点加载，降低依赖数量；这不能代替对托管平台本身的连通性验证。

Vercel 官方说明其没有中国大陆节点，默认 `vercel.app` 域名可能遇到封锁或性能问题，自定义域名能改善部分情况但不保证结果：[Vercel 官方说明](https://vercel.com/kb/guide/accessing-vercel-hosted-sites-from-mainland-china)。不能承诺 Netlify 默认域名在大陆一定更稳定。需要稳定公开运营时，再根据实际运营商测试选择域名与静态镜像托管。

## 存档与旧版本

存档在当前浏览器的 localStorage，换域名、设备或浏览器后不会自动同步。v0.2 使用新存档键，v0.1 远征不迁移，避免旧数值破坏新难度；最远层数记录沿用原键。

仓库保留原 Sites 配置与 `npm run build:sites`，但默认 `build` 已改为 Vite 静态构建。旧 Sites 地址不会因为这次上传 GitHub 自动更新。嵌套的本地 `gate-runner/` 初始克隆已被根项目忽略，不能把它当作网站构建根目录。
