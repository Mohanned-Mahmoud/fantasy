"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, getUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import api, { Player, Gameweek } from "@/lib/api";

const POSITIONS = ["GK", "DEF", "MID", "ATT"];

// تم إضافة إحصائيات ضربات الجزاء هنا لتعمل مع التصميم العبقري بتاعك
const STAT_FIELDS = [
  { key: "goals",            label: "Goals",       shortLabel: "Goals",   icon: "⚽", color: "#4ade80", max: 10,  step: 1 },
  { key: "assists",          label: "Assists",      shortLabel: "Assists",   icon: "🅰️", color: "#60a5fa", max: 10,  step: 1 },
  { key: "clean_sheet",      label: "Clean Sheet",  shortLabel: "Clean Sheet",  icon: "🛡️", color: "#a78bfa", max: 5,   step: 1 },
  { key: "saves",            label: "Saves",        shortLabel: "Saves",  icon: "🧤", color: "#facc15", max: 20,  step: 1 },
  { key: "defensive_errors", label: "Def. Errors",  shortLabel: "Def. Errors",  icon: "⚠️", color: "#fb923c", max: 5,   step: 1 },
  { key: "nutmegs",          label: "Nutmegs",      shortLabel: "Nutmegs",  icon: "🌀", color: "#f472b6", max: 10,  step: 1 },
  { key: "own_goals",        label: "Own Goals",    shortLabel: "Own Goals",  icon: "😬", color: "#f87171", max: 5,   step: 1 },
  { key: "penalties_scored", label: "Pen. Scored",  shortLabel: "Pen. Scored", icon: "🎯", color: "#34d399", max: 5,   step: 1 },
  { key: "penalties_saved",  label: "Pen. Saved",   shortLabel: "Pen. Saved",icon: "🦸‍♂️", color: "#2dd4bf", max: 5,   step: 1 },
  { key: "penalties_missed", label: "Pen. Missed",  shortLabel: "Pen. Missed", icon: "❌", color: "#ef4444", max: 5,   step: 1 },
  { key: "minutes_played",   label: "Minutes",      shortLabel: "MIN", icon: "⏱️", color: "#94a3b8", max: 120, step: 5 },
] as const;

type StatKey = typeof STAT_FIELDS[number]["key"];

interface PlayerStats {
  stats: Record<StatKey, number>;
  mvp: boolean;
}

const defaultStats = (): Record<StatKey, number> =>
  Object.fromEntries(STAT_FIELDS.map(f => [f.key, f.key === "minutes_played" ? 120 : 0])) as Record<StatKey, number>;

// تم تحديث حسبة النقاط التجريبية لتشمل ضربات الجزاء
// تم تحديث حسبة النقاط لتتطابق مع الـ POINTS_CONFIG الخاصة بالباك إند تماماً
function calcPoints(stats: Record<StatKey, number>, mvp: boolean, position: string) {
  let pts = 0;
  const pos = position?.toUpperCase() || "ATT";

  // نقطة المشاركة (لو الدقايق أكبر من صفر بياخد نقطة)
  if ((stats.minutes_played || 0) > 0) pts += 1;

  // الأهداف
  if (pos === "GK") pts += stats.goals * 6;
  else if (pos === "DEF" || pos === "MID") pts += stats.goals * 5;
  else pts += stats.goals * 4; // ATT

  // الأسيست
  pts += stats.assists * 3;

  // الكلين شيت
  if (pos === "GK") pts += stats.clean_sheet * 5;
  else if (pos === "DEF") pts += stats.clean_sheet * 3;
  else if (pos === "MID") pts += stats.clean_sheet * 2;
  else pts += stats.clean_sheet * 1; // ATT

  // التصديات (نقطة لكل 3 تصديات للحارس)
  if (pos === "GK") pts += Math.floor(stats.saves / 3);

  // الكباري (الكوبري بـ 2)
  pts += stats.nutmegs * 2;

  // الباقي
  pts += stats.own_goals * -2;
  pts += stats.defensive_errors * -1;
  pts += (stats.penalties_scored || 0) * 3;
  pts += (stats.penalties_saved || 0) * 5;
  pts += (stats.penalties_missed || 0) * -2;
  pts += mvp ? 3 : 0;

  // أقل حاجة سالب 10 زي الباك إند
  return Math.max(pts, -10);
}

