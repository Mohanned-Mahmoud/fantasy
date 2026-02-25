"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import api, { MiniLeague, MiniLeagueMemberEntry } from "@/lib/api";

export default function MiniLeaguesPage() {
  const router = useRouter();
  const [leagues, setLeagues] = useState<MiniLeague[]>([]);
  const [selected, setSelected] = useState<MiniLeague | null>(null);
  const [standings, setStandings] = useState<MiniLeagueMemberEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    loadLeagues();
  }, []);

  async function loadLeagues() {
    setLoading(true);
    try {
      const res = await api.get("/minileagues/my");
      setLeagues(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function createLeague() {
    if (!newName.trim()) return;
    setError(""); setMessage("");
    try {
      const res = await api.post("/minileagues/", { name: newName });
      setMessage(`League created! Join code: ${res.data.join_code}`);
      setNewName("");
      loadLeagues();
    } catch (err: any) { setError(err.response?.data?.detail || "Failed to create league"); }
  }

  async function joinLeague() {
    if (!joinCode.trim()) return;
    setError(""); setMessage("");
    try {
      const res = await api.post(`/minileagues/join?join_code=${joinCode.trim()}`);
      setMessage(res.data.message);
      setJoinCode("");
      loadLeagues();
    } catch (err: any) { setError(err.response?.data?.detail || "Failed to join league"); }
  }

  async function viewStandings(league: MiniLeague) {
    setSelected(league);
    try {
      const res = await api.get(`/minileagues/${league.id}/standings`);
      setStandings(res.data);
    } catch (err) { console.error(err); }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Navbar />
      <main className="md:ml-60 pb-20 md:pb-0 px-4 md:px-8 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">🔒 Mini-Leagues</h1>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Compete privately with your friends</p>
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

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="card p-4">
              <h2 className="font-semibold mb-3 text-sm">Create New League</h2>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="League name..." className="mb-3" />
              <button onClick={createLeague} className="btn-primary w-full py-2 text-sm">Create League</button>
            </div>
            <div className="card p-4">
              <h2 className="font-semibold mb-3 text-sm">Join a League</h2>
              <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Enter join code..." className="mb-3" />
              <button onClick={joinLeague} className="w-full py-2 rounded-lg text-sm font-semibold" style={{ background: "#2a2a3a", color: "var(--foreground)" }}>Join League</button>
            </div>
          </div>

          {selected ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setSelected(null)} className="text-sm" style={{ color: "var(--muted)" }}>← Back</button>
                <h2 className="font-bold">{selected.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: "#2a2a3a" }}>{selected.join_code}</span>
              </div>
              <div className="space-y-2">
                {standings.map((s) => (
                  <div key={s.rank} className="card p-4 flex items-center gap-4">
                    <div className="w-8 text-center font-bold text-sm" style={{ color: "var(--muted)" }}>#{s.rank}</div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{s.manager_name}</div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>{s.team_name}</div>
                    </div>
                    <div className="font-black gradient-text">{s.total_points} pts</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h2 className="font-semibold mb-3 text-sm" style={{ color: "var(--muted)" }}>YOUR LEAGUES</h2>
              {loading ? (
                <div className="text-center py-8" style={{ color: "var(--muted)" }}>Loading...</div>
              ) : leagues.length === 0 ? (
                <div className="card p-8 text-center">
                  <div className="text-3xl mb-2">🔒</div>
                  <div className="font-medium">No leagues yet</div>
                  <div className="text-sm mt-1" style={{ color: "var(--muted)" }}>Create or join one above</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {leagues.map((l) => (
                    <button key={l.id} onClick={() => viewStandings(l)} className="card w-full p-4 text-left hover:border-green-500 transition-colors flex items-center justify-between">
                      <div>
                        <div className="font-medium">{l.name}</div>
                        <div className="text-xs mt-0.5 font-mono" style={{ color: "var(--muted)" }}>Code: {l.join_code}</div>
                      </div>
                      <span style={{ color: "var(--muted)" }}>→</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
