'use client';

import type { ReactNode } from 'react';
import { GameTimer } from './GameTimer';
import type { GameAssignment } from '@/lib/types';

interface MiniGameChromeProps {
  assignment: GameAssignment;
  phase: 'intro' | 'playing' | 'outro';
  timeLeftMs: number;
  onExit: () => void;
  children: ReactNode;
  stat?: ReactNode;
  status?: string;
  accent?: string;
  durationMs?: number;
  bgImage?: string;
  variant?: 'modern' | 'cabin';
}

interface MissionBriefProps {
  assignment: GameAssignment;
  title: string;
  accent?: string;
  onStart: () => void;
  children: ReactNode;
  cta?: string;
}

interface AnalyzingPanelProps {
  title: string;
  subtitle: string;
  accent?: string;
}

export function MiniGameChrome({
  assignment,
  phase,
  timeLeftMs,
  onExit,
  children,
  stat,
  status,
  accent = assignment.theme.accent,
  durationMs = assignment.durationMs,
  bgImage,
  variant = 'modern',
}: MiniGameChromeProps) {
  return (
    <div
      className={`mini-game-shell variant-${variant}`}
      style={{ 
        '--game-accent': accent,
        '--game-bg': bgImage ? `url(${bgImage})` : 'none'
      } as React.CSSProperties}
    >
      <header className="mini-game-hud">
        <div className="mini-game-title-block">
          <div className="mini-game-badge">{assignment.theme.emoji}</div>
          <div>
            <div className="mini-game-system-line">
              <span className="mini-game-live-dot" />
              <span>{status || assignment.theme.label}</span>
            </div>
            <h2 className="mini-game-title">{assignment.gameName}</h2>
          </div>
        </div>

        <div className="mini-game-hud-actions">
          {stat}
          {phase === 'playing' && (
            <GameTimer
              durationMs={durationMs}
              timeLeftMs={timeLeftMs}
              accent={accent}
            />
          )}
          <button onClick={onExit} className="pixel-exit-button" type="button">
            Exit
          </button>
        </div>
      </header>

      <main className="mini-game-arena">{children}</main>

      <MiniGameChromeStyles />
    </div>
  );
}

export function MissionBrief({
  assignment,
  title,
  accent = assignment.theme.accent,
  onStart,
  children,
  cta = 'Start Challenge',
}: MissionBriefProps) {
  return (
    <div className="mission-brief" style={{ '--game-accent': accent } as React.CSSProperties}>
      <div className="mission-emblem">{assignment.theme.emoji}</div>
      <p className="mission-kicker">Zone Encounter</p>
      <h3>{title}</h3>
      <div className="mission-content">{children}</div>
      <button onClick={onStart} className="pixel-primary-button" type="button">
        {cta}
      </button>
    </div>
  );
}

export function MissionDirective({ children }: { children: ReactNode }) {
  return <div className="mission-directive">{children}</div>;
}

export function AnalyzingPanel({ title, subtitle, accent = '#7c3aed' }: AnalyzingPanelProps) {
  return (
    <div className="analyzing-panel" style={{ '--game-accent': accent } as React.CSSProperties}>
      <div className="analyzing-rune" />
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </div>
  );
}

