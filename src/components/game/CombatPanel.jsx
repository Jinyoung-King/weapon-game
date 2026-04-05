import { getBossConfig } from '../../utils/gameUtils';
import { Sword, Shield, Zap, Sparkles } from 'lucide-react';

export function CombatPanel({ combat, actions }) {
  const { stage, bossHp, playerHp, playerMaxHp, mana, maxMana, damageTexts, playerDamageTexts, turn, isAttacking } = combat;
  const currentBoss = getBossConfig(stage);
  const BossIcon = currentBoss.icon;

  const bossHpPercent = Math.max(0, (bossHp / currentBoss.maxHp) * 100);
  const playerHpPercent = Math.max(0, (playerHp / playerMaxHp) * 100);
  const mpPercent = Math.max(0, (mana / maxMana) * 100);

  return (
    <div className="w-full max-w-lg aspect-[4/3] bg-zinc-950 border-4 border-zinc-900 rounded-[2rem] p-0 mb-6 shadow-2xl overflow-hidden relative group">
      {/* 배경 장식 (Battlefield) */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-zinc-800">
        <div className="absolute bottom-0 w-full h-[40%] bg-zinc-900/50 skew-x-[-20deg] transform origin-bottom border-t border-zinc-700/30" />
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-red-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* 바닥 원형 패드 (용사의 자리 & 보스의 자리) */}
      <div className="absolute bottom-[15%] left-[15%] w-32 h-12 bg-black/40 rounded-[100%] border border-zinc-700/30 blur-[2px]" />
      <div className="absolute top-[35%] right-[15%] w-40 h-16 bg-black/40 rounded-[100%] border border-zinc-700/30 blur-[2px]" />

      {/* 보스 (적) 영역 - 우상단 */}
      <div className={`absolute top-[20%] right-[15%] flex flex-col items-center transition-all duration-300 ${turn === 'boss' ? 'scale-110' : 'scale-100'} ${bossHp <= 0 ? 'opacity-0 scale-50' : 'opacity-100'}`}>
        {/* Boss Status Card */}
        <div className="absolute -top-16 -left-16 w-32 p-2 bg-black/60 backdrop-blur-md border border-zinc-700/50 rounded-lg shadow-xl z-20">
          <div className="text-[10px] font-black text-red-500 uppercase flex justify-between">
            <span>BOSS</span>
            <span>Lv.{stage + 1}</span>
          </div>
          <div className="text-[11px] font-bold text-white mb-1 truncate">{currentBoss.name}</div>
          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
             <div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${bossHpPercent}%` }} />
          </div>
        </div>

        {/* Boss Visual */}
        <div className={`relative z-10 transition-transform duration-150 ${combat.attackEffects?.length > 0 ? 'animate-bounce' : ''}`}>
          <div className="w-32 h-32 rounded-full overflow-hidden bg-white/10 border-2 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <img 
                src={currentBoss.image} 
                alt={currentBoss.name}
                className="w-full h-full object-cover"
            />
          </div>
          {/* 피격 이펙트 */}
          {combat.attackEffects?.map(e => (
            <div key={e.id} className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-20 h-20 text-white animate-ping opacity-50" />
            </div>
          ))}
        </div>
      </div>

      {/* 플레이어 (나) 영역 - 좌하단 */}
      <div className={`absolute bottom-[10%] left-[15%] flex flex-col items-center transition-all duration-500 ${turn === 'player' ? 'translate-y-[-10px]' : ''}`}>
        {/* Player Status Card */}
        <div className="absolute -bottom-8 -right-32 w-40 p-3 bg-black/60 backdrop-blur-md border-2 border-zinc-700/50 rounded-xl shadow-2xl z-20">
           <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-black text-cyan-400 uppercase">HERO (YOU)</span>
           </div>
           <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 mb-1.5">
              <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300" style={{ width: `${playerHpPercent}%` }} />
           </div>
           <div className="flex justify-between items-center">
              <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 max-w-[60%]">
                <div className="h-full bg-cyan-500" style={{ width: `${mpPercent}%` }} />
              </div>
              <span className="text-[9px] font-black text-white">{Math.ceil(playerHp)} / {playerMaxHp}</span>
           </div>
        </div>

        {/* Player Visual (Hero Image) */}
        <div className={`relative z-10 transition-all duration-300 ${turn === 'player' ? 'scale-110' : 'scale-100'}`}>
          <div className={`w-32 h-32 rounded-full overflow-hidden bg-white/10 border-4 border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all duration-150 ${isAttacking ? 'translate-x-12' : ''}`}>
            <img 
                src="/assets/hero.png" 
                alt="Hero"
                className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* 데미지 텍스트 레이어 */}
      <div className="absolute inset-0 pointer-events-none z-50">
        {damageTexts.map(t => (
          <div 
            key={t.id} 
            className={`absolute font-black whitespace-nowrap animate-in fade-out slide-out-to-top-12 duration-1000 fill-mode-forwards z-[100] ${t.isSkill ? 'text-cyan-400 text-4xl drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] scale-150' : t.isCrit ? 'text-red-500 text-3xl drop-shadow-[0_0_10px_rgba(239,68,68,0.5)] scale-125' : 'text-white text-2xl drop-shadow-lg'}`}
            style={{ 
                right: `calc(15% + 50px + ${t.x}px)`, 
                top: `calc(20% + ${t.y}px)` 
            }}
          >
            -{ (t.amount || 0).toLocaleString()}
          </div>
        ))}

        {playerDamageTexts?.map(t => (
          <div 
            key={t.id} 
            className={`absolute font-black whitespace-nowrap text-red-500 text-3xl drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-in fade-out slide-out-to-bottom-12 duration-1000 fill-mode-forwards z-[100]`}
            style={{ 
                left: `calc(15% + 50px + ${t.x}px)`, 
                bottom: `calc(15% + ${t.y}px)` 
            }}
          >
            OUCH! -{ (t.amount || 0).toLocaleString()}
          </div>
        ))}
      </div>

      {/* 턴 메시지 오버레이 */}
      <div className="absolute top-4 left-4 z-40 bg-black/40 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">
         <span className={`text-[10px] font-black uppercase tracking-tighter ${turn === 'player' ? 'text-cyan-400' : 'text-red-400'}`}>
            {turn === 'player' ? "Your Turn - Select Move" : "Enemy Activity..."}
         </span>
      </div>
    </div>
  );
}
