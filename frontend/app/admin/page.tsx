"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, getUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import api, { Player, Gameweek } from "@/lib/api";

const POSITIONS = ["GK", "DEF", "MID", "ATT"];

interface StatForm {
  player_id: string;
  goals: string;
  assists: string;
  clean_sheet: string;
  saves: string;
  defensive_errors: string;
  mvp: boolean;
  nutmegs: string;
  own_goals: string;
  minutes_played: string;
}

const defaultStatForm: StatForm = {
  player_id: "", goals: "0", assists: "0", clean_sheet: "0", saves: "0",
  defensive_errors: "0", mvp: false, nutmegs: "0", own_goals: "0", minutes_played: "120",
};

export default function AdminPage() {
  const router = useRouter();
  const user = getUser();
  const [activeTab, setActiveTab] = useState<"players" | "gameweeks" | "stats">("players");
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameweeks, setGameweeks] = useState<Gameweek[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [newPlayer, setNewPlayer] = useState({ name: "", position: "GK", team_name: "", price: "5.0", image_url: "" });
  const [newGW, setNewGW] = useState({ number: "", name: "", deadline: "" });
  const [statGWId, setStatGWId] = useState("");
  const [statForm, setStatForm] = useState<StatForm>(defaultStatForm);

  useEffect(() => {
    if (!isLoggedIn() || !user?.is_admin) { router.push("/dashboard"); return; }
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [pRes, gRes] = await Promise.all([api.get("/players/"), api.get("/gameweeks/")]);
      setPlayers(pRes.data);
      setGameweeks(gRes.data);
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
      await api.post("/players/", { 
        ...newPlayer, 
        price: parseFloat(newPlayer.price),
        image_url: newPlayer.image_url || "/players/default.png" 
      });
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

  // التعديل الجديد: دالة حساب النقاط
  async function calculatePoints(id: number) {
    if (!confirm("Are you sure? This will calculate points for all users and close the Gameweek.")) return;
    try {
      await api.post(`/gameweeks/${id}/calculate-points`);
      flash("Points calculated and added to users successfully!");
      loadData();
    } catch (err: any) {
      flash(err.response?.data?.detail || "Failed to calculate points", true);
    }
  }

  async function submitStat() {
    if (!statGWId || !statForm.player_id) { flash("Select gameweek and player", true); return; }
    try {
      const payload = {
        player_id: parseInt(statForm.player_id),
        goals: parseInt(statForm.goals),
        assists: parseInt(statForm.assists),
        clean_sheet: parseInt(statForm.clean_sheet),
        saves: parseInt(statForm.saves),
        defensive_errors: parseInt(statForm.defensive_errors),
        mvp: statForm.mvp,
        nutmegs: parseInt(statForm.nutmegs),
        own_goals: parseInt(statForm.own_goals),
        minutes_played: parseInt(statForm.minutes_played),
      };
      await api.post(`/gameweeks/${statGWId}/stats`, payload);
      flash("Stats saved for player!");
      setStatForm(defaultStatForm);
    } catch (err: any) { flash(err.response?.data?.detail || "Failed", true); }
  }

  const tabs = ["players", "gameweeks", "stats"] as const;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Navbar />
      <main className="md:ml-60 pb-20 md:pb-0 px-4 md:px-8 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">⚙️ Admin Panel</h1>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Manage players, gameweeks, and match stats</p>
          </div>

          {message && <div className="p-3 rounded-lg mb-4 text-sm" style={{ background: "rgba(56,255,126,0.1)", color: "var(--primary)", border: "1px solid rgba(56,255,126,0.2)" }}>{message}</div>}
          {error && <div className="p-3 rounded-lg mb-4 text-sm text-red-400" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}

          <div className="flex gap-2 mb-6">
            {tabs.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-4 py-2 rounded-lg text-sm font-medium capitalize"
                style={{ background: activeTab === tab ? "var(--primary)" : "#2a2a3a", color: activeTab === tab ? "#0f0f13" : "var(--foreground)" }}>
                {tab}
              </button>
            ))}
          </div>

          {loading ? <div className="text-center py-12" style={{ color: "var(--muted)" }}>Loading...</div> : (
            <>
              {activeTab === "players" && (
                <div className="space-y-4">
                  <div className="card p-4">
                    <h2 className="font-semibold mb-3">Add Player</h2>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Name</label>
                        <input value={newPlayer.name} onChange={(e) => setNewPlayer((p) => ({ ...p, name: e.target.value }))} placeholder="Player name" className="w-full p-2 rounded bg-[#1a1a24] border border-[#2a2a3a]" />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Position</label>
                        <select value={newPlayer.position} onChange={(e) => setNewPlayer((p) => ({ ...p, position: e.target.value }))} className="w-full p-2 rounded bg-[#1a1a24] border border-[#2a2a3a]">
                          {POSITIONS.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Team Name</label>
                        <input value={newPlayer.team_name} onChange={(e) => setNewPlayer((p) => ({ ...p, team_name: e.target.value }))} placeholder="Real team" className="w-full p-2 rounded bg-[#1a1a24] border border-[#2a2a3a]" />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Price (M)</label>
                        <input type="number" step="0.5" min="1" max="15" value={newPlayer.price} onChange={(e) => setNewPlayer((p) => ({ ...p, price: e.target.value }))} className="w-full p-2 rounded bg-[#1a1a24] border border-[#2a2a3a]" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Image Path (e.g. /players/player.jpg)</label>
                        <input value={newPlayer.image_url} onChange={(e) => setNewPlayer((p) => ({ ...p, image_url: e.target.value }))} placeholder="/players/messi.jpg" className="w-full p-2 rounded bg-[#1a1a24] border border-[#2a2a3a]" />
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
                          <span className="text-xs px-2 py-0.5 rounded font-bold text-white w-10 text-center" style={{ background: { GK: "#f59e0b", DEF: "#3b82f6", MID: "#8b5cf6", ATT: "#ef4444" }[p.position] || "#6b7280" }}>{p.position}</span>
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

              {activeTab === "gameweeks" && (
                <div className="space-y-4">
                  <div className="card p-4">
                    <h2 className="font-semibold mb-3">Create Gameweek</h2>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Number</label>
                        <input type="number" value={newGW.number} onChange={(e) => setNewGW((g) => ({ ...g, number: e.target.value }))} placeholder="1" className="w-full p-2 rounded bg-[#1a1a24] border border-[#2a2a3a]" />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Name</label>
                        <input value={newGW.name} onChange={(e) => setNewGW((g) => ({ ...g, name: e.target.value }))} placeholder="Gameweek 1" className="w-full p-2 rounded bg-[#1a1a24] border border-[#2a2a3a]" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Deadline</label>
                        <input type="datetime-local" value={newGW.deadline} onChange={(e) => setNewGW((g) => ({ ...g, deadline: e.target.value }))} className="w-full p-2 rounded bg-[#1a1a24] border border-[#2a2a3a]" />
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
                          
                          {/* التعديل الجديد: أزرار التحكم في الجولة */}
                          <div className="flex gap-2 mt-2">
                            {gw.is_active && <span className="text-xs px-2 py-0.5 rounded font-bold flex items-center" style={{ background: "rgba(56,255,126,0.2)", color: "var(--primary)" }}>ACTIVE</span>}
                            
                            {!gw.is_active && !gw.is_finished && (
                              <button onClick={() => activateGW(gw.id)} className="text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-[#3a3a4a] transition-colors" style={{ background: "#2a2a3a" }}>
                                Activate
                              </button>
                            )}
                            
                            {/* زرار الحساب هيفضل ظاهر دايماً، لو الجولة خلصت هيبقى اسمه إعادة حساب ولونه برتقالي */}
                            <button 
                              onClick={() => calculatePoints(gw.id)} 
                              className="text-xs px-3 py-1.5 rounded-lg font-medium text-white hover:opacity-80 transition-opacity" 
                              style={{ background: gw.is_finished ? "#f59e0b" : "#ef4444" }}
                            >
                              {gw.is_finished ? "Recalculate Points" : "Calculate Points"}
                            </button>
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "stats" && (
                <div className="card p-4">
                  <h2 className="font-semibold mb-4">Enter Match Stats</h2>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Gameweek</label>
                      <select value={statGWId} onChange={(e) => setStatGWId(e.target.value)} className="w-full p-2 rounded bg-[#1a1a24] border border-[#2a2a3a]">
                        <option value="">Select gameweek</option>
                        {gameweeks.filter(gw => !gw.is_finished).map((gw) => <option key={gw.id} value={gw.id}>{gw.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Player</label>
                      <select value={statForm.player_id} onChange={(e) => setStatForm((f) => ({ ...f, player_id: e.target.value }))} className="w-full p-2 rounded bg-[#1a1a24] border border-[#2a2a3a]">
                        <option value="">Select player</option>
                        {players.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.position})</option>)}
                      </select>
                    </div>
                    {[
                      { key: "goals", label: "Goals" }, { key: "assists", label: "Assists" },
                      { key: "clean_sheet", label: "Clean Sheets (15m Games)" },
                      { key: "saves", label: "Saves" },
                      { key: "defensive_errors", label: "Defensive Errors (Fouls/Handball)" },
                      { key: "nutmegs", label: "Nutmegs/Skills" }, { key: "own_goals", label: "Own Goals" },
                      { key: "minutes_played", label: "Minutes Played" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>{label}</label>
                        <input type="number" min="0" value={(statForm as any)[key]}
                          onChange={(e) => setStatForm((f) => ({ ...f, [key]: e.target.value }))} className="w-full p-2 rounded bg-[#1a1a24] border border-[#2a2a3a]" />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={statForm.mvp}
                        onChange={(e) => setStatForm((f) => ({ ...f, mvp: e.target.checked }))}
                        className="w-4 h-4 accent-green-400" />
                      MVP Award
                    </label>
                  </div>

                  <button onClick={submitStat} className="btn-primary py-2.5 text-sm w-full">
                    Save Stats
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}