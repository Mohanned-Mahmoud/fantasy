"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, getUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import PitchView from "@/components/PitchView";
import api, { LeaderboardEntry, Player, Gameweek } from "@/lib/api";

export default function LeaderboardPage() {
  const router = useRouter();
  const user = getUser();
  
  // States الليدربورد الأساسية
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States البوب-أب والتشكيلات
  const [players, setPlayers] = useState<Player[]>([]);
  const [finishedGWs, setFinishedGWs] = useState<Gameweek[]>([]);
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [viewedGWId, setViewedGWId] = useState<number | null>(null);
  const [managerTeam, setManagerTeam] = useState<any>(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamError, setTeamError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      const [lbRes, plRes, gwRes] = await Promise.all([
        api.get("/leaderboard/global"),
        api.get("/players/"),
        api.get("/gameweeks/")
      ]);
      
      setEntries(lbRes.data);
      setPlayers(plRes.data);
      
      // بنفلتر الجولات وبناخد اللي خلصت بس
      const pastGws = gwRes.data.filter((g: Gameweek) => g.is_finished);
      setFinishedGWs(pastGws);
      
      // بنخلي الجولة الديفولت هي أحدث جولة خلصت
      if (pastGws.length > 0) {
        const latest = pastGws.sort((a: Gameweek, b: Gameweek) => b.number - a.number)[0];
        setViewedGWId(latest.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Effect لجلب تشكيلة المدرب لما نفتح البوب-أب أو نغير الجولة
  useEffect(() => {
    if (selectedManager && viewedGWId) {
      fetchManagerTeam(selectedManager, viewedGWId);
    }
  }, [selectedManager, viewedGWId]);

  async function fetchManagerTeam(username: string, gwId: number) {
    setLoadingTeam(true);
    setTeamError("");
    setManagerTeam(null);
    try {
      const res = await api.get(`/teams/user/${username}/gameweek/${gwId}`);
      if (res.data && res.data.player1_id) {
        setManagerTeam(res.data);
      } else {
        setTeamError("This manager hasn't selected a team for this gameweek 🤷‍♂️");
      }
    } catch (err: any) {
      setTeamError(err.response?.data?.detail || "Error fetching team data");
    } finally {
      setLoadingTeam(false);
    }
  }

  // تجميع اللعيبة عشان يترسموا في الملعب
  const pitchPlayers = [];
  if (managerTeam) {
    const ids = [managerTeam.player1_id, managerTeam.player2_id, managerTeam.player3_id, managerTeam.player4_id, managerTeam.player5_id].filter(Boolean);
    for (const id of ids) {
      const p = players.find(x => x.id === id);
      if (p) {
        pitchPlayers.push({ player: p, isCaptain: p.id === managerTeam.captain_id });
      }
    }
  }

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen relative" style={{ background: "var(--background)" }}>
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
                    onClick={() => setSelectedManager(entry.manager_name)}
                    className="card p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                    style={isMe ? { border: "2px solid rgba(56,255,126,0.85)", background: "rgba(56,255,126,0.08)", boxShadow: "0 0 0 2px rgba(56,255,126,0.15), 0 0 18px rgba(56,255,126,0.18)" } : {}}
                  >
                    <div className="w-10 text-center">
                      {entry.rank <= 3 ? (
                        <span className="text-2xl">{medals[entry.rank - 1]}</span>
                      ) : (
                        <span className="text-sm font-bold" style={{ color: "var(--muted)" }}>#{entry.rank}</span>
                      )}
                    </div>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
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
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <div className="font-black text-lg gradient-text">{entry.total_points}</div>
                        <div className="text-xs" style={{ color: "var(--muted)" }}>pts</div>
                      </div>
                      <span className="text-xs opacity-50">👁️</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* بوب-أب عرض التشكيلة */}
      {selectedManager && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setSelectedManager(null)}
        >
          <div 
            className="bg-[#12121a] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedManager(null)} 
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold mb-1">{selectedManager}'s Squad</h2>
            
            {/* اختيار الجولات المنتهية فقط */}
            <div className="mt-4 mb-6">
              <label className="text-xs text-gray-400 font-semibold mb-1 block">Past Gameweeks:</label>
              {finishedGWs.length === 0 ? (
                <div className="text-sm text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 p-2 rounded">
                  No finished gameweeks yet. Check back after the first gameweek concludes! ⏳
                </div>
              ) : (
                <select 
                  className="w-full bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-white font-bold outline-none cursor-pointer"
                  value={viewedGWId || ""}
                  onChange={(e) => setViewedGWId(parseInt(e.target.value))}
                >
                  {finishedGWs.map(gw => (
                    <option key={gw.id} value={gw.id}>
                      GW {gw.number} - {gw.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {loadingTeam ? (
                <div className="text-center py-10 text-gray-400 animate-pulse">Loading the team data... ⏳</div>
              ) : teamError ? (
                <div className="text-center py-10 text-red-400 bg-red-400/10 rounded-xl border border-red-400/20">
                  {teamError}
                </div>
              ) : managerTeam ? (
                <div>
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl mb-4 text-sm">
                    <span className="text-gray-400">GW Points:</span>
                    <span className="font-black text-[var(--primary)] text-lg">{managerTeam.gameweek_points}</span>
                  </div>
                  
                  {/* عرض التشكيلة في الملعب */}
                  <PitchView players={pitchPlayers} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
