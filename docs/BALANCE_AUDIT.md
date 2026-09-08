# v0.7 · 难度曲线验证

2026-09-08。最终冻结引擎共执行 **204局**：普通144局（每职业 × 三种策略 × 16个固定种子）、困难协同48局、站定对照12局。全部从零遗物、Lv1武器出发，通过真实选路、升级、轮抽与购买API成长。

三个职业均有普通和困难通关路径。游侠在困难下容错仍低于骑士、法师；骑士盾流最稳。控制器结果不代表真人胜率。

| 模式 / 构筑 | 骑士 | 游侠 | 法师 |
| --- | ---: | ---: | ---: |
| 普通 / 协同 | 16/16 | 12/16 | 16/16 |
| 普通 / 经济优先 | 12/16 | 2/16 | 3/16 |
| 普通 / 不取遗物 | 0/16 | 0/16 | 0/16 |
| 困难 / 协同 | 16/16 | 6/16 | 15/16 |
| 普通 / 站定对照 | 0/4 | 0/4 | 0/4 |

普通协同样本的章节首领交战中位时长依次为 **21.2、16.4、20.3秒**；三幕精英为 **19.3、6.3、6.0秒**。后期构筑带来清场加速；第三幕精英提高耐久并在第一轮使用招牌招式，让成型后仍有机制交互。困难双首领中位时长为 **27.8、19.8秒**。时长排除前置波次与升级菜单，仅统计对应战斗获胜样本。

本批无超时或升级队列挂起。站定与不取遗物组均未通关，单靠自动开火不能替代走位、过门和构筑。实际样本出现Lv25武器、371生命上限、单局2310累计金币和两次双首领胜利；金币高阶成就设为2200，保留可达的收集目标。

控制器每0.15秒决策，使用0.05秒步长及实际指针限速。只读取已出现目标、已发射弹体与公开预警；轮抽只选择实际提供的选项。处理地面危险区和蛛网减速，优先攻击可见魂灯。该策略有稳定反应与弹道预测，明显优于随意操作；没有浏览器或真机试玩证据。测试不是随机抽样的人类实验，也不能证明所有种子都能通关。

初轮困难游侠0/16后，将游侠基础攻击5.4提高到5.9，困难生命调整为+10%、攻击伤害+8%；双首领总生命为对应普通首领的132%，压力宽限额外6秒。保留普通最终王297321生命，新增阶段火墙与断界。

逐局结果见 [CSV](data/balance-v07-runs.csv)，引擎哈希、策略与汇总见 [JSON](data/balance-v07-summary.json)。完整房间和选择轨迹保存在忽略目录artifacts/balance-v07-final-*.json。v0.6历史结果见 [旧报告](BALANCE_AUDIT_V06.md)。

复现（Node.js24，PowerShell）：

```powershell
$env:MODE_FILTER='coherent,economy,none'
$env:RESULT_FILE='artifacts/balance-v07-final-normal.json'
node scripts/balance-sim.mjs 16
$env:MODE_FILTER='coherent'
$env:DIFFICULTY='hard'
$env:RESULT_FILE='artifacts/balance-v07-final-hard.json'
node scripts/balance-sim.mjs 16
$env:DIFFICULTY='normal'
$env:STATIONARY='1'
$env:RESULT_FILE='artifacts/balance-v07-final-stationary.json'
node scripts/balance-sim.mjs 4
```
