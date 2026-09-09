'use client';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
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
  Settings,
  Trophy,
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
import { Switch } from '@/components/ui/switch';
import { BattleCanvas, type BattleSnapshot } from '@/components/battle-canvas';
import { GameTutorial } from '@/components/game-tutorial';
import { GateEntrance } from '@/components/gate-entrance';
import { CollectionPanel } from '@/components/collection-panel';
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
  TOTAL_FLOORS,
  MAX_LEVEL,
  ACTS,
  createRun,
  enterNode,
  completeRoom,
  reviveRun,
  acceptDefeat,
  beginEpilogue,
  chooseReward,
  skipReward,
  restAction,
  shopBuy,
  eventAction,
  formatNumber,
  experience,
  type ClassId,
  type Run,
} from '@/lib/game';

import { createBattle, activateSkill, type Battle } from '@/lib/combat';
import { VIEW } from '@/lib/view';
import { musicPlayer, sceneMusic } from '@/lib/music';

import {
  subscribeStorage,
  storageSnapshot,
  serverStorageSnapshot,
  parseStorage,
  persistRun,
  persistSound,
  persistTutorialSeen,
  persistDoubleTapSkill,
  persistCollection,
} from '@/lib/storage';

import { hardModeUnlocked } from '@/lib/collection';
import { actIndex as currentAct, isEndless } from '@/lib/endless';
import { retireEndless } from '@/lib/game';
import { trackChronicle, flushChronicle } from '@/lib/chronicle';
import { ChroniclePanel, TravellerName } from '@/components/chronicle-panel';
import { DeveloperConsole } from '@/components/developer-console';
import { createCheckpointRun } from '@/lib/presets';

