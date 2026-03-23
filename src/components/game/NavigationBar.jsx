import React from 'react';
import { Swords, Hammer, Book, Trophy, Pickaxe } from 'lucide-react';

export function NavigationBar({ currentTab, setCurrentTab, hasNewAchievements }) {
  const tabs = [
    { id: 'COMBAT', icon: Swords, label: '전투' },
    { id: 'FORGE', icon: Hammer, label: '강화' },
    { id: 'MINE', icon: Pickaxe, label: '채광' },
    { id: 'ARCHIVE', icon: Book, label: '도감' },
    { id: 'ARENA', icon: Trophy, label: '투기장', badge: hasNewAchievements }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 border-t border-zinc-800 pb-safe backdrop-blur-md z-50">
      <div className="flex justify-around items-center h-20 max-w-md mx-auto px-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center gap-1.5 transition-all duration-300 relative group ${isActive ? 'text-blue-400 -translate-y-1' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'group-hover:bg-zinc-800'}`}>
                <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? 'opacity-100 scale-110' : 'opacity-60'}`}>
                {tab.label}
              </span>
              
              {tab.id === 'ARENA' && hasNewAchievements && !isActive && (
                <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-zinc-900 animate-pulse" />
              )}
              
              {isActive && (
                <div className="absolute -bottom-2 w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_8px_#60a5fa]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
