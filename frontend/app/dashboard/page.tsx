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
  const [votingGW, setVotingGW] = useState<Gameweek | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [highlights, setHighlights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // States for controlling gameweek navigation (arrow controls)
  const [allGWs, setAllGWs] = useState<Gameweek[]>([]);
  const [availableTeamGWs, setAvailableTeamGWs] = useState<TeamGW[]>([]);
  const [currentViewIndex, setCurrentViewIndex] = useState<number>(0);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    loadData();
  }, []);

  async function loadData() {
    try {
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
      setAllGWs(allGwsRes.data);

      const openVotingGW = allGwsRes.data.find((gw: Gameweek) => gw.is_voting_open);
      setVotingGW(openVotingGW || null);

      // Collect previous gameweeks history
      let fetchedHistory = historyRes.data || [];
      let currentTGW = null;

      // If there is an active gameweek, fetch your lineup for it and include it in history
      if (gwRes.data) {
        try {
          const tgwRes = await api.get(`/teams/my/gameweek/${gwRes.data.id}`);
          if (tgwRes.data) {
            currentTGW = tgwRes.data;
          }
        } catch {}
      }

      // Merge historical gameweeks with current gameweek so arrows can navigate all
      let combined = [...fetchedHistory];
      if (currentTGW && !combined.find((x: any) => x.gameweek_id === currentTGW.gameweek_id)) {
        combined.push(currentTGW);
      }

      // Sort gameweeks from oldest to newest based on gameweek id
      combined.sort((a: any, b: any) => (a.gameweek_id || 0) - (b.gameweek_id || 0));
      setAvailableTeamGWs(combined);
      
      // Default to the latest gameweek view (last item in the array)
      if (combined.length > 0) {
        setCurrentViewIndex(combined.length - 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Resolve currently viewed gameweek based on arrow index
  const teamGW = availableTeamGWs[currentViewIndex] || null;
  const viewedGWInfo = allGWs.find(g => g.id === teamGW?.gameweek_id) || activeGW;

  // Get players for the lineup shown in the currently viewed gameweek
  function getSelectedPlayers() {
    if (!teamGW) return [];
    const ids = [teamGW.player1_id, teamGW.player2_id, teamGW.player3_id, teamGW.player4_id, teamGW.player5_id].filter(Boolean) as number[];
    return ids.map((id) => {
      const p = players.find((pl) => pl.id === id);
      return p ? { player: p, isCaptain: id === teamGW.captain_id } : null;
    }).filter(Boolean) as { player: Player; isCaptain: boolean }[];
  }

  const selectedPlayers = getSelectedPlayers();

  // Arrow navigation handlers
  function handlePrevGW() {
    setCurrentViewIndex(prev => Math.max(0, prev - 1));
  }
  function handleNextGW() {
    setCurrentViewIndex(prev => Math.min(availableTeamGWs.length - 1, prev + 1));
  }

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
                
                {/* ── Gameweek points card + navigation arrows + vote button ── */}
                <div className="card p-4 flex flex-col justify-between relative transition-all">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-xs font-bold tracking-wider" style={{ color: "var(--muted)" }}>
                        {viewedGWInfo ? `${viewedGWInfo.name.toUpperCase()} POINTS` : "GAMEWEEK POINTS"}
                      </div>
                      
                      {/* Navigation arrows between gameweeks */}
                      {availableTeamGWs.length > 1 && (
                        <div className="flex gap-1 bg-[#1a1a24] p-1 rounded-lg border border-white/5">
                          <button 
                            onClick={handlePrevGW}
                            disabled={currentViewIndex === 0}
                            className="w-7 h-7 flex items-center justify-center rounded bg-[#2a2a3a] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all text-[10px]"
                            title="Previous gameweek"
                          >
                            ◀
                          </button>
                          <button 
                            onClick={handleNextGW}
                            disabled={currentViewIndex === availableTeamGWs.length - 1}
                            className="w-7 h-7 flex items-center justify-center rounded bg-[#2a2a3a] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all text-[10px]"
                            title="Next gameweek"
                          >
                            ▶
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-4xl font-black transition-all" style={{ color: "#7c3aed" }}>
                      {teamGW?.gameweek_points ?? 0}
                    </div>
                    {(teamGW?.transfer_penalty ?? 0) > 0 && (
                      <div className="text-xs text-red-400 mt-1">-{teamGW?.transfer_penalty} transfer penalty</div>
                    )}
                  </div>
                  
                  {/* Vote button is shown only when voting is open by admin */}
                  {votingGW && (
                    <button
                      onClick={() => router.push("/vote")}
                      className="mt-4 w-full py-2.5 rounded-xl font-bold text-sm transition-all animate-pulse shadow-[0_0_15px_rgba(250,204,21,0.15)] hover:scale-[1.02]"
                      style={{ background: "rgba(250,204,21,0.15)", color: "#facc15", border: "1px solid rgba(250,204,21,0.3)" }}
                    >
                      🗳️ MVP voting is open now!
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
                <div className="card p-4 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold">Your Pitch</h2>
                      {viewedGWInfo && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-white/5 text-gray-400 border border-white/10 uppercase tracking-widest">
                          {viewedGWInfo.name}
                        </span>
                      )}
                    </div>
                    {team?.name && (
                      <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(56,255,126,0.1)", color: "var(--primary)" }}>
                        {team.name}
                      </span>
                    )}
                  </div>
                  
                  {/* Pitch view updates dynamically based on selected gameweek */}
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