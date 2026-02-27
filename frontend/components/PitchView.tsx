"use client";

import { useRef, useState, useEffect } from "react";
import { Player } from "@/lib/api";

interface PitchPlayer {
  player: Player;
  isCaptain: boolean;
  stat?: any;
}

interface PitchViewProps {
  players: PitchPlayer[];
  onPlayerClick?: (player: Player) => void;
  onCaptainToggle?: (playerId: number) => void;
}

const posColors: Record<string, string> = {
  GK: "#f59e0b",
  DEF: "#3b82f6",
  MID: "#8b5cf6",
  ATT: "#ef4444",
};

// 🌟 وسعنا المسافات بين الخطوط عشان نمنع التداخل (Overlap)
const rowVerticalPosition: Record<string, string> = {
  GK: "88%",
  DEF: "66%",
  MID: "41%",
  ATT: "16%",
};

const PENTAGON_CLIP = "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)";

function getBadges(stat: any) {
  if (!stat) return [];
  const badges = [];
  
  const goals = Number(stat.goals) || 0;
  const assists = Number(stat.assists) || 0;
  const saves = Number(stat.saves) || 0;
  const ps = Number(stat.penalties_saved) || 0;
  const cs = Number(stat.clean_sheet) || 0;
  const mvp = Number(stat.mvp_rank) || 0;
  const nutmegs = Number(stat.nutmegs) || 0;
  const won = Number(stat.matches_won) || 0;
  const og = Number(stat.own_goals) || 0;
  const pm = Number(stat.penalties_missed) || 0;
  const errors = Number(stat.defensive_errors) || 0;

  if (goals >= 5) badges.push({ id: 'sniper', emoji: '🎯', title: 'Sniper (5+ Goals)', bg: '#ef4444' });
  if (assists >= 4) badges.push({ id: 'maestro', emoji: '🎩', title: 'The Maestro (4+ Assists)', bg: '#3b82f6' });
  if (saves >= 10) badges.push({ id: 'wall', emoji: '🧱', title: 'The Wall (10+ Saves)', bg: '#ea580c' });
  if (ps >= 1) badges.push({ id: 'octopus', emoji: '🐙', title: 'Penalty Killer', bg: '#9333ea' });
  if (cs >= 2) badges.push({ id: 'minister', emoji: '🛑', title: 'Minister of Defense', bg: '#475569' });
  if (mvp === 1) badges.push({ id: 'goat', emoji: '👑', title: 'The GOAT (MVP 1st)', bg: '#eab308' });
  if (nutmegs >= 2) badges.push({ id: 'ankle', emoji: '🌀', title: 'Ankle Breaker (2+ Nutmegs)', bg: '#06b6d4' });
  if (won >= 4) badges.push({ id: 'lucky', emoji: '🍀', title: 'Lucky Charm (4+ Wins)', bg: '#10b981' });
  
  if (og > 0) badges.push({ id: 'agent', emoji: '🕵️', title: 'Double Agent (Own Goal)', bg: '#1f2937' });
  if (pm > 0) badges.push({ id: 'freeze', emoji: '📉', title: 'Brain Freeze (Missed Penalty)', bg: '#4f46e5' });
  if (errors >= 2) badges.push({ id: 'disaster', emoji: '⚠️', title: 'Walking Disaster (2+ Errors)', bg: '#b91c1c' });
  
  return badges;
}

