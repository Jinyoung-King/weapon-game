import { Pickaxe, Hammer, ScrollText, Timer, Coins, Gem } from 'lucide-react';
import { ENHANCE_TIERS } from '../../config/constants';

export function ActionButtons({ game, ui, combat, actions }) {
  const { gold, stones, appraisals, equipment } = game;
  const { isMining, mineCharge, isAnimating, selectedEquip, logs } = ui;
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
    <>
      <div className="w-full max-w-md grid grid-cols-2 gap-3 mb-4">
        <button onMouseDown={actions.startMining} onMouseUp={actions.stopMining} onMouseLeave={actions.stopMining} onTouchStart={actions.startMining} onTouchEnd={actions.stopMining} className={`relative h-20 rounded-2xl border-2 flex flex-col items-center justify-center transition-all overflow-hidden ${isMining ? 'bg-zinc-800 border-blue-500' : 'bg-zinc-900 border-zinc-800'}`}>
          {isMining && <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-75" style={{ width: `${mineCharge}%` }} />}
          <Pickaxe className={`w-6 h-6 mb-1 ${isMining ? 'animate-bounce text-blue-400' : 'text-zinc-500'}`} /><span className="text-xs font-bold uppercase">{isMining ? '채광 중...' : '길게 눌러 채광'}</span>
        </button>
        <button onClick={actions.handleEnhance} disabled={isAnimating || isMining || !canEnhance} className="h-20 bg-blue-600 hover:bg-blue-500 rounded-2xl flex flex-col items-center justify-center transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 group">
          <Hammer className={`w-6 h-6 mb-1 ${isAnimating ? 'animate-spin' : ''}`} />
          <span className="text-xs font-black uppercase">강화</span>
          <div className="flex gap-2 mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
            <span className={`text-[9px] font-mono flex items-center gap-0.5 ${gold < finalGoldCost ? 'text-red-300' : 'text-blue-100'}`}><Coins className="w-2.5 h-2.5" />{finalGoldCost.toLocaleString()}</span>
            <span className={`text-[9px] font-mono flex items-center gap-0.5 ${stones < finalStoneCost ? 'text-red-300' : 'text-blue-100'}`}><Gem className="w-2.5 h-2.5" />{finalStoneCost}</span>
          </div>
        </button>
      </div>

      <button onClick={actions.handleAppraisal} disabled={isAnimating || isMining || !canAppraise} className="w-full max-w-md h-12 bg-zinc-900 border border-zinc-800 rounded-xl mb-4 flex items-center justify-center gap-2 hover:bg-zinc-800 disabled:opacity-30">
        <ScrollText className="w-4 h-4 text-zinc-500" />
        <span className="text-xs font-bold uppercase">
          {appraisals[selectedEquip] ? `다시 감정 (${appraisalCost.toLocaleString()}G)` : `장비 감정 (${appraisalCost.toLocaleString()}G)`}
        </span>
      </button>

      <div className="w-full max-w-md bg-black border border-zinc-900 rounded-2xl p-4 h-32 overflow-hidden flex flex-col mb-10 text-zinc-300">
        <div className="flex items-center gap-2 mb-2 text-[10px] font-black text-zinc-600 uppercase"><Timer className="w-3 h-3" /> 시스템 피드</div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {logs.slice().reverse().map(log => (
            <div key={log.id} className={`text-[10px] font-mono p-1 rounded text-left flex gap-1.5 ${log.type === 'success' ? 'text-green-400 bg-green-400/5' : log.type === 'danger' ? 'text-red-400 bg-red-400/5' : log.type === 'warning' ? 'text-yellow-400 bg-yellow-400/5' : 'text-zinc-500'}`}>
              <span className="opacity-40 shrink-0">[{new Date(log.at || Date.now()).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span> 
              <span className="flex-1 leading-relaxed">{String(log.text)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
