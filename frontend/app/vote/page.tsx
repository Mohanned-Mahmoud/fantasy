"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import api, { Player, Gameweek } from "@/lib/api";

export default function VotePage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [activeGW, setActiveGW] = useState<Gameweek | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  
  // Store ranked player ids: [0] = First, [1] = Second, [2] = Third
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    loadData();
  }, []);

  async function loadData() {
    try {
      const [gRes, pRes] = await Promise.all([
        api.get("/gameweeks/"),
        api.get("/players/")
      ]);
      
      const openGW = gRes.data.find((gw: Gameweek) => gw.is_voting_open);
      setActiveGW(openGW || null);
      setPlayers(pRes.data);

      if (openGW) {
        const voteRes = await api.get(`/gameweeks/${openGW.id}/my-vote`);
        setHasVoted(voteRes.data.has_voted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Runs when the user clicks a player's card
  function togglePlayer(id: number) {
    setSelectedIds(prev => {
      // If already selected, remove from ranking and shift remaining choices
      if (prev.includes(id)) {
        return prev.filter(pId => pId !== id);
      }
      // If fewer than 3 selected, append to ranking
      if (prev.length < 3) {
        return [...prev, id];
      }
      return prev;
    });
  }

  async function submitVote() {
    if (selectedIds.length !== 3 || !activeGW) return;
    setSubmitting(true);
    try {
      await api.post(`/gameweeks/${activeGW.id}/vote`, {
        first_place_id: selectedIds[0],
        second_place_id: selectedIds[1],
        third_place_id: selectedIds[2],
      });
      setHasVoted(true);
      setMessage("Your vote was submitted successfully! 🏆");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to submit vote");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-emerald-400 font-bold">Loading... ⏳</div>;

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--background)" }}>
      <Navbar />
      
      <main className="md:ml-60 px-4 pt-6 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black mb-2 text-white">🗳️ MVP Voting</h1>
          <p className="text-gray-400 text-sm">
            Pick the top 3 players in ranked order
          </p>
        </div>

        {!activeGW ? (
          <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-white mb-2">Voting is currently closed</h2>
            <p className="text-gray-400 text-sm">There is no open gameweek for voting right now. Please wait for the admin to open one.</p>
          </div>
        ) : hasVoted ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-emerald-400 mb-2">{message || "You already voted!"}</h2>
            <p className="text-emerald-500/70 text-sm">Thanks for voting. Results will be announced soon.</p>
          </div>
        ) : (
          <>
            {/* Progress bar showing how many players have been selected */}
            <div className="bg-[#1a1a24] border border-white/5 rounded-2xl p-4 mb-6 sticky top-4 z-50 shadow-2xl backdrop-blur-md bg-opacity-90">
              <div className="flex justify-between items-center mb-3">
                <div className="text-sm font-bold text-gray-300">Your ranking:</div>
                <div className="text-xs text-gray-500">{selectedIds.length}/3 selected</div>
              </div>
              <div className="flex gap-2">
                {[0, 1, 2].map(index => {
                  const pId = selectedIds[index];
                  const p = players.find(x => x.id === pId);
                  const medals = ["🥇", "🥈", "🥉"];
                  const colors = ["#facc15", "#94a3b8", "#fb923c"]; // Gold, Silver, Bronze
                  
                  return (
                    <div key={index} className="flex-1 bg-black/40 rounded-xl p-2 border border-white/5 flex flex-col items-center justify-center relative min-h-[80px]">
                      <div className="absolute -top-2 -right-2 text-lg z-10">{medals[index]}</div>
                      {p ? (
                        <>
                          <div className="w-10 h-10 rounded-full overflow-hidden mb-1 border-2" style={{ borderColor: colors[index] }}>
                            <img src={p.image_url || "/players/default.png"} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div className="text-[10px] font-bold text-white truncate w-full text-center">{p.name}</div>
                        </>
                      ) : (
                        <div className="text-gray-600 text-[10px] font-bold">Rank {index + 1}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Player grid for selection */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {players.map((p) => {
                const rankIndex = selectedIds.indexOf(p.id);
                const isSelected = rankIndex !== -1;
                const medals = ["🥇", "🥈", "🥉"];
                const colors = ["#facc15", "#94a3b8", "#fb923c"];

                return (
                  <div 
                    key={p.id}
                    onClick={() => togglePlayer(p.id)}
                    className={`relative rounded-2xl p-2 cursor-pointer transition-all transform ${isSelected ? "scale-95 border-2 bg-white/10" : "scale-100 border border-white/5 bg-[#1a1a24] hover:bg-white/5"}`}
                    style={{ borderColor: isSelected ? colors[rankIndex] : "" }}
                  >
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 text-2xl z-10 filter drop-shadow-lg">
                        {medals[rankIndex]}
                      </div>
                    )}
                    
                    <div className="aspect-square rounded-xl overflow-hidden mb-2 bg-black/50">
                      <img src={p.image_url || "/players/default.png"} alt={p.name} className={`w-full h-full object-cover transition-opacity ${isSelected ? "opacity-100" : "opacity-70"}`} />
                    </div>
                    
                    <div className="text-center">
                      <div className="font-bold text-xs text-white truncate">{p.name}</div>
                      <div className="text-[9px] text-gray-500 mt-0.5">{p.position}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Submit button */}
            <div className="fixed bottom-6 left-4 right-4 md:left-64 md:right-8 z-50 max-w-2xl mx-auto">
              <button
                onClick={submitVote}
                disabled={selectedIds.length !== 3 || submitting}
                className="w-full py-4 rounded-2xl font-black text-lg transition-all shadow-xl"
                style={{
                  background: selectedIds.length === 3 ? "var(--primary)" : "#2a2a3a",
                  color: selectedIds.length === 3 ? "#000" : "#666",
                  transform: selectedIds.length === 3 ? "translateY(-4px)" : "translateY(0)"
                }}
              >
                {submitting ? "Submitting..." : selectedIds.length === 3 ? "Confirm Vote 🚀" : `Pick ${3 - selectedIds.length} more`}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}