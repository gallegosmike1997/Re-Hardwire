'use client';

import { Badge, Card, Icon, Progress, toneForAction, toneForState } from '@/components/ui';
import { formatPercent, humanize } from '@/lib/format';
import type { RouteResponse } from '@/lib/api';

export interface RouteInspectorProps {
  route: RouteResponse | null;
  /** Levels from the protocol catalogue, used to place the decision on the ladder. */
  levels?: number;
  title?: string;
}

const ACTIONS = [
  'ground_and_reset',
  'reduce_load',
  'continue_protocol',
  'log_micro_win',
  'reflect_and_reframe',
  'escalate_support',
];

/**
 * Read-only view of the engine's routing decision.
 *
 * Shared by Chat, the Lab and the Dev dashboards so the reasoning is presented
 * identically everywhere it appears.
 */
export function RouteInspector({
  route,
  levels = 5,
  title = 'Routing decision',
}: RouteInspectorProps) {
  if (!route) {
    return (
      <Card title={title} subtitle="Nothing routed yet">
        <p className="flex items-center gap-2 text-xs text-slate-600">
          <Icon name="activity" size={14} />
          Send a message to see the engine&apos;s read.
        </p>
      </Card>
    );
  }

  const levelMatch = /Level\s*(\d)/i.exec(route.protocol);
  const level = levelMatch ? Number(levelMatch[1]) : null;
  const ladder = level ? Math.min(1, Math.max(0, (level - 1) / Math.max(1, levels - 1))) : null;

  return (
    <Card
      title={title}
      subtitle={route.protocol}
      action={<Badge tone="signal">{formatPercent(route.confidence)}</Badge>}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={toneForState(route.emotionalState)}>
            {humanize(route.emotionalState)}
          </Badge>
          <Badge tone={toneForAction(route.nextAction)}>{humanize(route.nextAction)}</Badge>
        </div>

        {ladder !== null && (
          <Progress
            value={ladder}
            tone="pulse"
            label={`Ladder position · Level ${level}`}
            showValue={false}
          />
        )}

        <Progress value={route.confidence} tone="signal" label="Confidence" showValue />

        <div>
          <p className="hw-label mb-2">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {route.tags.length ? (
              route.tags.map((tag) => (
                <Badge key={tag} tone="neutral">
                  {tag}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-slate-600">No tags emitted</span>
            )}
          </div>
        </div>

        <div>
          <p className="hw-label mb-2">Action ranking</p>
          <ul className="space-y-1">
            {ACTIONS.map((action) => {
              const isChosen = action === route.nextAction;
              return (
                <li
                  key={action}
                  className={[
                    'flex items-center justify-between gap-2 rounded-md px-2 py-1 text-xs',
                    isChosen ? 'bg-signal-500/10 text-signal-200' : 'text-slate-600',
                  ].join(' ')}
                >
                  <span className="font-mono text-[11px]">{action}</span>
                  {isChosen && <Icon name="check" size={13} />}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Card>
  );
}

export default RouteInspector;