function MiniGameChromeStyles() {
  return (
    <style jsx global>{`
      .mini-game-shell {
        --game-accent: #7c3aed;
        position: relative;
        display: flex;
        height: 100%;
        width: 100%;
        flex-direction: column;
        overflow: hidden;
        color: #f8fbff;
        background:
          linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px),
          radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--game-accent) 20%, transparent), transparent 42%),
          #07101c;
        background-size: 32px 32px, 32px 32px, 100% 100%, 100% 100%;
        image-rendering: pixelated;
      }

      .mini-game-shell.variant-cabin {
        background: var(--game-bg, #1a1512);
        background-size: cover;
        background-position: center;
        image-rendering: auto;
      }

      .mini-game-shell.variant-cabin::before,
      .mini-game-shell.variant-cabin::after {
        display: none;
      }

      .mini-game-shell.variant-cabin .mini-game-hud {
        background: rgba(26, 21, 18, 0.45);
        backdrop-filter: blur(8px);
        border-bottom-color: rgba(255,255,255,0.1);
      }

      .mini-game-shell::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(90deg, transparent 0 48%, rgba(255,255,255,0.045) 49% 51%, transparent 52% 100%),
          linear-gradient(0deg, rgba(0,0,0,0.28), transparent 18%, transparent 82%, rgba(0,0,0,0.32));
        mix-blend-mode: screen;
        opacity: 0.55;
      }

      .mini-game-shell::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 4px);
        opacity: 0.22;
      }

      .mini-game-hud {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 18px clamp(18px, 4vw, 34px);
        border-bottom: 1px solid rgba(255,255,255,0.12);
        background: rgba(8, 13, 24, 0.82);
        box-shadow: 0 18px 45px rgba(0,0,0,0.24);
      }

      .mini-game-title-block,
      .mini-game-hud-actions {
        display: flex;
        align-items: center;
        gap: 14px;
        min-width: 0;
      }

      .mini-game-badge {
        display: grid;
        width: 52px;
        height: 52px;
        flex: 0 0 auto;
        place-items: center;
        border: 2px solid color-mix(in srgb, var(--game-accent) 55%, white 8%);
        border-radius: 8px;
        background: color-mix(in srgb, var(--game-accent) 20%, #08101c);
        box-shadow: 0 0 24px color-mix(in srgb, var(--game-accent) 45%, transparent);
        font-size: 28px;
      }

      .mini-game-system-line {
        display: flex;
        align-items: center;
        gap: 8px;
        color: color-mix(in srgb, var(--game-accent) 75%, white 25%);
        font-family: 'Press Start 2P', monospace;
        font-size: 8px;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .mini-game-live-dot {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: var(--game-accent);
        box-shadow: 0 0 12px var(--game-accent);
      }

      .mini-game-title {
        margin-top: 7px;
        overflow-wrap: anywhere;
        color: #fff;
        font-size: clamp(16px, 2vw, 22px);
        font-weight: 900;
        line-height: 1.05;
      }

      .mini-game-arena {
        position: relative;
        z-index: 1;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

      .variant-cabin .mini-game-arena {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .pixel-exit-button,
      .pixel-primary-button {
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.16);
        font-weight: 900;
        text-transform: uppercase;
        transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
      }

      .pixel-exit-button {
        min-width: 86px;
        padding: 12px 16px;
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.58);
        font-size: 10px;
        letter-spacing: 0.12em;
      }

      .pixel-exit-button:hover {
        border-color: rgba(248, 113, 113, 0.42);
        background: rgba(239, 68, 68, 0.13);
        color: #fecaca;
      }

      .pixel-primary-button {
        width: 100%;
        padding: 18px 20px;
        background: var(--game-accent);
        color: white;
        box-shadow: 0 14px 0 rgba(0,0,0,0.25), 0 0 30px color-mix(in srgb, var(--game-accent) 45%, transparent);
        font-size: 12px;
        letter-spacing: 0.14em;
      }

      .pixel-primary-button:hover,
      .pixel-exit-button:hover {
        transform: translateY(-1px);
      }

      .pixel-primary-button:active,
      .pixel-exit-button:active {
        transform: translateY(2px) scale(0.99);
      }

      .mission-brief {
        position: absolute;
        left: 50%;
        top: 50%;
        display: flex;
        width: min(520px, calc(100vw - 32px));
        max-height: min(700px, calc(100vh - 100px));
        transform: translate(-50%, -50%);
        flex-direction: column;
        align-items: center;
        gap: 20px;
        overflow: auto;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 48px;
        background: rgba(10, 10, 15, 0.75);
        backdrop-filter: blur(24px) saturate(180%);
        padding: 48px 40px;
        text-align: center;
        box-shadow: 
          0 40px 100px rgba(0,0,0,0.6),
          inset 0 0 0 1px rgba(255,255,255,0.08);
      }

      .mission-emblem {
        display: grid;
        width: 80px;
        height: 80px;
        place-items: center;
        border: 2px solid color-mix(in srgb, var(--game-accent) 70%, white 8%);
        border-radius: 20px;
        background: color-mix(in srgb, var(--game-accent) 25%, black);
        box-shadow: 0 20px 40px color-mix(in srgb, var(--game-accent) 30%, transparent);
        font-size: 42px;
        margin-bottom: 8px;
        transform: rotate(-3deg);
      }

      .kaboom-text {
        font-family: 'Inter', sans-serif;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: -0.02em;
        line-height: 0.9;
        color: #fff;
        text-shadow: 
          0 0 20px color-mix(in srgb, var(--game-accent) 50%, transparent),
          0 0 40px color-mix(in srgb, var(--game-accent) 30%, transparent);
        filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));
      }

      .mission-kicker {
        color: color-mix(in srgb, var(--game-accent) 80%, white 20%);
        font-family: 'Press Start 2P', monospace;
        font-size: 8px;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .mission-brief h3,
      .analyzing-panel h3 {
        color: white;
        font-size: clamp(24px, 5vw, 42px);
        font-weight: 950;
        line-height: 1;
      }

      .mission-content {
        display: grid;
        width: 100%;
        gap: 12px;
        color: rgba(255,255,255,0.74);
        font-weight: 700;
        line-height: 1.5;
      }

      .mission-directive {
        border: 1px solid color-mix(in srgb, var(--game-accent) 36%, rgba(255,255,255,0.12));
        border-radius: 8px;
        background: color-mix(in srgb, var(--game-accent) 10%, rgba(255,255,255,0.03));
        padding: 16px;
      }

      .analyzing-panel {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 18px;
        padding: 30px;
        text-align: center;
      }

      .analyzing-rune {
        width: 92px;
        height: 92px;
        border: 8px solid color-mix(in srgb, var(--game-accent) 16%, transparent);
        border-top-color: var(--game-accent);
        border-radius: 999px;
        animation: spin 1.2s linear infinite;
        box-shadow: 0 0 32px color-mix(in srgb, var(--game-accent) 36%, transparent);
      }

      .analyzing-panel p {
        color: rgba(255,255,255,0.45);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      @media (max-width: 720px) {
        .mini-game-hud {
          align-items: flex-start;
          padding: 12px;
        }

        .mini-game-badge {
          width: 42px;
          height: 42px;
          font-size: 22px;
        }

        .mini-game-hud-actions {
          gap: 8px;
        }

        .pixel-exit-button {
          min-width: 66px;
          padding: 10px 12px;
        }

        .mission-brief {
          padding: 22px;
        }
      }
    `}</style>
  );
}