export default function Home() {
  const [run, setRun] = useState<Run>(() => createRun('knight'));
  const [battle, setBattle] = useState<Battle | null>(null);
  const [snapshot, setSnapshot] = useState<BattleSnapshot | null>(null);
  const beforeDeveloper = useRef<{
    run: Run;
    battle: Battle | null;
    snapshot: BattleSnapshot | null;
  } | null>(null);
  const stored = useSyncExternalStore(
    subscribeStorage,
    storageSnapshot,
    serverStorageSnapshot,
  );
  const {
    saved,
    best,
    muted,
    tutorialSeen,
    doubleTapSkill,
    collection,
    available: saveAvailable,
  } = useMemo(() => parseStorage(stored), [stored]);
  const [paused, setPaused] = useState(false);
  const [overlay, setOverlay] = useState<
    'help' | 'codex' | 'route' | 'settings' | 'collection' | 'chronicle' | null
  >(null);
  const [characterOpen, setCharacterOpen] = useState(false);
  const [tutorialDismissed, setTutorialDismissed] = useState(false);
  const activeOverlay =
    overlay ??
    (Boolean(stored) &&
    !run.devMode &&
    !tutorialSeen &&
    !tutorialDismissed &&
    run.phase !== 'setup'
      ? 'help'
      : null);
  const game = run.phase === 'battle' && snapshot ? snapshot.run : run;
  const hero = HEROES.find((h) => h.id === game.classId)!;
  const ClassIcon = CLASS_ICONS[game.classId];
  const actIndex = currentAct(run);
  const act = ACTS[Math.max(0, actIndex)];
  const inBattle = run.phase === 'battle' && battle !== null;
  const inExpedition = run.phase !== 'setup';
  const blocked = paused || activeOverlay !== null || characterOpen;
  const xp = experience(game);
  const playerScreenRatio = (VIEW.playerY - VIEW.far) / (VIEW.near - VIEW.far);
  useEffect(() => {
    document.body.classList.toggle('expedition-active', inExpedition);
    return () => document.body.classList.remove('expedition-active');
  }, [inExpedition]);
  useEffect(() => {
    persistRun(run);
    trackChronicle(run);
  }, [run]);
  useEffect(() => {
    const flush = () => {
      void flushChronicle();
    };
    const interval = window.setInterval(flush, 15000);
    window.addEventListener('online', flush);
    flush();
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', flush);
    };
  }, []);
  useEffect(() => {
    const unlock = () => musicPlayer.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      musicPlayer.setState(null, true, false);
    };
  }, []);
  useEffect(() => {
    if (inBattle) return;
    const syncMusic = () =>
      musicPlayer.setState(
        sceneMusic(run.phase, { floor: run.floor, difficulty: run.difficulty }),
        document.hidden || paused,
        muted,
      );
    syncMusic();
    document.addEventListener('visibilitychange', syncMusic);
    return () => document.removeEventListener('visibilitychange', syncMusic);
  }, [inBattle, run.phase, run.floor, run.difficulty, paused, muted]);
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
        : {
            ...result.player,
            phase: (isEndless(result.player) &&
            (result.player.revivalCoins || 0) > 0
              ? 'fallen'
              : 'defeat') as Run['phase'],
          };
    persistCollection(next, result.encounterKills);
    setRun(next);
    setBattle(null);
    setSnapshot(null);
    setPaused(false);
  }, []);
  const onSnapshot = useCallback((s: BattleSnapshot) => setSnapshot(s), []);
  const onPause = useCallback(() => setPaused((p) => !p), []);
  const start = () => {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    setRun({
      ...createRun(
        run.classId,
        seed,
        hardModeUnlocked(collection) ? run.difficulty : 'normal',
      ),
      phase: 'map',
      runId: crypto.randomUUID(),
    });
    setSnapshot(null);
    setBattle(null);
    setPaused(false);
  };
  const selectClass = (id: ClassId) =>
    setRun(createRun(id, run.seed, run.difficulty));
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
    if (run.devMode && beforeDeveloper.current) {
      const previous = beforeDeveloper.current;
      beforeDeveloper.current = null;
      setRun(previous.run);
      setBattle(previous.battle);
      setSnapshot(previous.snapshot);
      setPaused(Boolean(previous.battle));
      return;
    }
    setBattle(null);
    setSnapshot(null);
    setPaused(false);
    setRun(createRun(run.classId));
  };
  const setSoundEnabled = (enabled: boolean) => {
    persistSound(!enabled);
    if (enabled) musicPlayer.unlock(true);
  };
  const toggleSound = () => setSoundEnabled(muted);
  const launchPreparedRun = (next: Run) => {
    setRun(next);
    setSnapshot(null);
    setBattle(next.phase === 'battle' ? createBattle(next) : null);
    setPaused(false);
  };
  const launchDeveloper = (next: Run) => {
    if (!run.devMode) beforeDeveloper.current = { run, battle, snapshot };
    setOverlay(null);
    launchPreparedRun(next);
  };
  const continueCheckpoint = (room: 46 | 91) => {
    if ((collection.records.endlessDepth || 0) < room - 1 && !run.devMode)
      return;
    const next = createCheckpointRun(
      run.classId,
      room,
      crypto.getRandomValues(new Uint32Array(1))[0],
    );
    next.checkpointStart = room;
    next.revivalCoinsEarned = room === 46 ? 2 : 3;
    next.devMode = run.devMode;
    next.runId = next.devMode ? '' : crypto.randomUUID();
    setOverlay(null);
    launchPreparedRun(next);
  };
  const closeOverlay = () => {
    if (activeOverlay === 'help') {
      setTutorialDismissed(true);
      persistTutorialSeen();
    }
    setOverlay(null);
  };
  const skill = () => {
    if (battle && !blocked && !snapshot?.arriving) activateSkill(battle);
  };

  return (
    <main
      className={`game-shell ${collection.secrets.includes('ascension') ? 'has-ascended' : ''} ${run.devMode ? 'is-developer' : ''} ${battle?.epilogue ? 'is-epilogue' : ''} ${run.phase === 'setup' ? 'is-setup' : ''} ${inExpedition ? 'is-expedition' : ''} ${inBattle ? 'is-battle' : ''}`}
    >
      {run.phase === 'setup' ? (
        <GateEntrance
          selected={run.classId}
          difficulty={run.difficulty}
          hardUnlocked={hardModeUnlocked(collection)}
          onDifficulty={(mode) => {
            if (mode === 'normal' || hardModeUnlocked(collection))
              setRun((r) => ({ ...r, difficulty: mode }));
          }}
          onSelect={selectClass}
          onStart={start}
          onContinue={
            saved
              ? () => {
                  launchPreparedRun(saved);
                }
              : undefined
          }
          onSettings={() => setOverlay('settings')}
          onChronicle={() => setOverlay('chronicle')}
        />
      ) : null}
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
          <button onClick={() => setOverlay('chronicle')}>
            <Trophy size={16} />
            灰烬史册
          </button>
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
            {run.phase === 'setup'
              ? '命运，始于一道门。'
              : isEndless(run) && run.floor >= 90
                ? '登神长阶'
                : act.name}
            <span>
              {run.phase === 'setup'
                ? '选择你的冒险者，向高塔进发。'
                : isEndless(run) && run.floor >= 90
                  ? '迷雾尽处，愿凡人的火照亮诸神。'
                  : act.sub}
            </span>
          </h1>
        </div>
        <div className="expedition-status">
          <Flame size={15} />
          {run.phase === 'setup'
            ? best
              ? `最远 ${best} 关`
              : '新的远征'
            : `${hero.name}的远征`}
          <i />第{' '}
          {String(
            isEndless(run)
              ? Math.min(run.ascended ? 101 : 100, run.floor + 1)
              : Math.min(TOTAL_FLOORS, run.floor + 1),
          ).padStart(2, '0')}{' '}
          / {isEndless(run) ? (run.ascended ? '101' : '100') : TOTAL_FLOORS} 关
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
              {isEndless(run) && run.floor >= 90 ? '✦' : act.roman}
              <i />
              {isEndless(run) && run.floor >= 90
                ? run.floor >= 100
                  ? '最后的祝福'
                  : '登神长阶'
                : act.name}
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
          {inExpedition &&
          !['victory', 'defeat', 'fallen', 'ascension'].includes(run.phase) ? (
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
                    第{' '}
                    {isEndless(run)
                      ? Math.min(run.ascended ? 101 : 100, run.floor + 1)
                      : Math.min(TOTAL_FLOORS, run.floor + 1)}{' '}
                    /{' '}
                    {isEndless(run)
                      ? run.ascended
                        ? '101'
                        : '100'
                      : TOTAL_FLOORS}{' '}
                    关
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
                <span>ⅩⅤ</span>
                <p>
                  十五关高塔
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
                    继续远征 · 第 {saved.floor + 1} 关<ArrowRight size={18} />
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
                doubleTapSkill={doubleTapSkill}
                paused={blocked}
                muted={muted}
                onSnapshot={onSnapshot}
                onEnd={onEnd}
                onPause={onPause}
              />
              {snapshot &&
              snapshot.encounters.length > 0 &&
              !snapshot.arriving ? (
                <div
                  className="encounter-health-stack"
                  data-dual={snapshot.encounters.length > 1}
                >
                  {snapshot.encounters.map((encounter) => (
                    <div
                      key={encounter.id}
                      className="encounter-health"
                      data-kind={encounter.chapterBoss ? 'boss' : 'elite'}
                    >
                      <div className="encounter-health-heading">
                        <span className="encounter-health-title">
                          <small>
                            {encounter.chapterBoss ? '章节首领' : '关底精英'}
                          </small>
                          <strong title={encounter.name}>
                            {encounter.name}
                          </strong>
                        </span>
                        <span className="encounter-health-status">
                          {encounter.status}
                        </span>
                      </div>
                      <meter
                        className="sr-only"
                        aria-label={`${encounter.name}生命`}
                        min={0}
                        max={encounter.maxHp}
                        value={encounter.hp}
                      />
                      <div
                        className="encounter-health-track"
                        aria-hidden="true"
                      >
                        <span
                          className="encounter-health-trail"
                          style={{
                            width: `${(100 * encounter.hp) / encounter.maxHp}%`,
                          }}
                        />
                        <span
                          className="encounter-health-fill"
                          style={{
                            width: `${(100 * encounter.hp) / encounter.maxHp}%`,
                          }}
                        />
                        {encounter.phaseThresholds.map((threshold) => (
                          <i
                            key={threshold}
                            className="encounter-health-half"
                            style={{ left: `${threshold}%` }}
                          />
                        ))}
                        <span className="encounter-health-numbers">
                          {Math.ceil(encounter.hp).toLocaleString('zh-CN')} /{' '}
                          {Math.ceil(encounter.maxHp).toLocaleString('zh-CN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="battle-edge-progress">
                <span>
                  第 {run.floor + 1} 关 ·{' '}
                  {snapshot?.enrage
                    ? '狂暴'
                    : battle.totalWaves > 0
                      ? `${snapshot?.wave || 1}/${battle.totalWaves} 波`
                      : '首领交锋'}
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
                    {xp.level === MAX_LEVEL
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
                      ? '集火打断 / 移入绿色安全区'
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
              <output
                className="hero-notice"
                aria-live="polite"
                style={{
                  left: `clamp(min(145px, 46%), ${50 + (snapshot?.x || 0) * VIEW.horizontalScale * 100}%, max(calc(100% - 145px), 54%))`,
                  top: `calc(${playerScreenRatio * 100}% - ${VIEW.controlSpace * playerScreenRatio + 103}px)`,
                }}
              >
                {snapshot?.message}
              </output>
              <span className="battle-drag-hint">← 横向拖动 · 自动发射 →</span>
              <div
                className="skill-dock"
                style={{ '--skill-color': hero.color } as CSSProperties}
              >
                <button
                  className="side-skill-button"
                  onClick={skill}
                  disabled={
                    blocked ||
                    snapshot?.arriving ||
                    (snapshot?.cooldown || 0) > 0
                  }
                  aria-label={hero.skill}
                  title={hero.skillDesc}
                >
                  <ClassIcon size={28} />
                  <span>
                    <strong>
                      {(snapshot?.cooldown || 0) > 0
                        ? `${Math.ceil(snapshot!.cooldown)} 秒`
                        : hero.skill}
                    </strong>
                    <small>
                      {(snapshot?.buffRemaining || 0) > 0
                        ? `${run.classId === 'ranger' ? '疾射' : '誓约'} ${Math.ceil(snapshot!.buffRemaining)}秒`
                        : (snapshot?.cooldown || 0) > 0
                          ? '冷却中'
                          : '点击 / 空格'}
                    </small>
                  </span>
                </button>
              </div>
            </>
          ) : null}
          {run.phase !== 'setup' && run.phase !== 'battle' ? (
            <RoomScreen
              run={run}
              onEnter={go}
              onReward={(id) =>
                setRun((r) =>
                  id === '__skip' ? skipReward(r) : chooseReward(r, id),
                )
              }
              onRest={(action) => setRun((r) => restAction(r, action))}
              onBuy={(id) => setRun((r) => shopBuy(r, id))}
              onLeaveShop={() => setRun((r) => completeRoom(r, false))}
              onEvent={(action) => setRun((r) => eventAction(r, action))}
              onRestart={restart}
              onDeveloperMenu={() => setOverlay('settings')}
              onRetire={() => setRun((r) => retireEndless(r))}
              onRevive={() => {
                const next = reviveRun(run);
                persistCollection(next, {});
                launchPreparedRun(next);
              }}
              onAcceptDefeat={() => setRun((r) => acceptDefeat(r))}
              onEpilogue={() => launchPreparedRun(beginEpilogue(run))}
              onCheckpoint={continueCheckpoint}
              checkpointDepth={
                run.devMode ? 90 : collection.records.endlessDepth || 0
              }
            />
          ) : null}
        </section>
        {run.phase === 'setup' ? (
          <ClassPicker id={run.classId} onSelect={selectClass} />
        ) : null}
      </div>
      {run.devMode && (
        <div className="developer-banner">
          <span>开发者演练</span>
          <button onClick={restart}>退出演练</button>
          <button onClick={() => setOverlay('settings')}>返回演武场</button>
        </div>
      )}
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
              三个职业 <i /> 十五关高塔 <i /> 你的独特构筑
            </>
          ) : (
            game.log[0]
          )}
        </span>
        <span>
          正式版 <b>v1.2.3</b>
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
        open={activeOverlay !== null}
        onOpenChange={(open) => {
          if (!open) closeOverlay();
        }}
      >
        <DialogContent
          className={`game-dialog ${activeOverlay === 'chronicle' ? 'chronicle-dialog' : activeOverlay === 'collection' ? 'collection-dialog' : activeOverlay === 'codex' ? 'codex-dialog' : activeOverlay === 'help' ? 'tutorial-dialog' : ''}`}
        >
          <DialogTitle>
            {activeOverlay === 'chronicle'
              ? '灰烬史册'
              : activeOverlay === 'settings'
                ? '设置'
                : activeOverlay === 'collection'
                  ? '远征收藏'
                  : activeOverlay === 'codex'
                    ? '秘宝与构筑'
                    : activeOverlay === 'route'
                      ? '远征路线'
                      : activeOverlay === 'help'
                        ? '冒险入门'
                        : ''}
          </DialogTitle>
          <DialogDescription>
            {activeOverlay === 'codex'
              ? '以每一次选择，铸成独一无二的英雄。'
              : '穿过数值门，收集强化，在灰烬中登上高塔。'}
          </DialogDescription>
          {activeOverlay === 'settings' ? (
            <>
              <TravellerName
                ascended={collection.secrets.includes('ascension')}
              />
              <button
                className="secondary-button"
                onClick={() => setOverlay('chronicle')}
              >
                <Trophy size={18} />
                排行榜与我的履历
              </button>
              <label className="control-option" htmlFor="settings-double-tap">
                <span>
                  双击人物释放技能<small>连续轻点队长，拖动不会施放</small>
                </span>
                <Switch
                  id="settings-double-tap"
                  checked={doubleTapSkill}
                  onCheckedChange={persistDoubleTapSkill}
                />
              </label>
              <label className="control-option" htmlFor="settings-audio">
                <span>音乐与音效</span>
                <Switch
                  id="settings-audio"
                  checked={!muted}
                  onCheckedChange={setSoundEnabled}
                />
              </label>
              <button
                className="secondary-button"
                onClick={() => setOverlay('collection')}
              >
                <Trophy size={18} />
                图鉴与成就
              </button>
              <button
                className="secondary-button"
                onClick={() => setOverlay('codex')}
              >
                <BookOpen size={18} />
                强化符文图鉴
              </button>
              <p className="settings-note">
                收藏记录自动保存在当前浏览器，新开远征不会清空。
              </p>
              {(run.phase === 'setup' || run.phase === 'defeat') &&
                (collection.records.endlessDepth || 0) >= 45 && (
                  <div className="dev-presets">
                    <button onClick={() => continueCheckpoint(46)}>
                      <strong>余火重聚 · 第四轮</strong>
                      <small>以固定誓装从第46关续战，另列史册。</small>
                    </button>
                    {(collection.records.endlessDepth || 0) >= 90 && (
                      <button onClick={() => continueCheckpoint(91)}>
                        <strong>群星之约 · 登神长阶</strong>
                        <small>以固定誓装从第91关续战，另列史册。</small>
                      </button>
                    )}
                  </div>
                )}
              <DeveloperConsole onLaunch={launchDeveloper} />
            </>
          ) : activeOverlay === 'chronicle' ? (
            <ChroniclePanel />
          ) : activeOverlay === 'collection' ? (
            <CollectionPanel progress={collection} />
          ) : activeOverlay === 'codex' ? (
            <Codex run={game} />
          ) : activeOverlay === 'route' ? (
            <RoutePanel
              run={run}
              onEnter={(id) => {
                setOverlay(null);
                go(id);
              }}
            />
          ) : activeOverlay === 'help' ? (
            <>
              <GameTutorial onComplete={closeOverlay} />
              <details className="tutorial-reference">
                <summary>完整规则与存档说明</summary>
                <Help />
              </details>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog
        open={paused && activeOverlay === null && !characterOpen && inBattle}
        onOpenChange={setPaused}
      >
        <DialogContent className="game-dialog pause-dialog">
          <DialogTitle>远征已暂停</DialogTitle>
          <DialogDescription>深呼吸。高塔会等你回来。</DialogDescription>
          <label className="control-option" htmlFor="double-tap-skill">
            <span>
              双击人物释放技能<small>开启后，连续轻点队长即可施放</small>
            </span>
            <Switch
              id="double-tap-skill"
              checked={doubleTapSkill}
              onCheckedChange={persistDoubleTapSkill}
              aria-label="双击人物释放技能"
            />
          </label>
          <button
            className="secondary-button"
            onClick={() => setOverlay('settings')}
          >
            <Settings size={18} />
            设置、图鉴与成就
          </button>
          <button className="primary-button" onClick={() => setPaused(false)}>
            <Play size={18} />
            继续战斗
          </button>
          <button
            className="secondary-button"
            onClick={() => setOverlay('help')}
          >
            <CircleHelp size={17} />
            查看图文教程
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
