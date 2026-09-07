'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  Crown,
  LockKeyhole,
  Shield,
  Swords,
  Trophy,
} from 'lucide-react';
import { ENCOUNTERS, type EncounterProfile } from '@/lib/bosses';
import {
  getAchievementStates,
  type AchievementState,
  type CollectionProgress,
} from '@/lib/collection';
import { formatNumber } from '@/lib/game';
import './collection-panel.css';

export interface CollectionPanelProps {
  progress: CollectionProgress;
}

function EncounterPortrait({
  encounter,
  unlocked,
}: {
  encounter: EncounterProfile;
  unlocked: boolean;
}) {
  const [unavailable, setUnavailable] = useState(false);
  const Emblem = encounter.kind === 'boss' ? Crown : Shield;
  return (
    <div className="collection-portrait" aria-hidden="true">
      <div className="collection-portrait-emblem">
        <Emblem size={48} strokeWidth={1} />
      </div>
      {unlocked && !unavailable ? (
        <img
          src={encounter.portrait}
          alt=""
          width={384}
          height={576}
          loading="lazy"
          decoding="async"
          onError={() => setUnavailable(true)}
        />
      ) : null}
      {!unlocked ? (
        <span className="collection-portrait-lock">
          <LockKeyhole size={18} strokeWidth={1.5} />
        </span>
      ) : null}
      <span className="collection-kind">
        {encounter.kind === 'boss' ? '首领' : '精英'}
      </span>
    </div>
  );
}

function EncounterEntry({
  encounter,
  count,
}: {
  encounter: EncounterProfile;
  count: number;
}) {
  if (count <= 0)
    return (
      <article className="collection-entry is-locked">
        <EncounterPortrait encounter={encounter} unlocked={false} />
        <div className="collection-entry-caption">
          <h3>{encounter.name}</h3>
          <p>击败后解锁档案</p>
        </div>
      </article>
    );

  return (
    <details className="collection-entry is-unlocked">
      <summary>
        <EncounterPortrait encounter={encounter} unlocked />
        <div className="collection-entry-caption">
          <h3>{encounter.name}</h3>
          <p>{encounter.title}</p>
          <span className="collection-entry-action">
            <span>已击败 ×{formatNumber(count)}</span>
            <ChevronDown size={15} aria-hidden="true" />
          </span>
        </div>
      </summary>
      <div className="collection-entry-details">
        <p>{encounter.description}</p>
        <div className="collection-encounter-hint">
          <span>
            <Swords size={13} aria-hidden="true" /> 招式与应对
          </span>
          <p>{encounter.hint}</p>
        </div>
      </div>
    </details>
  );
}

function AchievementEntry({ achievement }: { achievement: AchievementState }) {
  const Icon = achievement.unlocked ? Trophy : LockKeyhole;
  return (
    <article
      className={`collection-achievement ${achievement.unlocked ? 'is-unlocked' : ''} ${achievement.concealed ? 'is-concealed' : ''}`}
    >
      <span className="collection-achievement-icon" aria-hidden="true">
        <Icon size={20} strokeWidth={1.5} />
      </span>
      <div className="collection-achievement-content">
        <h3>{achievement.title}</h3>
        {!achievement.concealed ? <p>{achievement.description}</p> : null}
        {!achievement.concealed && achievement.target > 1 ? (
          <progress
            max={achievement.target}
            value={achievement.current}
            aria-label={`${achievement.title}：${achievement.current} / ${achievement.target}`}
          />
        ) : null}
      </div>
      {achievement.unlocked ? (
        <span className="collection-achievement-complete" aria-label="已达成">
          <Check size={17} aria-hidden="true" />
        </span>
      ) : !achievement.concealed ? (
        <span className="collection-achievement-count">
          {achievement.current}/{achievement.target}
        </span>
      ) : null}
    </article>
  );
}

export function CollectionPanel({ progress }: CollectionPanelProps) {
  const [tab, setTab] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const id = useId();
  const achievements = getAchievementStates(progress);
  const defeated = ENCOUNTERS.filter(
    (e) => (progress.kills[e.id] || 0) > 0,
  ).length;
  const unlocked = achievements.filter((a) => a.unlocked).length;

  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>) {
    let next: number;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') next = 1 - tab;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 1;
    else return;
    event.preventDefault();
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <section className="collection-panel" aria-label="高塔图鉴与成就">
      <header className="collection-heading">
        <span>高塔档案</span>
        <h2>每一场胜利，都有回响</h2>
        <p>击败强敌，留下属于你的远征印记。</p>
      </header>
      <div className="collection-tabs" role="tablist" aria-label="选择档案页签">
        {[
          {
            label: '图鉴',
            Icon: BookOpen,
            count: `${defeated}/${ENCOUNTERS.length}`,
          },
          {
            label: '成就',
            Icon: Trophy,
            count: `${unlocked}/${achievements.length}`,
          },
        ].map(({ label, Icon, count }, index) => (
          <button
            key={label}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel-${index}`}
            aria-selected={tab === index}
            tabIndex={tab === index ? 0 : -1}
            className={tab === index ? 'is-active' : ''}
            onClick={() => setTab(index)}
            onKeyDown={navigateTabs}
          >
            <Icon size={17} aria-hidden="true" />
            {label}
            <span>{count}</span>
          </button>
        ))}
      </div>
      <div
        key={tab}
        className="collection-scroll"
        role="tabpanel"
        id={`${id}-panel-${tab}`}
        aria-labelledby={`${id}-tab-${tab}`}
        tabIndex={0}
      >
        {tab === 0 ? (
          <div className="collection-groups">
            {(['elite', 'boss'] as const).map((kind) => {
              const encounters = ENCOUNTERS.filter((e) => e.kind === kind);
              const known = encounters.filter(
                (e) => (progress.kills[e.id] || 0) > 0,
              ).length;
              return (
                <section className="collection-group" key={kind}>
                  <h3 className="collection-group-heading">
                    {kind === 'elite' ? '精英征伐' : '章节首领'}
                    <span>
                      {known} / {encounters.length} 已击败
                    </span>
                  </h3>
                  <div className="collection-grid">
                    {encounters.map((encounter) => (
                      <EncounterEntry
                        key={encounter.id}
                        encounter={encounter}
                        count={progress.kills[encounter.id] || 0}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="collection-achievements">
            {achievements.map((achievement) => (
              <AchievementEntry
                key={achievement.id}
                achievement={achievement}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
