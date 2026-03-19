import { Target } from 'lucide-react';
import { getBossConfig } from '../../utils/gameUtils';

export function CombatPanel({ combat, actions }) {
  const { stage, bossHp, damageTexts } = combat;
  const currentBoss = getBossConfig(stage);
  const bossHpPercent = Math.max(0, (bossHp / currentBoss.maxHp) * 100);

  return (
    <div className={`w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4 shadow-xl overflow-hidden ${combat.attackEffects.length > 0 ? 'animate-[shake_0.15s_ease-in-out_infinite]' : ''}`}>
      <style>{`
        @keyframes shake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          25% { transform: translate(-1px, -1px) rotate(-1deg); }
          50% { transform: translate(-2px, 0px) rotate(1deg); }
          75% { transform: translate(1px, 2px) rotate(0deg); }
          100% { transform: translate(1px, -1px) rotate(1deg); }
        }
      `}</style>
      <div className="relative overflow-hidden bg-black/50 rounded-xl p-4 border border-zinc-800/50 text-center">
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {damageTexts.map(t => (
            <div key={t.id} className={`absolute left-1/2 top-1/2 font-black whitespace-nowrap -translate-x-1/2 -translate-y-1/2 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards opacity-0 ${t.isCrit ? 'text-red-400 text-3xl drop-shadow-[0_0_10px_rgba(239,68,68,0.5)] scale-125' : 'text-white text-xl'}`} style={{ transform: `translate(calc(-50% + ${t.x}px), calc(-50% + ${t.y}px))` }}>
              {t.isCrit && <span className="text-yellow-300 text-[10px] block -mb-2 animate-bounce">CRITICAL HIT</span>}-{t.amount.toLocaleString()}
            </div>
          ))}
          {combat.attackEffects?.map(e => (
            <div 
              key={e.id} 
              className="absolute pointer-events-none z-[60]"
              style={{ 
                left: `calc(50% + ${e.x}px)`, 
                top: `calc(50% + ${e.y}px)`,
                transform: `translate(-50%, -50%) rotate(${e.rotate}deg)` 
              }}
            >
              {/* Slash Trail */}
              <div className={`h-[2px] rounded-full blur-[1px] animate-in slide-in-from-left-full duration-150 fill-mode-forwards ${e.isCrit ? 'w-32 bg-gradient-to-r from-red-600 via-yellow-400 to-white shadow-[0_0_20px_rgba(251,191,36,0.8)] h-[4px]' : 'w-20 bg-gradient-to-r from-transparent via-white to-transparent'}`} />
              
              {/* Impact Spark */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-4 h-4 rounded-full animate-ping ${e.isCrit ? 'bg-yellow-400' : 'bg-white opacity-50'}`} />
                {e.isCrit && (
                  <>
                    <div className="w-16 h-16 bg-red-600 rounded-full blur-xl opacity-30 animate-pulse" />
                    <div className="absolute w-40 h-[1px] bg-white blur-[2px] animate-in zoom-in duration-75 rotate-45" />
                    <div className="absolute w-40 h-[1px] bg-white blur-[2px] animate-in zoom-in duration-75 -rotate-45" />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-end mb-2">
          <div className="flex items-center gap-2 text-sm font-bold"><currentBoss.icon className={`w-5 h-5 ${currentBoss.color}`} /> {currentBoss.name}</div>
          <span className="text-[10px] font-mono text-zinc-500">HP: {bossHp.toLocaleString()} / {currentBoss.maxHp.toLocaleString()}</span>
        </div>
        <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden mb-3 border border-zinc-800">
          <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${bossHpPercent}%` }} />
        </div>
        <button onClick={actions.handleAttack} disabled={bossHp <= 0} className="w-full py-2 bg-red-950/40 hover:bg-red-900 border border-red-900/50 text-red-200 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
          <Target className="w-4 h-4" /> {bossHp <= 0 ? '리스폰 대기 중...' : '공격'}
        </button>
      </div>
    </div>
  );
}
