import React from 'react';
import { CombatPanel } from '../CombatPanel';
import { EquipmentPanel } from '../EquipmentPanel';
import { Sparkles, TrendingUp, Zap } from 'lucide-react';
import { SKILLS } from '../../../config/constants';

export function CombatView({ state, actions }) {
  const { game, combat, ui } = state;
  const { myCombatPower, activeBuffs, mana, maxMana } = combat;

  return (
    <div className="w-full max-w-md flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 pb-28 px-4">
      {/* 1. 메인 전투 패널 (Boss, HP, MP) */}
      <CombatPanel combat={combat} actions={actions} />
      
      {/* Skill Buttons Section */}
      <div className="w-full grid grid-cols-2 gap-3 mb-6 mt-4">
        {SKILLS.map(skill => {
          const Icon = skill.icon;
          const canUse = mana >= skill.cost;
          const activeBuff = combat.tempBuffs?.find(b => b.skillId === skill.id);
          const buffPercent = activeBuff ? Math.max(0, ((activeBuff.expiresAt - Date.now()) / (skill.duration || 5000)) * 100) : 0;

          return (
            <button
              key={skill.id}
              onClick={() => actions.handleUseSkill(skill.id)}
              disabled={!canUse}
              className={`group p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all relative overflow-hidden ${canUse ? 'bg-zinc-900 border-zinc-800 hover:border-blue-500 active:scale-95' : 'bg-zinc-900/50 border-zinc-900 opacity-50'}`}
            >
              {/* Buff Progress Bar Overlay */}
              {buffPercent > 0 && (
                <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: `${buffPercent}%` }} />
              )}
              
              {/* Click Flash Effect Layer */}
              <div className="absolute inset-0 bg-white opacity-0 group-active:animate-[ping_300ms_ease-out] pointer-events-none" />

              <div className={`p-3 rounded-full relative z-10 ${canUse ? 'bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform' : 'bg-zinc-800 text-zinc-600'}`}>
                <Icon className="w-6 h-6" />
                {buffPercent > 0 && <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 animate-spin" />}
              </div>
              <div className="text-center w-full relative z-10">
                <div className="text-xs font-black text-white">{skill.name}</div>
                <div className="text-[9px] font-bold text-zinc-500 mt-0.5 leading-tight px-1 min-h-[1.5rem] flex items-center justify-center">{skill.desc}</div>
                <div className="text-[10px] font-bold text-blue-400 mt-1 flex items-center justify-center gap-1">
                    <Zap className="w-2.5 h-2.5" /> {skill.cost} MP
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. 장착 정보 (Compact) */}
      <EquipmentPanel game={game} ui={ui} combat={combat} actions={actions} isCompact={true} />

      {/* 4. 상태 패널 (전투 컨디션) */}
      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-5 mt-6 mb-4 shadow-xl relative overflow-hidden text-left">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <h3 className="text-xs font-black uppercase text-zinc-300">현재 전투 컨디션</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-zinc-400">캐릭터 레벨 <span className="text-blue-400">Lv.{game.playerData.level}</span></div>
            <div className="flex justify-between text-[11px] font-bold text-zinc-400">최종 전투력 <span className="text-white font-mono">{myCombatPower.toLocaleString()}</span></div>
          </div>
          <div className="space-y-1">
             <div className="flex justify-between text-[11px] font-bold text-zinc-400">경험치 보너스 <span className="text-emerald-400">+{((activeBuffs.find(b => b.effect === 'exp_bonus')?.value || 1) - 1).toFixed(1)}%</span></div>
             <div className="flex justify-between text-[11px] font-bold text-zinc-400">골드 보너스 <span className="text-yellow-500">+{((activeBuffs.find(b => b.effect === 'farm_bonus')?.value || 1) - 1).toFixed(1)}%</span></div>
          </div>
        </div>

        {activeBuffs.length > 0 && (
          <div className="mt-4 pt-3 border-t border-zinc-800 flex flex-wrap gap-1.5">
            {activeBuffs.map((b, i) => b.label && (
              <div key={i} className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-blue-400" />
                <span className="text-[9px] font-black text-blue-300 uppercase">{b.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
