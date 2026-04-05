import { useState, useRef } from 'react';

export function useCombatState() {
  const [stage, setStage] = useState(0);
  const [bossHp, setBossHp] = useState(0);
  const [playerHp, setPlayerHp] = useState(100);
  const [playerMaxHp, setPlayerMaxHp] = useState(100);
  const [mana, setMana] = useState(100);
  const [maxMana, setMaxMana] = useState(100);
  const [turn, setTurn] = useState('player'); // 'player' | 'boss'
  const [isBattleOver, setIsBattleOver] = useState(false);
  const [runBuffs, setRunBuffs] = useState([]); // Roguelike buffs
  const [tempBuffs, setTempBuffs] = useState([]); // Skill buffs
  const [isAttacking, setIsAttacking] = useState(false);
  const [pendingCards, setPendingCards] = useState(null);
  const [damageTexts, setDamageTexts] = useState([]);
  const [playerDamageTexts, setPlayerDamageTexts] = useState([]); // Boss dealing damage to player
  const [attackEffects, setAttackEffects] = useState([]);

  const suppressBossHpResetRef = useRef(null);
  const bossRespawnTimeoutRef = useRef(null);
  const bossRespawnScheduledStageRef = useRef(null);

  return {
    state: { stage, bossHp, playerHp, playerMaxHp, mana, maxMana, turn, isBattleOver, runBuffs, tempBuffs, isAttacking, pendingCards, damageTexts, playerDamageTexts, attackEffects },
    setters: { setStage, setBossHp, setPlayerHp, setPlayerMaxHp, setMana, setMaxMana, setTurn, setIsBattleOver, setRunBuffs, setTempBuffs, setIsAttacking, setPendingCards, setDamageTexts, setPlayerDamageTexts, setAttackEffects },
    refs: { suppressBossHpResetRef, bossRespawnTimeoutRef, bossRespawnScheduledStageRef }
  };
}
