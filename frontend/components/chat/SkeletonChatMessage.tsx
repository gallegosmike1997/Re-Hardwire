'use client';

import { cn } from '@/lib/utils';

interface SkeletonChatMessageProps {
  isStreaming?: boolean;
}

export function SkeletonChatMessage({ isStreaming = true }: SkeletonChatMessageProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        'rounded-xl border border-white/[0.06] bg-panelsoft/40 p-3',
        'animate-pulse/50',
        'max-w-fit'
      )}
    >
      <div className='h-10 w-14 rounded-bl-lg bg-panel/20' />
      <div className='flex items-start gap-3'>
        <div className='flex-1'>
          <div className='h-6 w-64 rounded-bg bg-panel/20 rounded-b-lg' />
          <div className='h-4 w-48 rounded-bg bg-panel/20 mb-1' />
          <div className='h-3 w-36 rounded-bg bg-panel/20' />
        </div>
        <div className='flex-1'>
          <div className='h-5 w-40 rounded-bg bg-panel/20 mb-1.5' />
          <div className='h-4 w-50 rounded-bg bg-panel/20' />
        </div>
      </div>
    </div>
  );
}