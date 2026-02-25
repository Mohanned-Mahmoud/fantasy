"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, getUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import api, { LeaderboardEntry } from "@/lib/api";

export default function LeaderboardPage() {
  const router = useRouter();
  const user = getUser();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    api.get("/leaderboard/global").then((r) => setEntries(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Navbar />
      <main className="md:ml-60 pb-20 md:pb-0 px-4 md:px-8 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">🏆 Global Leaderboard</h1>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Top fantasy managers this season</p>
          </div>

          {loading ? (
            <div className="text-center py-20" style={{ color: "var(--muted)" }}>Loading...</div>
          ) : entries.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="text-4xl mb-3">🏆</div>
              <div className="font-medium">No managers yet</div>
              <div className="text-sm mt-1" style={{ color: "var(--muted)" }}>Be the first to join!</div>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => {
                const isMe = entry.manager_name === user?.username;
                return (
                  <div
                    key={entry.rank}
                    className="card p-4 flex items-center gap-4"
                    style={isMe ? { border: "1px solid rgba(56,255,126,0.4)", background: "rgba(56,255,126,0.05)" } : {}}
                  >
                    <div className="w-10 text-center">
                      {entry.rank <= 3 ? (
                        <span className="text-2xl">{medals[entry.rank - 1]}</span>
                      ) : (
                        <span className="text-sm font-bold" style={{ color: "var(--muted)" }}>#{entry.rank}</span>
                      )}
                    </div>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{ background: isMe ? "var(--primary)" : "#2a2a3a", color: isMe ? "#0f0f13" : "var(--foreground)" }}
                    >
                      {entry.manager_name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate flex items-center gap-2">
                        {entry.manager_name}
                        {isMe && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(56,255,126,0.2)", color: "var(--primary)" }}>You</span>}
                      </div>
                      <div className="text-xs truncate" style={{ color: "var(--muted)" }}>{entry.team_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-lg gradient-text">{entry.total_points}</div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>pts</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
