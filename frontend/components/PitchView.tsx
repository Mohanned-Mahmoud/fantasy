"use client";

import { Player } from "@/lib/api";

interface PitchPlayer {
  player: Player;
  isCaptain: boolean;
}

interface PitchViewProps {
  players: PitchPlayer[];
  onPlayerClick?: (player: Player) => void;
  onCaptainToggle?: (playerId: number) => void;
}

const positionLayout: Record<string, { top: string; left: string; label: string }[]> = {
  GK: [{ top: "82%", left: "50%", label: "GK" }],
  DEF: [
    { top: "60%", left: "25%", label: "DEF" },
    { top: "60%", left: "75%", label: "DEF" },
  ],
  MID: [
    { top: "40%", left: "25%", label: "MID" },
    { top: "40%", left: "75%", label: "MID" },
  ],
  ATT: [
    { top: "20%", left: "50%", label: "ATT" },
  ],
};

function groupByPosition(players: PitchPlayer[]) {
  const groups: Record<string, PitchPlayer[]> = { GK: [], DEF: [], MID: [], ATT: [] };
  for (const pp of players) {
    const pos = pp.player.position.toUpperCase();
    if (groups[pos]) {
      groups[pos].push(pp);
    } else {
      groups["ATT"].push(pp);
    }
  }
  return groups;
}

function getPlayerPositions(players: PitchPlayer[]): Array<PitchPlayer & { top: string; left: string; label: string }> {
  const groups = groupByPosition(players);
  const result: Array<PitchPlayer & { top: string; left: string; label: string }> = [];

  for (const [pos, pps] of Object.entries(groups)) {
    const slots = positionLayout[pos] || [];
    pps.forEach((pp, i) => {
      const slot = slots[i] || { top: "50%", left: "50%", label: pos };
      result.push({ ...pp, ...slot });
    });
  }
  return result;
}

const posColors: Record<string, string> = {
  GK: "#f59e0b",
  DEF: "#3b82f6",
  MID: "#8b5cf6",
  ATT: "#ef4444",
};

export default function PitchView({ players, onPlayerClick, onCaptainToggle }: PitchViewProps) {
  const positioned = getPlayerPositions(players);

  return (
    <div
      className="pitch-bg relative w-full rounded-xl overflow-hidden select-none"
      style={{ paddingBottom: "140%", maxWidth: "360px", margin: "0 auto" }}
    >
      <div className="absolute inset-0">
        <div
          className="absolute rounded-full border-2 border-white/20"
          style={{ top: "35%", left: "15%", width: "70%", height: "30%", borderStyle: "solid" }}
        />
        <div
          className="absolute rounded-full border-2 border-white/20"
          style={{ top: "43%", left: "36%", width: "28%", height: "14%", borderStyle: "solid" }}
        />
        <div className="absolute border-b-2 border-white/20" style={{ top: "50%", left: "5%", right: "5%", height: 0 }} />
        <div className="absolute border-2 border-white/20" style={{ top: "78%", left: "25%", width: "50%", height: "14%" }} />
        <div className="absolute border-2 border-white/20" style={{ top: "8%", left: "25%", width: "50%", height: "14%" }} />
      </div>

      {positioned.map((pp, idx) => (
        <div
          key={idx}
          onClick={() => {
            if (onPlayerClick) onPlayerClick(pp.player);
          }}
          className="absolute flex flex-col items-center gap-1 transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer outline-none"
          style={{ top: pp.top, left: pp.left, zIndex: 10 }}
        >
          <div className="relative">
            {/* التعديل الجوهري: إضافة الصورة الحقيقية للاعب */}
            <div
              className="w-14 h-14 rounded-full overflow-hidden shadow-lg border-2 transition-transform group-hover:scale-110 flex items-center justify-center bg-[#1a1a24]"
              style={{
                borderColor: pp.isCaptain ? "#38ff7e" : "rgba(255,255,255,0.3)",
                boxShadow: pp.isCaptain ? "0 0 12px rgba(56,255,126,0.6)" : undefined,
              }}
            >
              {pp.player.image_url ? (
                <img 
                  src={pp.player.image_url} 
                  alt={pp.player.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // في حال فشل تحميل الصورة يظهر بدلاً منها الحروف الأولى
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-white font-bold text-xs">
                  {pp.player.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            
            {pp.isCaptain && (
              <div
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black z-20"
                style={{ background: "#38ff7e", color: "#0f0f13" }}
              >
                C
              </div>
            )}
          </div>

          <div
            className="px-2 py-0.5 rounded text-xs font-semibold text-white max-w-[70px] truncate text-center"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          >
            {pp.player.name.split(" ").slice(-1)[0]}
          </div>
          <div
            className="px-1.5 py-0.5 rounded text-xs font-bold"
            style={{ background: posColors[pp.player.position.toUpperCase()] || "#6b7280", color: "white", fontSize: "10px" }}
          >
            {pp.label}
          </div>
          
          {onCaptainToggle && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCaptainToggle(pp.player.id);
              }}
              className="text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity mt-1"
              style={{ background: "rgba(56,255,126,0.2)", color: "#38ff7e", fontSize: "10px" }}
            >
              {pp.isCaptain ? "Captain ✓" : "Set C"}
            </button>
          )}
        </div>
      ))}

      {players.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="text-4xl mb-3">👥</div>
            <div className="text-sm font-medium text-white/70">No players selected yet</div>
            <div className="text-xs text-white/40 mt-1">Go to Squad to pick your team</div>
          </div>
        </div>
      )}
    </div>
  );
}