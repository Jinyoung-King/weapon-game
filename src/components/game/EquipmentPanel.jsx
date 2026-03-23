import React from 'react';
import { Swords, Shield, Zap } from 'lucide-react';
import { EQUIP_TYPES, ENHANCE_TIERS } from '../../config/constants';

export function EquipmentPanel({ game, ui, combat, actions, isCompact = false }) {
  const { equipment, appraisals } = game;
  const { selectedEquip, isAnimating } = ui;
  const { myCombatPower } = combat;

  const CurrentEquipIcon = EQUIP_TYPES[selectedEquip].icon;

  return (
    <>
      <div className={`w-full max-w-md flex justify-between items-end px-2 mb-2 ${isCompact ? 'mt-0' : 'mt-4'}`}>
        <span className="text-xs text-blue-400 font-bold uppercase">전투력</span>
        <span className="text-xl font-black text-white">{myCombatPower.toLocaleString()} CP</span>
      </div>

      <div className={`w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-4 flex flex-col items-center relative overflow-hidden ${isCompact ? 'py-4' : 'py-8'}`}>
        {appraisals[selectedEquip] && <div className={`absolute top-4 left-4 text-[10px] font-black px-2 py-0.5 rounded border border-current ${appraisals[selectedEquip].grade.color}`}>{appraisals[selectedEquip].grade.name}</div>}
        
        <div className={isCompact ? 'mt-2 mb-2' : 'mt-4 mb-6'}>
          <div className={`${isCompact ? 'w-20 h-20' : 'w-28 h-28'} bg-zinc-950 rounded-full border-2 flex items-center justify-center shadow-2xl transition-all duration-300 ${isAnimating ? 'scale-110 rotate-12 bg-zinc-800' : ''} ${appraisals[selectedEquip] ? 'border-blue-500/50' : 'border-zinc-800'}`}>
            <CurrentEquipIcon className={`${isCompact ? 'w-10 h-10' : 'w-14 h-14'} ${appraisals[selectedEquip]?.grade.color || 'text-zinc-600'}`} />
          </div>
        </div>

        <h3 className={`${isCompact ? 'text-lg' : 'text-xl'} font-black mb-1 text-center`}><span className={appraisals[selectedEquip]?.grade.color || 'text-white'}>+{equipment[selectedEquip]} {appraisals[selectedEquip]?.name || `${EQUIP_TYPES[selectedEquip].name}`}</span></h3>
        
        {!isCompact && (
          <p className="text-xs text-zinc-500 text-center px-8 mb-6 line-clamp-2 italic">"{appraisals[selectedEquip]?.text || '아직 감정되지 않은 장비입니다.'}"</p>
        )}

        <div className={`w-full grid grid-cols-2 gap-2 ${isCompact ? 'mb-1 scale-90' : 'mb-4'}`}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 flex flex-col items-center justify-center">
            <span className="text-[10px] text-zinc-500 font-bold mb-1 uppercase tracking-tighter">보유 효과</span>
            <div className="flex items-center gap-1.5 font-black text-sm text-zinc-200">
               {selectedEquip === 'weapon' ? `+${(equipment.weapon * 25).toLocaleString()}` : selectedEquip === 'armor' ? `+${equipment.armor}%` : `+${(equipment.ring * 0.5).toFixed(1)}%`}
            </div>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 flex flex-col items-center justify-center">
            <span className="text-[10px] text-zinc-500 font-bold mb-1 uppercase tracking-tighter">전투 기여</span>
            <div className="flex items-center gap-1.5 font-black text-sm text-zinc-200 uppercase">
               {selectedEquip === 'weapon' ? 'Main' : selectedEquip === 'armor' ? 'Tank' : 'Luck'}
            </div>
          </div>
        </div>

        {!isCompact && (
          <div className="w-full bg-zinc-950 rounded-xl p-3 border border-zinc-800 mb-2">
            {(() => {
              const level = equipment[selectedEquip];
              const config = ENHANCE_TIERS.find(t => level < t.threshold) || ENHANCE_TIERS[ENHANCE_TIERS.length - 1];
              const successBonus = combat.activeBuffs.filter(b => b.effect === 'success_bonus').reduce((acc, b) => acc + b.value, 0);
              
              const realSuccess = Math.min(100, config.success + successBonus + (game.failStack * 1.5));
              
              return (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[10px] text-zinc-500 font-bold mb-1">
                      <span>강화 성공률 {game.failStack > 0 && <span className="text-yellow-500">(+{game.failStack})</span>}</span>
                      <span className="text-green-400">{realSuccess.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 transition-all duration-300 shadow-[0_0_8px_rgba(34,197,94,0.4)]" style={{ width: `${realSuccess}%` }} />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {isCompact && (
        <div className="w-full flex gap-2 mb-1 px-2">
          {Object.entries(EQUIP_TYPES).map(([key, item]) => (
            <button key={key} onClick={() => actions.setSelectedEquip(key)} className={`flex-1 py-2 rounded-xl border flex items-center justify-center gap-2 transition-all ${selectedEquip === key ? 'bg-zinc-800 border-zinc-600 text-blue-400' : 'bg-zinc-900 border-zinc-800 text-zinc-600 opacity-60'}`}>
              <item.icon className="w-3.5 h-3.5" /><span className="text-[10px] font-black">+{equipment[key]}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