const POS_COLORS: Record<string, string> = {
  GK: "#f59e0b", DEF: "#3b82f6", MID: "#8b5cf6", ATT: "#ef4444",
};

// ── Stat stepper cell ──────────────────────────────────────────────────────────
function StatCell({
  field, value, onChange,
}: {
  field: typeof STAT_FIELDS[number];
  value: number;
  onChange: (v: number) => void;
}) {
  const { shortLabel, icon, color, max, step } = field;
  const val = Number(value) || 0;
  const active = val > 0 && field.key !== "minutes_played" || (field.key === "minutes_played" && val < 120);

  return (
    <div style={{
      background: active ? `${color}12` : "#1a1a24",
      border: `1.5px solid ${active ? `${color}66` : "#2a2a3a"}`,
      borderRadius: 10,
      padding: "8px 6px 6px",
      textAlign: "center",
      transition: "border-color .15s, background .15s",
    }}>
      <div style={{
        fontSize: 9, fontWeight: 600, letterSpacing: ".06em",
        color: active ? color : "#475569", marginBottom: 6, whiteSpace: "nowrap",
      }}>
        {icon} {shortLabel}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
        <button
          onClick={() => onChange(Math.max(0, val - step))}
          disabled={val <= 0}
          style={{
            width: 24, height: 24, borderRadius: 5,
            background: "#0f0f1a", border: "1px solid #2a2a3a",
            color: "#94a3b8", fontSize: 16, lineHeight: 1,
            cursor: val <= 0 ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: val <= 0 ? 0.2 : 1, flexShrink: 0, padding: 0,
            transition: "opacity .1s",
          }}
        >−</button>
        <span style={{
          fontSize: 20, fontWeight: 700,
          color: active ? color : "#e2e8f0",
          minWidth: 22, lineHeight: 1,
        }}>
          {val}
        </span>
        <button
          onClick={() => onChange(Math.min(max, val + step))}
          disabled={val >= max}
          style={{
            width: 24, height: 24, borderRadius: 5,
            background: "#0f0f1a", border: "1px solid #2a2a3a",
            color: "#94a3b8", fontSize: 16, lineHeight: 1,
            cursor: val >= max ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: val >= max ? 0.2 : 1, flexShrink: 0, padding: 0,
            transition: "opacity .1s",
          }}
        >+</button>
      </div>
    </div>
  );
}

