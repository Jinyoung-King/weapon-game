import { useCallback } from 'react';
import { 
  ENHANCE_TIERS, EQUIP_TYPES, MAX_LEVEL 
} from '../../config/constants';

export function useEconomyHandlers({ state, setters, utils }) {
  const { game, combat, ui } = state;
  const { setGold, setStones, setSoulStones, setEquipment, setAppraisals, setAllocatedStats, setTraits, setRelics, setFailStack, setStatistics } = setters.game;
  const { setPlayerData } = setters.game;
  const { addLog, setIsAnimating, updateQuestProgress, gainExp } = utils;

  const handleEnhance = () => {
    const { gold, stones, equipment, failStack } = game;
    const { selectedEquip } = ui;
    const { activeBuffs } = combat;

    const level = equipment[selectedEquip];
    if (level >= MAX_LEVEL) return addLog('최대 강화 수치에 도달했습니다.', 'warning');
    
    const config = ENHANCE_TIERS.find(t => level < t.threshold) || ENHANCE_TIERS[ENHANCE_TIERS.length - 1];
    const costReduction = activeBuffs.filter(b => b.effect === 'enhance_cost_reduction').reduce((acc, b) => acc + b.value, 0);
    const finalGoldCost = Math.floor(config.gold * (1 - costReduction));
    const finalStoneCost = Math.max(1, Math.floor(config.stone * (1 - costReduction)));

    if (gold < finalGoldCost || stones < finalStoneCost) return addLog('자원이 부족합니다.', 'danger');

    setGold(g => g - finalGoldCost); setStones(s => s - finalStoneCost);
    setIsAnimating(true);

    setTimeout(() => {
      setIsAnimating(false);
      const successBonus = activeBuffs.filter(b => b.effect === 'success_bonus').reduce((acc, b) => acc + b.value, 0);
      const safetyBonus = activeBuffs.filter(b => b.effect === 'safety_bonus').reduce((acc, b) => acc + b.value, 0);
      
      const realSuccess = Math.min(100, config.success + successBonus + (failStack * 1.5));
      
      const roll = Math.random() * 100;
      if (roll < realSuccess) {
        setEquipment(prev => ({ ...prev, [selectedEquip]: level + 1 }));
        setAppraisals(prev => ({ ...prev, [selectedEquip]: null })); 
        setFailStack(0);
        addLog(`[성공] ${EQUIP_TYPES[selectedEquip].name} +${level + 1} 달성!`, 'success');
      } else {
        setFailStack(f => f + 1);
        const penaltyRoll = Math.random() * 100;
        const realDrop = Math.max(0, config.drop - safetyBonus);
        const realDestroy = Math.max(0, config.destroy - safetyBonus);

        if (penaltyRoll < realDestroy) {
            setEquipment(prev => ({ ...prev, [selectedEquip]: 0 }));
            addLog(`[파괴] 장비가 파괴되었습니다! 수치가 초기화됩니다.`, 'danger');
        } else if (penaltyRoll < realDestroy + realDrop) {
            setEquipment(prev => ({ ...prev, [selectedEquip]: Math.max(0, level - 1) }));
            addLog(`[하락] 강화에 실패하여 수치가 하락했습니다.`, 'warning');
        } else {
            addLog(`[실패] 강화에 실패했습니다. (스택 +1)`, 'warning');
        }
      }
      updateQuestProgress('ENHANCE');
    }, 1000);
  };

  const handleAppraisal = () => {
    const { gold, stones, equipment, appraisals } = game;
    const { selectedEquip } = ui;
    const level = equipment[selectedEquip];
    const cost = Math.floor(200 + (level * 50));

    if (gold < cost) return addLog('골드가 부족합니다.', 'danger');
    if (appraisals[selectedEquip]) return addLog('이미 감정된 장비입니다.', 'warning');

    setGold(g => g - cost);
    const newAppraisal = utils.generateLocalAppraisal(selectedEquip, level);
    setAppraisals(prev => ({ ...prev, [selectedEquip]: newAppraisal }));
    addLog(`[감정] '${newAppraisal.name}'(${newAppraisal.grade.name}) 옵션이 부여되었습니다!`, 'success');
  };

  const handleTraitAllocation = (traitId) => {
     const { playerData, allocatedStats } = game;
     if (playerData.traitPoints <= 0) return addLog('특성 포인트가 부족합니다.', 'warning');
     
     setPlayerData(prev => ({ ...prev, traitPoints: prev.traitPoints - 1 }));
     setAllocatedStats(prev => ({ ...prev, [traitId]: (prev[traitId] || 0) + 1 }));
     addLog(`[특성] ${traitId} 포인트 투자 완료`, 'success');
  };

  const handleRelicUpgrade = (id) => {
    const { soulStones, relics } = game;
    const currentLevel = relics[id] || 0;
    const config = utils.RELICS_CONFIG[id];
    const cost = utils.getRelicCost(config, currentLevel);

    if (soulStones >= cost && currentLevel < config.max) {
      setSoulStones(s => s - cost);
      setRelics(r => ({ ...r, [id]: currentLevel + 1 }));
      addLog(`[유물] ${config.name} Lv.${currentLevel + 1} 강화 성공!`, 'success');
    }
  };

  const completeMining = (earnedGold, earnedStones) => {
    if (earnedGold > 0) {
      setGold(g => g + earnedGold);
      setStones(s => s + earnedStones);
      setStatistics(s => ({ ...s, totalGoldEarned: s.totalGoldEarned + earnedGold }));
      gainExp(Math.floor(earnedGold / 2));
      updateQuestProgress('MINING');
    }
  };

  return { handleEnhance, handleAppraisal, handleTraitAllocation, handleRelicUpgrade, completeMining };
}
