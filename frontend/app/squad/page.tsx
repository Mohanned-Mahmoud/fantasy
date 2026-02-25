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
  const [activeGW, setActiveGW] = useState<Gameweek | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [captainId, setCaptainId] = useState<number | null>(null);
  const [filterPos, setFilterPos] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    loadData();
  }, []);

  async function loadData() {
    try {
      const [playersRes, teamRes, gwRes] = await Promise.all([
        api.get("/players/"),
        api.get("/teams/my"),
        api.get("/gameweeks/active"),
      ]);
      setPlayers(playersRes.data);
      setTeam(teamRes.data);
      setActiveGW(gwRes.data);

      if (gwRes.data) {
        try {
          const tgwRes = await api.get(`/teams/my/gameweek/${gwRes.data.id}`);
          if (tgwRes.data) {
            const ids = [tgwRes.data.player1_id, tgwRes.data.player2_id, tgwRes.data.player3_id, tgwRes.data.player4_id, tgwRes.data.player5_id].filter(Boolean);
            setSelectedIds(ids);
            if (tgwRes.data.captain_id) setCaptainId(tgwRes.data.captain_id);
          }
        } catch {}
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const selectedPlayers = selectedIds.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[];
  const totalCost = selectedPlayers.reduce((s, p) => s + p.price, 0);
  const budgetLeft = BUDGET - totalCost;

  function togglePlayer(player: Player) {
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
    setCaptainId((prev) => (prev === playerId ? null : playerId));
  }

  async function saveSquad() {
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
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save squad");
    } finally {
      setSaving(false);
    }
  }

  const filteredPlayers = filterPos === "ALL" ? players : players.filter((p) => p.position === filterPos);

  const pitchPlayers = selectedPlayers.map((p) => ({ player: p, isCaptain: p.id === captainId }));

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Navbar />
      <main className="md:ml-60 pb-20 md:pb-0 px-4 md:px-8 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">👥 Pick Your Squad</h1>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Select 5 players within £50M. Choose a captain (2x points).</p>
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
                  <PitchView players={pitchPlayers} onCaptainToggle={toggleCaptain} />

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

                  <button
                    onClick={saveSquad}
                    disabled={saving || selectedIds.length !== 5 || !captainId}
                    className="btn-primary w-full py-3 mt-4 text-sm"
                    style={{ opacity: (saving || selectedIds.length !== 5 || !captainId) ? 0.5 : 1, cursor: (saving || selectedIds.length !== 5 || !captainId) ? "not-allowed" : "pointer" }}
                  >
                    {saving ? "Saving..." : "Save Squad"}
                  </button>
                </div>
              </div>

              <div className="md:col-span-3">
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
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

                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                    {filteredPlayers.length === 0 ? (
                      <div className="text-center py-8" style={{ color: "var(--muted)" }}>No players available. Ask your admin to add players.</div>
                    ) : filteredPlayers.map((player) => {
                      const isSelected = selectedIds.includes(player.id);
                      const isCap = captainId === player.id;
                      const canAfford = budgetLeft >= player.price || isSelected;
                      return (
                        <div
                          key={player.id}
                          className="flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer"
                          style={{
                            background: isSelected ? "rgba(56,255,126,0.08)" : "#1a1a24",
                            border: `1px solid ${isSelected ? "rgba(56,255,126,0.3)" : "var(--border)"}`,
                            opacity: !canAfford && !isSelected ? 0.5 : 1,
                          }}
                          onClick={() => togglePlayer(player)}
                        >
                          {/* التعديل هنا: عرض صورة اللاعب بدلاً من الدائرة الملونة فقط */}
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
                              {/* اسم اللاعب */}
                              {player.name}

                              {/* إطار المركز الصغير */}
                              <span 
                                className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white uppercase tracking-wider"
                                style={{ 
                                  background: posColors[player.position] || "#6b7280",
                                  border: "1px solid rgba(255,255,255,0.1)"
                                }}
                              >
                                {player.position}
                              </span>

                              {/* علامة الكابتن لو موجودة */}
                              {isCap && (
                                <span className="text-xs px-1 rounded font-bold" style={{ background: "var(--primary)", color: "#0f0f13" }}>
                                  C
                                </span>
                              )}
                            </div>
                            <div className="text-xs" style={{ color: "var(--muted)" }}>{player.team_name}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-bold text-yellow-400">£{player.price.toFixed(1)}M</div>
                            <div className="text-xs" style={{ color: "var(--muted)" }}>{player.total_points} pts</div>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--primary)" }}>
                              <span className="text-xs text-black font-bold">✓</span>
                            </div>
                          )}
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
    </div>
  );
}