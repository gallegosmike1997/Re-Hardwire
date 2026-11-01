/**
 * Forget Chat Modal — Week 54: Persistent Session Memory
 *
 * Allows users to delete a saved chat summary from local memory.
 */
import { createPortal } from 'react-dom';
import { removeMemory, type MemoryEntry } from '@/lib/sessionMemory';

interface ForgetChatModalProps {
  entry: MemoryEntry;
  onClose: () => void;
  onForgotten: () => void;
}

export function ForgetChatModal({ entry, onClose, onForgotten }: ForgetChatModalProps) {
  const confirmForget = () => {
    removeMemory(entry.id);
    onForgotten();
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/[0.4] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-edge bg-panelpane p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-100">Forget this chat?</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">
          This will permanently remove the saved summary of this conversation
          from local storage. This action cannot be undone.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={confirmForget}
            className="rounded-lg border border-alarm/30 bg-alarm/10 px-4 py-2 text-sm font-medium text-alarm hover:bg-alarm/20"
          >
            Yes, forget it
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-edgesoft bg-panelsoft px-4 py-2 text-sm font-medium text-slate-300 hover:bg-panelsoft/80"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
