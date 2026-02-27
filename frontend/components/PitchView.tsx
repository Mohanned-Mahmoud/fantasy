"use client";

import { useRef } from "react";
import { Player } from "@/lib/api";

interface PitchPlayer {
  player: Player;
  isCaptain: boolean;
  stat?: any; // دي اللي بتستقبل الإحصائيات عشان نرسم عليها الباجات
}

interface PitchViewProps {
  players: PitchPlayer[];
  onPlayerClick?: (player: Player) => void;
  onCaptainToggle?: (playerId: number) => void;
}

// ألوان المراكز
const posColors: Record<string, string> = {
  GK: "#f59e0b",
  DEF: "#3b82f6",
  MID: "#8b5cf6",
  ATT: "#ef4444",
};

// تحديد "خطوط" الملعب لكل مركز (الارتفاع الرأسي)
const rowVerticalPosition: Record<string, string> = {
  GK: "85%",
  DEF: "65%",
  MID: "40%",
  ATT: "18%",
};

// كود شكل الخماسي المنتظم للباجات
const PENTAGON_CLIP = "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)";

// الدالة اللي بتختبر الأرقام وتدي الباجات
function getBadges(stat: any) {
  if (!stat) return [];
  const badges = [];
  
  // باجات الأساطير
  if (stat.goals >= 5) badges.push({ id: 'sniper', emoji: '🎯', title: 'Sniper (5+ Goals)', bg: '#ef4444' });
  if (stat.assists >= 4) badges.push({ id: 'maestro', emoji: '🎩', title: 'The Maestro (4+ Assists)', bg: '#3b82f6' });
  if (stat.saves >= 15) badges.push({ id: 'wall', emoji: '🧱', title: 'The Wall (10+ Saves)', bg: '#ea580c' });
  if (stat.penalties_saved >= 1) badges.push({ id: 'octopus', emoji: '🐙', title: 'Penalty Killer', bg: '#9333ea' });
  if (stat.clean_sheet >= 2) badges.push({ id: 'minister', emoji: '🛑', title: 'Minister of Defense', bg: '#475569' });
  if (stat.mvp_rank === 1) badges.push({ id: 'goat', emoji: '👑', title: 'The GOAT (MVP 1st)', bg: '#eab308' });
  if (stat.nutmegs >= 4) badges.push({ id: 'ankle', emoji: '🌀', title: 'Ankle Breaker (2+ Nutmegs)', bg: '#06b6d4' });
  if (stat.matches_won >= 4) badges.push({ id: 'lucky', emoji: '🍀', title: 'Lucky Charm (4+ Wins)', bg: '#10b981' });
  
  // باجات السف والتحفيل
  if (stat.own_goals > 0) badges.push({ id: 'agent', emoji: '🕵️', title: 'Double Agent (Own Goal)', bg: '#1f2937' });
  if (stat.penalties_missed > 0) badges.push({ id: 'freeze', emoji: '📉', title: 'Brain Freeze (Missed Penalty)', bg: '#4f46e5' });
  if (stat.defensive_errors >= 4) badges.push({ id: 'disaster', emoji: '⚠️', title: 'Walking Disaster (2+ Errors)', bg: '#b91c1c' });
  
  return badges;
}

