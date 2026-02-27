"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, getUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import PitchView from "@/components/PitchView";
import api, { Player, FantasyTeam, Gameweek } from "@/lib/api";

interface TeamGW {
  player1_id?: number;
  player2_id?: number;
  player3_id?: number;
  player4_id?: number;
  player5_id?: number;
  captain_id?: number;
  gameweek_points: number;
  transfer_penalty: number;
  gameweek_id?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const user = typeof window !== "undefined" ? getUser() : null;
  const [team, setTeam] = useState<FantasyTeam | null>(null);
  const [activeGW, setActiveGW] = useState<Gameweek | null>(null);
  const [votingGW, setVotingGW] = useState<Gameweek | null>(null); // State جديدة عشان نعرف لو فيه تصويت مفتوح
  const [teamGW, setTeamGW] = useState<TeamGW | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [highlights, setHighlights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    loadData();
  }, []);

  async function loadData() {
    try {
      // ضفنا طلب جديد يجيب كل الجولات عشان ندور فيهم على جولة التصويت بتاعها مفتوح
      const [teamRes, gwRes, playersRes, historyRes, highlightsRes, allGwsRes] = await Promise.all([
        api.get("/teams/my"),
        api.get("/gameweeks/active"),
        api.get("/players/"),
        api.get("/teams/my/history").catch(() => ({ data: [] })),
        api.get("/stats/dashboard-highlights").catch(() => ({ data: { show: false } })),
        api.get("/gameweeks/").catch(() => ({ data: [] }))
      ]);
      
      setTeam(teamRes.data);
      setActiveGW(gwRes.data);
      setPlayers(playersRes.data);
      setHighlights(highlightsRes.data);

      // بندور على أي جولة الأدمن فاتح فيها التصويت
      const openVotingGW = allGwsRes.data.find((gw: Gameweek) => gw.is_voting_open);
      setVotingGW(openVotingGW || null);

      if (gwRes.data) {
        try {
          const tgwRes = await api.get(`/teams/my/gameweek/${gwRes.data.id}`);
          if (tgwRes.data) {
            setTeamGW(tgwRes.data);
          } else {
            setLatestHistoryGW(historyRes.data);
          }
        } catch {
          setLatestHistoryGW(historyRes.data);
        }
      } else {
        setLatestHistoryGW(historyRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function setLatestHistoryGW(historyData: TeamGW[]) {
    if (historyData && historyData.length > 0) {
      const sortedHistory = historyData.sort((a, b) => (b.gameweek_id || 0) - (a.gameweek_id || 0));
      setTeamGW(sortedHistory[0]);
    }
  }

  function getSelectedPlayers() {
    if (!teamGW) return [];
    const ids = [teamGW.player1_id, teamGW.player2_id, teamGW.player3_id, teamGW.player4_id, teamGW.player5_id].filter(Boolean) as number[];
    return ids.map((id) => {
      const p = players.find((pl) => pl.id === id);
      return p ? { player: p, isCaptain: id === teamGW.captain_id } : null;
    }).filter(Boolean) as { player: Player; isCaptain: boolean }[];
  }

  const selectedPlayers = getSelectedPlayers();

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Navbar />
      <main className="md:ml-60 pb-20 md:pb-0 px-4 md:px-8 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Welcome back, <span className="gradient-text">{user?.username}</span> 👋</h1>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              {activeGW ? `${activeGW.name} is active` : "No gameweek currently active"}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="text-4xl mb-3 animate-pulse">⚽</div>
                <div style={{ color: "var(--muted)" }}>Loading your dashboard...</div>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="card p-4">
                  <div className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>TOTAL POINTS</div>
                  <div className="text-4xl font-black gradient-text">{team?.total_points ?? 0}</div>
                </div>
                
                {/* ── كارت بوينتات الجولة + زرار التصويت ── */}
                <div className="card p-4 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>
                      {activeGW ? "GAMEWEEK POINTS" : "LAST GAMEWEEK POINTS"}
                    </div>
                    <div className="text-4xl font-black" style={{ color: "#7c3aed" }}>{teamGW?.gameweek_points ?? 0}</div>
                    {(teamGW?.transfer_penalty ?? 0) > 0 && (
                      <div className="text-xs text-red-400 mt-1">-{teamGW?.transfer_penalty} transfer penalty</div>
                    )}
                  </div>
                  
                  {/* زرار التصويت بيظهر بس لو الأدمن فاتح التصويت */}
                  {votingGW && (
                    <button
                      onClick={() => router.push("/vote")}
                      className="mt-4 w-full py-2.5 rounded-xl font-bold text-sm transition-all animate-pulse shadow-[0_0_15px_rgba(250,204,21,0.15)] hover:scale-[1.02]"
                      style={{ background: "rgba(250,204,21,0.15)", color: "#facc15", border: "1px solid rgba(250,204,21,0.3)" }}
                    >
                      🗳️ تصويت الـ MVP متاح الآن!
                    </button>
                  )}
                </div>

                <div className="card p-4">
                  <div className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>BUDGET</div>
                  <div className="text-3xl font-black text-yellow-400">£{team?.budget_remaining?.toFixed(1)}M</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>FREE TRANSFERS</div>
                  <div className="text-3xl font-black text-blue-400">{team?.free_transfers ?? 1}</div>
                </div>
                <button
                  onClick={() => router.push("/squad")}
                  className="btn-primary w-full py-3 text-center block text-sm"
                >
                  {selectedPlayers.length > 0 ? "Edit Squad →" : "Pick Your Squad →"}
                </button>
              </div>

              <div className="md:col-span-2">
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold">Your Pitch</h2>
                    {team?.name && (
                      <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(56,255,126,0.1)", color: "var(--primary)" }}>
                        {team.name}
                      </span>
                    )}
                  </div>
                  <PitchView players={selectedPlayers} />
                </div>
              </div>

              {/* ── HIGHLIGHTS WIDGETS ── */}
              {highlights?.show && (
                <div className="grid md:grid-cols-2 gap-6 mt-2 md:col-span-3">
                  
                  {/* Most Owned */}
                  {highlights.top_owned?.length > 0 && (
                    <div className="card p-4">
                      <h3 className="font-bold mb-3 flex items-center gap-2">🔥 Most Owned</h3>
                      <div className="space-y-3">
                        {highlights.top_owned.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "#1a1a24" }}>
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                              <img src={item.player.image_url} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-sm">{item.player.name}</div>
                              <div className="text-xs" style={{ color: "var(--muted)" }}>{item.player.team_name}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-black text-blue-400">{item.ownership_percent}%</div>
                              <div className="text-[10px]" style={{ color: "var(--muted)" }}>TSB</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Scorers Last GW */}
                  {highlights.top_scorers?.length > 0 && (
                    <div className="card p-4">
                      <h3 className="font-bold mb-3 flex items-center gap-2">⭐ Top Scorers <span className="text-xs font-normal" style={{color: "var(--muted)"}}>({highlights.last_gw_name})</span></h3>
                      <div className="space-y-3">
                        {highlights.top_scorers.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "#1a1a24" }}>
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                              <img src={item.player.image_url} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-sm">{item.player.name}</div>
                              <div className="text-xs" style={{ color: "var(--muted)" }}>{item.player.position}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-black gradient-text">{item.points}</div>
                              <div className="text-[10px]" style={{ color: "var(--muted)" }}>pts</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                </div>
              )}

            </div>
          )}
        </div>
      </main>
    </div>
  );
}