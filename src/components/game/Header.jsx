import React from 'react';
import { Settings, MessageSquare, Trophy, Swords, User, Coins, Gem, Infinity as InfinityIcon, ZapOff, BookOpen, LogOut, LayoutGrid } from 'lucide-react';
import { DAILY_QUESTS } from '../../config/constants';

export function Header({ session, game, pvp, ui, actions }) {
  const { playerName, hasLocalPin } = session;
  const { gold, stones, playerData } = game;
  const { isOfflineMode, dailyQuests } = pvp;

  const hasUnclaimedQuest = dailyQuests && dailyQuests.some(q => q.current >= q.goal && !q.claimed);

  return (
    <>
      <div className="fixed top-4 right-4 z-50 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-full px-4 py-2 flex items-center gap-4 shadow-2xl">
        <div className="flex items-center gap-1.5"><Coins className="w-4 h-4 text-yellow-500" /><span className="font-mono font-bold text-sm">{gold.toLocaleString()}</span></div>
        <div className="w-px h-4 bg-zinc-700" />
        <div className="flex items-center gap-1.5"><Gem className="w-4 h-4 text-cyan-400" /><span className="font-mono font-bold text-sm">{stones.toLocaleString()}</span></div>
      </div>

      <div className="w-full max-w-md flex justify-between items-center mb-4 px-2 mt-2">
        <div>
          <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">방랑자</span>
          <h2 className="text-lg font-black flex items-center gap-2">{playerName} <span className="text-blue-500 text-sm">Lv.{playerData.level}</span></h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => actions.setActiveModal('quests')} className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-cyan-400 relative">
            <BookOpen className="w-5 h-5" />
            {hasUnclaimedQuest && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-bounce" />}
          </button>
          <button onClick={() => actions.setActiveModal('pvp')} className="p-2 bg-red-950/40 rounded-lg border border-red-900/50 hover:bg-red-900 text-red-400 relative">
            <Swords className="w-5 h-5" />
            {isOfflineMode && <ZapOff className="w-3 h-3 text-yellow-500 absolute -top-1 -right-1 bg-zinc-900 rounded-full" />}
          </button>
          <button onClick={() => actions.setActiveModal('stats')} className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-blue-400 relative">
            <User className="w-5 h-5" />
            {playerData.traitPoints > 0 && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
          </button>
          <button type="button" onClick={() => actions.handleLogout()} title="로그아웃" className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-500 hover:text-orange-400">
            <LogOut className="w-5 h-5" />
          </button>
          <button onClick={() => actions.setActiveModal('menu')} className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-400 relative">
            <LayoutGrid className="w-5 h-5" />
            {game.hasNewAchievements && <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />}
          </button>
        </div>
      </div>
    </>
  );
}
