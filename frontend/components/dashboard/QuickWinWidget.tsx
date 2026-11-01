'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useSuccessStore } from '@/state/useSuccessStore';

export function QuickWinWidget() {
  const [text, setText] = useState('');
  const [logged, setLogged] = useState(false);
  const addWin = useSuccessStore((s) => s.addWin);
  const streak = useSuccessStore((s) => s.streak());

  const handleLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addWin(text.trim());
    setText('');
    setLogged(true);
    setTimeout(() => setLogged(false), 3000);
  };

  return (
    <Card
      title="Anchor a micro-win"
      subtitle={streak > 0 ? `🔥 ${streak}-day consistency streak active` : 'Capture a small moment that mattered today.'}
      glow
    >
      <form onSubmit={handleLog} className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. I took a pause before reacting..."
            required
          />
          <Button type="submit" variant="primary" size="md">
            Log
          </Button>
        </div>
        {logged && (
          <div className="flex items-center gap-2">
            <Badge tone="win">Win recorded successfully!</Badge>
          </div>
        )}
      </form>
    </Card>
  );
}
