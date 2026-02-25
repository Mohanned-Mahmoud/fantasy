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
  clean_sheet: boolean;
  saves: string;
  yellow_cards: string;
  red_card: boolean;
  mvp: boolean;
  nutmegs: string;
  own_goals: string;
  minutes_played: string;
}

const defaultStatForm: StatForm = {
  player_id: "", goals: "0", assists: "0", clean_sheet: false, saves: "0",
  yellow_cards: "0", red_card: false, mvp: false, nutmegs: "0", own_goals: "0", minutes_played: "45",
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

  const [newPlayer, setNewPlayer] = useState({ name: "", position: "GK", team_name: "", price: "5.0" });
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
      await api.post("/players/", { ...newPlayer, price: parseFloat(newPlayer.price) });
      flash(`Player ${newPlayer.name} added!`);
      setNewPlayer({ name: "", position: "GK", team_name: "", price: "5.0" });
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
      flash("Gameweek activated!");
      loadData();
    } catch (err: any) { flash("Failed", true); }
  }

  async function submitStat() {
    if (!statGWId || !statForm.player_id) { flash("Select gameweek and player", true); return; }
    try {
      const payload = {
        player_id: parseInt(statForm.player_id),
        goals: parseInt(statForm.goals),
        assists: parseInt(statForm.assists),
        clean_sheet: statForm.clean_sheet,
        saves: parseInt(statForm.saves),
        yellow_cards: parseInt(statForm.yellow_cards),
        red_card: statForm.red_card,
        mvp: statForm.mvp,
        nutmegs: parseInt(statForm.nutmegs),
        own_goals: parseInt(statForm.own_goals),
        minutes_played: parseInt(statForm.minutes_played),
      };
      await api.post(`/gameweeks/${statGWId}/stats`, payload);
      flash("Stats saved and points calculated!");
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
                        <input value={newPlayer.name} onChange={(e) => setNewPlayer((p) => ({ ...p, name: e.target.value }))} placeholder="Player name" />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Position</label>
                        <select value={newPlayer.position} onChange={(e) => setNewPlayer((p) => ({ ...p, position: e.target.value }))}>
                          {POSITIONS.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Team Name</label>
                        <input value={newPlayer.team_name} onChange={(e) => setNewPlayer((p) => ({ ...p, team_name: e.target.value }))} placeholder="Real team" />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Price (M)</label>
                        <input type="number" step="0.5" min="1" max="15" value={newPlayer.price} onChange={(e) => setNewPlayer((p) => ({ ...p, price: e.target.value }))} />
                      </div>
                    </div>
                    <button onClick={createPlayer} className="btn-primary py-2 text-sm">Add Player</button>
                  </div>

                  <div className="card p-4">
                    <h2 className="font-semibold mb-3">All Players ({players.length})</h2>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {players.map((p) => (
                        <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "#1a1a24" }}>
                          <span className="text-xs px-2 py-0.5 rounded font-bold text-white" style={{ background: { GK: "#f59e0b", DEF: "#3b82f6", MID: "#8b5cf6", ATT: "#ef4444" }[p.position] || "#6b7280" }}>{p.position}</span>
                          <span className="flex-1 text-sm font-medium">{p.name}</span>
                          <span className="text-xs" style={{ color: "var(--muted)" }}>{p.team_name}</span>
                          <span className="text-sm font-bold text-yellow-400">£{p.price}M</span>
                          <span className="text-xs gradient-text font-bold">{p.total_points}pts</span>
                        </div>
                      ))}
                      {players.length === 0 && <div className="text-center py-4 text-sm" style={{ color: "var(--muted)" }}>No players yet</div>}
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
                        <input type="number" value={newGW.number} onChange={(e) => setNewGW((g) => ({ ...g, number: e.target.value }))} placeholder="1" />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Name</label>
                        <input value={newGW.name} onChange={(e) => setNewGW((g) => ({ ...g, name: e.target.value }))} placeholder="Gameweek 1" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Deadline</label>
                        <input type="datetime-local" value={newGW.deadline} onChange={(e) => setNewGW((g) => ({ ...g, deadline: e.target.value }))} />
                      </div>
                    </div>
                    <button onClick={createGameweek} className="btn-primary py-2 text-sm">Create Gameweek</button>
                  </div>

                  <div className="card p-4">
                    <h2 className="font-semibold mb-3">Gameweeks</h2>
                    <div className="space-y-2">
                      {gameweeks.map((gw) => (
                        <div key={gw.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#1a1a24" }}>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{gw.name}</div>
                            <div className="text-xs" style={{ color: "var(--muted)" }}>Deadline: {new Date(gw.deadline).toLocaleDateString()}</div>
                          </div>
                          {gw.is_active && <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ background: "rgba(56,255,126,0.2)", color: "var(--primary)" }}>ACTIVE</span>}
                          {!gw.is_active && (
                            <button onClick={() => activateGW(gw.id)} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: "#2a2a3a" }}>
                              Activate
                            </button>
                          )}
                        </div>
                      ))}
                      {gameweeks.length === 0 && <div className="text-center py-4 text-sm" style={{ color: "var(--muted)" }}>No gameweeks yet</div>}
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
                      <select value={statGWId} onChange={(e) => setStatGWId(e.target.value)}>
                        <option value="">Select gameweek</option>
                        {gameweeks.map((gw) => <option key={gw.id} value={gw.id}>{gw.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Player</label>
                      <select value={statForm.player_id} onChange={(e) => setStatForm((f) => ({ ...f, player_id: e.target.value }))}>
                        <option value="">Select player</option>
                        {players.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.position})</option>)}
                      </select>
                    </div>
                    {[
                      { key: "goals", label: "Goals" }, { key: "assists", label: "Assists" },
                      { key: "saves", label: "Saves" }, { key: "yellow_cards", label: "Yellow Cards" },
                      { key: "nutmegs", label: "Nutmegs/Skills" }, { key: "own_goals", label: "Own Goals" },
                      { key: "minutes_played", label: "Minutes Played" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>{label}</label>
                        <input type="number" min="0" value={(statForm as any)[key]}
                          onChange={(e) => setStatForm((f) => ({ ...f, [key]: e.target.value }))} />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-4 mb-4">
                    {[
                      { key: "clean_sheet", label: "Clean Sheet" },
                      { key: "red_card", label: "Red Card" },
                      { key: "mvp", label: "MVP" },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={(statForm as any)[key]}
                          onChange={(e) => setStatForm((f) => ({ ...f, [key]: e.target.checked }))}
                          className="w-4 h-4 accent-green-400" />
                        {label}
                      </label>
                    ))}
                  </div>

                  <button onClick={submitStat} className="btn-primary py-2.5 text-sm w-full">
                    Save Stats & Calculate Points
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
