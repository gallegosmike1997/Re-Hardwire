#!/bin/bash
# Re‑Hardwire Frontend Scaffold Script
# Creates Next.js + Capacitor structure

# Root folder
mkdir -p ~/Re-Hardwire/frontend
cd ~/Re-Hardwire/frontend

# App router pages
mkdir -p app/{chat,success,protocol,lab,account,dev,api}
touch app/layout.tsx app/page.tsx
touch app/chat/page.tsx app/success/page.tsx app/protocol/page.tsx app/lab/page.tsx app/account/page.tsx app/dev/page.tsx

# Components
mkdir -p components/{ui,layout,chat,success,protocol,lab,account,dev}
touch components/layout/{Header.tsx,Sidebar.tsx,AppShell.tsx}
touch components/chat/{ChatMessage.tsx,ChatInput.tsx,ConversationList.tsx}
touch components/success/{ProgressRing.tsx,WinsList.tsx}
touch components/protocol/ProtocolSlider.tsx
touch components/lab/RouteGraph.tsx
touch components/account/PermissionsToggle.tsx
touch components/dev/SystemStatusCard.tsx

# Libraries and state
mkdir -p lib state
touch lib/{api.ts,routing.ts,storage.ts,config.ts}
touch state/{useChatStore.ts,useProfileStore.ts,useProtocolStore.ts,useSystemStore.ts}

# Public assets
mkdir -p public/icons
touch public/logo.svg

# Capacitor config
touch capacitor.config.ts

# Config files
touch package.json tsconfig.json tailwind.config.js

echo "✅ Re‑Hardwire frontend scaffold created successfully."
