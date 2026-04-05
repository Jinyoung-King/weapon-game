/* eslint-disable no-unused-vars */
/* global __initial_auth_token */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  DEFAULT_UI_SETTINGS, UI_SETTINGS_KEY, 
  ACHIEVEMENTS_CONFIG, ENHANCE_TIERS, EQUIP_TYPES, MAX_LEVEL,
  CUSTOM_STATS_CONFIG, RELICS_CONFIG, PERSONALITY_QUESTIONS, TRAITS,
  APPRAISAL_GRADES, IDLE_REWARD_MAX_MS, IDLE_REWARD_MIN_MS, PBKDF2_ITERATIONS,
  DAILY_QUESTS, DAILY_QUEST_ALL_DONE_REWARD, SKILLS, ROGUELIKE_BUFF_POOL
} from '../config/constants';
import { appId, auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  getSaveKey, getPinKey, isValidPin, getStoredPinRecord, 
  readUiSettings, clampNumber, getReqExp, getRelicCost, applyExpOffline, 
  getBossConfig, generateLocalAppraisal, getActiveBuffs,
  peekLastSessionSave, persistLastSession
} from '../utils/gameUtils';

// Sub-hooks
import { useEconomyState } from './subhooks/useEconomyState';
import { useCombatState } from './subhooks/useCombatState';
import { useSocialState } from './subhooks/useSocialState';
import { useUiState } from './subhooks/useUiState';
import { useAuthState } from './subhooks/useAuthState';

// Handlers
import { useEconomyHandlers } from './subhooks/useEconomyHandlers';
import { useCombatHandlers } from './subhooks/useCombatHandlers';
import { useSocialHandlers } from './subhooks/useSocialHandlers';
import { useAuthHandlers } from './subhooks/useAuthHandlers';

