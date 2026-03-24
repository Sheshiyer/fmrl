/**
 * TarotResult Component
 * Dedicated renderer for the Tarot engine showing card spreads and readings.
 * Displays cards in a horizontal flex layout with position labels, arcana-colored borders,
 * reversal badges, and a synthesis/interpretation prose panel.
 */
import { Sparkles, Clock, Cpu, Database } from 'lucide-react';
import type { EngineOutput } from '../../types/selemene';

function getField(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const val = obj[key] ?? obj[key.toLowerCase()];
    if (val !== undefined) return val;
  }
  return undefined;
}

interface TarotCard {
  name: string;
  arcana?: string;
  position?: string;
  reversed?: boolean;
  meaning?: string;
  number?: number | string;
  suit?: string;
  keywords?: string[];
  element?: string;
}

function CardPanel({ card }: { card: TarotCard }) {
  const isMajor = card.arcana?.toLowerCase() === 'major';
  const borderColor = isMajor
    ? 'border-pip-gold/60'
    : 'border-pip-border/50';
  const bgAccent = isMajor
    ? 'bg-pip-gold/8'
    : 'bg-pip-dark/60';

  return (
    <div className="flex flex-col items-center gap-2 min-w-[140px] max-w-[180px]">
      {/* Position label */}
      {card.position && (
        <span className="text-[10px] uppercase tracking-[0.15em] text-pip-text-muted font-medium">
          {card.position}
        </span>
      )}

      {/* Card face */}
      <div className={`flex flex-col items-center justify-center gap-2 w-full aspect-[2/3] rounded-xl border-2 ${borderColor} ${bgAccent} p-3`}>
        {/* Card number / arcana indicator */}
        <span className={`text-3xl font-bold ${isMajor ? 'text-pip-gold' : 'text-pip-text-primary'}`}>
          {card.number !== undefined && card.number !== null ? String(card.number) : '✦'}
        </span>

        {/* Arcana / suit label */}
        <span className="text-[9px] uppercase tracking-wider text-pip-text-muted">
          {isMajor ? 'Major Arcana' : card.suit ? card.suit : card.arcana ? card.arcana : 'Arcana'}
        </span>
      </div>

      {/* Card name */}
      <span className="text-sm font-semibold text-pip-text-primary text-center leading-tight">
        {card.name}
      </span>

      {/* Reversed badge */}
      {card.reversed && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
          ↕ Reversed
        </span>
      )}

      {/* Card meaning */}
      {card.meaning && (
        <p className="text-xs text-pip-text-secondary text-center leading-relaxed">
          {card.meaning}
        </p>
      )}

      {/* Keywords */}
      {card.keywords && Array.isArray(card.keywords) && card.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center">
          {card.keywords.map((kw, i) => (
            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-pip-dark border border-pip-border/30 text-pip-text-muted">
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function TarotResult({ result }: { result: EngineOutput }) {
  if (!result) {
    return (
      <div className="mystic-panel !p-6 text-center text-pip-text-muted">
        No tarot data available.
      </div>
    );
  }

  const data = (result.result ?? {}) as Record<string, unknown>;

  // Extract cards array
  const rawCards = getField(data, 'cards', 'spread', 'card_spread', 'drawn_cards') as TarotCard[] | undefined;
  const cards: TarotCard[] = Array.isArray(rawCards) ? rawCards : [];

  // Extract spread type
  const spreadType = getField(data, 'spread_type', 'type', 'layout', 'spread_name') as string | undefined;

  // Extract synthesis / interpretation
  const synthesis = getField(data, 'synthesis', 'reading', 'interpretation', 'overall_reading', 'summary') as string | undefined;

  // Extract theme / question
  const theme = getField(data, 'theme', 'question', 'query', 'focus') as string | undefined;

  return (
    <div className="flex flex-col gap-4">
      {/* Witness Prompt */}
      {result.witness_prompt && (
        <div className="mystic-panel !p-5">
          <p className="text-lg italic text-pip-gold leading-relaxed">
            &ldquo;{result.witness_prompt}&rdquo;
          </p>
        </div>
      )}

      {/* Engine + Spread Type Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-3 py-1 rounded-full text-xs border border-pip-border/50 bg-black/20 text-pip-text-secondary flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          {result.engine_id}
        </span>
        <span className="px-3 py-1 rounded-full text-xs border border-pip-gold/30 bg-pip-gold/10 text-pip-gold flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          Level {result.consciousness_level}
        </span>
        {spreadType && (
          <span className="px-3 py-1 rounded-full text-xs border border-purple-500/30 bg-purple-500/10 text-purple-300 font-medium capitalize">
            {spreadType.replace(/[-_]/g, ' ')}
          </span>
        )}
      </div>

      {/* Theme / Question */}
      {theme && (
        <div className="mystic-panel !p-4">
          <div className="mystic-eyebrow text-xs mb-2">Question / Theme</div>
          <p className="text-sm text-pip-text-primary leading-relaxed">{theme}</p>
        </div>
      )}

      {/* Card Spread */}
      {cards.length > 0 && (
        <div className="mystic-panel !p-4">
          <div className="mystic-eyebrow text-xs mb-4 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-pip-text-muted" />
            Card Spread
            <span className="ml-auto text-pip-text-muted font-normal">
              {cards.length} card{cards.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-5 justify-center">
            {cards.map((card, idx) => (
              <CardPanel key={idx} card={card} />
            ))}
          </div>
        </div>
      )}

      {/* Synthesis / Reading */}
      {synthesis && (
        <div className="mystic-panel !p-5">
          <div className="mystic-eyebrow text-xs mb-3">Reading</div>
          <p className="text-sm text-pip-text-secondary leading-relaxed whitespace-pre-line">
            {synthesis}
          </p>
        </div>
      )}

      {/* Metadata Footer */}
      {result.metadata && (
        <div className="flex items-center gap-4 text-xs text-pip-text-muted px-1">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-pip-gold" />
            {result.metadata.calculation_time_ms.toFixed(1)}ms
          </span>
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3" />
            {result.metadata.backend}
          </span>
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3" />
            {result.metadata.cached ? 'Cached' : 'Fresh'}
          </span>
          {result.metadata.precision_achieved && (
            <span className="text-pip-text-muted">{result.metadata.precision_achieved}</span>
          )}
        </div>
      )}
    </div>
  );
}
