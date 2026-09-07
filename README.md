# 灰烬之门 · Ashen Gates

一个可玩的中世纪奇幻 Gate Runner × 肉鸽爬塔原型。使用 React、TypeScript 与 Canvas 2D；场景以 2.5D 透视绘制，单人本地规则，无需游戏服务器。

## 玩法

- 三职业：誓约骑士（圣盾反击）、灰林游侠（暴击连射）、秘火法师（奥术回响）。
- 三幕十二层，带相邻连接限制的随机分岔路线；每第四层挑战首领。
- 实时左右换道，通过加法、乘法、减法、除法门累积队伍。队伍伤害按人数平方根增长，人数上限 999。
- 当前道路自动攻击；在期限内击碎宝箱，获得武器升级和金币。武器 10 级封顶。
- 25 项可叠加强化，战后三选一。累计三层职业强化激活该职业的流派加成。
- 精英战、宝库、营火、商店、献祭事件、胜利/死亡结算及重开。
- 关卡间在当前浏览器自动存档，战斗中刷新回到最近的关卡间检查点。无云端存档或跨设备同步。

## 操作

方向键 / A D：换道。空格：职业技能。P / Esc：暂停。手机：点击左右场地或拖动换道，点击技能按钮。切换窗口自动暂停。

## 开发

Node.js 24+。`npm install`，`npm run dev`。

`npm test` 运行战斗规则、经济、存档与三职业完整爬塔模拟。
`npm run typecheck` 检查类型。
`npm run lint` 检查本项目编写的源码；生成的 `components/ui` 和 `hooks` 保持上游原样，不在此检查范围。
`npm run build` 生成 Sites/Cloudflare Worker 产物。

主要文件：`lib/game.ts`（可独立模拟的战斗及爬塔规则）、`lib/renderer.ts`（透视渲染）、`lib/storage.ts`（本地存档）、`components/battle-canvas.tsx`（帧循环及输入）、`components/game-panels.tsx`（职业/地图/构筑/房间界面）、`app/page.tsx`（流程编排）。

## 美术资产

`public/art/citadel.png` 为内置 imagegen 工具生成的原创 1536×1024 古堡环境图；已保存于项目内。最终提示词：

> Use case: stylized-concept. Asset type: Original raster environment art for a medieval fantasy DnD-style Gate Runner roguelike game, one 1536x1024 landscape illustration. A dramatic ruined black stone gothic citadel centered high in the background, with a narrow ancient stone bridge leading from the bottom center into the castle. Deep ravines on both sides of the bridge, distant pine forest, cold teal fog, moss on ancient masonry, sparse ember torches casting restrained warm amber light. Painterly, detailed premium indie game concept art, dark and moody but with readable architecture. Wide landscape, castle mass centered high; strong bridge perspective from bottom center towards the castle entrance. Center-bottom bridge area visually quiet and uncluttered for gameplay overlays. Cold atmospheric teal haze contrasting subtly with warm amber torchlight. Exactly one image. No text, logos, watermark, UI, characters, or decorative border.

图标使用 lucide-react。关卡单位、门、宝箱和投射物由游戏渲染器实时绘制。世界观、名称和数值为本项目原创，不使用 D&D 或《杀戮尖塔》的专有美术、角色或规则内容。

当前版本是可迭代的玩法原型：三幕复用一种地形、角色为简化战棋单位。尚未加入更多职业、剧情分支、音轨或长期解锁。