// ── Main admin page ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const user = getUser();
  const [activeTab, setActiveTab] = useState<"players" | "gameweeks" | "stats" | "settings">("players");
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameweeks, setGameweeks] = useState<Gameweek[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [allowTransfers, setAllowTransfers] = useState(true); // <-- ضفنا الخاصية دي
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [newPlayer, setNewPlayer] = useState({ name: "", position: "GK", team_name: "", price: "5.0", image_url: "" });
  const [newGW, setNewGW] = useState({ number: "", name: "", deadline: "" });

  // Stats tab state
  const [statGWId, setStatGWId] = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [statsMap, setStatsMap] = useState<Record<string, PlayerStats>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingFlash, setSavingFlash] = useState(false);
  const [savingStat, setSavingStat] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");

  useEffect(() => {
    if (!isLoggedIn() || !user?.is_admin) { router.push("/dashboard"); return; }
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [pRes, gRes, settingsRes] = await Promise.all([
        api.get("/players/"), 
        api.get("/gameweeks/"),
        api.get("/stats/settings").catch(() => ({ data: { show_dashboard_stats: false, allow_transfers: true } }))
      ]);
      setPlayers(pRes.data);
      setGameweeks(gRes.data);
      setShowStats(settingsRes.data?.show_dashboard_stats || false);
      setAllowTransfers(settingsRes.data?.allow_transfers ?? true); // <-- تحديث الحالة من الباك إند
      
      const openGWs = gRes.data.filter((gw: Gameweek) => !gw.is_finished);
      const activeOpen = openGWs.find((gw: Gameweek) => gw.is_active) || openGWs[0];
      if (activeOpen) setStatGWId((prev) => prev || String(activeOpen.id));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function flash(msg: string, isError = false) {
    if (isError) { setError(msg); setMessage(""); }
    else { setMessage(msg); setError(""); }
    setTimeout(() => { setMessage(""); setError(""); }, 4000);
  }

  async function createPlayer() {
    if (!newPlayer.name || !newPlayer.team_name) { flash("Fill all fields", true); return; }
    try {
      await api.post("/players/", { ...newPlayer, price: parseFloat(newPlayer.price), image_url: newPlayer.image_url || "/players/default.png" });
      flash(`Player ${newPlayer.name} added!`);
      setNewPlayer({ name: "", position: "GK", team_name: "", price: "5.0", image_url: "" });
      loadData();
    } catch (err: any) { flash(err.response?.data?.detail || "Failed", true); }
  }

  async function createGameweek() {
    if (!newGW.number || !newGW.name || !newGW.deadline) { flash("Fill all fields", true); return; }
    try {
      await api.post("/gameweeks/", { number: parseInt(newGW.number), name: newGW.name, deadline: new Date(newGW.deadline).toISOString() });
      flash(`Gameweek ${newGW.number} created!`);
      setNewGW({ number: "", name: "", deadline: "" });
      loadData();
    } catch (err: any) { flash(err.response?.data?.detail || "Failed", true); }
  }

  async function activateGW(id: number) {
    try {
      await api.put(`/gameweeks/${id}/activate`);
      flash("Gameweek activated & Teams Rolled Over!");
      loadData();
    } catch (err: any) { flash("Failed", true); }
  }

  async function calculatePoints(id: number) {
    if (!confirm("Are you sure? This will calculate points for all users and close the Gameweek.")) return;
    try {
      await api.post(`/gameweeks/${id}/calculate-points`);
      flash("Points calculated and added to users successfully!");
      loadData();
    } catch (err: any) { flash(err.response?.data?.detail || "Failed to calculate points", true); }
  }

  async function toggleDashboardStats() {
    try {
      const newVal = !showStats;
      await api.put(`/stats/settings?show_stats=${newVal}`);
      setShowStats(newVal);
      flash(newVal ? "Stats are now VISIBLE to users" : "Stats are HIDDEN from users");
    } catch (err: any) {
      console.error("Settings Error:", err.response || err); 
      const errorMessage = err.response?.data?.detail || err.message || "Failed to update settings";
      flash(`Error: ${errorMessage}`, true);
    }
  }

  // <-- الدالة الجديدة للتحكم في قفل/فتح اللعبة -->
  async function toggleTransfers() {
    try {
      const newVal = !allowTransfers;
      await api.put(`/stats/settings?allow_transfers=${newVal}`);
      setAllowTransfers(newVal);
      flash(newVal ? "Transfers are now UNLOCKED" : "Transfers are now LOCKED for everyone");
    } catch (err: any) {
      console.error("Settings Error:", err.response || err); 
      const errorMessage = err.response?.data?.detail || err.message || "Failed to update settings";
      flash(`Error: ${errorMessage}`, true);
    }
  }

  // Stats queue logic
  const queuePlayers = players.filter(p =>
    p.name.toLowerCase().includes(playerSearch.toLowerCase())
  );
  const currentPlayer = queuePlayers[currentIdx];
  const currentData: PlayerStats = statsMap[currentPlayer?.id] || { stats: defaultStats(), mvp: false };

  const setCurrentPlayerStats = useCallback((updater: (d: PlayerStats) => PlayerStats) => {
    if (!currentPlayer) return;
    setStatsMap(prev => {
      const existing = prev[currentPlayer.id] || { stats: defaultStats(), mvp: false };
      return { ...prev, [currentPlayer.id]: updater(existing) };
    });
  }, [currentPlayer]);

  const setStat = useCallback((key: StatKey, val: number) => {
    setCurrentPlayerStats(d => ({ ...d, stats: { ...d.stats, [key]: val } }));
  }, [setCurrentPlayerStats]);

  const toggleMvp = useCallback(() => {
    setCurrentPlayerStats(d => ({ ...d, mvp: !d.mvp }));
  }, [setCurrentPlayerStats]);

  function restartSession() {
    setCurrentIdx(0);
    setSessionDone(false);
    setStatsMap({});
    setSavedIds(new Set());
  }

  async function saveAndNext() {
    if (!statGWId || !currentPlayer) { flash("Select a gameweek first", true); return; }
    setSavingStat(true);
    try {
      const payload = {
        player_id: currentPlayer.id, 
        ...Object.fromEntries(STAT_FIELDS.map(f => [f.key, currentData.stats[f.key] || 0])),
        mvp: currentData.mvp,
      };
      await api.post(`/gameweeks/${statGWId}/stats`, payload);
      setSavedIds(prev => new Set([...prev, String(currentPlayer.id)]));
      setSavingFlash(true);
      setTimeout(() => setSavingFlash(false), 600);
      const nextIdx = currentIdx + 1;
      if (nextIdx >= queuePlayers.length) setSessionDone(true);
      else setCurrentIdx(nextIdx);
    } catch (err: any) {
      console.error("Save Stats Error:", err.response?.data || err);
      const errorMessage = err.response?.data?.detail || err.message || "Failed to save stats";
      flash(`Error: ${errorMessage}`, true);
    } finally {
      setSavingStat(false);
    }
  }

  function skipPlayer() {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= queuePlayers.length) setSessionDone(true);
    else setCurrentIdx(nextIdx);
  }

  function goToPlayer(idx: number) { setCurrentIdx(idx); setSessionDone(false); }

  const pts = calcPoints(currentData.stats, currentData.mvp, currentPlayer?.position || "ATT");
  const activeGW = gameweeks.find(g => String(g.id) === statGWId);
  const tabs = ["players", "gameweeks", "stats", "settings"] as const;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px", borderRadius: 8,
    background: "#1a1a24", border: "1px solid #2a2a3a",
    color: "inherit", fontSize: 14, outline: "none",
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Navbar />
      <main className="md:ml-60 pb-20 md:pb-0 px-4 md:px-8 py-6">
        <div className="max-w-3xl mx-auto">

          <div className="mb-6">
            <h1 className="text-2xl font-bold">⚙️ Admin Panel</h1>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Manage players, gameweeks, and match stats</p>
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

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {tabs.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-4 py-2 rounded-lg text-sm font-medium capitalize"
                style={{ background: activeTab === tab ? "var(--primary)" : "#2a2a3a", color: activeTab === tab ? "#0f0f13" : "var(--foreground)" }}>
                {tab}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12" style={{ color: "var(--muted)" }}>Loading...</div>
          ) : (
            <>
              {/* ── PLAYERS TAB ── */}
              {activeTab === "players" && (
                <div className="space-y-4">
                  <div className="card p-4">
                    <h2 className="font-semibold mb-3">Add Player</h2>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Name</label>
                        <input value={newPlayer.name} onChange={(e) => setNewPlayer((p) => ({ ...p, name: e.target.value }))} placeholder="Player name" style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Position</label>
                        <select value={newPlayer.position} onChange={(e) => setNewPlayer((p) => ({ ...p, position: e.target.value }))} style={inputStyle}>
                          {POSITIONS.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Team Name</label>
                        <input value={newPlayer.team_name} onChange={(e) => setNewPlayer((p) => ({ ...p, team_name: e.target.value }))} placeholder="Real team" style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Price (M)</label>
                        <input type="number" step="0.5" min="1" max="15" value={newPlayer.price} onChange={(e) => setNewPlayer((p) => ({ ...p, price: e.target.value }))} style={inputStyle} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Image Path</label>
                        <input value={newPlayer.image_url} onChange={(e) => setNewPlayer((p) => ({ ...p, image_url: e.target.value }))} placeholder="/players/messi.jpg" style={inputStyle} />
                      </div>
                    </div>
                    <button onClick={createPlayer} className="btn-primary w-full py-2 text-sm">Add Player</button>
                  </div>

                  <div className="card p-4">
                    <h2 className="font-semibold mb-3">All Players ({players.length})</h2>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {players.map((p) => (
                        <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "#1a1a24" }}>
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                            <img src={p.image_url || "/players/default.png"} alt="" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded font-bold text-white w-10 text-center" style={{ background: POS_COLORS[p.position] || "#6b7280" }}>{p.position}</span>
                          <span className="flex-1 text-sm font-medium">{p.name}</span>
                          <span className="text-xs" style={{ color: "var(--muted)" }}>{p.team_name}</span>
                          <span className="text-sm font-bold text-yellow-400">£{p.price}M</span>
                          <span className="text-xs gradient-text font-bold">{p.total_points}pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── GAMEWEEKS TAB ── */}
              {activeTab === "gameweeks" && (
                <div className="space-y-4">
                  <div className="card p-4">
                    <h2 className="font-semibold mb-3">Create Gameweek</h2>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Number</label>
                        <input type="number" value={newGW.number} onChange={(e) => setNewGW((g) => ({ ...g, number: e.target.value }))} placeholder="1" style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Name</label>
                        <input value={newGW.name} onChange={(e) => setNewGW((g) => ({ ...g, name: e.target.value }))} placeholder="Gameweek 1" style={inputStyle} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Deadline</label>
                        <input type="datetime-local" value={newGW.deadline} onChange={(e) => setNewGW((g) => ({ ...g, deadline: e.target.value }))} style={inputStyle} />
                      </div>
                    </div>
                    <button onClick={createGameweek} className="btn-primary w-full py-2 text-sm">Create Gameweek</button>
                  </div>

                  <div className="card p-4">
                    <h2 className="font-semibold mb-3">Gameweeks</h2>
                    <div className="space-y-2">
                      {gameweeks.map((gw) => (
                        <div key={gw.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#1a1a24" }}>
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {gw.name}
                              {gw.is_finished && <span className="ml-2 text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">FINISHED</span>}
                            </div>
                            <div className="text-xs" style={{ color: "var(--muted)" }}>Deadline: {new Date(gw.deadline).toLocaleDateString()}</div>
                          </div>
                          <div className="flex gap-2">
                            {gw.is_active && (
                              <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ background: "rgba(56,255,126,0.2)", color: "var(--primary)" }}>ACTIVE</span>
                            )}
                            {!gw.is_active && !gw.is_finished && (
                              <button onClick={() => activateGW(gw.id)} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: "#2a2a3a" }}>
                                Activate
                              </button>
                            )}
                            <button onClick={() => calculatePoints(gw.id)} className="text-xs px-3 py-1.5 rounded-lg font-medium text-white" style={{ background: gw.is_finished ? "#f59e0b" : "#ef4444" }}>
                              {gw.is_finished ? "Recalculate Points" : "Calculate Points"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STATS TAB ── */}
              {activeTab === "stats" && (
                <div className="card p-4">

                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold">Enter Match Stats</h2>
                    {savedIds.size > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: "rgba(74,222,128,.15)", color: "#4ade80" }}>
                        {savedIds.size} saved
                      </span>
                    )}
                  </div>

                  {/* GW + search */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Gameweek</label>
                      <select
                        value={statGWId}
                        onChange={(e) => { setStatGWId(e.target.value); restartSession(); }}
                        style={inputStyle}
                      >
                        <option value="">Select gameweek</option>
                        {gameweeks.filter(gw => !gw.is_finished).map((gw) => (
                          <option key={gw.id} value={gw.id}>{gw.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Filter players</label>
                      <input
                        value={playerSearch}
                        onChange={(e) => { setPlayerSearch(e.target.value); setCurrentIdx(0); setSessionDone(false); }}
                        placeholder="Search by name…"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Progress pills */}
                  {queuePlayers.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
                      {queuePlayers.map((p, i) => {
                        const isSaved = savedIds.has(String(p.id));
                        const isCurrent = i === currentIdx && !sessionDone;
                        return (
                          <div
                            key={p.id}
                            title={p.name}
                            onClick={() => goToPlayer(i)}
                            style={{
                              flexShrink: 0,
                              width: 30, height: 30,
                              borderRadius: 6,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 8, fontWeight: 700,
                              cursor: "pointer",
                              border: `1.5px solid ${isSaved ? "rgba(74,222,128,.4)" : isCurrent ? "#4a6bde" : "#2a2a3a"}`,
                              background: isSaved ? "rgba(74,222,128,.12)" : isCurrent ? "#1e1e3a" : "#1a1a24",
                              color: isSaved ? "#4ade80" : isCurrent ? "#93c5fd" : "#475569",
                              transition: "all .15s",
                            }}
                          >
                            {p.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Done state */}
                  {sessionDone ? (
                    <div style={{ padding: "40px 0", textAlign: "center" }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
                      <div style={{ fontWeight: 700, fontSize: 18, color: "var(--primary)", marginBottom: 6 }}>All Done!</div>
                      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
                        {savedIds.size} players saved for {activeGW?.name}
                      </div>
                      <button
                        onClick={restartSession}
                        style={{ padding: "8px 20px", borderRadius: 8, background: "#2a2a3a", color: "var(--foreground)", border: "1px solid #3a3a4a", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                      >
                        Start New Session
                      </button>
                    </div>

                  ) : currentPlayer ? (
                    <>
                      {/* Player card */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, background: "#1a1a24", border: "1px solid #2a2a3a", marginBottom: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", background: "#2a2a3a", flexShrink: 0 }}>
                          <img src={currentPlayer.image_url || "/players/default.png"} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {currentPlayer.name}
                          </div>
                          <div style={{ fontSize: 11, marginTop: 3, color: "var(--muted)" }}>
                            <span style={{ fontWeight: 700, marginRight: 4, color: POS_COLORS[currentPlayer.position] || "#94a3b8" }}>
                              {currentPlayer.position}
                            </span>
                            · {currentIdx + 1} of {queuePlayers.length}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, color: pts < 0 ? "#f87171" : "var(--primary)" }}>
                            {pts > 0 ? "+" : ""}{pts.toFixed(1)}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em" }}>pts</div>
                        </div>
                      </div>

                      {/* Stat steppers */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 10 }}>
                        {STAT_FIELDS.map(field => (
                          <StatCell
                            key={field.key}
                            field={field}
                            value={currentData.stats[field.key]}
                            onChange={val => setStat(field.key, val)}
                          />
                        ))}
                      </div>

                      {/* MVP toggle */}
                      <button
                        onClick={toggleMvp}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 12,
                          padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                          background: currentData.mvp ? "rgba(250,204,21,.08)" : "#1a1a24",
                          border: `1.5px solid ${currentData.mvp ? "rgba(250,204,21,.4)" : "#2a2a3a"}`,
                          color: "var(--foreground)", textAlign: "left", marginBottom: 10,
                          transition: "all .15s",
                        }}
                      >
                        <span style={{ fontSize: 18 }}>🏆</span>
                        <span style={{ flex: 1 }}>
                          <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>MVP Award</span>
                          <span style={{ fontSize: 11, color: "var(--muted)" }}>+3 bonus points</span>
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20,
                          background: "rgba(250,204,21,.15)", color: "#facc15",
                          opacity: currentData.mvp ? 1 : 0.3, transition: "opacity .15s",
                          letterSpacing: ".06em",
                        }}>MVP</span>
                      </button>

                      {/* Save & Skip */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: 8 }}>
                        <button
                          onClick={skipPlayer}
                          style={{
                            padding: "12px 0", borderRadius: 10, fontSize: 13, fontWeight: 600,
                            background: "#1a1a24", border: "1.5px solid #2a2a3a",
                            color: "var(--muted)", cursor: "pointer",
                          }}
                        >
                          Skip
                        </button>
                        <button
                          onClick={saveAndNext}
                          disabled={savingStat || !statGWId}
                          style={{
                            padding: "12px 0", borderRadius: 10, fontSize: 15, fontWeight: 700,
                            background: savingFlash ? "#86efac" : "var(--primary)",
                            color: "#0f0f13", border: "none",
                            opacity: (savingStat || !statGWId) ? 0.5 : 1,
                            cursor: (savingStat || !statGWId) ? "not-allowed" : "pointer",
                            transition: "background .15s",
                          }}
                        >
                          {savingStat ? "Saving…" : savingFlash ? "✓ Saved!" : currentIdx + 1 < queuePlayers.length ? "Save & Next →" : "Save & Finish"}
                        </button>
                      </div>
                    </>

                  ) : (
                    <div style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
                      {players.length === 0 ? "No players loaded." : "No players match your search."}
                    </div>
                  )}
                </div>
              )}

              {/* ── SETTINGS TAB ── */}
              {activeTab === "settings" && (
                <div className="card p-4 space-y-4">
                  
                  <h2 className="font-semibold mb-2">Dashboard Features</h2>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1a1a24", padding: "16px", borderRadius: "12px", border: "1px solid #2a2a3a" }}>
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "15px" }}>Show Highlights Stats</div>
                      <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                        Displays "Most Owned" and "Top Scorers" widgets on user dashboards.
                      </div>
                    </div>
                    <button 
                      onClick={toggleDashboardStats}
                      style={{
                        padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", fontSize: "13px",
                        background: showStats ? "rgba(239,68,68,0.1)" : "rgba(56,255,126,0.1)",
                        color: showStats ? "#ef4444" : "var(--primary)",
                        border: `1px solid ${showStats ? "rgba(239,68,68,0.2)" : "rgba(56,255,126,0.2)"}`,
                        cursor: "pointer"
                      }}
                    >
                      {showStats ? "Disable" : "Enable"}
                    </button>
                  </div>

                  <h2 className="font-semibold mb-2 mt-4">Game Settings</h2>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1a1a24", padding: "16px", borderRadius: "12px", border: "1px solid #2a2a3a" }}>
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "15px" }}>Allow Transfers & Squad Changes</div>
                      <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                        Turn this off to globally lock all user squads (e.g., during live matches).
                      </div>
                    </div>
                    <button 
                      onClick={toggleTransfers}
                      style={{
                        padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", fontSize: "13px",
                        background: !allowTransfers ? "rgba(239,68,68,0.1)" : "rgba(56,255,126,0.1)",
                        color: !allowTransfers ? "#ef4444" : "var(--primary)",
                        border: `1px solid ${!allowTransfers ? "rgba(239,68,68,0.2)" : "rgba(56,255,126,0.2)"}`,
                        cursor: "pointer",
                        minWidth: "120px"
                      }}
                    >
                      {!allowTransfers ? "Locked (Unlock)" : "Unlocked (Lock)"}
                    </button>
                  </div>

                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}