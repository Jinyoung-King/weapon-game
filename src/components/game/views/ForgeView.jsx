import React from 'react';
import { EquipmentPanel } from '../EquipmentPanel';
import { Hammer, ScrollText, Coins, Gem, Target, Sparkles } from 'lucide-react';
import { ENHANCE_TIERS, EQUIP_TYPES } from '../../../config/constants';

export function ForgeView({ state, actions }) {
  const { game, ui, combat } = state;
  const { gold, stones, appraisals, equipment } = game;
  const { isAnimating, selectedEquip, logs } = ui;
  const { activeBuffs } = combat;

  const currentLevel = equipment[selectedEquip];
  const enhanceConfig = ENHANCE_TIERS.find(t => currentLevel < t.threshold) || ENHANCE_TIERS[ENHANCE_TIERS.length - 1];
  const costReduction = activeBuffs.filter(b => b.effect === 'enhance_cost_reduction').reduce((acc, b) => acc + b.value, 0);
  const finalGoldCost = Math.floor(enhanceConfig.gold * (1 - costReduction));
  const finalStoneCost = Math.max(1, Math.floor(enhanceConfig.stone * (1 - costReduction)));
  const canEnhance = gold >= finalGoldCost && stones >= finalStoneCost;

  const appraisalCost = 500 + (currentLevel * 250);
  const canAppraise = gold >= appraisalCost;

  return (
    <div className="w-full max-w-md flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 pb-28 px-4">
      {/* 1. 고정 헤더: 장비 선택 탭 */}
      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-2 mb-6 flex gap-1 shadow-2xl">
        {Object.entries(EQUIP_TYPES).map(([key, config]) => {
          const isActive = selectedEquip === key;
          const Icon = config.icon;
          return (
            <button
              key={key}
              onClick={() => actions.setSelectedEquip(key)}
              className={`flex-1 py-3 rounded-2xl flex flex-col items-center gap-1 transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'bg-transparent text-zinc-500 hover:bg-zinc-800'}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase">{config.name}</span>
            </button>
          );
        })}
      </div>

      {/* 2. 장비 상세 패널 */}
      <EquipmentPanel game={game} ui={ui} combat={combat} actions={actions} isCompact={false} />

      {/* 3. 대장간 액션 영역 */}
      <div className="w-full mt-6 space-y-4">
        {/* 강화 버튼 */}
        <button 
          onClick={actions.handleEnhance} 
          disabled={isAnimating || !canEnhance}
          className="w-full h-24 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800/50 disabled:opacity-50 rounded-[2.5rem] flex flex-col items-center justify-center transition-all shadow-xl shadow-blue-900/40 group relative overflow-hidden"
        >
          <div className="flex items-center gap-3 text-white mb-1">
            <Hammer className={`w-8 h-8 ${isAnimating ? 'animate-bounce' : 'group-hover:rotate-12 transition-transform'}`} />
            <span className="text-xl font-black uppercase tracking-widest">강화 시작</span>
          </div>
          <div className="flex gap-4">
             <div className={`flex items-center gap-1.5 text-xs font-bold ${gold < finalGoldCost ? 'text-red-400' : 'text-blue-100'}`}>
                <Coins className="w-4 h-4" /> {finalGoldCost.toLocaleString()}
             </div>
             <div className={`flex items-center gap-1.5 text-xs font-bold ${stones < finalStoneCost ? 'text-red-400' : 'text-blue-100'}`}>
                <Gem className="w-4 h-4" /> {finalStoneCost}
             </div>
          </div>
          {isAnimating && <div className="absolute inset-x-0 bottom-0 h-1 bg-white/30 animate-pulse" />}
        </button>

        {/* 감정 버튼 */}
        <button 
          onClick={actions.handleAppraisal} 
          disabled={isAnimating || !canAppraise}
          className="w-full h-16 bg-zinc-900 border border-zinc-800 hover:border-zinc-500 hover:bg-zinc-800 rounded-2xl flex items-center justify-center gap-4 transition-all disabled:opacity-30 group"
        >
          <div className="p-2 bg-black/40 rounded-xl group-hover:scale-110 transition-transform">
            <ScrollText className="w-5 h-5 text-zinc-400" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-black text-white uppercase">장비 옵션 감정</span>
            <span className="text-[10px] text-zinc-500 font-bold">{appraisalCost.toLocaleString()} G 소모</span>
          </div>
        </button>
      </div>

      {/* 4. 제작 히스토리 (로그) */}
      <div className="w-full mt-8">
        <div className="flex items-center gap-2 mb-4 px-2">
           <Sparkles className="w-4 h-4 text-blue-400" />
           <h3 className="text-xs font-black uppercase text-zinc-500">최근 대장간 기록</h3>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-4 h-40 overflow-y-auto space-y-2">
            {logs.filter(l => l.text.includes('장비') || l.text.includes('강화') || l.text.includes('감정')).slice(0, 5).map(log => (
                <div key={log.id} className={`text-[10px] font-bold p-2 rounded-xl flex gap-3 ${log.type === 'success' ? 'bg-green-500/10 text-green-400' : log.type === 'danger' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800/40 text-zinc-500'}`}>
                    <span className="opacity-30">#</span>
                    <span>{log.text}</span>
                </div>
            ))}
            {logs.length === 0 && <div className="h-full flex items-center justify-center text-[10px] text-zinc-600 font-bold uppercase tracking-widest">기록이 없습니다</div>}
        </div>
      </div>
    </div>
  );
}
