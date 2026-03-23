import { getBossConfig } from '../../utils/gameUtils';

export function CombatPanel({ combat, actions }) {
  const { stage, bossHp, mana, maxMana, damageTexts } = combat;
  const currentBoss = getBossConfig(stage);
  const BossIcon = currentBoss.icon;
  const hpPercent = Math.max(0, (bossHp / currentBoss.maxHp) * 100);
  const mpPercent = Math.max(0, (mana / maxMana) * 100);

  return (
    <div className={`w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-4 shadow-xl overflow-hidden relative ${combat.attackEffects?.length > 0 ? 'animate-[shake_0.15s_ease-in-out_infinite]' : ''}`}>
      <style>{`
        @keyframes shake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          25% { transform: translate(-1px, -1px) rotate(-1deg); }
          50% { transform: translate(-2px, 0px) rotate(1deg); }
          75% { transform: translate(1px, 2px) rotate(0deg); }
          100% { transform: translate(1px, -1px) rotate(1deg); }
        }
      `}</style>

      {/* 몬스터 일러스트 영역 */}
      <div className="relative w-full aspect-video bg-black/40 rounded-2xl border border-zinc-800/50 mb-6 flex items-center justify-center overflow-hidden">
        {/* 배경 레이어 */}
        <div className={`absolute inset-0 bg-gradient-to-b from-transparent to-black/20`} />
        
        {/* 데미지 텍스트 레이어 */}
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {damageTexts.map(t => (
            <div 
              key={t.id} 
              className={`absolute left-1/2 top-1/2 font-black whitespace-nowrap -translate-x-1/2 -translate-y-1/2 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards opacity-0 ${t.isSkill ? 'text-cyan-400 text-4xl drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] scale-150' : t.isCrit ? 'text-red-400 text-3xl drop-shadow-[0_0_10px_rgba(239,68,68,0.5)] scale-125' : 'text-white text-xl'}`}
              style={{ transform: `translate(calc(-50% + ${t.x}px), calc(-50% + ${t.y}px))` }}
            >
              {t.isSkill && <span className="text-cyan-300 text-[10px] block -mb-2 animate-pulse text-center">SKILL HIT</span>}
              {t.isCrit && !t.isSkill && <span className="text-yellow-300 text-[10px] block -mb-2 animate-bounce text-center">CRITICAL</span>}
              -{ (t.amount || 0).toLocaleString()}
            </div>
          ))}
          {combat.attackEffects?.map(e => (
            <div key={e.id} className="absolute pointer-events-none z-[60]" style={{ left: `calc(50% + ${e.x}px)`, top: `calc(50% + ${e.y}px)`, transform: `translate(-50%, -50%) rotate(${e.rotate}deg)` }}>
              <div className={`rounded-full blur-[1px] animate-in slide-in-from-left-full duration-150 fill-mode-forwards 
                ${e.isSkill ? 'w-56 h-[6px] bg-gradient-to-r from-cyan-400 via-blue-500 to-white shadow-[0_0_30px_#22d3ee]' : 
                  e.isCrit ? 'w-32 h-[4px] bg-gradient-to-r from-red-600 via-yellow-400 to-white shadow-[0_0_20px_rgba(251,191,36,0.8)]' : 
                  'w-20 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent'}`} 
              />
            </div>
          ))}
        </div>

        {/* 몬스터 아이콘 */}
        <div className={`relative z-10 p-8 rounded-full border-2 border-dashed transition-all duration-300 ${bossHp <= 0 ? 'opacity-0 scale-50 rotate-45' : 'opacity-100 scale-100'} ${currentBoss.color.replace('text-', 'border-')}/30 bg-black/20`}>
          <BossIcon className={`w-20 h-20 drop-shadow-2xl animate-pulse ${currentBoss.color}`} />
        </div>
      </div>

      {/* 보스 정보 및 HP바 */}
      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Stage {stage + 1} BOSS</span>
            <div className="text-lg font-black text-zinc-100">{currentBoss.name}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-black text-red-500 font-mono tracking-tighter">{Math.ceil(bossHp).toLocaleString()}</div>
            <div className="text-[9px] text-zinc-600 font-bold uppercase">Health Points</div>
          </div>
        </div>

        {/* HP Bar */}
        <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 p-0.5 shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-red-700 to-red-500 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(239,68,68,0.3)] relative"
            style={{ width: `${hpPercent}%` }}
          >
            <div className="absolute inset-0 bg-white/10 animate-pulse" />
          </div>
        </div>

        {/* MP Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] font-black uppercase">
            <span className="text-cyan-600">Mana Gauge</span>
            <span className="text-cyan-400">{Math.floor(mana)} / {maxMana}</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900 shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(34,211,238,0.3)]"
              style={{ width: `${mpPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