export default function PitchView({ players, onPlayerClick, onCaptainToggle }: PitchViewProps) {
  const lastTapTimeRef = useRef(0);
  const lastTapPlayerIdRef = useRef<number | null>(null);

  const [toastBadge, setToastBadge] = useState<{ emoji: string, title: string, bg: string } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  function handleBadgeClick(e: React.MouseEvent | React.TouchEvent, badge: any) {
    e.stopPropagation();
    setToastBadge(badge);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => { setToastBadge(null); }, 3000);
  }

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
  
  const getDynamicPositions = (currentPlayers: PitchPlayer[]) => {
    const groups: Record<string, PitchPlayer[]> = { GK: [], DEF: [], MID: [], ATT: [] };
    currentPlayers.forEach(pp => {
      const pos = pp.player.position.toUpperCase();
      if (groups[pos]) groups[pos].push(pp);
    });

    const result: Array<PitchPlayer & { top: string; left: string; label: string }> = [];

    Object.entries(groups).forEach(([pos, pps]) => {
      const count = pps.length;
      const top = rowVerticalPosition[pos];
      pps.forEach((pp, index) => {
        let left = "50%"; 
        if (count > 1) left = `${(index + 1) * (100 / (count + 1))}%`;
        result.push({ ...pp, top, left, label: pos });
      });
    });
    return result;
  };

  const positioned = getDynamicPositions(players);

  return (
    <div
      className="pitch-bg relative w-full rounded-xl select-none"
      style={{ paddingBottom: "140%", maxWidth: "360px", margin: "0 auto", overflow: "visible" }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-xl">
        <div className="absolute rounded-full border-2 border-white/10" style={{ top: "35%", left: "15%", width: "70%", height: "30%" }} />
        <div className="absolute border-b-2 border-white/10" style={{ top: "50%", left: "5%", right: "5%" }} />
        <div className="absolute border-2 border-white/10" style={{ top: "78%", left: "20%", width: "60%", height: "18%" }} />
        <div className="absolute border-2 border-white/10" style={{ top: "4%", left: "20%", width: "60%", height: "18%" }} />
      </div>

      {positioned.map((pp, idx) => {
        const badges = getBadges(pp.stat);

        return (
          <div
            key={`${pp.player.id}-${idx}`}
            onClick={() => onPlayerClick?.(pp.player)}
            onTouchEnd={() => handlePlayerTouchEnd(pp.player.id)}
            className="absolute flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-all duration-500 ease-in-out z-20 hover:z-50"
            style={{ top: pp.top, left: pp.left }}
          >
            <div className="relative">
              
              {/* ── حاوية الباجات ── */}
              {badges.length > 0 && (
                <div className="absolute -top-1 -right-2 flex -space-x-1.5 z-50">
                  {badges.map((badge) => (
                    <div 
                      key={badge.id} 
                      onClick={(e) => handleBadgeClick(e, badge)}
                      className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-gradient-to-br from-yellow-200 to-yellow-600 shadow-[0_0_8px_rgba(0,0,0,0.8)] transform hover:scale-125 transition-transform cursor-pointer"
                      style={{ clipPath: PENTAGON_CLIP }}
                      title={badge.title}
                    >
                      <div 
                        className="w-[16px] h-[16px] sm:w-[19px] sm:h-[19px] flex items-center justify-center"
                        style={{ background: badge.bg, clipPath: PENTAGON_CLIP }}
                      >
                        <span className="text-[11px] sm:text-[14px] filter drop-shadow-md leading-none flex items-center justify-center pointer-events-none">{badge.emoji}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 🌟 الصورة بتصغر سنة على الموبايل وبتكبر في الشاشات العادية */}
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shadow-xl border-2 transition-transform group-hover:scale-110 flex items-center justify-center bg-[#1a1a24] relative z-30"
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
                <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black z-40 shadow-md" style={{ background: "#38ff7e", color: "#0f0f13" }}>
                  C
                </div>
              )}
            </div>

            {/* 🌟 كبسولة الاسم والنقط المدمجة (وفرت مساحة كبيرة جداً) */}
            <div className="mt-1 flex flex-col items-center rounded overflow-hidden shadow-sm border border-white/10 relative z-30" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}>
              <div className="px-2 py-[2px] text-[9px] sm:text-[10px] font-bold text-white max-w-[80px] truncate text-center w-full">
                {pp.player.name.split(" ").pop()}
              </div>
              {pp.stat && (
                <div className="px-2 py-[1px] text-[8px] sm:text-[9px] font-black text-yellow-400 bg-white/10 border-t border-white/10 w-full text-center">
                  {pp.stat.points ?? 0} pts
                </div>
              )}
            </div>

            {onCaptainToggle && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCaptainToggle(pp.player.id); }}
                className="text-[9px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity mt-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 relative z-30"
              >
                {pp.isCaptain ? "Captain ✓" : "Set C"}
              </button>
            )}
          </div>
        );
      })}

      {/* رسالة الموبايل العائمة (Toast) */}
      {toastBadge && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[100] w-[90%] max-w-[280px] transition-all duration-300 pointer-events-none">
          <div 
            className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.9)] border border-white/10"
            style={{ background: "rgba(20, 20, 25, 0.95)", backdropFilter: "blur(8px)" }}
          >
            <div 
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center shadow-inner"
              style={{ background: toastBadge.bg, clipPath: PENTAGON_CLIP }}
            >
              <span className="text-[18px] filter drop-shadow-md">{toastBadge.emoji}</span>
            </div>
            <div className="flex-1 font-black text-[13px] text-white leading-tight">
              {toastBadge.title}
            </div>
          </div>
        </div>
      )}

      {players.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] rounded-xl">
          <div className="text-center">
            <div className="text-4xl mb-2 opacity-50">🏟️</div>
            <div className="text-sm font-medium text-white/60">Build your lineup</div>
          </div>
        </div>
      )}
    </div>
  );
}