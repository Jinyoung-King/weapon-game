import React, { useState, useEffect } from 'react';
import { Pickaxe, Zap, TrendingUp, Coins, Gem, Sparkles, Box, Hammer, Activity, LayoutGrid, Clock } from 'lucide-react';

export function MineView({ state, actions }) {
  const { game, combat, ui } = state;
  const { gold, stones, playerData, equipment } = game;
  const { activeBuffs } = combat;
  const [isPulsing, setIsPulsing] = useState(false);
  const [lootHistory, setLootHistory] = useState([]);

  const wealthMult = activeBuffs.filter(b => b.effect === 'wealth_bonus').reduce((acc, b) => acc * b.value, 1);
  const baseYield = (playerData.level * 2 + (equipment.weapon + equipment.armor + equipment.ring));
  const yieldGoldPer3s = Math.floor(baseYield * wealthMult);
  const goldPerSec = (yieldGoldPer3s / 3).toFixed(1);
  const stoneChance = (0.05 + (activeBuffs.find(b => b.effect === 'farm_bonus_p')?.value || 0)) * 100;

  const totalEquipLevel = (equipment.weapon + equipment.armor + equipment.ring) || 1;
  const weaponWeight = (equipment.weapon / totalEquipLevel * 100).toFixed(0);
  const armorWeight = (equipment.armor / totalEquipLevel * 100).toFixed(0);
  const ringWeight = (equipment.ring / totalEquipLevel * 100).toFixed(0);

  const handleManualPulse = () => {
    if (isPulsing) return;
    setIsPulsing(true);
    const bonusGold = Math.floor(yieldGoldPer3s * 0.5);
    actions.completeMining(bonusGold, 0);
    const newLoot = { id: Date.now(), text: `+${bonusGold}G (펄스 보너스)`, type: 'gold' };
    setLootHistory(prev => [newLoot, ...prev.slice(0, 4)]);
    setTimeout(() => setIsPulsing(false), 2000);
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 pb-28 px-4 text-zinc-300">
      <div className="w-full flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" /> 생산 제어실
          </h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none">Ancient Mineral Hub</p>
        </div>
        <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-emerald-500 uppercase">System Online</span>
        </div>
      </div>

      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 relative overflow-hidden shadow-2xl mb-6">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <LayoutGrid className="w-32 h-32" />
        </div>
        <div className="flex flex-col items-center py-6 relative z-10">
          <div className={`relative mb-8 transition-transform duration-500 ${isPulsing ? 'scale-110' : ''}`}>
            <div className={`absolute -inset-8 bg-emerald-500/20 rounded-full blur-3xl transition-opacity duration-300 ${isPulsing ? 'opacity-100' : 'opacity-0'}`} />
            <div className="w-32 h-32 bg-zinc-950 rounded-full border-4 border-zinc-800 shadow-inner flex items-center justify-center relative">
              <div className={`absolute inset-2 border-2 border-dashed border-zinc-700 rounded-full ${isPulsing ? 'animate-spin' : 'animate-[spin_10s_linear_infinite]'}`} />
              <Pickaxe className={`w-16 h-16 text-zinc-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] ${isPulsing ? 'animate-bounce text-emerald-400' : ''}`} />
              <button 
                onClick={handleManualPulse}
                disabled={isPulsing}
                className={`absolute -bottom-2 px-4 py-1.5 rounded-full border-2 font-black text-[10px] transition-all uppercase tracking-tighter
                ${isPulsing ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : 'bg-emerald-600 border-emerald-400 text-white hover:bg-emerald-500 shadow-[0_4px_15px_rgba(16,185,129,0.4)] hover:-translate-y-0.5'}`}
              >
                {isPulsing ? 'Charging...' : 'Overdrive Pulse'}
              </button>
            </div>
          </div>
          <div className="w-full grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-zinc-500 uppercase mb-1">골드 수확량</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">{goldPerSec}</span>
                <span className="text-[10px] font-black text-yellow-500 font-mono">G/s</span>
              </div>
            </div>
            <div className="flex flex-col items-center border-l border-zinc-800">
              <span className="text-[10px] font-bold text-zinc-500 uppercase mb-1">강화석 발견</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">{stoneChance.toFixed(1)}</span>
                <span className="text-[10px] font-black text-emerald-400">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-4 text-zinc-400">
          <TrendingUp className="w-4 h-4" />
          <span className="text-[11px] font-black uppercase tracking-widest">생산 효율 분석</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Weapon', value: weaponWeight, color: 'bg-red-500' },
            { label: 'Armor', value: armorWeight, color: 'bg-blue-500' },
            { label: 'Ring', value: ringWeight, color: 'bg-emerald-500' }
          ].map(item => (
            <div key={item.label} className="bg-black/30 rounded-xl p-2 border border-zinc-800/50">
              <div className="text-[8px] font-black text-zinc-500 uppercase mb-1 tracking-tight">{item.label}</div>
              <div className="text-sm font-black text-white mb-2">{item.value}%</div>
              <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full ${item.color} transition-all duration-1000`} style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full space-y-2">
        {lootHistory.length > 0 ? lootHistory.map(loot => (
          <div key={loot.id} className="w-full bg-zinc-900/40 border border-zinc-800/30 rounded-xl px-4 py-2 flex justify-between items-center animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <div className={`w-1 h-1 rounded-full ${loot.type === 'gold' ? 'bg-yellow-500' : 'bg-emerald-500'}`} />
              <span className="text-xs font-bold text-zinc-300">{loot.text}</span>
            </div>
            <span className="text-[9px] font-bold text-zinc-600 uppercase">Just Now</span>
          </div>
        )) : (
          <div className="w-full py-8 border-2 border-dashed border-zinc-900 rounded-2xl flex flex-col items-center justify-center opacity-30">
            <Clock className="w-6 h-6 text-zinc-600 mb-2" />
            <span className="text-[10px] font-black uppercase text-zinc-600">No recent pulse activity</span>
          </div>
        )}
      </div>

      <p className="mt-6 text-[9px] text-zinc-600 font-bold text-center leading-relaxed">
        생산 효율은 캐릭터 레벨과 장위의 총 레벨 합에 비례합니다.<br/>
        장비를 강화하여 더 많은 자원을 확보하세요.
      </p>
    </div>
  );
}
