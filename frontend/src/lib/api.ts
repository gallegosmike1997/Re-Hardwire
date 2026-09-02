const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Message {
  role: "user" | "assistant";
  content: string;
  ts?: number;
  routing_details?: {
    protocol: string;
    reason: string;
    score: number;
  };
}

export interface Profile {
  name: string;
  thoughts: string[];
  feelings: string[];
  goals: string;
  hobbies: string[];
  loc_permission?: boolean;
}

export interface RoutingResult {
  protocol: string;
  reason: string;
  score: number;
}

export interface UserState {
  active_state: string;
  auto_routing: boolean;
  routing_weights: {
    semantic: number;
    keyword: number;
    recency: number;
    user_pref: number;
  };
}

export async function fetchHistory(): Promise<Message[]> {
  const res = await fetch(API_BASE + "/api/history");
  const data = await res.json();
  return data.history;
}

export async function clearHistory(): Promise<void> {
  await fetch(API_BASE + "/api/history", { method: "DELETE" });
}

export async function fetchProfile(): Promise<Profile> {
  const res = await fetch(API_BASE + "/api/profile");
  const data = await res.json();
  return data.profile;
}

export async function updateProfile(profile: Partial<Profile>): Promise<Profile> {
  const res = await fetch(API_BASE + "/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  const data = await res.json();
  return data.profile;
}

export async function testRoute(text: string): Promise<RoutingResult> {
  const res = await fetch(API_BASE + "/api/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return res.json();
}

export async function fetchState(): Promise<UserState> {
  const res = await fetch(API_BASE + "/api/state");
  return res.json();
}

export async function updateWeights(weights: {
  semantic?: number;
  keyword?: number;
  recency?: number;
  user_pref?: number;
}) {
  const res = await fetch(API_BASE + "/api/weights", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(weights),
  });
  return res.json();
}

export async function sendChatMessage(
  message: string,
  onRouting: (r: RoutingResult) => void,
  onToken: (token: string) => void,
  onDone: (protocol: string) => void,
  onError: (err: string) => void
): Promise<void> {
  const res = await fetch(API_BASE + "/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.body) { onError("No response stream"); return; }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(String.fromCharCode(10) + String.fromCharCode(10));
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const payload = JSON.parse(line.slice(6));
          if (payload.type === "routing") onRouting(payload.data);
          else if (payload.type === "token") onToken(payload.data);
          else if (payload.type === "done") onDone(payload.data.protocol);
          else if (payload.type === "error") onError(payload.data);
        } catch (e) {}
      }
    }
  }
}
