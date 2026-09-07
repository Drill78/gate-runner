# gate-runner · 灰烬之门 / Ashen Gates

Gate Runner × Roguelike，原创中世纪奇幻十二层远征。当前版本 **v0.3**。

**[立即试玩](https://gate-runner-seven.vercel.app)** · [GitHub 仓库](https://github.com/Drill78/gate-runner)

- 手机竖屏整屏战场、透明边缘信息、角色抽屉菜单；真正俯视、全宽连续横移。
- 远处目标提前 1.25 秒可见，放大敌人体积；击杀获得金币和经验，局内升级。
- 不同宽度的两门或三门选择，兵力没有 999 上限，面板解释兵力与火力。
- 三职业完整立绘、25 项可叠加遗物、六条 build 方向。
- 每幕 8 / 10 / 12 波，打宝箱升武器；三位首领分别使用散斧与盾牌、交错魔法弹幕、震荡与可打断吟唱。
- 全职业短时格挡：减伤 75%、保住兵力，代价是停火和减速，冷却 6 秒。
- 分支地图、战后三选一、营火、商店、祭坛事件、本地存档。

![誓约骑士](public/art/knight.webp)

## 运行

需要 Node.js 24。

```sh
npm ci
npm run dev
npm run build
npm start
```

默认生产构建输出 `dist/`，可直接部署 Vercel 或 Netlify，无服务端和环境变量需求。A/D 或左右方向键按住移动，空格释放技能，Shift 格挡，P/Esc 暂停；手机点击或拖动场地，底部按钮释放技能和格挡，左上角「角色」查看详情并暂停战斗。

## 设计与验证

- [完整游戏设计](docs/GAME_DESIGN.md)
- [所有数值、遗物与难度曲线](docs/BALANCE.md)
- [三位人物与六条构筑路线](docs/CHARACTERS.md)
- [难度模拟与局限](docs/BALANCE_AUDIT.md)
- [美术资产与后续 3D](docs/ART_ASSETS.md)
- [部署与大陆访问说明](docs/DEPLOYMENT.md)

```sh
npm test
npm run typecheck
npm run lint
npm run test:balance -- 64
```

完整远征模拟从零遗物、Lv1 武器开始，通过实际三选一逐步构筑，不预装毕业装备。模拟只能验证机制和数值方向，不代表人类玩家胜率。

## 代码结构

- `lib/game.ts`：职业、遗物、地图、房间、经济、经验等级与存档迁移。
- `lib/combat.ts`：连续移动、敌人波次、门、弹幕、吟唱、格挡与战斗。
- `lib/renderer.ts`、`lib/view.ts`：固定比例俯视 Canvas 和共用视野投影。
- `app/page.tsx`、`components/game-panels.tsx`：完整远征流程与界面。
- `scripts/balance-sim.mjs`：遵守移动速度的自动模拟器。

本版的 3D 风格立绘是 2D 图像，尚无真正 3D 模型或骨骼动画。存档只在当前浏览器；v0.2 存档自动迁移至 v0.3，保留进度，经验从零起步；不兼容 v0.1 远征。所有美术和游戏资源从本站加载，没有外部字体/CDN 依赖。
