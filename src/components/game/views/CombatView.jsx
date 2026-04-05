import React from 'react';
import { CombatPanel } from '../CombatPanel';
import { EquipmentPanel } from '../EquipmentPanel';
import { SKILLS, PASSIVE_SKILLS } from '../../../config/constants';
import { Sword, Sparkles, TrendingUp, Zap, ShieldAlert } from 'lucide-react';

export function CombatView({ state, actions }) {
  const { game, combat, ui } = state;
  const { myCombatPower, activeBuffs, mana, maxMana, turn, isBattleOver } = combat;

  const isPlayerTurn = turn === 'player' && !isBattleOver;

  return (
    <div className="w-full max-w-lg flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 pb-28 px-4">
      {/* 1. Pokemon-Style Battle Arena */}
      <CombatPanel combat={combat} actions={actions} />
      
      {/* 2. Command Menu (Action Area) */}
      <div className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-[2rem] p-6 shadow-2xl mt-[-20px] relative z-30">
        <div className="flex items-center gap-2 mb-4 px-2">
            <Sword className="w-4 h-4 text-zinc-500" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Select Command</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
            {/* Main Attack */}
            <button
                onClick={actions.handleAttack}
                disabled={!isPlayerTurn}
                className={`col-span-2 h-16 rounded-xl border-2 flex items-center justify-center gap-3 transition-all ${isPlayerTurn ? 'bg-white border-zinc-200 text-zinc-950 active:scale-95' : 'bg-zinc-800 border-zinc-700 text-zinc-600 opacity-40'}`}
            >
                <div className={`p-2 rounded-lg ${isPlayerTurn ? 'bg-zinc-950 text-white' : 'bg-zinc-700 text-zinc-500'}`}>
                    <Sword className="w-5 h-5" />
                </div>
                <div className="text-left leading-none">
                    <div className="text-xs font-black uppercase">Standard Attack</div>
                    <div className="text-[9px] font-bold opacity-60">No MP Cost</div>
                </div>
                <div className="flex-1" />
                <div className="text-lg font-black italic pr-4">ATK</div>
            </button>

            {/* Skills */}
            {SKILLS.map(skill => {
                const Icon = skill.icon;
                const canUse = isPlayerTurn && mana >= skill.cost;
                const activeBuff = combat.tempBuffs?.find(b => b.skillId === skill.id);
                const buffPercent = activeBuff ? Math.max(0, ((activeBuff.expiresAt - Date.now()) / (skill.duration || 5000)) * 100) : 0;

                return (
                <button
                    key={skill.id}
                    onClick={() => actions.handleUseSkill(skill.id)}
                    disabled={!canUse}
                    className={`h-16 rounded-xl border-2 flex items-center gap-3 px-3 transition-all relative overflow-hidden ${canUse ? 'bg-zinc-900 border-zinc-800 hover:border-blue-500 active:scale-95' : 'bg-zinc-900/40 border-zinc-900 opacity-40'}`}
                >
                    {buffPercent > 0 && (
                        <div className="absolute top-0 left-0 h-full bg-blue-500/10 transition-all duration-1000 ease-linear" style={{ width: `${buffPercent}%` }} />
                    )}
                    <div className={`p-2 rounded-lg ${canUse ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-600'}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                        <div className="text-[10px] font-black text-white truncate uppercase">{skill.name}</div>
                        <div className="text-[9px] font-bold text-blue-400 flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5" /> {skill.cost}
                        </div>
                    </div>
                </button>
                );
            })}
        </div>

        {/* Passive Indicator */}
        <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
            <div className="flex gap-2">
                {PASSIVE_SKILLS.map(p => (
                    <div key={p.id} className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-md border border-white/5">
                        <p.icon className="w-3.5 h-3.5 text-orange-400" />
                        <span className="text-[9px] font-black text-zinc-400 uppercase">{p.name} Active</span>
                    </div>
                ))}
            </div>
            <div className="flex gap-1">
                {activeBuffs.map((b, i) => b.label && (
                    <div key={i} className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_#3b82f6]" title={b.label} />
                ))}
            </div>
        </div>
      </div>

      {/* 3. Battlefield Equipment & Stats Summary */}
      <div className="w-full grid grid-cols-2 gap-4 mt-8 opacity-80 hover:opacity-100 transition-opacity">
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 flex flex-col justify-center">
              <div className="text-[9px] font-black text-zinc-500 mb-2 uppercase">Character Status</div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-400">Combat Power</span>
                <span className="font-black text-white font-mono">{myCombatPower.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs mt-1">
                <span className="font-bold text-zinc-400">Exp Bonus</span>
                <span className="font-black text-emerald-400">+{((activeBuffs.find(b => b.effect === 'exp_bonus')?.value || 1) - 1).toFixed(1)}%</span>
              </div>
          </div>
          <EquipmentPanel game={game} ui={ui} combat={combat} actions={actions} isCompact={true} />
      </div>
    </div>
  );
}
