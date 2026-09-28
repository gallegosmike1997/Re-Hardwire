import os
from pathlib import Path

base = str(Path(__file__).resolve().parent)
files = [
    'backend/app/main.py','backend/app/api/route.py','backend/app/api/llm.py','backend/app/api/tts.py','backend/app/api/history.py','backend/app/api/profile.py',
    'backend/app/core/routing/engine.py','backend/app/core/routing/models.py','backend/app/core/llm/client.py','backend/app/core/llm/prompts.py',
    'backend/app/core/tts/engine.py','backend/app/core/storage/history.py','backend/app/core/storage/profile.py','backend/app/core/config.py',
    'frontend/components/chat/ChatInput.tsx','frontend/components/chat/ChatMessage.tsx','frontend/components/chat/ConversationList.tsx',
    'frontend/components/protocol/ProtocolSlider.tsx','frontend/components/success/WinsList.tsx','frontend/components/success/ProgressRing.tsx',
    'frontend/components/dev/SystemStatusCard.tsx','frontend/components/lab/RouteGraph.tsx','frontend/components/account/PermissionsToggle.tsx',
    'frontend/components/layout/Header.tsx','frontend/components/layout/Sidebar.tsx','frontend/components/layout/AppShell.tsx',
    'frontend/lib/config.ts','frontend/lib/api.ts','frontend/lib/routing.ts','frontend/lib/storage.ts',
    'frontend/state/useChatStore.ts','frontend/state/useProtocolStore.ts','frontend/state/useSystemStore.ts','frontend/state/useProfileStore.ts',
    'frontend/app/layout.tsx','frontend/app/page.tsx','frontend/app/chat/page.tsx','frontend/app/protocol/page.tsx',
    'frontend/app/account/page.tsx','frontend/app/dev/page.tsx','frontend/app/lab/page.tsx','frontend/app/success/page.tsx',
]
for rel_path in files:
    full_path = os.path.join(base, rel_path)
    if os.path.exists(full_path):
        size = os.path.getsize(full_path)
        print(f'\n{