export default function PitchView({ players, onPlayerClick, onCaptainToggle }: PitchViewProps) {
  const lastTapTimeRef = useRef(0);
  const lastTapPlayerIdRef = useRef<number | null>(null);

  function handlePlayerTouchEnd(playerId: number) {
    if (!onCaptainToggle) return;

    const now = Date.now();
    const isSamePlayer = lastTapPlayerIdRef.current === playerId;
    const isDoubleTap = isSamePlayer && now - lastTapTimeRef.current < 350;

    if (isDoubleTap) {
      onCaptainToggle(playerId);
      lastTapTimeRef.current = 0;
      lastTapPlayerIdRef.current = null;
      return;
    }

    lastTapTimeRef.current = now;
    lastTapPlayerIdRef.current = playerId;
  }
  
  // دالة لتوزيع اللاعبين عرضياً بشكل متساوي
  const getDynamicPositions = (currentPlayers: PitchPlayer[]) => {
    const groups: Record<string, PitchPlayer[]> = { GK: [], DEF: [], MID: [], ATT: [] };
    
    // تجميع اللاعبين حسب مراكزهم
    currentPlayers.forEach(pp => {
      const pos = pp.player.position.toUpperCase();
      if (groups[pos]) groups[pos].push(pp);
    });

    const result: Array<PitchPlayer & { top: string; left: string; label: string }> = [];

    // حساب إحداثيات كل مركز
    Object.entries(groups).forEach(([pos, pps]) => {
      const count = pps.length;
      const top = rowVerticalPosition[pos];

      pps.forEach((pp, index) => {
        let left = "50%"; // الافتراضي لو لاعب واحد يكون في النص
        
        if (count > 1) {
          // توزيع المسافات: مثلاً لو 2 لعيبة يبقوا عند 25% و 75%
          left = `${(index + 1) * (100 / (count + 1))}%`;
        }

        result.push({ ...pp, top, left, label: pos });
      });
    });

    return result;
  };

  const positioned = getDynamicPositions(players);

  return (
    <div
      className="pitch-bg relative w-full rounded-xl overflow-hidden select-none"
      style={{ paddingBottom: "140%", maxWidth: "360px", margin: "0 auto" }}
    >
      {/* رسم خطوط الملعب */}
      <div className="absolute inset-0">
        <div className="absolute rounded-full border-2 border-white/10" style={{ top: "35%", left: "15%", width: "70%", height: "30%" }} />
        <div className="absolute border-b-2 border-white/10" style={{ top: "50%", left: "5%", right: "5%" }} />
        <div className="absolute border-2 border-white/10" style={{ top: "78%", left: "20%", width: "60%", height: "18%" }} />
        <div className="absolute border-2 border-white/10" style={{ top: "4%", left: "20%", width: "60%", height: "18%" }} />
      </div>

      {positioned.map((pp, idx) => {
        const badges = getBadges(pp.stat); // بنجيب باجات اللاعب ده

        return (
          <div
            key={`${pp.player.id}-${idx}`}
            onClick={() => onPlayerClick?.(pp.player)}
            onTouchEnd={() => handlePlayerTouchEnd(pp.player.id)}
            className="absolute flex flex-col items-center gap-1 transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-all duration-500 ease-in-out"
            style={{ top: pp.top, left: pp.left, zIndex: 10 }}
          >
            <div className="relative">
              
              {/* ── هنا السحر بتاع الباجات الخماسية ── */}
              {badges.length > 0 && (
                <div className="absolute -top-4 -right-4 flex -space-x-2 z-40">
                  {badges.map((badge) => (
                    <div 
                      key={badge.id} 
                      className="w-6 h-6 flex items-center justify-center bg-gradient-to-br from-yellow-200 to-yellow-600 shadow-[0_0_10px_rgba(0,0,0,0.5)] transform hover:scale-125 transition-transform"
                      style={{ clipPath: PENTAGON_CLIP }}
                      title={badge.title}
                    >
                      <div 
                        className="w-[20px] h-[20px] flex items-center justify-center"
                        style={{ background: badge.bg, clipPath: PENTAGON_CLIP }}
                      >
                        <span className="text-[10px] filter drop-shadow-md">{badge.emoji}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div
                className="w-14 h-14 rounded-full overflow-hidden shadow-lg border-2 transition-transform group-hover:scale-110 flex items-center justify-center bg-[#1a1a24]"
                style={{
                  borderColor: pp.isCaptain ? "#38ff7e" : "rgba(255,255,255,0.3)",
                  boxShadow: pp.isCaptain ? "0 0 15px rgba(56,255,126,0.5)" : undefined,
                }}
              >
                {pp.player.image_url ? (
                  <img src={pp.player.image_url} alt={pp.player.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-xs">{pp.player.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              
              {pp.isCaptain && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black z-20 shadow-md" style={{ background: "#38ff7e", color: "#0f0f13" }}>
                  C
                </div>
              )}
            </div>

            <div className="px-2 py-0.5 rounded text-[10px] font-semibold text-white max-w-[80px] truncate text-center shadow-sm" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}>
              {pp.player.name.split(" ").pop()}
            </div>

            {/* نقط اللاعب في الجولة (لو موجودة) */}
            {pp.stat && (
              <div className="text-[9px] font-black text-yellow-400 bg-black/60 px-1.5 py-0.5 rounded shadow-lg border border-yellow-400/20">
                {pp.stat.points} pts
              </div>
            )}

            {onCaptainToggle && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCaptainToggle(pp.player.id); }}
                className="text-[9px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity mt-1 bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                {pp.isCaptain ? "Captain ✓" : "Set C"}
              </button>
            )}
          </div>
        );
      })}

      {players.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
          <div className="text-center">
            <div className="text-4xl mb-2 opacity-50">🏟️</div>
            <div className="text-sm font-medium text-white/60">Build your lineup</div>
          </div>
        </div>
      )}
    </div>
  );
}