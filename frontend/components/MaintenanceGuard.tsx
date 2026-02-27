"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getUser } from "@/lib/auth";
import { motion } from "framer-motion";

export default function MaintenanceGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  
  // 🔴 غيّر دي لـ false لما تخلص صيانة وعايز تفتح اللعبة للكل
  const MAINTENANCE_MODE = true; 

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null; 

  const user = getUser();
  const isAdmin = user?.is_admin === true;

  // بنسمح بصفحة اللوجين والريجيستر عشان الأدمن يقدر يسجل دخول
  if (pathname === "/login" || pathname === "/register") {
    return <>{children}</>;
  }

  // لو وضع الصيانة شغال واليوزر مش أدمن، هنظهرله التصميم بتاعك
  if (MAINTENANCE_MODE && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans" dir="rtl">
        {/* Animated Background Blobs */}
        <div className="absolute top-[10%] left-[20%] w-96 h-96 bg-emerald-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-1000" />
        <div className="absolute bottom-[10%] right-[20%] w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-1000 delay-500" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.02)_0%,rgba(0,0,0,0)_80%)]" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-lg w-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl rounded-[2rem] p-8 md:p-10 text-center shadow-2xl relative z-10"
        >
          {/* Engineer Sticker Container */}
          <div className="relative w-56 h-56 mx-auto mb-8">
            <motion.img 
              src="/sleeping-engineer.png" 
              alt="Sleeping Engineer" 
              className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(16,185,129,0.2)]"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Zzzzz Animations */}
            <motion.div 
              className="absolute top-2 right-12 text-3xl font-black text-emerald-400/80"
              animate={{ opacity: [0, 1, 0], y: [0, -30, -50], x: [0, 15, 30], scale: [0.8, 1.2, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0 }}
            >
              Z
            </motion.div>
            <motion.div 
              className="absolute -top-4 right-2 text-4xl font-black text-emerald-400/60"
              animate={{ opacity: [0, 1, 0], y: [0, -30, -60], x: [0, 15, 30], scale: [0.8, 1.5, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 1 }}
            >
              z
            </motion.div>
          </div>

          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/5 text-sm font-semibold text-white/80 mb-6">
              🛠️ تحديثات النظام
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
              في صيانة دلوقتي
            </h1>
            
            <p className="text-2xl text-emerald-400 font-bold mb-8">
              يلا عشان هنرش مياه 🧹💦
            </p>
            
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent mb-8" />
            
            <p className="text-zinc-400 text-base md:text-lg leading-relaxed mb-8">
              بنجهزلك أقوى تجربة <span className="text-white font-semibold">فانتسي خماسي</span>... <br/>
              المهندس بتاعنا مريح شوية وهنرجع أقوى من الأول!
            </p>

            {/* Loading Dots */}
            <div className="flex justify-center items-center gap-3">
              <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // لو أدمن أو الصيانة مقفولة، هيشوف الموقع عادي
  return <>{children}</>;
}