import { useCallback } from 'react';
import { SKILLS, ROGUELIKE_BUFF_POOL } from '../../config/constants';
import { getBossConfig, getReqExp } from '../../utils/gameUtils';

export function useCombatHandlers({ state, setters, utils }) {
  const { game, combat, ui } = state;
  const { setStage, setBossHp, setMana, setMaxMana, setRunBuffs, setTempBuffs, setIsAttacking, setPendingCards, setDamageTexts, setAttackEffects } = setters.combat;
  const { setGold, setStones, setSoulStones, setPlayerData, setStatistics } = setters.game;
  const { addLog, updateQuestProgress, gainExp } = utils;

  const recordClick = () => {
    setStatistics(prev => ({ ...prev, totalClicks: (prev.totalClicks || 0) + 1 }));
  };

  const handleBossDefeat = () => {
    const { stage } = combat;
    const { statistics } = game;
    const boss = getBossConfig(stage);
    
    addLog(`[승리] ${boss.name} 처치!`, 'success');
    setGold(g => g + boss.rewardGold);
    setStones(s => s + boss.rewardStone);
    setSoulStones(s => s + (stage + 1));
    setStatistics({ ...statistics, bossesDefeated: statistics.bossesDefeated + 1 });
    gainExp(boss.rewardGold / 5);

    // Show Roguelike Buffet
    const pool = [...ROGUELIKE_BUFF_POOL].sort(() => 0.5 - Math.random()).slice(0, 3);
    setPendingCards(pool);
  };

  const handleAttack = () => {
    const { bossHp, isAttacking, myCombatPower, activeBuffs } = combat;
    if (bossHp <= 0 || isAttacking) return;

    setIsAttacking(true);
    recordClick();

    const critP = (activeBuffs.find(b => b.effect === 'crit_bonus')?.value || 0) + 0.1;
    const isCrit = Math.random() < critP;
    const dmg = isCrit ? myCombatPower * 2.5 : myCombatPower;
    
    const nextHp = Math.max(0, bossHp - dmg);
    setBossHp(nextHp);

    setDamageTexts(prev => [...prev.slice(-10), { 
      id: Date.now(), 
      amount: dmg, 
      x: Math.random() * 40 - 20, 
      y: Math.random() * 20 - 10, 
      isCrit 
    }]);

    setAttackEffects(prev => [...prev, { id: Date.now(), x: Math.random() * 20 - 10, y: Math.random() * 20 - 10, rotate: Math.random() * 360, isCrit }]);
    setTimeout(() => setAttackEffects(prev => prev.slice(1)), 100);

    updateQuestProgress('BOSS', 1);
    gainExp(Math.max(1, Math.floor(dmg / 100)));

    if (nextHp === 0) handleBossDefeat();
    setTimeout(() => setIsAttacking(false), 150);
  };

  const handleUseSkill = (skillId) => {
    const { mana, myCombatPower, maxMana } = combat;
    const skill = SKILLS.find(s => s.id === skillId);
    if (!skill || mana < skill.cost) return addLog('[스킬] 마나가 부족합니다.', 'warning');

    setMana(prev => Math.max(0, prev - skill.cost));
    addLog(`[스킬] ${skill.name} 사용!`, 'info');
    
    if (skill.type === 'damage') {
      const damage = Math.floor(myCombatPower * skill.multiplier);
      setAttackEffects(prev => [...prev, 
        { id: Date.now(), x: 0, y: 0, rotate: -45, isSkill: true },
        { id: Date.now() + 50, x: 0, y: 0, rotate: 45, isSkill: true }
      ]);
      setTimeout(() => setAttackEffects(prev => prev.slice(2)), 250);

      setBossHp(prev => {
        const next = Math.max(0, prev - damage);
        if (next === 0) handleBossDefeat();
        return next;
      });
      setDamageTexts(prev => [...prev.slice(-10), { id: Date.now(), amount: damage, x: Math.random() * 60 - 30, y: Math.random() * 20 - 10, isCrit: true, isSkill: true }]);
    } else if (skill.type === 'buff') {
      const expiresAt = Date.now() + (skill.duration || 5000);
      setTempBuffs(prev => [
        ...prev.filter(b => b.expiresAt > Date.now()),
        { id: `${skill.id}_${Date.now()}`, skillId: skill.id, effect: skill.effect, value: 0.3, expiresAt, name: skill.name }
      ]);
      addLog(`[스킬] ${skill.name} 발동!`, 'info');
    } else if (skill.type === 'regen') {
      setMana(prev => Math.min(maxMana, prev + skill.amount));
    }
  };

  const handleChooseRunBuff = (buff) => {
    setRunBuffs(prev => [...prev, buff]);
    setStage(s => s + 1);
    const nextBoss = getBossConfig(combat.stage + 1);
    setBossHp(nextBoss.maxHp);
    setPendingCards(null);
    addLog(`[스테이지 성과] ${buff.name} 획득! 다음 층으로 이동.`, 'success');
  };

  return { handleAttack, handleBossDefeat, handleUseSkill, handleChooseRunBuff, gainExp };
}
