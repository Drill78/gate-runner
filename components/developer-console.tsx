'use client';
import { useState } from 'react';
import { ENCOUNTERS } from '@/lib/bosses';
import { HEROES, type ClassId, type Run, firepower } from '@/lib/game';
import {
  createDeveloperRun,
  customBossPreset,
  DEVELOPER_PRESETS,
  type DeveloperPreset,
} from '@/lib/presets';
import { type BossMutation } from '@/lib/endless';
import { setArmy, formatArmy } from '@/lib/army';
import './expedition-results.css';
let sessionUnlocked = false;

export function DeveloperConsole({
  onLaunch,
}: {
  onLaunch: (run: Run) => void;
}) {
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(sessionUnlocked);
  const [error, setError] = useState('');
  const [classId, setClassId] = useState<ClassId>('knight');
  const [boss, setBoss] = useState('king');
  const [mutation, setMutation] = useState('plain');
  const [health, setHealth] = useState(1);
  const [power, setPower] = useState(1);
  const [armyExponent, setArmyExponent] = useState('');
  const [preview, setPreview] = useState('');
  const launch = (preset: DeveloperPreset) => {
    const run = createDeveloperRun(classId, preset);
    run.hp = run.maxHp = Math.max(1, Math.min(1e12, run.maxHp * health));
    if (run.difficulty === 'endless')
      run.endless.power = Math.min(1e100, run.endless.power * power);
    if (armyExponent.trim() && Number.isInteger(Number(armyExponent)))
      setArmy(run, {
        mantissa: 1,
        exponent: Math.max(0, Math.min(32768, Number(armyExponent))),
      });
    setPreview(
      `${HEROES.find((h) => h.id === classId)!.name} · 生命${Math.round(run.maxHp)} · 军势${formatArmy(run)} · 主弹期望秒伤${Math.round(firepower(run).dps).toLocaleString()}`,
    );
    onLaunch(run);
  };
  if (!unlocked)
    return (
      <form
        className="dev-console"
        onSubmit={(e) => {
          e.preventDefault();
          if (password === '721604') {
            sessionUnlocked = true;
            setUnlocked(true);
            setPassword('');
            setError('');
          } else setError('口令不正确。');
        }}
      >
        <strong>开发者演武场</strong>
        <label htmlFor="developer-password">
          访问口令
          <input
            id="developer-password"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="secondary-button" type="submit">
          开启演武场
        </button>
        <output>{error}</output>
      </form>
    );
  return (
    <div className="dev-console">
      <strong>开发者演武场 · 已开启</strong>
      <p className="dev-note">
        演练使用独立预设，不覆盖正式存档、不上传排行、不解锁正式成就。退出演练可回到进入前的远征。主神的分段承伤限制在演练中同样生效。
      </p>
      <div className="dev-fields">
        <label>
          职业
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value as ClassId)}
          >
            {HEROES.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          生命倍率
          <input
            type="number"
            min="0.25"
            max="10"
            step="0.25"
            value={health}
            onChange={(e) =>
              setHealth(
                Math.max(0.25, Math.min(10, Number(e.target.value) || 1)),
              )
            }
          />
        </label>
        <label>
          无尽火力倍率
          <input
            type="number"
            min="0.1"
            max="100"
            step="0.25"
            value={power}
            onChange={(e) =>
              setPower(
                Math.max(0.1, Math.min(100, Number(e.target.value) || 1)),
              )
            }
          />
        </label>
        <label>
          兵力10的指数
          <input
            type="number"
            min="0"
            max="32768"
            placeholder="保持预设"
            value={armyExponent}
            onChange={(e) => setArmyExponent(e.target.value)}
          />
        </label>
      </div>
      <div className="dev-presets">
        {DEVELOPER_PRESETS.map((p) => (
          <button key={p.id} onClick={() => launch(p)}>
            <strong>{p.name}</strong>
            <small>{p.description}</small>
          </button>
        ))}
      </div>
      <div className="dev-fields">
        <label>
          独立首领
          <select value={boss} onChange={(e) => setBoss(e.target.value)}>
            {ENCOUNTERS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          异化
          <select
            value={mutation}
            onChange={(e) => setMutation(e.target.value)}
          >
            {[
              ['plain', '无异化'],
              ['ashen', '黯化'],
              ['frenzied', '血月'],
              ['golden', '金身'],
              ['fusion', '合葬'],
              ['angelic', '天使化'],
            ].map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary-button"
          onClick={() =>
            launch(
              customBossPreset(
                boss,
                mutation === 'plain' ? undefined : (mutation as BossMutation),
              ),
            )
          }
        >
          进入首领演武
        </button>
      </div>
      <div className="dev-presets">
        <button
          onClick={() => {
            const run = createDeveloperRun(
              classId,
              DEVELOPER_PRESETS.find((p) => p.id === 'deity')!,
            );
            run.floor = 100;
            run.node = null;
            run.path = [];
            run.phase = 'ascension';
            run.ascended = true;
            run.nodes = [
              [{ id: '100-2', floor: 100, col: 2, kind: 'treasure', next: [] }],
            ];
            onLaunch(run);
          }}
        >
          <strong>百关结算 → 祝福尾声</strong>
          <small>预览金色结算、署名与101关；不制造正式通关记录。</small>
        </button>
        <button
          onClick={() => {
            const run = createDeveloperRun(
              classId,
              DEVELOPER_PRESETS.find((p) => p.id === 'ascendant')!,
            );
            run.hp = 0;
            run.phase = 'fallen';
            run.revivalCoins = 1;
            run.revivalCoinsEarned = 1;
            onLaunch(run);
          }}
        >
          <strong>归魂币 → 重启战斗</strong>
          <small>验证死亡选择、消耗归魂币与满血重战。</small>
        </button>
      </div>
      <output className="dev-note">{preview}</output>
    </div>
  );
}
