import { useCallback } from 'react';
import { SKILLS, ROGUELIKE_BUFF_POOL } from '../../config/constants';
import { getBossConfig, getReqExp } from '../../utils/gameUtils';

export function useCombatHandlers({ state, setters, utils }) {
  const { game, combat } = state;
  const { 
    setStage, setBossHp, setPlayerHp, setPlayerMaxHp, setMana, setMaxMana, 
    setTurn, setIsBattleOver, setRunBuffs, setTempBuffs, setIsAttacking, 
    setPendingCards, setDamageTexts, setPlayerDamageTexts, setAttackEffects 
  } = setters.combat;
  const { setGold, setStones, setSoulStones, setPlayerData, setStatistics } = setters.game;
  const { addLog, updateQuestProgress, gainExp, setActiveModal } = utils;

  const handleBossDefeat = () => {
    const { stage } = combat;
    const { statistics } = game;
    const boss = getBossConfig(stage);
    
    addLog(`[승리] ${boss.name} 처치!`, 'success');
    setGold(g => g + boss.rewardGold);
    setStones(s => s + boss.rewardStone);
    setSoulStones(s => s + (stage * 2 + 1));
    setStatistics({ ...statistics, bossesDefeated: (statistics.bossesDefeated || 0) + 1 });
    gainExp(boss.rewardGold / 5);

    setIsBattleOver(true);
    // Show Roguelike Buffet
    const pool = [...ROGUELIKE_BUFF_POOL].sort(() => 0.5 - Math.random()).slice(0, 3);
    setPendingCards(pool);
  };

  const handlePlayerDefeat = () => {
    addLog('[패배] 당신은 쓰러졌습니다. 정비 후 다시 도전하세요.', 'warning');
    setIsBattleOver(true);
    setTimeout(() => {
      setPlayerHp(combat.playerMaxHp);
      setMana(combat.maxMana);
      setIsBattleOver(false);
      setTurn('player');
      addLog('[시스템] 부활하여 전장으로 복귀합니다.', 'info');
    }, 3000);
  };

  const handleBossTurn = (currentBossHp) => {
    if (currentBossHp <= 0) return;
    
    setTurn('boss');
    setTimeout(() => {
      const boss = getBossConfig(combat.stage);
      const defBonus = combat.activeBuffs.find(b => b.effect === 'defense_bonus')?.value || 0;
      const rawDmg = boss.dmg || (combat.stage + 1) * 5;
      const finalDmg = Math.max(1, Math.floor(rawDmg * (1 - defBonus)));

      setPlayerHp(prev => {
        const next = Math.max(0, prev - finalDmg);
        if (next === 0) handlePlayerDefeat();
        return next;
      });

      const bossDmgId = `boss_dmg_${Date.now()}_${Math.random()}`;
      setPlayerDamageTexts(prev => [...prev.slice(-9), { 
        id: bossDmgId, 
        amount: finalDmg, 
        x: Math.random() * 40 - 20, 
        y: Math.random() * 20 - 50
      }]);

      setTimeout(() => {
        setPlayerDamageTexts(prev => prev.filter(t => t.id !== bossDmgId));
      }, 1000);

      addLog(`[보스] ${boss.name}의 공격! ${finalDmg} 데미지를 입었습니다.`, 'warning');
      
      if (currentBossHp > 0) {
        setTurn('player');
      }
    }, 1000);
  };

  const handleAttack = () => {
    const { bossHp, isAttacking, myCombatPower, activeBuffs, turn, isBattleOver } = combat;
    if (bossHp <= 0 || isAttacking || turn !== 'player' || isBattleOver) return;

    setIsAttacking(true);
    const critP = (activeBuffs.find(b => b.effect === 'crit_bonus')?.value || 0) + 0.1;
    const isCrit = Math.random() < critP;
    const dmg = isCrit ? Math.floor(myCombatPower * 2.5) : myCombatPower;
    
    const nextHp = Math.max(0, bossHp - dmg);
    setBossHp(nextHp);

    // Passive: Lifesteal (Blood Lust)
    const lifesteal = 0.1;
    const healAmount = Math.floor(dmg * lifesteal);
    setPlayerHp(prev => Math.min(combat.playerMaxHp, prev + healAmount));

    const dmgId = `dmg_${Date.now()}_${Math.random()}`;
    const effId = `eff_${Date.now()}_${Math.random()}`;

    setDamageTexts(prev => [...prev.slice(-9), { 
      id: dmgId, amount: dmg, x: Math.random() * 40 - 20, y: Math.random() * 20 - 10, isCrit 
    }]);

    setAttackEffects(prev => [...prev, { id: effId, x: Math.random() * 20 - 10, y: Math.random() * 20 - 10, rotate: Math.random() * 360, isCrit }]);
    
    // Auto cleanup after 1s
    setTimeout(() => {
        setDamageTexts(prev => prev.filter(t => t.id !== dmgId));
        setAttackEffects(prev => prev.filter(e => e.id !== effId));
    }, 1000);

    updateQuestProgress('BOSS', 1);
    gainExp(Math.max(1, Math.floor(dmg / 100)));

    if (nextHp === 0) {
      handleBossDefeat();
      setIsAttacking(false);
    } else {
      setTimeout(() => {
        setIsAttacking(false);
        handleBossTurn(nextHp);
      }, 150);
    }
  };

  const handleUseSkill = (skillId) => {
    const { mana, myCombatPower, maxMana, turn, isBattleOver } = combat;
    if (turn !== 'player' || isBattleOver) return;

    const skill = SKILLS.find(s => s.id === skillId);
    if (!skill || mana < skill.cost) return addLog('[스킬] 마나가 부족합니다.', 'warning');

    setMana(prev => Math.max(0, prev - skill.cost));
    addLog(`[스킬] ${skill.name} 사용!`, 'info');
    
    let isInstantTurnEnd = true;

    if (skill.type === 'damage') {
      const damage = Math.floor(myCombatPower * skill.multiplier);
      setAttackEffects(prev => [...prev, 
        { id: `skill_1_${Date.now()}_${Math.random()}`, x: 0, y: 0, rotate: -45, isSkill: true },
        { id: `skill_2_${Date.now()}_${Math.random()}`, x: 0, y: 0, rotate: 45, isSkill: true }
      ]);
      setTimeout(() => setAttackEffects(prev => prev.slice(2)), 250);

      setBossHp(prev => {
        const next = Math.max(0, prev - damage);
        if (next === 0) handleBossDefeat();
        else handleBossTurn(next);
        return next;
      });

      setDamageTexts(prev => {
        const skillDmgId = `skill_dmg_${Date.now()}_${Math.random()}`;
        setTimeout(() => {
            setDamageTexts(curr => curr.filter(t => t.id !== skillDmgId));
        }, 1000);
        return [...prev.slice(-9), { id: skillDmgId, amount: damage, x: Math.random() * 60 - 30, y: Math.random() * 20 - 10, isCrit: true, isSkill: true }];
      });
    } else if (skill.type === 'heal') {
      const healAmt = Math.floor(combat.playerMaxHp * skill.amount);
      setPlayerHp(prev => Math.min(combat.playerMaxHp, prev + healAmt));
      addLog(`[성스러운 빛] 체력을 ${healAmt} 회복했습니다.`, 'success');
      handleBossTurn(combat.bossHp);
    } else if (skill.type === 'buff') {
      const expiresAt = Date.now() + (skill.duration || 5000);
      setTempBuffs(prev => [
        ...prev.filter(b => b.expiresAt > Date.now()),
        { id: `${skill.id}_${Date.now()}`, skillId: skill.id, effect: skill.effect, value: skill.value, expiresAt, name: skill.name }
      ]);
      handleBossTurn(combat.bossHp);
    }
  };

  const handleChooseRunBuff = (buff) => {
    const { playerMaxHp } = combat;
    setRunBuffs(prev => [...prev, buff]);
    
    // Apply permanent HP boost if it's HP_UP
    if (buff.effect === 'hp_bonus_p') {
        setPlayerMaxHp(prev => Math.floor(prev * (1 + buff.value)));
        setPlayerHp(prev => Math.floor(prev * (1 + buff.value)));
    }

    const nextStage = combat.stage + 1;
    setStage(nextStage);
    const nextBoss = getBossConfig(nextStage);
    setBossHp(nextBoss.maxHp);
    setPendingCards(null);
    setIsBattleOver(false);
    setTurn('player');
    setActiveModal(null);
    addLog(`[스테이지 성과] ${buff.name} 획득! 다음 층으로 이동.`, 'success');
  };

  return { handleAttack, handleBossDefeat, handleUseSkill, handleChooseRunBuff, gainExp };
}

