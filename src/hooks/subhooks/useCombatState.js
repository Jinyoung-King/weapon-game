import { useState, useRef } from 'react';

export function useCombatState() {
  const [stage, setStage] = useState(0);
  const [bossHp, setBossHp] = useState(0);
  const [mana, setMana] = useState(100);
  const [maxMana, setMaxMana] = useState(100);
  const [runBuffs, setRunBuffs] = useState([]); // Roguelike buffs
  const [tempBuffs, setTempBuffs] = useState([]); // Skill buffs
  const [isAttacking, setIsAttacking] = useState(false);
  const [pendingCards, setPendingCards] = useState(null);
  const [damageTexts, setDamageTexts] = useState([]);
  const [attackEffects, setAttackEffects] = useState([]);

  const suppressBossHpResetRef = useRef(null);
  const bossRespawnTimeoutRef = useRef(null);
  const bossRespawnScheduledStageRef = useRef(null);

  return {
    state: { stage, bossHp, mana, maxMana, runBuffs, tempBuffs, isAttacking, pendingCards, damageTexts, attackEffects },
    setters: { setStage, setBossHp, setMana, setMaxMana, setRunBuffs, setTempBuffs, setIsAttacking, setPendingCards, setDamageTexts, setAttackEffects },
    refs: { suppressBossHpResetRef, bossRespawnTimeoutRef, bossRespawnScheduledStageRef }
  };
}
