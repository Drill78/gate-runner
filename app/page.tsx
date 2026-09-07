'use client';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  Flame,
  Footprints,
  BookOpen,
  Volume2,
  VolumeX,
  CircleHelp,
  Users,
  ArrowRight,
  Shield,
  Pause,
  Play,
  RotateCcw,
  Coins,
  Heart,
  Menu,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { BattleCanvas, type BattleSnapshot } from '@/components/battle-canvas';
import {
  RoutePanel,
  ClassPicker,
  BuildPanel,
  RoomScreen,
  Codex,
  Help,
  CLASS_ICONS,
} from '@/components/game-panels';
import {
  HEROES,
  ACTS,
  createRun,
  enterNode,
  completeRoom,
  chooseReward,
  restAction,
  shopBuy,
  eventAction,
  formatNumber,
  experience,
  type ClassId,
  type Run,
} from '@/lib/game';

import { createBattle, activateSkill, type Battle } from '@/lib/combat';

import {
  subscribeStorage,
  storageSnapshot,
  serverStorageSnapshot,
  parseStorage,
  persistRun,
  persistSound,
} from '@/lib/storage';

export default function Home() {
  const [run, setRun] = useState<Run>(() => createRun('knight'));
  const [battle, setBattle] = useState<Battle | null>(null);
  const [snapshot, setSnapshot] = useState<BattleSnapshot | null>(null);
  const stored = useSyncExternalStore(
    subscribeStorage,
    storageSnapshot,
    serverStorageSnapshot,
  );
  const {
    saved,
    best,
    muted,
    available: saveAvailable,
  } = useMemo(() => parseStorage(stored), [stored]);
  const [paused, setPaused] = useState(false);
  const [overlay, setOverlay] = useState<'help' | 'codex' | 'route' | null>(
    null,
  );
  const [characterOpen, setCharacterOpen] = useState(false);
  const game = run.phase === 'battle' && snapshot ? snapshot.run : run;
  const hero = HEROES.find((h) => h.id === game.classId)!;
  const ClassIcon = CLASS_ICONS[game.classId];
  const actIndex = Math.min(
    2,
    Math.floor((run.phase === 'reward' ? run.floor - 1 : run.floor) / 4),
  );
  const act = ACTS[Math.max(0, actIndex)];
  const inBattle = run.phase === 'battle' && battle !== null;
  const inExpedition = run.phase !== 'setup';
  const blocked = paused || overlay !== null || characterOpen;
  const xp = experience(game);
  useEffect(() => {
    document.body.classList.toggle('expedition-active', inExpedition);
    return () => document.body.classList.remove('expedition-active');
  }, [inExpedition]);
  useEffect(() => {
    persistRun(run);
  }, [run]);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden && run.phase === 'battle') setPaused(true);
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [run.phase]);
  const onEnd = useCallback((result: Battle) => {
    const next =
      result.state === 'won'
        ? completeRoom(result.player)
        : { ...result.player, phase: 'defeat' as const };
    setRun(next);
    setBattle(null);
    setSnapshot(null);
    setPaused(false);
  }, []);
  const onSnapshot = useCallback((s: BattleSnapshot) => setSnapshot(s), []);
  const onPause = useCallback(() => setPaused((p) => !p), []);
  const start = () => {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    setRun({ ...createRun(run.classId, seed), phase: 'map' });
    setSnapshot(null);
    setBattle(null);
    setPaused(false);
  };
  const selectClass = (id: ClassId) => setRun(createRun(id));
  const go = (id: string) => {
    const next = enterNode(run, id);
    if (next === run) return;
    setRun(next);
    if (next.phase === 'battle') {
      setSnapshot(null);
      setBattle(createBattle(next));
      setPaused(false);
    }
  };
  const restart = () => {
    setBattle(null);
    setSnapshot(null);
    setPaused(false);
    setRun(createRun(run.classId));
  };
  const toggleSound = () => persistSound(!muted);
  const skill = () => {
    if (battle && !blocked && !snapshot?.arriving) activateSkill(battle);
  };

  return (
    <main
      className={`game-shell ${inExpedition ? 'is-expedition' : ''} ${inBattle ? 'is-battle' : ''}`}
    >
      <header className="masthead">
        <div className="brand">
          <span className="brand-mark">
            <Flame size={25} />
          </span>
          <span>
            灰烬之门<small>ASHEN GATES</small>
          </span>
        </div>
        <nav className="top-nav" aria-label="游戏导航">
          <button className="nav-active" onClick={() => setOverlay(null)}>
            <Footprints size={16} />
            踏上征途
          </button>
          <button onClick={() => setOverlay('codex')}>
            <BookOpen size={16} />
            构筑图鉴
          </button>
        </nav>
        <div className="header-actions">
          <span className="edition">ROGUELIKE RUNNER</span>
          <button
            className="mobile-codex"
            aria-label="打开构筑图鉴"
            onClick={() => setOverlay('codex')}
          >
            <BookOpen size={18} />
          </button>
          <button
            aria-label={muted ? '开启音效' : '关闭音效'}
            onClick={toggleSound}
            title={muted ? '开启音效' : '关闭音效'}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button
            aria-label="玩法说明"
            onClick={() => setOverlay('help')}
            title="玩法说明"
          >
            <CircleHelp size={18} />
          </button>
        </div>
      </header>
      <section className="expedition-bar">
        <div>
          <span className="eyebrow">
            {run.phase === 'setup'
              ? 'THE FIRST EXPEDITION'
              : `ACT ${actIndex + 1} · ${['THE THORN FRONTIER', 'HALLS OF ECLIPSE', 'THE ASHEN THRONE'][actIndex]}`}
          </span>
          <h1>
            {run.phase === 'setup' ? '命运，始于一道门。' : act.name}
            <span>
              {run.phase === 'setup' ? '选择你的冒险者，向高塔进发。' : act.sub}
            </span>
          </h1>
        </div>
        <div className="expedition-status">
          <Flame size={15} />
          {run.phase === 'setup'
            ? best
              ? `最远 ${best} 层`
              : '新的远征'
            : `${hero.name}的远征`}
          <i />第 {String(Math.min(12, run.floor + 1)).padStart(2, '0')} / 12 层
        </div>
      </section>
      <div className="game-layout">
        {run.phase === 'setup' ? <RoutePanel run={run} onEnter={go} /> : null}
        <section
          className={`arena ${run.phase === 'setup' ? 'arena-setup' : ''} act-${actIndex}`}
          aria-label="远征游戏区域"
        >
          <div className="arena-art" />
          <div className="arena-vignette" />
          <div className="arena-top">
            <span className="area-badge">
              {act.roman}
              <i />
              {act.name}
            </span>
            {inBattle ? (
              <button
                className="arena-pause"
                aria-label="暂停游戏"
                onClick={() => setPaused(true)}
              >
                <Pause size={16} />
                <span>暂停</span>
              </button>
            ) : (
              <span className="live-tag">
                <i />
                {run.phase === 'setup'
                  ? '等待冒险者'
                  : run.phase === 'map'
                    ? '选择路线'
                    : run.phase === 'reward'
                      ? '战斗胜利'
                      : run.phase === 'victory'
                        ? '远征完成'
                        : run.phase === 'defeat'
                          ? '远征落幕'
                          : '旅途中的片刻'}
              </span>
            )}
          </div>
          {inExpedition ? (
            <div className="expedition-hud">
              <div className="hud-left-edge">
                <button
                  className="edge-character"
                  onClick={() => setCharacterOpen(true)}
                  aria-label="角色与构筑菜单"
                >
                  <Menu size={20} />
                  <span>
                    角色 <b>Lv.{xp.level}</b>
                  </span>
                </button>
                <span className="edge-health">
                  <Heart size={14} />
                  <b>{Math.ceil(game.hp)}</b>
                  <small>/{game.maxHp}</small>
                  <Shield size={13} />
                  {Math.ceil(snapshot?.shield || 0)}
                </span>
              </div>
              <div className="hud-right-edge">
                <span className="edge-gold">
                  <Coins size={17} />
                  <b>{formatNumber(game.gold)}</b>
                </span>
                {inBattle ? (
                  <button
                    className="edge-pause"
                    onClick={() => setPaused(true)}
                    aria-label="暂停游戏"
                  >
                    <Pause size={19} />
                    <span>暂停</span>
                  </button>
                ) : (
                  <span className="edge-floor">
                    第 {Math.min(12, run.floor + 1)} / 12 层
                  </span>
                )}
              </div>
            </div>
          ) : null}
          {run.phase === 'setup' ? (
            <>
              <img
                className="hero-portrait"
                src={`/art/${hero.id}.webp`}
                alt={`${hero.name}全身立绘`}
              />
              <div className="stage-title">
                <span>CHOOSE YOUR LEGEND</span>
                <h2>{hero.name}</h2>
                <div className="character-name">{hero.person}</div>
                <p>“{hero.quote}”</p>
                <div className="hero-intro-tags">{hero.tags}</div>
              </div>
              <div className="journey-stamp">
                <span>Ⅻ</span>
                <p>
                  十二层高塔
                  <br />
                  一次命运远征
                </p>
              </div>
              <div className="arena-bottom">
                <div className="squad-preview">
                  <Users size={21} />
                  <b>{hero.squad}</b>
                  <span>初始队伍</span>
                </div>
                {saved ? (
                  <button
                    className="primary-button"
                    onClick={() => {
                      setRun(saved);
                      setSnapshot(null);
                    }}
                  >
                    继续远征 · 第 {saved.floor + 1} 层<ArrowRight size={18} />
                  </button>
                ) : null}
                <button
                  className={
                    saved ? 'text-button new-run-button' : 'primary-button'
                  }
                  onClick={start}
                >
                  {saved ? '开启新的远征' : '开启远征'}
                  <ArrowRight size={19} />
                </button>
                <p>
                  按住 ← → / A D 自由移动 <span>·</span> 自动攻击
                </p>
              </div>
            </>
          ) : null}
          {inBattle ? (
            <>
              <BattleCanvas
                battle={battle}
                paused={blocked}
                muted={muted}
                onSnapshot={onSnapshot}
                onEnd={onEnd}
                onPause={onPause}
              />
              <div className="battle-edge-progress">
                <span>
                  第 {run.floor + 1} 层 ·{' '}
                  {snapshot?.enrage
                    ? '狂暴'
                    : `${snapshot?.wave || 1}/${battle.totalWaves} 波`}
                </span>
                <span className="boss-pressure-timer">
                  {snapshot?.pressure && snapshot.time >= battle.finalStart ? (
                    <>
                      {snapshot.pressure.name} ·{' '}
                      <b>
                        {Math.max(
                          0,
                          snapshot.pressure.nextAt - snapshot.time,
                        ).toFixed(1)}
                        s
                      </b>
                    </>
                  ) : null}
                </span>
              </div>
              <div className="battle-xp">
                <span>
                  Lv.{xp.level}{' '}
                  <small>
                    {xp.level === 12
                      ? 'MAX'
                      : `${xp.current} / ${xp.needed} XP`}
                  </small>
                </span>
                <Progress value={xp.progress} aria-label="升级经验" />
              </div>
              {snapshot?.ritual ? (
                <div
                  className={`ritual-indicator ${snapshot.ritual.interruptible ? 'interruptible' : 'unavoidable'}`}
                >
                  <strong>
                    {snapshot.ritual.name} ·{' '}
                    {Math.max(
                      0,
                      snapshot.ritual.resolveAt - snapshot.time,
                    ).toFixed(1)}
                    s
                  </strong>
                  <span>
                    {snapshot.ritual.interruptible
                      ? '持续攻击或释放技能打断'
                      : '全屏冲击 · 尽快击败首领'}
                  </span>
                  {snapshot.ritual.interruptible ? (
                    <Progress
                      value={
                        (100 * snapshot.ritual.breakRemaining) /
                        snapshot.ritual.breakMax
                      }
                      aria-label="剩余打断值"
                    />
                  ) : null}
                </div>
              ) : null}
              <output className="battle-message" aria-live="polite">
                {snapshot?.ritual ? '' : snapshot?.message}
              </output>
              <div className="battle-controls">
                <span className="drag-hint">拖动移动</span>
                <button
                  className="skill-button"
                  onClick={skill}
                  disabled={
                    blocked ||
                    snapshot?.arriving ||
                    (snapshot?.cooldown || 0) > 0
                  }
                  aria-label={hero.skill}
                  title={hero.skillDesc}
                >
                  <ClassIcon size={25} />
                  <span>
                    <strong>
                      {(snapshot?.cooldown || 0) > 0
                        ? `${Math.ceil(snapshot!.cooldown)} 秒`
                        : hero.skill}
                    </strong>
                    <small>SPACE · 技能</small>
                  </span>
                </button>
              </div>
            </>
          ) : null}
          {run.phase !== 'setup' && run.phase !== 'battle' ? (
            <RoomScreen
              run={run}
              onEnter={go}
              onReward={(id) => setRun((r) => chooseReward(r, id))}
              onRest={(action) => setRun((r) => restAction(r, action))}
              onBuy={(id) => setRun((r) => shopBuy(r, id))}
              onLeaveShop={() => setRun((r) => completeRoom(r, false))}
              onEvent={(action) => setRun((r) => eventAction(r, action))}
              onRestart={restart}
            />
          ) : null}
        </section>
        {run.phase === 'setup' ? (
          <ClassPicker id={run.classId} onSelect={selectClass} />
        ) : null}
      </div>
      <footer className="game-footer">
        <span>
          <Shield size={14} />
          {saveAvailable
            ? '一次生命，无限可能'
            : '浏览器未允许存档，本次仍可正常游玩'}
        </span>
        <span>
          {run.phase === 'setup' ? (
            <>
              三个职业 <i /> 十二层高塔 <i /> 你的独特构筑
            </>
          ) : (
            game.log[0]
          )}
        </span>
        <span>
          EARLY ACCESS <b>v0.4</b>
        </span>
      </footer>
      <Sheet open={characterOpen} onOpenChange={setCharacterOpen}>
        <SheetContent className="character-sheet">
          <SheetHeader>
            <SheetTitle>冒险者档案</SheetTitle>
            <SheetDescription>
              查看等级、装备和构筑。查看时暂停战斗。
            </SheetDescription>
          </SheetHeader>
          <div className="sheet-scroll">
            <BuildPanel
              run={game}
              shield={snapshot?.shield || 0}
              onCodex={() => {
                setCharacterOpen(false);
                setOverlay('codex');
              }}
            />
            <div className="sheet-links">
              <button
                onClick={() => {
                  setCharacterOpen(false);
                  setOverlay('route');
                }}
              >
                <Footprints size={17} />
                远征路线
              </button>
              <button
                onClick={() => {
                  setCharacterOpen(false);
                  setOverlay('help');
                }}
              >
                <CircleHelp size={17} />
                冒险手册
              </button>
              <button onClick={toggleSound}>
                {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}音效
                {muted ? '关闭' : '开启'}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <Dialog
        open={overlay !== null}
        onOpenChange={(open) => {
          if (!open) setOverlay(null);
        }}
      >
        <DialogContent
          className={`game-dialog ${overlay === 'codex' ? 'codex-dialog' : ''}`}
        >
          <DialogTitle>
            {overlay === 'codex'
              ? '秘宝与构筑'
              : overlay === 'route'
                ? '远征路线'
                : '冒险者手册'}
          </DialogTitle>
          <DialogDescription>
            {overlay === 'codex'
              ? '以每一次选择，铸成独一无二的英雄。'
              : '穿过数值门，收集强化，在灰烬中登上高塔。'}
          </DialogDescription>
          {overlay === 'codex' ? (
            <Codex run={game} />
          ) : overlay === 'route' ? (
            <RoutePanel
              run={run}
              onEnter={(id) => {
                setOverlay(null);
                go(id);
              }}
            />
          ) : (
            <Help />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={paused && overlay === null && !characterOpen && inBattle}
        onOpenChange={setPaused}
      >
        <DialogContent className="game-dialog pause-dialog">
          <DialogTitle>远征已暂停</DialogTitle>
          <DialogDescription>深呼吸。高塔会等你回来。</DialogDescription>
          <button className="primary-button" onClick={() => setPaused(false)}>
            <Play size={18} />
            继续战斗
          </button>
          <button
            className="secondary-button"
            onClick={() => setOverlay('help')}
          >
            <CircleHelp size={17} />
            查看冒险者手册
          </button>
          <button
            className="text-button"
            onClick={() => {
              if (battle) onEnd({ ...battle, state: 'lost' });
            }}
          >
            <RotateCcw size={15} />
            结束本次远征
          </button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
