"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import PitchView from "@/components/PitchView";
import api, { Player, FantasyTeam, Gameweek } from "@/lib/api";

const BUDGET = 50.0;
const posColors: Record<string, string> = {
  GK: "#f59e0b", DEF: "#3b82f6", MID: "#8b5cf6", ATT: "#ef4444",
};

export default function SquadPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [team, setTeam] = useState<FantasyTeam | null>(null);
  
  // States الجديدة للجولات
  const [allGWs, setAllGWs] = useState<Gameweek[]>([]);
  const [activeGW, setActiveGW] = useState<Gameweek | null>(null);
  const [viewedGW, setViewedGW] = useState<Gameweek | null>(null);
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [captainId, setCaptainId] = useState<number | null>(null);
  const [filterPos, setFilterPos] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // States البوب-أب
  const [infoPlayer, setInfoPlayer] = useState<Player | null>(null);
  const [playerBreakdown, setPlayerBreakdown] = useState<Record<string, number> | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  // حالة بتحدد إذا كان مسموح التعديل ولا لأ
  const canEdit = viewedGW?.id === activeGW?.id && activeGW !== null;

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    loadData();
  }, []);

  async function loadData() {
    try {
      // 1. هنجيب كل الجولات مش الأكتيف بس
      const [playersRes, teamRes, gwsRes] = await Promise.all([
        api.get("/players/"),
        api.get("/teams/my"),
        api.get("/gameweeks/"),
      ]);
      
      setPlayers(playersRes.data);
      setTeam(teamRes.data);
      
      const gws: Gameweek[] = gwsRes.data;
      setAllGWs(gws);
      
      const active = gws.find(g => g.is_active) || null;
      setActiveGW(active);
      
      // هنعرض الجولة الحالية، لو مفيش هنعرض أحدث جولة خلصت
      const initialGW = active || gws[gws.length - 1] || null;
      setViewedGW(initialGW);

      if (initialGW) {
        await fetchSquadForGW(initialGW.id, teamRes.data, active?.id === initialGW.id);
      }
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  }

  // دالة بتجيب تشكيلة اليوزر في جولة معينة
  async function fetchSquadForGW(gwId: number, baseTeam: any, isActiveGW: boolean) {
    try {
      const res = await api.get(`/teams/my/gameweek/${gwId}`);
      if (res.data && res.data.player1_id) {
        const ids = [res.data.player1_id, res.data.player2_id, res.data.player3_id, res.data.player4_id, res.data.player5_id].filter(Boolean);
        setSelectedIds(ids);
        setCaptainId(res.data.captain_id);
      } else if (isActiveGW && baseTeam) {
        const ids = [baseTeam.player1_id, baseTeam.player2_id, baseTeam.player3_id, baseTeam.player4_id, baseTeam.player5_id].filter(Boolean);
        setSelectedIds(ids);
        setCaptainId(baseTeam.captain_id);
      } else {
        setSelectedIds([]);
        setCaptainId(null);
      }
    } catch {
      if (isActiveGW && baseTeam) {
        const ids = [baseTeam.player1_id, baseTeam.player2_id, baseTeam.player3_id, baseTeam.player4_id, baseTeam.player5_id].filter(Boolean);
        setSelectedIds(ids);
        setCaptainId(baseTeam.captain_id);
      } else {
        setSelectedIds([]);
        setCaptainId(null);
      }
    }
  }

  // لما يغير الجولة من الـ Dropdown
  function handleGWChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const gwId = parseInt(e.target.value);
    const selected = allGWs.find(g => g.id === gwId) || null;
    setViewedGW(selected);
    setError(""); // شيل أي إيرور قديم
    setMessage("");
    
    if (selected) {
      fetchSquadForGW(selected.id, team, selected.id === activeGW?.id);
    }
  }

  const selectedPlayers = selectedIds.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[];
  const totalCost = selectedPlayers.reduce((s, p) => s + p.price, 0);
  const budgetLeft = BUDGET - totalCost;

  function togglePlayer(player: Player) {
    if (!canEdit) {
      setError("لا يمكنك تعديل التشكيلة في جولة سابقة أو منتهية 🔒");
      return;
    }

    if (selectedIds.includes(player.id)) {
      setSelectedIds((prev) => prev.filter((id) => id !== player.id));
      if (captainId === player.id) setCaptainId(null);
    } else {
      if (selectedIds.length >= 5) {
        setError("You can only select 5 players.");
        return;
      }
      if (totalCost + player.price > BUDGET) {
        setError("Not enough budget.");
        return;
      }
      setError("");
      setSelectedIds((prev) => [...prev, player.id]);
    }
  }

  function toggleCaptain(playerId: number) {
    if (!canEdit) return; // منع تغيير الكابتن في الجولات القديمة
    setCaptainId((prev) => (prev === playerId ? null : playerId));
  }

  async function saveSquad() {
    if (!canEdit) return;
    if (selectedIds.length !== 5) { setError("Select exactly 5 players."); return; }
    if (!captainId) { setError("Please select a captain."); return; }
    if (!activeGW) { setError("No active gameweek found."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const res = await api.post("/teams/my/select", {
        player_ids: selectedIds,
        captain_id: captainId,
        gameweek_id: activeGW.id,
      });
      setMessage(`Squad saved! Transfers: ${res.data.transfers_made}, Penalty: -${res.data.transfer_penalty}pts`);
      // تحديث الداتا الأساسية
      const teamRes = await api.get("/teams/my");
      setTeam(teamRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save squad");
    } finally {
      setSaving(false);
    }
  }

  async function handlePlayerClick(player: Player) {
    setInfoPlayer(player);
    setPlayerBreakdown(null); 
    
    // هنجيب نقط الجولة المعروضة (سواء قديمة أو جديدة)
    if (viewedGW) {
      setLoadingBreakdown(true);
      try {
        const res = await api.get(`/gameweeks/${viewedGW.id}/stats/${player.id}/breakdown`);
        setPlayerBreakdown(res.data);
      } catch (err) {
        setPlayerBreakdown({}); 
      } finally {
        setLoadingBreakdown(false);
      }
    }
  }

  const filteredPlayers = filterPos === "ALL" ? players : players.filter((p) => p.position === filterPos);
  const pitchPlayers = selectedPlayers.map((p) => ({ player: p, isCaptain: p.id === captainId }));

  return (
    <div className="min-h-screen relative" style={{ background: "var(--background)" }}>
      <Navbar />
      <main className="md:ml-60 pb-20 md:pb-0 px-4 md:px-8 py-6">
        <div className="max-w-5xl mx-auto">
          
          {/* الـ Header الجديد مع اختيار الجولة */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">👥 My Squad</h1>
              <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Select 5 players within £50M. Choose a captain (2x points).</p>
            </div>
            
            {/* Dropdown الجولات */}
            {allGWs.length > 0 && (
              <div className="flex items-center gap-2 bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-1.5 shadow-lg">
                <span className="text-sm font-semibold text-gray-400">Gameweek:</span>
                <select 
                  className="bg-transparent text-white font-bold outline-none cursor-pointer text-sm py-1"
                  value={viewedGW?.id || ""}
                  onChange={handleGWChange}
                >
                  {allGWs.map(gw => (
                    <option key={gw.id} value={gw.id} className="bg-[#1a1a24] text-white">
                      GW {gw.number} - {gw.name} {gw.id === activeGW?.id ? "(Active)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {message && (
            <div className="p-3 rounded-lg mb-4 text-sm" style={{ background: "rgba(56,255,126,0.1)", color: "var(--primary)", border: "1px solid rgba(56,255,126,0.2)" }}>
              {message}
            </div>
          )}
          {error && (
            <div className="p-3 rounded-lg mb-4 text-sm text-red-400" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-20" style={{ color: "var(--muted)" }}>Loading players...</div>
          ) : (
            <div className="grid md:grid-cols-5 gap-6">
              <div className="md:col-span-2">
                <div className="card p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-sm">Your Pitch</h2>
                    <span className="text-xs px-2 py-1 rounded" style={{ background: selectedIds.length === 5 ? "rgba(56,255,126,0.1)" : "rgba(239,68,68,0.1)", color: selectedIds.length === 5 ? "var(--primary)" : "#ef4444" }}>
                      {selectedIds.length}/5 players
                    </span>
                  </div>
                  
                  <PitchView 
                    players={pitchPlayers} 
                    onCaptainToggle={canEdit ? toggleCaptain : undefined} 
                    onPlayerClick={handlePlayerClick} 
                  />

                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span style={{ color: "var(--muted)" }}>Budget used</span>
                      <span className={totalCost > BUDGET ? "text-red-400 font-bold" : "font-bold"}>£{totalCost.toFixed(1)}M / £{BUDGET}M</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: "var(--muted)" }}>Remaining</span>
                      <span className="font-bold text-yellow-400">£{budgetLeft.toFixed(1)}M</span>
                    </div>
                    {captainId && (
                      <div className="flex justify-between text-sm">
                        <span style={{ color: "var(--muted)" }}>Captain</span>
                        <span className="font-bold text-blue-400">
                          {selectedPlayers.find((p) => p.id === captainId)?.name || "None"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* إخفاء زرار الحفظ وإظهار رسالة تحذير لو الجولة مقفولة */}
                  {canEdit ? (
                    <button
                      onClick={saveSquad}
                      disabled={saving || selectedIds.length !== 5 || !captainId}
                      className="btn-primary w-full py-3 mt-4 text-sm"
                      style={{ opacity: (saving || selectedIds.length !== 5 || !captainId) ? 0.5 : 1, cursor: (saving || selectedIds.length !== 5 || !captainId) ? "not-allowed" : "pointer" }}
                    >
                      {saving ? "Saving..." : "Save Squad"}
                    </button>
                  ) : (
                    <div className="mt-4 p-3 rounded-lg text-center text-xs font-semibold" style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                      🔒 Viewing past gameweek. Editing is disabled.
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-3">
                <div className="card p-4" style={{ opacity: canEdit ? 1 : 0.6 }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {["ALL", "GK", "DEF", "MID", "ATT"].map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setFilterPos(pos)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          style={{
                            background: filterPos === pos ? (posColors[pos] || "var(--primary)") : "#2a2a3a",
                            color: filterPos === pos ? "white" : "var(--muted)",
                          }}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                    {!canEdit && (
                       <span className="text-xs text-yellow-500 font-bold px-2">Read Only Mode</span>
                    )}
                  </div>

                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                    {filteredPlayers.length === 0 ? (
                      <div className="text-center py-8" style={{ color: "var(--muted)" }}>No players available.</div>
                    ) : filteredPlayers.map((player) => {
                      const isSelected = selectedIds.includes(player.id);
                      const isCap = captainId === player.id;
                      const canAfford = budgetLeft >= player.price || isSelected;
                      return (
                        <div
                          key={player.id}
                          className="flex items-center gap-3 p-3 rounded-lg transition-colors"
                          style={{
                            background: isSelected ? "rgba(56,255,126,0.08)" : "#1a1a24",
                            border: `1px solid ${isSelected ? "rgba(56,255,126,0.3)" : "var(--border)"}`,
                            opacity: (!canAfford && !isSelected) ? 0.5 : 1,
                            cursor: canEdit ? "pointer" : "default"
                          }}
                          onClick={() => canEdit && togglePlayer(player)}
                        >
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 overflow-hidden border border-white/10"
                            style={{ background: posColors[player.position] || "#6b7280" }}
                          >
                            {player.image_url ? (
                                <img src={player.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span>{player.position}</span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate flex items-center gap-2">
                              {player.name}
                              <span 
                                className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white uppercase tracking-wider"
                                style={{ background: posColors[player.position] || "#6b7280", border: "1px solid rgba(255,255,255,0.1)" }}
                              >
                                {player.position}
                              </span>
                              {isCap && (
                                <span className="text-xs px-1 rounded font-bold" style={{ background: "var(--primary)", color: "#0f0f13" }}>C</span>
                              )}
                            </div>
                            <div className="text-xs" style={{ color: "var(--muted)" }}>{player.team_name}</div>
                          </div>
                          
                          <div className="text-right flex-shrink-0 flex items-center gap-3">
                            <div>
                              <div className="text-sm font-bold text-yellow-400">£{player.price.toFixed(1)}M</div>
                              <div className="text-xs" style={{ color: "var(--muted)" }}>{player.total_points} pts</div>
                            </div>
                            
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePlayerClick(player); }}
                              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-sm"
                              title="Player Stats"
                            >
                              ℹ️
                            </button>

                            {isSelected && (
                              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-1" style={{ background: "var(--primary)" }}>
                                <span className="text-xs text-black font-bold">✓</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {infoPlayer && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" 
          onClick={() => setInfoPlayer(null)}
        >
          <div 
            className="bg-[#1a1a24] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative transform transition-all" 
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setInfoPlayer(null)} 
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              ✕
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div 
                className="w-16 h-16 rounded-full border-2 overflow-hidden flex-shrink-0 bg-[#2a2a3a]"
                style={{ borderColor: posColors[infoPlayer.position] || "#6b7280" }}
              >
                {infoPlayer.image_url ? (
                  <img src={infoPlayer.image_url} alt={infoPlayer.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-bold">{infoPlayer.position}</div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{infoPlayer.name}</h3>
                <div className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                  <span>{infoPlayer.team_name}</span>
                  <span>•</span>
                  <span style={{ color: posColors[infoPlayer.position] || "#fff" }}>{infoPlayer.position}</span>
                  <span>•</span>
                  <span className="text-yellow-400">£{infoPlayer.price}M</span>
                </div>
              </div>
            </div>

            <h4 className="font-semibold text-[var(--primary)] mb-3 border-b border-white/10 pb-2 flex justify-between">
              <span>GW {viewedGW?.number || "?"} Breakdown</span>
            </h4>

            {loadingBreakdown ? (
              <div className="text-center py-6 text-gray-400 animate-pulse">
               loading... ⏳
              </div>
            ) : playerBreakdown && Object.keys(playerBreakdown).length > 0 ? (
              <div className="space-y-2 mt-4">
                {Object.entries(playerBreakdown)
                  .filter(([k]) => k !== "Total")
                  .map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center text-sm bg-white/5 p-2 rounded">
                    <span className="text-gray-300">{key}</span>
                    <span className={`font-bold ${value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {value > 0 ? `+${value}` : value}
                    </span>
                  </div>
                ))}
                
                <div className="flex justify-between items-center text-lg font-black text-white pt-4 border-t border-white/10 mt-4">
                  <span>Total GW Points</span>
                  <span className="text-[var(--primary)]">{playerBreakdown["Total"] || 0} pts</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-white/5 rounded-xl mt-4 border border-white/5">
                <div className="text-3xl mb-2">🤷‍♂️</div>
                <div>There are no breakdown points for this player in the current gameweek.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}