'use client';

import { useEffect } from 'react';
import { formatTime, humanize } from '@/lib/format';
import { Badge, Icon, toneForAction, toneForState } from '@/components/ui';
import type { LLMMessage } from '@/lib/api';
import type { RouteResponse } from '@/lib/api';

export interface ChatMessageProps {
  message: LLMMessage;
  /** Routing decision attached to the assistant turn that followed it. */
  route?: RouteResponse | null;
  isStreaming?: boolean;
}

export function ChatMessage({ message, route, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <article
      className={['flex w-full gap-3', isUser ? 'flex-row-reverse' : 'flex-row'].join(' ')}
    >
      <span
        className={[
          'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border',
          isUser
            ? 'border-signal-500/30 bg-signal-500/10 text-signal-300'
            : 'border-pulse-500/30 bg-pulse-500/10 text-pulse-300',
        ].join(' ')}
        aria-hidden="true"
      >
        <Icon name={isUser ? 'person' : 'shield'} size={14} />
      </span>

      <div className={['min-w-0 max-w-[85%]', isUser ? 'items-end text-right' : ''].join(' ')}>
        <div
          className={[
            'rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'border-signal-500/25 bg-signal-500/8 text-slate-100'
              : 'border-edge bg-panel/70 text-slate-200',
          ].join(' ')}
        >
          {message.content.split('\n\n').map((block, index) => (
            <p key={index} className={index > 0 ? 'mt-2.5' : undefined}>
              {block}
            </p>
          ))}
          {isStreaming && (
            <span
              className="ml-0.5 inline-block h-3.5 w-[3px] animate-blink rounded-sm bg-signal-400 align-middle"
              aria-hidden="true"
            />
          )}
        </div>

        {!isUser && route && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge tone="signal">{route.protocol}</Badge>
            <Badge tone={toneForState(route.emotionalState)}>
              {humanize(route.emotionalState)}
            </Badge>
            <Badge tone={toneForAction(route.nextAction)}>
              {humanize(route.nextAction)}
            </Badge>
            <span className="font-mono text-[10px] text-slate-600">
              {Math.round(route.confidence * 100)}%
            </span>
          </div>
        )}

        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-600">
          {formatTime(message.created_at)}
        </p>
      </div>
    </article>
  );
}

export interface TypingIndicatorProps {
  label?: string;
}

export function TypingIndicator({ label = 'Routing your turn…' }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-pulse-500/30 bg-pulse-500/10 text-pulse-300"
        aria-hidden="true"
      >
        <Icon name="shield" size={14} />
      </span>
      <span className="flex items-center gap-2 rounded-xl border border-edge bg-panel/70 px-3.5 py-2.5">
        <span className="flex gap-1" aria-hidden="true">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="h-1.5 w-1.5 animate-blink rounded-full bg-slate-500"
              style={{ animationDelay: `${dot * 160}ms` }}
            />
          ))}
        </span>
        <span className="text-xs text-slate-500">{label}</span>
      </span>
    </div>
  );
}

/** Re-exported so pages can render a route chip on its own. */
export interface RouteChipProps {
  route: RouteResponse;
}

export function RouteChip({ route }: RouteChipProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(JSON.stringify(route, null, 2)).then(() => {
          setCopied(true);
        });
      }}
      className="hw-focus rounded-md"
      title="Copy routing decision as JSON"
    >
      <Badge tone={copied ? 'win' : 'neutral'}>
        {copied ? 'Copied' : `${route.protocol} · ${Math.round(route.confidence * 100)}%`}
      </Badge>
    </button>
  );
}

import { useState } from 'react';