export function useGameLogic() {
  // 1. Initialize States
  const economy = useEconomyState();
  const combat = useCombatState();
  const social = useSocialState();
  const ui = useUiState();
  const auth = useAuthState();

  // 2. Computed (Memoized) States
  const activeBuffs = useMemo(() => {
    const buffs = getActiveBuffs(economy.state.traits, economy.state.allocatedStats, ui.state.achievementLevels, economy.state.relics, economy.state.appraisals, economy.state.equipment);
    
    // Run Buffs
    combat.state.runBuffs.forEach(b => buffs.push({ effect: b.effect, value: b.value, label: b.name }));


    // Temporary Skill Buffs
    const now = Date.now();
    combat.state.tempBuffs.forEach(b => {
      if (b.expiresAt > now) {
        buffs.push({ effect: b.effect, value: b.value, label: b.name });
      }
    });

    return buffs;
  }, [economy.state, combat.state.runBuffs, combat.state.tempBuffs, ui.state.achievementLevels]);

  const myCombatPower = useMemo(() => {
    const atkAllocated = economy.state.allocatedStats.ATTACK * 25;
    const relicDmg = 1 + (economy.state.relics.DAMAGE * 0.1);
    const dmgBonus = activeBuffs.filter(b => b.effect === 'damage_bonus_p').reduce((acc, b) => acc + b.value, 0);
    const levelAtk = economy.state.playerData.level * 10;
    const weaponAtk = economy.state.equipment.weapon * 25;
    
    return Math.floor((100 + levelAtk + weaponAtk + atkAllocated) * (1 + dmgBonus) * relicDmg);
  }, [economy.state, activeBuffs]);

  const playerMaxHealth = useMemo(() => {
    const levelHp = economy.state.playerData.level * 50;
    const armorHp = economy.state.equipment.armor * 100;
    const hpBonus = activeBuffs.filter(b => b.effect === 'hp_bonus_p').reduce((acc, b) => acc + b.value, 0);
    return Math.floor((500 + levelHp + armorHp) * (1 + hpBonus));
  }, [economy.state.playerData.level, economy.state.equipment.armor, activeBuffs]);

  // Sync playerMaxHp
  useEffect(() => {
    combat.setters.setPlayerMaxHp(playerMaxHealth);
    if (combat.state.playerHp === 100 || combat.state.playerHp === 0) {
      combat.setters.setPlayerHp(playerMaxHealth);
    }
  }, [playerMaxHealth]);

  const hasLocalPin = useMemo(() => !!localStorage.getItem(getPinKey(ui.state.playerName)), [ui.state.playerName]);

  const hasNewAchievements = useMemo(() => {
    return Object.keys(ui.state.achievementLevels).some(
      id => (ui.state.achievementLevels[id] || 0) > (ui.state.viewedAchievementLevels[id] || 0)
    );
  }, [ui.state.achievementLevels, ui.state.viewedAchievementLevels]);

  // 3. Orchestrated Logic & Handlers
  const addLog = (text, type = 'info') => {
    const newLog = { id: Date.now(), text, type, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) };
    ui.setters.setLogs(prev => [newLog, ...prev.slice(0, 49)]);
  };

  const gainExp = (amount) => {
    const { playerData } = economy.state;
    let nextExp = (playerData.exp || 0) + amount;
    let nextLevel = playerData.level || 1;
    let nextTraitPoints = playerData.traitPoints || 0;

    while (nextExp >= getReqExp(nextLevel)) {
      nextExp -= getReqExp(nextLevel);
      nextLevel++;
      nextTraitPoints += 5;
      addLog(`[레벨업] Lv.${nextLevel} 달성! (특성 +5)`, 'success');
    }

    economy.setters.setPlayerData({ level: nextLevel, exp: nextExp, traitPoints: nextTraitPoints });
  };

  const getFullStateToSave = useCallback(() => {
    // Exclude non-serializable things like the Firebase User object
    const socialToSave = { ...social.state };
    delete socialToSave.user;

    const authToSave = { ...auth.state };
    // pendingLogin might contain a user object, clear it too
    delete authToSave.pendingLogin;

    return {
      ...economy.state,
      ...combat.state,
      ...socialToSave,
      ...ui.state,
      ...authToSave,
      lastSavedAt: Date.now()
    };
  }, [economy.state, combat.state, social.state, ui.state, auth.state]);

  const loadGameFromSave = (data) => {
    // Economy & Player
    economy.setters.setGold(data.gold || 0);
    economy.setters.setStones(data.stones || 0);
    economy.setters.setSoulStones(data.soulStones || 0);
    economy.setters.setPlayerData(data.playerData || { level: 1, exp: 0, traitPoints: 0 });
    economy.setters.setEquipment(data.equipment || { weapon: 0, armor: 0, ring: 0 });
    economy.setters.setAppraisals(data.appraisals || { weapon: null, armor: null, ring: null });
    economy.setters.setAllocatedStats(data.allocatedStats || { ATTACK: 0, SUCCESS: 0, CRIT: 0, WEALTH: 0 });
    economy.setters.setTraits(data.traits || []);
    economy.setters.setRelics(data.relics || { DAMAGE: 0, GOLD: 0, CRIT: 0, SUCCESS: 0 });
    economy.setters.setFailStack(data.failStack || 0);

    // Combat
    combat.setters.setStage(data.stage || 0);
    combat.setters.setBossHp(data.bossHp || getBossConfig(data.stage || 0).maxHp);
    combat.setters.setMana(data.mana || 100);
    combat.setters.setMaxMana(data.maxMana || 100);
    combat.setters.setRunBuffs(data.runBuffs || []);

    // Social & Progress
    let normalizedQuests = [];
    if (Array.isArray(data.dailyQuests)) {
      normalizedQuests = data.dailyQuests;
    } else if (data.dailyQuests && typeof data.dailyQuests === 'object') {
      normalizedQuests = DAILY_QUESTS.map(q => ({
        ...q,
        current: data.dailyQuests.state?.[q.id] || 0,
        claimed: data.dailyQuests.claimed?.includes(q.id) || false
      }));
    } else {
      normalizedQuests = DAILY_QUESTS.map(q => ({ ...q, current: 0, claimed: false }));
    }
    social.setters.setDailyQuests(normalizedQuests);
    social.setters.setPvpHistory(data.pvpHistory || []);
    ui.setters.setStatistics(data.statistics || { totalGoldEarned: 0, bossesDefeated: 0, totalClicks: 0, pvpWins: 0, pvpLosses: 0, arenaPoints: 1000, lastPvpAt: 0 });
    ui.setters.setAchievementLevels(data.achievementLevels || {});
    ui.setters.setViewedAchievementLevels(data.viewedAchievementLevels || {});

    // Boss fix from remote
    if (data.stage !== undefined) {
      combat.setters.setStage(data.stage);
      combat.setters.setBossHp(data.bossHp ?? getBossConfig(data.stage).maxHp);
    }

    addLog('[시스템] 데이터를 성공적으로 불러왔습니다.', 'success');
  };

  // Bootstrapping Effect (Remote Feature)
  useEffect(() => {
    if (ui.state.appState !== 'playing' && typeof window !== 'undefined') {
      const peek = peekLastSessionSave();
      if (peek && ui.state.appState === 'login') {
         ui.setters.setAppState('bootstrapping');
      }
    }
  }, [ui.state.appState]);

  useEffect(() => {
    if (ui.state.appState === 'bootstrapping') {
      const peek = peekLastSessionSave();
      if (peek) {
        try {
          ui.setters.setPlayerName(peek.name);
          loadGameFromSave(JSON.parse(peek.raw));
          ui.setters.setAppState('playing');
          addLog(`[자동 복구] ${peek.name}님, 환영합니다!`, 'success');
        } catch (e) {
          console.error('Session restore failed:', e);
          persistLastSession(null);
          ui.setters.setAppState('login');
        }
      } else {
        ui.setters.setAppState('login');
      }
    }
  }, [ui.state.appState]);

  useEffect(() => {
    if (ui.state.appState === 'playing' && ui.state.playerName) {
      persistLastSession(ui.state.playerName);
    }
  }, [ui.state.appState, ui.state.playerName]);

  // Utilities to pass into handlers
  const utils = { 
    addLog, getFullStateToSave, loadGameFromSave, 
    generateLocalAppraisal, getRelicCost, RELICS_CONFIG, gainExp,
    setAppState: ui.setters.setAppState,
    setPlayerName: ui.setters.setPlayerName,
    setIsAnimating: ui.setters.setIsAnimating,
    setActiveModal: ui.setters.setActiveModal,
    updateQuestProgress: (t, a) => social.setters.setDailyQuests(prev => prev.map(q => q.id === t ? { ...q, current: (q.current || 0) + a } : q))
  };

  const bundle = {
    state: { 
      game: { ...economy.state, statistics: ui.state.statistics, achievementLevels: ui.state.achievementLevels }, 
      combat: { ...combat.state, myCombatPower, activeBuffs }, 
      social: social.state, 
      auth: auth.state, 
      ui: ui.state, 
      pvp: social.state 
    },
    setters: { 
      game: { ...economy.setters, setStatistics: ui.setters.setStatistics }, 
      combat: combat.setters, 
      social: social.setters, 
      auth: auth.setters, 
      ui: ui.setters, 
      pvp: social.setters 
    },
    utils
  };

  const economyHandlers = useEconomyHandlers(bundle);
  const combatHandlers = useCombatHandlers(bundle);
  const socialHandlers = useSocialHandlers(bundle);
  const authHandlers = useAuthHandlers(bundle);

  // 4. Effects (System Core)
  
  // Initial Cloud Load
  const isInitialLoaded = useRef(false);


  useEffect(() => {
    // 이미 로딩되었거나, 사용자/이름이 없거나, 앱 상태가 playing이 아니면 중단
    if (isInitialLoaded.current || !social.state.user || !ui.state.playerName || ui.state.appState !== 'playing') return;

    const fetchData = async () => {
      try {
        const profileRef = doc(db, 'artifacts', appId, 'public', 'data', 'profiles', ui.state.playerName);
        const snap = await getDoc(profileRef);
        if (snap.exists() && snap.data().state) {
          loadGameFromSave(snap.data().state);
          isInitialLoaded.current = true; // 로드 완료 표시
          console.log('[Firestore] 초기 데이터를 성공적으로 불러와 보호 조치를 활성화했습니다.');
        }
      } catch (err) {
        console.error('Load Error:', err);
      }
    };
    fetchData();
  }, [social.state.user, ui.state.playerName, ui.state.appState]);

  // Main Game Loop (1s)
  const miningTickerRef = useRef(0);
  useEffect(() => {
    if (ui.state.appState !== 'playing' || ui.state.isScreenSaver) return;
    
    const interval = setInterval(() => {
      // Temp Buffs Cleanup
      combat.setters.setTempBuffs(prev => prev.filter(b => b.expiresAt > Date.now()));

      // Mana Regen
      const regenRate = 2 * (1 + (activeBuffs.find(b => b.effect === 'mana_regen_p')?.value || 0));
      combat.setters.setMana(m => Math.min(combat.state.maxMana, m + regenRate));

      // Auto Attack (Turn-based: Disabled auto-attack to wait for player input)
      // combatHandlers.handleAttack();

      // Auto Mining (3s interval)
      miningTickerRef.current += 1;
      if (miningTickerRef.current >= 3) {
        miningTickerRef.current = 0;
        const { level } = economy.state.playerData;
        const { weapon, armor, ring } = economy.state.equipment;
        const wealthMult = activeBuffs.filter(b => b.effect === 'wealth_bonus').reduce((acc, b) => acc * b.value, 1);
        
        const baseYield = (level * 2 + (weapon + armor + ring)) || 1;
        const finalGold = Math.floor(baseYield * wealthMult);
        
        const farmBonusP = activeBuffs.find(b => b.effect === 'farm_bonus_p')?.value || 0;
        const finalStone = Math.random() < (0.05 + farmBonusP) ? 1 : 0;
        
        if (finalGold > 0) {
          economyHandlers.completeMining(finalGold, finalStone);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [ui.state.appState, ui.state.isScreenSaver, activeBuffs, combat.state.maxMana, combatHandlers, economy.state.playerData, economy.state.equipment, economyHandlers]);

  // Auto Save (300s = 5m)
  // 5분마다 클라우드에 자동 저장하여 Firestore 쓰기(Write) 할당량을 보존합니다.
  const lastSocialHandlersRef = useRef(socialHandlers);
  useEffect(() => {
    lastSocialHandlersRef.current = socialHandlers;
  }, [socialHandlers]);

  useEffect(() => {
    if (ui.state.appState !== 'playing') return;
    const interval = setInterval(() => {
      lastSocialHandlersRef.current.syncCloudSave();
    }, 300000); 
    return () => clearInterval(interval);
  }, [ui.state.appState]); // appState가 playing일 때만 딱 한 번 설정됨

  // 5. Achievement Progress Monitoring
  useEffect(() => {
    if (ui.state.appState !== 'playing') return;
    
    const nextLevels = { ...ui.state.achievementLevels };
    let changed = false;

    ACHIEVEMENTS_CONFIG.forEach(ach => {
      const currentTier = nextLevels[ach.id] || 0;
      if (currentTier >= ach.thresholds.length) return;

      // 현재 업적에 해당하는 통계값 가져오기
      let currentVal = 0;
      switch (ach.id) {
        case 'boss_slayer': currentVal = ui.state.statistics.bossesDefeated; break;
        case 'rich': currentVal = ui.state.statistics.totalGoldEarned; break;
        case 'clicker': currentVal = ui.state.statistics.totalClicks; break;
        case 'level_up': currentVal = economy.state.playerData.level; break;
        case 'enhancer': currentVal = Object.values(economy.state.equipment).reduce((a, b) => a + b, 0); break;
        case 'pvp_master': currentVal = ui.state.statistics.arenaPoints; break;
        case 'arena_slayer': currentVal = ui.state.statistics.pvpWins; break;
        default: break;
      }

      let newTier = currentTier;
      while (newTier < ach.thresholds.length && currentVal >= ach.thresholds[newTier]) {
        newTier++;
      }

      if (newTier > currentTier) {
        nextLevels[ach.id] = newTier;
        changed = true;
        addLog(`[업적 달성] ${ach.name} Lv.${newTier} 달성!`, 'success');
      }
    });

    if (changed) {
      ui.setters.setAchievementLevels(nextLevels);
    }
  }, [ui.state.statistics, economy.state.playerData.level, economy.state.equipment, ui.state.appState]);

  // 통합 모달 처리 효과
  useEffect(() => {
    if (!ui.state.activeModal) return;

    if (ui.state.activeModal === 'feedback') {
        socialHandlers.fetchFeedback();
    } else if (ui.state.activeModal === 'pvp') {
        socialHandlers.fetchRankings();
        socialHandlers.fetchPvpLogs();
    } else if (ui.state.activeModal === 'achievements') {
        ui.setters.setViewedAchievementLevels({ ...ui.state.achievementLevels });
    }
  }, [ui.state.activeModal]);

  // 대결 모달 전환 조건부 효과
  useEffect(() => {
    if (social.state.pvpOpponent && ui.state.activeModal !== 'pvp_clash') {
        ui.setters.setActiveModal('pvp_clash');
    }
  }, [social.state.pvpOpponent, ui.state.activeModal]);

  // 자동 카드 선택 모달 (보너스 선택)
  useEffect(() => {
    if (combat.state.pendingCards?.length > 0 && ui.state.activeModal !== 'card_selection') {
      ui.setters.setActiveModal('card_selection');
    }
  }, [combat.state.pendingCards, ui.state.activeModal]);

  // Unified actions object
  // UI 컴포넌트들(ModalManager, ActionButtons 등)에서 기대하는 함수 이름으로 명시적 매핑을 수행합니다.
  const actions = {
    // Economy
    ...economyHandlers,
    enhanceEquip: economyHandlers.handleEnhance,
    appraiseEquip: economyHandlers.handleAppraisal,
    allocateStat: economyHandlers.handleTraitAllocation,
    buyRelic: economyHandlers.handleRelicUpgrade,

    // Combat
    ...combatHandlers,
    attack: combatHandlers.handleAttack,
    useSkill: combatHandlers.handleUseSkill,
    chooseRunBuff: combatHandlers.handleChooseRunBuff,

    // Social & Auth
    ...socialHandlers,
    fetchPvpLogs: socialHandlers.fetchPvpLogs,
    ...authHandlers,

    // UI
    setCurrentTab: ui.setters.setCurrentTab,
    setActiveModal: (modal) => {
        if (ui.state.activeModal === 'pvp_clash' && modal !== 'pvp_clash') {
          social.setters.setPvpOpponent(null);
          social.setters.setPvpResult(null);
        }
        ui.setters.setActiveModal(modal);
    },
    setSelectedEquip: ui.setters.setSelectedEquip,
    setAppState: ui.setters.setAppState,
    setFeedbackDraft: ui.setters.setFeedbackDraft,
    addLog
  };

  return {
    state: {
      session: { ...auth.state, ...ui.state, hasLocalPin },
      game: { ...economy.state, ...ui.state, hasNewAchievements },
      combat: { ...combat.state, myCombatPower, activeBuffs },
      ui: { ...ui.state, ...auth.state }, 
      pvp: social.state,
      social: social.state
    },
    actions
  };
}
