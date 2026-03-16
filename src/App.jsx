import React, { useState, useEffect, useRef } from 'react';
import { 
  Sword, Coins, Gem, Hammer, Pickaxe, AlertCircle, Sparkles, Flame, 
  ScrollText, Loader2, BrainCircuit, Shield, Ghost, Skull, ShieldAlert, 
  Crown, Target, Trophy, BarChart3, User, CheckCircle2, Circle, X, 
  Zap, ArrowUpCircle, Swords, Medal, Music, PlusCircle, TrendingUp, 
  Crosshair, Shirt, Infinity 
} from 'lucide-react';

/**
 * [Architectural Note]
 * 이 게임은 Data-Driven Design을 기반으로 합니다. 모든 확률, 비용, 스탯 가중치는 
 * 하단의 Configuration 섹션에서 관리되며, 핵심 로직은 순수 함수(Pure Function)를 통해 
 * 부작용(Side-effect) 없이 연산됩니다. (Open-Closed Principle 준수)
 */

// ==========================================
// 1. Configuration (게임 데이터 설정)
// ==========================================
const MAX_LEVEL = 25;

const ENHANCE_TIERS = [
  { threshold: 5, success: 100, drop: 0, destroy: 0, gold: 100, stone: 1, color: 'text-gray-300', glow: 'shadow-gray-500/50' },
  { threshold: 10, success: 85, drop: 0, destroy: 0, gold: 500, stone: 3, color: 'text-green-400', glow: 'shadow-green-500/50' },
  { threshold: 15, success: 55, drop: 15, destroy: 0, gold: 1500, stone: 5, color: 'text-blue-400', glow: 'shadow-blue-500/50' },
  { threshold: 20, success: 35, drop: 30, destroy: 5, gold: 5000, stone: 10, color: 'text-purple-500', glow: 'shadow-purple-500/50' },
  { threshold: 25, success: 15, drop: 40, destroy: 15, gold: 20000, stone: 25, color: 'text-red-500', glow: 'shadow-red-500/70' }
];

const APPRAISAL_GRADES = [
  { id: 'NORMAL', name: '일반', mult: 1.0, color: 'text-gray-400', reqRoll: 0 },
  { id: 'RARE', name: '희귀', mult: 1.2, color: 'text-blue-400', reqRoll: 50 },
  { id: 'EPIC', name: '영웅', mult: 1.5, color: 'text-purple-500', reqRoll: 80 },
  { id: 'LEGENDARY', name: '전설', mult: 2.0, color: 'text-yellow-400', reqRoll: 100 },
  { id: 'MYTHIC', name: '신화', mult: 3.5, color: 'text-red-500', reqRoll: 125 }
];

const EQUIP_TYPES = {
  weapon: { id: 'weapon', name: '무기', icon: Sword, desc: '공격력 상승' },
  armor: { id: 'armor', name: '방어구', icon: Shirt, desc: '투기장 피해 감소 및 확률 보정' },
  ring: { id: 'ring', name: '반지', icon: Circle, desc: '자원 획득량 증가' }
};

const RELICS_CONFIG = {
  DAMAGE: { id: 'DAMAGE', name: '고대 투신의 검집', desc: '최종 데미지 +15%', effect: 'damage_bonus', valuePerLevel: 0.15, max: 10, costBase: 1, costMult: 2, icon: Sword },
  GOLD: { id: 'GOLD', name: '황금 고블린의 자루', desc: '획득 골드 +30%', effect: 'farm_bonus', valuePerLevel: 0.3, max: 10, costBase: 1, costMult: 2, icon: Coins },
  SUCCESS: { id: 'SUCCESS', name: '시간의 톱니바퀴', desc: '강화 확률 +3%p', effect: 'success_bonus', valuePerLevel: 3, max: 10, costBase: 2, costMult: 2, icon: Hammer }
};

const TRAITS = {
  MINER: { id: 'MINER', name: '광부의 인내', desc: '채굴 골드 20% 증가', effect: 'farm_bonus', value: 1.2, color: 'text-yellow-400' },
  ARTISAN: { id: 'ARTISAN', name: '장인의 혼', desc: '강화 확률 5%p 증가', effect: 'success_bonus', value: 5, color: 'text-green-400' },
  SURVIVOR: { id: 'SURVIVOR', name: '불굴의 의지', desc: '실패 페널티 5%p 감소', effect: 'safety_bonus', value: 5, color: 'text-blue-400' },
  WARRIOR: { id: 'WARRIOR', name: '전사의 심장', desc: '최종 데미지 20% 증가', effect: 'damage_bonus', value: 1.2, color: 'text-red-400' },
  LUCKY: { id: 'LUCKY', name: '행운아', desc: '크리티컬 확률 15%p 증가', effect: 'crit_chance_bonus', value: 0.15, color: 'text-emerald-400' },
  GREEDY: { id: 'GREEDY', name: '탐욕', desc: '보스 보상 30% 증가', effect: 'boss_reward_bonus', value: 1.3, color: 'text-amber-500' },
  STEADY: { id: 'STEADY', name: '평정심', desc: '강화석 확률 10%p 증가', effect: 'stone_drop_bonus', value: 0.1, color: 'text-teal-400' }
};

const UNLOCKABLE_TRAITS = [
  { id: 'BERSERKER', name: '광전사', desc: '크리티컬 데미지 배율 +50%p', condition: (s) => s.bossesDefeated >= 10, effect: 'crit_damage_bonus', value: 0.5, color: 'text-red-600' },
  { id: 'MILLIONAIRE', name: '백만장자', desc: '강화 성공 확률 +10%p', condition: (s) => s.totalGoldEarned >= 1000000, effect: 'success_bonus', value: 10, color: 'text-yellow-300' },
  { id: 'MAD_CLICKER', name: '광기의 손가락', desc: '최종 데미지 30% 증가', condition: (s) => s.totalClicks >= 500, effect: 'damage_bonus', value: 1.3, color: 'text-fuchsia-400' },
  { id: 'REBORN', name: '초월자', desc: '강화석 확률 +15%p', condition: (s) => s.rebirthCount > 0, effect: 'stone_drop_bonus', value: 0.15, color: 'text-purple-400' }
];

const CUSTOM_STATS_CONFIG = {
  ATTACK: { id: 'ATTACK', name: '근력', desc: '데미지 +2%', effect: 'damage_bonus', valuePerPoint: 0.02, maxLevel: 50, icon: Sword },
  SUCCESS: { id: 'SUCCESS', name: '손재주', desc: '강화 확률 +0.5%p', effect: 'success_bonus', valuePerPoint: 0.5, maxLevel: 50, icon: Hammer },
  CRIT: { id: 'CRIT', name: '통찰력', desc: '크리티컬 확률 +1%p', effect: 'crit_chance_bonus', valuePerPoint: 0.01, maxLevel: 50, icon: Target },
  CRIT_DMG: { id: 'CRIT_DMG', name: '치명', desc: '크리티컬 데미지 +5%p', effect: 'crit_damage_bonus', valuePerPoint: 0.05, maxLevel: 50, icon: Crosshair },
  WEALTH: { id: 'WEALTH', name: '매력', desc: '획득 골드 +5%', effect: 'farm_bonus', valuePerPoint: 0.05, maxLevel: 50, icon: Coins }
};

const PERSONALITY_QUESTIONS = [
  { text: "[질문 1/2] 낡은 대장간 구석에서 심상치 않은 광석을 발견했습니다. 다음 행동은?", answers: [ { text: "창고에 보관하고 채굴에 집중한다.", trait: TRAITS.MINER }, { text: "가장 아끼는 망치를 들어 제련한다.", trait: TRAITS.ARTISAN }, { text: "쓰는 무기에 광석을 강제로 융합시킨다.", trait: TRAITS.SURVIVOR }, { text: "광석을 대검에 박고 돌진한다.", trait: TRAITS.WARRIOR } ] },
  { text: "[질문 2/2] 빛나는 3개의 보물상자가 나타났습니다. 어떤 방식을 선택하시겠습니까?", answers: [ { text: "가장 화려해 보이는 상자를 고른다.", trait: TRAITS.LUCKY }, { text: "세 상자를 모두 챙긴다.", trait: TRAITS.GREEDY }, { text: "튼튼해 보이는 상자를 하나만 연다.", trait: TRAITS.STEADY } ] }
];

const ACHIEVEMENTS_CONFIG = [
  { id: 'boss_slayer', name: '학살자', descPrefix: '보스', thresholds: [1, 5, 20, 50, 100], getDesc: (t) => `보스 ${t}마리 처치`, effect: 'damage_bonus', baseValue: 1.05, valuePerTier: 0.05, icon: Skull },
  { id: 'rich', name: '재벌', descPrefix: '누적 골드', thresholds: [50000, 200000, 1000000, 5000000], getDesc: (t) => `누적 ${t.toLocaleString()}G 획득`, effect: 'safety_bonus', baseValue: 3, valuePerTier: 2, icon: Coins },
  { id: 'arena', name: '검투사', descPrefix: '투기장 승리', thresholds: [1, 10, 50, 100], getDesc: (t) => `투기장 ${t}승`, effect: 'crit_damage_bonus', baseValue: 0.1, valuePerTier: 0.1, icon: Swords },
  { id: 'clicker', name: '행동대장', descPrefix: '누적 행동', thresholds: [100, 500, 2000, 10000], getDesc: (t) => `행동 ${t}회`, effect: 'stone_drop_bonus', baseValue: 0.05, valuePerTier: 0.02, icon: Pickaxe }
];

const BOSS_LIST = [
  { name: '떠돌이 고블린', icon: Ghost, maxHp: 150, rewardGold: 300, rewardStone: 2, color: 'text-green-500' },
  { name: '동굴 트롤', icon: Skull, maxHp: 800, rewardGold: 1000, rewardStone: 5, color: 'text-gray-400' },
  { name: '타락한 기사', icon: ShieldAlert, maxHp: 3500, rewardGold: 4000, rewardStone: 12, color: 'text-blue-500' },
  { name: '화염의 드래곤', icon: Flame, maxHp: 15000, rewardGold: 15000, rewardStone: 30, color: 'text-red-500' },
  { name: '심연의 군주', icon: Crown, maxHp: 80000, rewardGold: 50000, rewardStone: 100, color: 'text-purple-600' }
];

// ==========================================
// 2. Pure Functions (로직 연산 및 파이프라인)
// ==========================================

// 버프 통합 파이프라인 (Composite Pattern)
const getActiveBuffs = (traits, dynamicTraits, achievementLevels, allocatedStats, tavernBuffs, equipment, relics) => {
  const achBuffs = Object.entries(achievementLevels).map(([id, tier]) => {
    const ach = ACHIEVEMENTS_CONFIG.find(a => a.id === id);
    if (!ach || tier === 0) return null;
    return { effect: ach.effect, value: ach.baseValue + (ach.valuePerTier * (tier - 1)) };
  }).filter(Boolean);
  
  const allocBuffs = Object.entries(allocatedStats).map(([id, level]) => {
    if (level === 0) return null;
    const config = CUSTOM_STATS_CONFIG[id];
    let val = level * config.valuePerPoint;
    if (config.effect === 'damage_bonus' || config.effect === 'farm_bonus') val += 1; // 배율(Multiplier) 처리
    return { effect: config.effect, value: val };
  }).filter(Boolean);

  const tavernBuffList = [];
  if (tavernBuffs.damage > 0) tavernBuffList.push({ effect: 'damage_bonus', value: 1 + (tavernBuffs.damage * 0.03) }); 
  if (tavernBuffs.gold > 0) tavernBuffList.push({ effect: 'farm_bonus', value: 1 + (tavernBuffs.gold * 0.08) }); 

  const equipBuffs = [];
  if (equipment.armor > 0) equipBuffs.push({ effect: 'success_bonus', value: equipment.armor * 0.5 }); // 방어구: 강화 확률 보정
  if (equipment.ring > 0) {
    equipBuffs.push({ effect: 'farm_bonus', value: 1 + (equipment.ring * 0.05) }); // 반지: 골드 획득
    equipBuffs.push({ effect: 'stone_drop_bonus', value: equipment.ring * 0.02 }); // 반지: 강화석 획득
  }

  const relicBuffs = Object.entries(relics).map(([id, level]) => {
    if (level === 0) return null;
    const config = RELICS_CONFIG[id];
    let val = level * config.valuePerLevel;
    if (config.effect === 'damage_bonus' || config.effect === 'farm_bonus') val += 1;
    return { effect: config.effect, value: val };
  }).filter(Boolean);

  return [...traits, ...dynamicTraits, ...achBuffs, ...allocBuffs, ...tavernBuffList, ...equipBuffs, ...relicBuffs];
};

const getTierConfig = (level) => ENHANCE_TIERS.find(tier => level < tier.threshold) || ENHANCE_TIERS[ENHANCE_TIERS.length - 1];

const getEffectiveTierConfig = (level, activeBuffs, failStack, playerLevel) => {
  const baseConfig = getTierConfig(level);
  if (!activeBuffs || activeBuffs.length === 0) return { ...baseConfig, failStackBonus: 0, levelBonus: 0 };

  const successBonus = activeBuffs.filter(b => b.effect === 'success_bonus').reduce((acc, b) => acc + b.value, 0);
  const safetyBonus = activeBuffs.filter(b => b.effect === 'safety_bonus').reduce((acc, b) => acc + b.value, 0);
  
  const failStackBonus = failStack * 2;
  const levelBonus = (playerLevel - 1) * 0.5; // 레벨당 0.5%p 성공 확률 보정

  // Boundary Value Analysis: 확률 경계값(0~100) 방어
  return { 
    ...baseConfig, 
    success: Math.min(100, baseConfig.success + successBonus + failStackBonus + levelBonus), 
    drop: Math.max(0, baseConfig.drop - safetyBonus), 
    destroy: Math.max(0, baseConfig.destroy - safetyBonus),
    failStackBonus, levelBonus
  };
};

const getReqExp = (level) => Math.floor(100 * Math.pow(1.4, level - 1));
const getTavernCost = (visits) => Math.floor(500 * Math.pow(1.3, visits)); 
const getRelicCost = (config, currentLevel) => Math.floor(config.costBase * Math.pow(config.costMult, currentLevel));

const rollAppraisalGrade = (equipLevel) => {
  const roll = Math.random() * 100 + (equipLevel * 1.5);
  const eligibleGrades = APPRAISAL_GRADES.filter(g => roll >= g.reqRoll);
  return eligibleGrades[eligibleGrades.length - 1]; 
};

// 무기(Weapon) 레벨 기준 데미지 연산
const getComplexDamage = (weaponLevel, activeBuffs, playerLevel, appraisal) => {
  const playerBaseAttack = playerLevel * 3;
  const weaponAttack = 10 + Math.floor(Math.pow(weaponLevel, 1.85)); 
  let totalBase = playerBaseAttack + weaponAttack;
  
  if (activeBuffs && activeBuffs.length > 0) {
    const traitScaleMult = 1 + ((playerLevel - 1) * 0.01); // 플레이어 레벨에 따른 특성 효율 1% 증가
    const multiplier = activeBuffs.filter(b => b.effect === 'damage_bonus')
                                  .reduce((acc, b) => acc * (1 + (b.value - 1) * traitScaleMult), 1);
    totalBase = Math.floor(totalBase * multiplier);
  }
  if (appraisal) {
    totalBase = Math.floor(totalBase * appraisal.grade.mult);
  }
  return totalBase;
};

// 방어구(Armor) 레벨 기준 투기장 피해 감소 연산
const getDamageMitigation = (armorLevel) => Math.min(0.8, armorLevel * 0.02); // 최대 80% 감소

const getBossConfig = (stage) => {
  const safeStage = Math.max(0, stage);
  if (safeStage < BOSS_LIST.length) return BOSS_LIST[safeStage];
  const overStage = safeStage - BOSS_LIST.length + 1;
  return {
    name: `심연의 파편 (Lv.${overStage})`, icon: Crown,
    maxHp: Math.floor(80000 * Math.pow(1.8, overStage)),
    rewardGold: 50000 + (20000 * overStage), rewardStone: 100 + (20 * overStage), color: 'text-fuchsia-500'
  };
};

// ==========================================
// 3. Main Component
// ==========================================
export default function App() {
  // --- Core State ---
  const [gameState, setGameState] = useState('intro');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [traits, setTraits] = useState([]);
  const [dynamicTraits, setDynamicTraits] = useState([]); 
  const [activeModal, setActiveModal] = useState(null); 
  
  // --- Player Progression (Rebirth & Stats) ---
  const [playerData, setPlayerData] = useState({ level: 1, exp: 0, traitPoints: 0 });
  const [allocatedStats, setAllocatedStats] = useState({ ATTACK: 0, SUCCESS: 0, CRIT: 0, CRIT_DMG: 0, WEALTH: 0 });
  const [soulStones, setSoulStones] = useState(0);
  const [relics, setRelics] = useState({ DAMAGE: 0, GOLD: 0, SUCCESS: 0 });
  
  // --- Equipment & Resources ---
  const [equipment, setEquipment] = useState({ weapon: 0, armor: 0, ring: 0 });
  const [selectedEquip, setSelectedEquip] = useState('weapon');
  const [appraisals, setAppraisals] = useState({ weapon: null, armor: null, ring: null });
  const [failStack, setFailStack] = useState(0);
  const [gold, setGold] = useState(2000);
  const [stones, setStones] = useState(10);
  
  // --- Statistics & Metaprogression ---
  const [stats, setStats] = useState({ totalGoldEarned: 2000, bossesDefeated: 0, totalClicks: 0, arenaWins: 0, tavernVisits: 0, rebirthCount: 0 });
  const [achievementLevels, setAchievementLevels] = useState({}); 

  // --- UI & Combat State ---
  const [logs, setLogs] = useState([{ id: 0, text: '게임을 시작합니다. 자원을 모아 장비를 강화하세요!', type: 'info' }]);
  const [isAppraising, setIsAppraising] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [damageTexts, setDamageTexts] = useState([]); 
  
  // Boss State
  const [stage, setStage] = useState(0);
  const [bossHp, setBossHp] = useState(0);
  const [isAttacking, setIsAttacking] = useState(false);

  // Arena (Ghost PvP) State
  const [arenaOpponent, setArenaOpponent] = useState(null);
  const [arenaResult, setArenaResult] = useState(null); 
  const [winStreak, setWinStreak] = useState(0);
  
  // Tavern (Bard) State
  const [bardTale, setBardTale] = useState(null);
  const [isBardSinging, setIsBardSinging] = useState(false);
  const [tavernBuffs, setTavernBuffs] = useState({ damage: 0, gold: 0 });
  
  const logsContainerRef = useRef(null);
  const logIdCounter = useRef(1);
  const prevPlayerLevel = useRef(1);

  // --- Pipeline Computations ---
  const activeBuffs = getActiveBuffs(traits, dynamicTraits, achievementLevels, allocatedStats, tavernBuffs, equipment, relics);
  const currentEquipLevel = equipment[selectedEquip];
  const currentAppraisal = appraisals[selectedEquip];
  const currentConfig = getEffectiveTierConfig(currentEquipLevel, activeBuffs, failStack, playerData.level);
  
  const baseComputedDamage = getComplexDamage(equipment.weapon, activeBuffs, playerData.level, appraisals.weapon);
  const currentTavernCost = getTavernCost(stats.tavernVisits);

  // --- Effects ---
  useEffect(() => {
    if (logsContainerRef.current) logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    setBossHp(getBossConfig(stage).maxHp);
  }, [stage]);

  // Level Up Side-effect
  useEffect(() => {
    if (playerData.level > prevPlayerLevel.current) {
      const levelDiff = playerData.level - prevPlayerLevel.current;
      addLog(`🎉 레벨 업! 레벨 ${playerData.level} 달성! (TP ${levelDiff * 2} 획득)`, 'success');
      setStones(prev => prev + levelDiff * 2);
      prevPlayerLevel.current = playerData.level;
    }
  }, [playerData.level]);

  // Achievement & Dynamic Traits Observer
  useEffect(() => {
    let achievementsUpdated = false;
    const newAchLevels = { ...achievementLevels };
    
    ACHIEVEMENTS_CONFIG.forEach(ach => {
      const currentTier = newAchLevels[ach.id] || 0;
      if (currentTier >= ach.thresholds.length) return; 
      
      const nextThreshold = ach.thresholds[currentTier];
      let currentValue = 0;
      if (ach.id === 'boss_slayer') currentValue = stats.bossesDefeated;
      if (ach.id === 'rich') currentValue = stats.totalGoldEarned;
      if (ach.id === 'arena') currentValue = stats.arenaWins;
      if (ach.id === 'clicker') currentValue = stats.totalClicks;

      if (currentValue >= nextThreshold) {
        newAchLevels[ach.id] = currentTier + 1;
        achievementsUpdated = true;
        addLog(`🏆 [업적 달성] ${ach.name} Lv.${currentTier + 1} - 영구 버프 강화!`, 'success');
      }
    });
    if (achievementsUpdated) setAchievementLevels(newAchLevels);

    const newTraits = UNLOCKABLE_TRAITS.filter(t => !dynamicTraits.some(dt => dt.id === t.id) && t.condition(stats));
    if (newTraits.length > 0) {
      setDynamicTraits(prev => [...prev, ...newTraits]);
      newTraits.forEach(t => addLog(`🔥 [히든 특성 해금] 조건을 만족하여 '${t.name}' 특성을 획득했습니다!`, 'success'));
    }
  }, [stats]);

  // --- Handlers ---
  const addLog = (text, type = 'info') => setLogs(prev => [...prev.slice(-49), { id: logIdCounter.current++, text, type }]); 

  const showFloatingDamage = (amount, isCrit) => {
    const id = Date.now() + Math.random();
    const xOffset = Math.random() * 60 - 30; 
    const yOffset = Math.random() * 20 - 10;
    setDamageTexts(prev => [...prev, { id, amount, isCrit, x: xOffset, y: yOffset }]);
    setTimeout(() => setDamageTexts(prev => prev.filter(t => t.id !== id)), 800); 
  };

  const gainExp = (amount) => {
    setPlayerData(prev => {
      let newExp = prev.exp + amount;
      let newLv = prev.level;
      let newTp = prev.traitPoints;
      let reqExp = getReqExp(newLv);
      while (newExp >= reqExp) {
        newExp -= reqExp;
        newLv++;
        newTp += 2; 
        reqExp = getReqExp(newLv);
      }
      return { level: newLv, exp: newExp, traitPoints: newTp };
    });
  };

  const handleAllocateStat = (statId) => {
    if (playerData.traitPoints > 0 && allocatedStats[statId] < CUSTOM_STATS_CONFIG[statId].maxLevel) {
      setPlayerData(p => ({ ...p, traitPoints: p.traitPoints - 1 }));
      setAllocatedStats(p => ({ ...p, [statId]: p[statId] + 1 }));
    }
  };

  const handleRebirth = () => {
    if (playerData.level < 15) return addLog('환생은 플레이어 레벨 15 이상부터 가능합니다.', 'warning');
    
    // 장비의 평균 레벨 + 플레이어 레벨 비례하여 영혼석 지급
    const earnedStones = Math.floor((equipment.weapon + equipment.armor + equipment.ring) / 3) + Math.floor(playerData.level / 5);
    
    setSoulStones(prev => prev + earnedStones);
    setEquipment({ weapon: 0, armor: 0, ring: 0 });
    setAppraisals({ weapon: null, armor: null, ring: null });
    setPlayerData({ level: 1, exp: 0, traitPoints: 0 });
    setAllocatedStats({ ATTACK: 0, SUCCESS: 0, CRIT: 0, CRIT_DMG: 0, WEALTH: 0 });
    setGold(0);
    setStones(0);
    setStage(0);
    setFailStack(0);
    setArenaOpponent(null);
    setArenaResult(null);
    setStats(s => ({ ...s, rebirthCount: s.rebirthCount + 1 }));
    prevPlayerLevel.current = 1;
    
    setActiveModal(null);
    addLog(`✨ [환생] 육체를 초월하여 영혼석 ${earnedStones}개를 획득했습니다. (장비 및 스탯 초기화)`, 'success');
  };

  const handleUpgradeRelic = (relicId) => {
    const config = RELICS_CONFIG[relicId];
    const currentLevel = relics[relicId];
    const cost = getRelicCost(config, currentLevel);
    
    if (soulStones >= cost && currentLevel < config.max) {
      setSoulStones(prev => prev - cost);
      setRelics(prev => ({ ...prev, [relicId]: currentLevel + 1 }));
      addLog(`💎 [유물 강화] '${config.name}'의 힘이 강해집니다.`, 'success');
    }
  };

  const handleFarm = () => {
    const baseGold = Math.floor(Math.random() * 200) + 50;
    const traitScaleMult = 1 + ((playerData.level - 1) * 0.01);
    const goldBonus = activeBuffs.filter(b => b.effect === 'farm_bonus').reduce((acc, b) => acc * (1 + (b.value - 1) * traitScaleMult), 1);
    
    const earnedGold = Math.floor(baseGold * goldBonus);
    const baseStoneChance = 0.3;
    const stoneBonus = activeBuffs.filter(b => b.effect === 'stone_drop_bonus').reduce((acc, b) => acc + (b.value * traitScaleMult), 0);
    
    const earnedStones = Math.random() < (baseStoneChance + stoneBonus) ? 1 : 0; 
    
    setGold(prev => prev + earnedGold);
    if (earnedStones > 0) setStones(prev => prev + earnedStones);
    gainExp(15); 
    
    setStats(s => ({ ...s, totalClicks: s.totalClicks + 1, totalGoldEarned: s.totalGoldEarned + earnedGold }));
    addLog(`광산에서 골드 ${earnedGold}G${earnedStones > 0 ? ', 강화석 1개' : ''}를 획득했습니다.`, 'farm');
  };

  const handleEnhance = () => {
    if (currentEquipLevel >= MAX_LEVEL) return addLog('이미 최고 레벨에 도달했습니다!', 'warning');
    if (gold < currentConfig.gold || stones < currentConfig.stone) {
      return addLog(`자원이 부족합니다. (필요: ${currentConfig.gold}G, 강화석 ${currentConfig.stone}개)`, 'warning');
    }

    setGold(prev => prev - currentConfig.gold);
    setStones(prev => prev - currentConfig.stone);
    setStats(s => ({ ...s, totalClicks: s.totalClicks + 1 }));
    setIsAnimating(true);
    
    // 장비 강화 시 해당 부위의 감정 내역은 초기화 (새로운 기운)
    setAppraisals(prev => ({ ...prev, [selectedEquip]: null }));

    setTimeout(() => {
      setIsAnimating(false);
      const roll = Math.random() * 100;
      gainExp(currentConfig.gold / 20);
      
      if (roll < currentConfig.success) {
        setEquipment(prev => ({ ...prev, [selectedEquip]: prev[selectedEquip] + 1 }));
        setFailStack(0); 
        addLog(`[성공] ${EQUIP_TYPES[selectedEquip].name} +${currentEquipLevel + 1} 단계 달성!`, 'success');
      } else {
        setFailStack(prev => prev + 1); 
        if (roll < currentConfig.success + currentConfig.drop && currentEquipLevel > 0) {
          setEquipment(prev => ({ ...prev, [selectedEquip]: prev[selectedEquip] - 1 }));
          addLog(`[하락] 강화 실패로 레벨이 하락했습니다. (+${currentEquipLevel - 1}) (보정 스택 +1)`, 'danger');
        } else if (roll < currentConfig.success + currentConfig.drop + currentConfig.destroy) {
          setEquipment(prev => ({ ...prev, [selectedEquip]: 0 }));
          addLog(`[파괴] 장비가 산산조각 났습니다. (+0 초기화) (보정 스택 +1)`, 'danger');
        } else {
          addLog(`[실패] 강화에 실패했습니다. (+${currentEquipLevel}) (보정 스택 +1)`, 'warning');
        }
      }
    }, 600);
  };

  const handleAttack = () => {
    if (bossHp <= 0 || isAttacking || isAnimating) return;
    setIsAttacking(true);

    const baseCrit = 0.2;
    const traitScaleMult = 1 + ((playerData.level - 1) * 0.01);
    const critBonus = activeBuffs.filter(b => b.effect === 'crit_chance_bonus').reduce((acc, b) => acc + (b.value * traitScaleMult), 0);
    const isCrit = Math.random() < (baseCrit + critBonus);
    
    // RNG 보정 (±5%) 적용된 무기 공격력 연산
    const rngMultiplier = 0.95 + (Math.random() * 0.1); 
    let finalDamage = Math.floor(baseComputedDamage * rngMultiplier);
    
    if (isCrit) {
      const critDamageBonus = activeBuffs.filter(b => b.effect === 'crit_damage_bonus').reduce((acc, b) => acc + b.value, 0);
      finalDamage = Math.floor(finalDamage * (1.5 + critDamageBonus));
    }
    
    showFloatingDamage(finalDamage, isCrit); 
    
    const nextHp = Math.max(0, bossHp - finalDamage);
    setBossHp(nextHp);
    setStats(s => ({ ...s, totalClicks: s.totalClicks + 1 }));
    
    if (isCrit) addLog(`💥 크리티컬 적중! 보스에게 ${finalDamage}의 데미지를 입혔습니다.`, 'success');

    if (nextHp === 0) {
      const boss = getBossConfig(stage);
      const rewardBonus = activeBuffs.filter(b => b.effect === 'boss_reward_bonus').reduce((acc, b) => acc * (1 + (b.value - 1) * traitScaleMult), 1);
      
      const finalGoldReward = Math.floor(boss.rewardGold * rewardBonus);
      const finalStoneReward = Math.floor(boss.rewardStone * rewardBonus);

      setGold(prev => prev + finalGoldReward);
      setStones(prev => prev + finalStoneReward);
      gainExp(finalGoldReward / 10);
      setStats(s => ({ ...s, bossesDefeated: s.bossesDefeated + 1, totalGoldEarned: s.totalGoldEarned + finalGoldReward }));
      
      addLog(`[토벌 성공] ${boss.name} 처치! 골드 ${finalGoldReward}G, 강화석 ${finalStoneReward}개 획득.`, 'success');
      setTimeout(() => setStage(prev => prev + 1), 1200);
    }
    setTimeout(() => setIsAttacking(false), 150);
  };

  const handleAppraise = async () => {
    if (isAppraising) return;
    setIsAppraising(true);
    addLog(`✨ 대장장이에게 ${EQUIP_TYPES[selectedEquip].name} 감정을 의뢰합니다...`, 'info');

    // Canvas 환경 자동 주입을 위해 빈 문자열 유지
    const apiKey = ""; 
    const traitNames = traits.map(t => t.name).join(', ');
    const rolledGrade = rollAppraisalGrade(currentEquipLevel);

    const prompt = `너는 판타지 게임의 대장장이야. 이 장비는 +${currentEquipLevel} 단계의 ${EQUIP_TYPES[selectedEquip].name}이고 주인의 성향은 [${traitNames}]이야.
    등급은 [${rolledGrade.name}] 등급이야. 이 등급과 장비에 걸맞은 아주 멋지고 에픽한 '이름'과 1~2줄짜리 '배경 설정(lore)'을 작성해줘.
    결과는 반드시 {"name": "...", "lore": "..."} 형태의 JSON으로 줘.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
      });
      const data = await response.json();
      const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
      
      setAppraisals(prev => ({ ...prev, [selectedEquip]: { grade: rolledGrade, name: parsed.name, text: parsed.lore } }));
      addLog(`[감정 완료] [${rolledGrade.name}] 등급의 '${parsed.name}'(을)를 얻었습니다! (배율 x${rolledGrade.mult})`, 'success');
    } catch (error) {
      addLog('장비 감정에 실패했습니다.', 'danger');
    } finally {
      setIsAppraising(false);
    }
  };

  const generateArenaOpponent = () => {
    const oppLevel = Math.max(0, equipment.weapon + Math.floor(Math.random() * 5) - 2);
    const oppPlayerLevel = Math.max(1, playerData.level + Math.floor(Math.random() * 5) - 2);
    const oppGrade = rollAppraisalGrade(oppLevel);
    
    let oppDamage = (oppPlayerLevel * 3) + 10 + Math.floor(Math.pow(oppLevel, 1.85));
    oppDamage = Math.floor(oppDamage * oppGrade.mult);

    setArenaOpponent({ name: `망령 검사`, weaponLevel: oppLevel, playerLevel: oppPlayerLevel, grade: oppGrade, damage: oppDamage });
    setArenaResult(null); 
  };

  const handleArenaClash = () => {
    if (!arenaOpponent || isAttacking) return;
    setIsAttacking(true);

    const myRoll = baseComputedDamage * (0.8 + Math.random() * 0.4);
    // 방어구에 의한 투기장 피해 감소 처리
    const mitigation = getDamageMitigation(equipment.armor);
    const oppRoll = (arenaOpponent.damage * (0.8 + Math.random() * 0.4)) * (1 - mitigation);

    setTimeout(() => {
      setIsAttacking(false);
      const isWin = myRoll >= oppRoll;
      let reward = 0;

      if (isWin) {
        reward = 500 + (winStreak * 200) + (arenaOpponent.playerLevel * 100);
        setGold(prev => prev + reward);
        setWinStreak(prev => prev + 1);
        setStats(s => ({ ...s, arenaWins: s.arenaWins + 1 }));
        gainExp(reward / 5);
        addLog(`⚔️ [투기장 승리] 보상: ${reward.toLocaleString()}G`, 'success');
      } else {
        setWinStreak(0);
        addLog(`💀 [투기장 패배] 연승 초기화`, 'danger');
      }
      setArenaResult({ isWin, reward, myRoll: Math.floor(myRoll), oppRoll: Math.floor(oppRoll), mitigation: Math.floor(mitigation*100) });
    }, 800);
  };

  const handleListenBard = async () => {
    if (isBardSinging) return;
    if (gold < currentTavernCost) return addLog(`골드가 부족합니다. (필요: ${currentTavernCost.toLocaleString()}G)`, 'warning');

    setIsBardSinging(true);
    setGold(prev => prev - currentTavernCost);
    setStats(s => ({ ...s, tavernVisits: s.tavernVisits + 1 }));
    addLog(`🎵 음유시인에게 ${currentTavernCost.toLocaleString()}G를 주고 연주를 청합니다...`, 'info');

    const apiKey = ""; 
    const traitNames = traits.length > 0 ? traits.map(t => t.name).join(', ') : '특징 없는';
    const weaponName = appraisals.weapon ? appraisals.weapon.name : `+${equipment.weapon} 무기`;

    const prompt = `너는 판타지 세계 주점의 음유시인이야. 활약 중인 모험가에 대한 소문을 과장해서 들려줘.
    레벨: ${playerData.level}, 성향: ${traitNames}, 무기: ${weaponName}, 보스 킬: ${stats.bossesDefeated}, 투기장: ${stats.arenaWins}승
    영웅담이나 재미있는 헛소문을 2문장으로 작성해줘. {"title": "...", "content": "..."} 형태의 JSON으로 응답해.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
      });
      const data = await response.json();
      const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
      
      setBardTale({ title: parsed.title, content: parsed.content });
      
      const isDamageBuff = Math.random() > 0.5;
      if(isDamageBuff) {
        setTavernBuffs(p => ({...p, damage: p.damage + 1}));
        addLog(`[주점] 노래를 듣고 투지가 타오릅니다! (영구 데미지 +3%)`, 'success');
      } else {
        setTavernBuffs(p => ({...p, gold: p.gold + 1}));
        addLog(`[주점] 노래를 듣고 상술을 터득했습니다! (영구 골드 획득 +8%)`, 'success');
      }
    } catch (error) {
      addLog('음유시인이 술에 취해 노래를 부르지 못합니다.', 'danger');
    } finally {
      setIsBardSinging(false);
    }
  };

  // --- UI Renders ---
  if (gameState === 'intro') {
    const currentQ = PERSONALITY_QUESTIONS[questionIndex];
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-4 font-sans select-none">
        <div className="w-full max-w-lg bg-gray-900 rounded-3xl p-8 shadow-2xl border border-gray-800 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
          <BrainCircuit className="w-16 h-16 text-purple-500 mb-6" />
          <h1 className="text-2xl font-bold mb-2 tracking-wider">운명의 선택</h1>
          <div className="flex gap-2 mb-6">
            {PERSONALITY_QUESTIONS.map((_, idx) => (
              <div key={idx} className={`w-12 h-1.5 rounded-full transition-colors duration-300 ${idx === questionIndex ? 'bg-purple-500' : 'bg-gray-800'}`} />
            ))}
          </div>
          <p className="text-gray-300 mb-8 leading-relaxed text-balance min-h-[3rem]">{currentQ.text}</p>
          <div className="flex flex-col gap-3 w-full">
            {currentQ.answers.map((ans, idx) => (
              <button key={idx} onClick={() => {
                const newTraits = [...traits, ans.trait];
                if (questionIndex < PERSONALITY_QUESTIONS.length - 1) {
                  setTraits(newTraits); setQuestionIndex(prev => prev + 1);
                } else {
                  setTraits(newTraits); setGameState('playing'); addLog(`[운명의 결속] 특성이 무기에 깃들었습니다!`, 'success');
                }
              }} className="w-full bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-sm text-gray-200 p-4 rounded-xl transition-all border border-gray-700 text-left flex justify-between items-center group hover:scale-[1.02]">
                <span>{ans.text}</span><Shield className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${ans.trait.color}`} />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentBoss = getBossConfig(stage);
  const bossHpPercent = Math.max(0, (bossHp / currentBoss.maxHp) * 100);
  const reqExp = getReqExp(playerData.level);
  const expPercent = Math.min(100, (playerData.exp / reqExp) * 100);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans select-none overflow-x-hidden p-4 flex flex-col items-center">
      
      {/* Top Menu Buttons */}
      <div className="w-full max-w-md flex flex-wrap justify-center gap-2 mb-4">
        <button onClick={() => setActiveModal('traits')} className="flex-1 min-w-[60px] bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl py-2 flex justify-center items-center gap-1.5 text-xs text-gray-300 transition-colors relative">
          <User className="w-4 h-4" /> 스탯
          {playerData.traitPoints > 0 && <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">{playerData.traitPoints}</span>}
        </button>
        <button onClick={() => setActiveModal('achievements')} className="flex-1 min-w-[60px] bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl py-2 flex justify-center items-center gap-1.5 text-xs text-gray-300 transition-colors relative">
          <Trophy className={`w-4 h-4 ${Object.keys(achievementLevels).length > 0 ? 'text-yellow-500' : ''}`} /> 업적
        </button>
        <button onClick={() => { setActiveModal('arena'); if(!arenaOpponent) generateArenaOpponent(); }} className="flex-1 min-w-[60px] bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 rounded-xl py-2 flex justify-center items-center gap-1.5 text-xs text-red-300 transition-colors">
          <Swords className="w-4 h-4" /> 결투
        </button>
        <button onClick={() => setActiveModal('tavern')} className="flex-1 min-w-[60px] bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-900/50 rounded-xl py-2 flex justify-center items-center gap-1.5 text-xs text-emerald-300 transition-colors">
          <Music className="w-4 h-4" /> 주점
        </button>
        <button onClick={() => setActiveModal('rebirth')} className="flex-1 min-w-[60px] bg-blue-950/40 hover:bg-blue-900/60 border border-blue-900/50 rounded-xl py-2 flex justify-center items-center gap-1.5 text-xs text-blue-300 transition-colors relative">
          <Infinity className="w-4 h-4" /> 환생
          {soulStones > 0 && <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{soulStones}</span>}
        </button>
      </div>

      {/* Header Resources & Player EXP */}
      <div className="w-full max-w-md bg-gray-900 rounded-2xl p-4 shadow-lg flex flex-col gap-3 border border-gray-800 mb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Coins className="text-yellow-400 w-5 h-5" />
            <span className="font-mono text-xl font-bold">{gold.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Gem className="text-cyan-400 w-5 h-5" />
            <span className="font-mono text-xl font-bold">{stones.toLocaleString()}</span>
          </div>
        </div>
        
        <div className="bg-gray-950 rounded-lg p-2 border border-gray-800/50">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-purple-400 font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> Lv.{playerData.level}</span>
            <span className="text-gray-500 font-mono">{Math.floor(playerData.exp)} / {reqExp} EXP</span>
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${expPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Boss Raid Panel */}
      <div className="w-full max-w-md bg-gray-900 rounded-3xl p-6 shadow-2xl border border-red-900/30 relative overflow-hidden mb-4">
        <div className="absolute inset-0 bg-gradient-to-t from-red-900/10 to-transparent pointer-events-none" />
        
        {/* Floating Damage Texts */}
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {damageTexts.map(t => (
            <div key={t.id} 
                 className={`absolute left-1/2 top-1/2 font-black text-center whitespace-nowrap -translate-x-1/2 -translate-y-1/2 animate-in fade-in slide-in-from-bottom-8 duration-500 fill-mode-forwards opacity-0 ${t.isCrit ? 'text-red-400 text-3xl drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] scale-125' : 'text-white text-xl drop-shadow-md'}`}
                 style={{ transform: `translate(calc(-50% + ${t.x}px), calc(-50% + ${t.y}px))` }}>
              {t.isCrit && <span className="text-yellow-300 text-sm block -mb-1">CRITICAL</span>}-{t.amount.toLocaleString()}
            </div>
          ))}
        </div>

        <div className="flex justify-between items-end mb-4 relative z-10">
          <div>
            <span className="text-xs font-bold text-red-500 tracking-widest uppercase block mb-1">Stage {stage + 1}</span>
            <h2 className={`text-xl font-bold ${currentBoss.color} flex items-center gap-2`}><currentBoss.icon className="w-6 h-6" /> {currentBoss.name}</h2>
          </div>
          <div className="text-right">
            <span className="text-sm font-mono text-gray-300 block">HP: {bossHp.toLocaleString()} / {currentBoss.maxHp.toLocaleString()}</span>
          </div>
        </div>
        <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden mb-5 border border-gray-700 shadow-inner relative z-10">
          <div className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300" style={{ width: `${bossHpPercent}%` }} />
        </div>
        <button onClick={handleAttack} disabled={bossHp <= 0 || isAttacking || isAnimating}
          className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-100 relative z-20
            ${bossHp <= 0 ? 'bg-gray-800 text-gray-500 border border-gray-700' : 'bg-red-950/50 hover:bg-red-900 border border-red-700/50 text-red-100 hover:shadow-[0_0_15px_rgba(220,38,38,0.3)]'}
            ${isAttacking ? 'scale-95' : ''}
          `}>
          <Target className="w-5 h-5" />
          {bossHp <= 0 ? '다음 스테이지 준비 중...' : '무기 공격 (클릭)'}
        </button>
      </div>

      {/* Equipment Selector (Tabs) */}
      <div className="w-full max-w-md flex bg-gray-900 rounded-2xl p-1.5 border border-gray-800 mb-2">
        {Object.entries(EQUIP_TYPES).map(([key, equip]) => (
          <button key={key} onClick={() => setSelectedEquip(key)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${selectedEquip === key ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
            <equip.icon className="w-4 h-4" /> {equip.name} <span className="text-xs font-mono ml-1">+{equipment[key]}</span>
          </button>
        ))}
      </div>

      {/* Main Equipment Display */}
      <div className="w-full max-w-md bg-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-800 flex flex-col items-center relative overflow-hidden mb-4">
        {currentAppraisal && (
          <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold border bg-gray-950/80 backdrop-blur-sm ${currentAppraisal.grade.color} border-current`}>
            {currentAppraisal.grade.name} 등급
          </div>
        )}

        <h1 className="text-2xl font-bold mb-1 mt-4 tracking-wider text-center z-10">
          <span className={currentAppraisal ? currentAppraisal.grade.color : currentConfig.color}>
            {currentEquipLevel === 0 && !currentAppraisal ? `평범한 ${EQUIP_TYPES[selectedEquip].name}` : `+${currentEquipLevel} ${currentAppraisal?.name || `알 수 없는 ${EQUIP_TYPES[selectedEquip].name}`}`}
          </span>
        </h1>
        
        <div className="text-gray-400 mb-4 font-mono z-10 flex flex-col items-center">
          {selectedEquip === 'weapon' ? (
            <div className="flex items-center gap-2">
              <span>공격력: <span className="text-white font-bold text-xl">{baseComputedDamage.toLocaleString()}</span></span>
              {currentAppraisal && currentAppraisal.grade.mult > 1 && <span className={`text-xs ${currentAppraisal.grade.color}`}>(x{currentAppraisal.grade.mult})</span>}
            </div>
          ) : selectedEquip === 'armor' ? (
            <div className="text-sm text-blue-300">투기장 피해 감소: {(getDamageMitigation(equipment.armor) * 100).toFixed(0)}%</div>
          ) : (
             <div className="text-sm text-yellow-300">자원 획득량 보너스: +{(equipment.ring * 5)}%</div>
          )}
        </div>

        {/* Dynamic Equip Icon */}
        <div className={`relative p-6 rounded-full mb-6 transition-all duration-500 z-10
          ${isAnimating ? 'animate-bounce scale-110' : ''} ${isAttacking && selectedEquip === 'weapon' ? '-translate-y-4 scale-105 duration-75' : ''}
          ${currentConfig.glow} shadow-[0_0_40px_rgba(0,0,0,0.5)] bg-gray-800
        `}>
          {React.createElement(EQUIP_TYPES[selectedEquip].icon, { className: `w-20 h-20 ${currentConfig.color} ${currentEquipLevel >= 20 ? 'animate-pulse' : ''}` })}
        </div>

        {/* Info & Probabilities */}
        <div className="w-full bg-gray-950 rounded-xl p-4 border border-gray-800 z-10">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">강화 비용</span>
            <span className="font-mono">
              <span className={gold >= currentConfig.gold ? 'text-yellow-400' : 'text-red-400'}>{currentConfig.gold.toLocaleString()}G</span>
              <span className="text-gray-500 mx-1">/</span>
              <span className={stones >= currentConfig.stone ? 'text-cyan-400' : 'text-red-400'}>{currentConfig.stone.toLocaleString()}석</span>
            </span>
          </div>
          
          <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-gray-800">
            <div style={{ width: `${currentConfig.success}%` }} className="bg-green-500" />
            <div style={{ width: `${100 - currentConfig.success - currentConfig.drop - currentConfig.destroy}%` }} className="bg-gray-500" />
            <div style={{ width: `${currentConfig.drop}%` }} className="bg-orange-500" />
            <div style={{ width: `${currentConfig.destroy}%` }} className="bg-red-600" />
          </div>
          
          <div className="flex justify-between text-xs mt-2 text-gray-500">
            <span className="text-green-500 font-bold flex items-center gap-1">
              성공 {currentConfig.success.toFixed(1)}%
              {(currentConfig.failStackBonus > 0 || currentConfig.levelBonus > 0) && (
                <span className="text-purple-400 flex items-center text-[10px]"><ArrowUpCircle className="w-3 h-3 mr-0.5" />보정</span>
              )}
            </span>
            {currentConfig.drop > 0 && <span className="text-orange-500">하락 {currentConfig.drop.toFixed(1)}%</span>}
            {currentConfig.destroy > 0 && <span className="text-red-500">파괴 {currentConfig.destroy.toFixed(1)}%</span>}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md flex flex-col gap-3 mb-4">
        <div className="flex gap-3 w-full">
          <button onClick={handleFarm} disabled={isAnimating || isAppraising || bossHp <= 0} className="flex-1 bg-gray-800 hover:bg-gray-700 active:bg-gray-900 text-white rounded-xl py-4 flex flex-col items-center justify-center gap-2 transition-colors border border-gray-700 disabled:opacity-50">
            <Pickaxe className="w-5 h-5" />
            <span className="font-bold text-sm">광물 캐기</span>
          </button>
          <button onClick={handleEnhance} disabled={isAnimating || isAppraising || bossHp <= 0 || currentEquipLevel >= MAX_LEVEL} className={`flex-1 rounded-xl py-4 flex flex-col items-center justify-center gap-2 transition-all font-bold text-sm ${currentEquipLevel >= MAX_LEVEL ? 'bg-gray-800 text-gray-500' : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-lg shadow-blue-900/50'} ${(isAnimating || isAppraising || bossHp <= 0) ? 'opacity-50' : ''}`}>
            <Hammer className="w-5 h-5" />
            <span>{currentEquipLevel >= MAX_LEVEL ? 'MAX LEVEL' : '강화하기'}</span>
          </button>
        </div>
        <button onClick={handleAppraise} disabled={isAnimating || isAppraising || bossHp <= 0} className="w-full bg-gradient-to-r from-purple-900 to-indigo-900 hover:from-purple-800 text-purple-200 rounded-xl py-3 flex items-center justify-center gap-2 transition-all border border-purple-500/30 disabled:opacity-50 relative overflow-hidden">
          {isAppraising && <div className="absolute inset-0 bg-purple-500/20 animate-pulse" />}
          {isAppraising ? <Loader2 className="w-4 h-4 animate-spin text-purple-300 relative z-10" /> : <ScrollText className="w-4 h-4 text-purple-300 relative z-10" />}
          <span className="font-bold tracking-wide text-sm relative z-10">
            {isAppraising ? '무기 감정 중...' : `✨ 대장장이에게 ${EQUIP_TYPES[selectedEquip].name} 감정 의뢰하기 ✨`}
          </span>
        </button>
      </div>

      {/* System Logs */}
      <div className="w-full max-w-md bg-gray-900 rounded-2xl p-4 border border-gray-800 shadow-lg h-32 flex flex-col">
        <h3 className="text-gray-400 text-xs font-bold mb-2 uppercase tracking-widest flex items-center gap-2"><AlertCircle className="w-4 h-4" /> 시스템 로그</h3>
        <div ref={logsContainerRef} className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2 scroll-smooth">
          <div className="flex flex-col gap-1">
            {logs.map((log) => (
              <div key={log.id} className={`text-xs py-1.5 px-2 rounded font-mono break-keep ${log.type === 'success' ? 'bg-green-500/10 text-green-400' : log.type === 'danger' ? 'bg-red-500/10 text-red-400' : log.type === 'warning' ? 'bg-orange-500/10 text-orange-400' : log.type === 'farm' ? 'text-gray-400' : 'text-gray-300'}`}>{log.text}</div>
            ))}
          </div>
        </div>
      </div>

      {/* --- Modals --- */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" onClick={() => setActiveModal(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm md:max-w-md relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>

            {/* Rebirth Modal Content */}
            {activeModal === 'rebirth' && (
              <div>
                <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2 text-blue-400"><Infinity className="w-5 h-5" /> 환생 (Prestige)</h3>
                <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 pb-2">
                  <div className="bg-blue-950/20 rounded-xl p-4 border border-blue-900/30 text-center">
                    <p className="text-sm text-gray-300 mb-2 break-keep">환생 시 모든 장비와 레벨이 초기화되며 대신 영혼석을 얻습니다.</p>
                    <div className="flex justify-center items-center gap-2 text-blue-300 font-bold text-lg mb-4">
                      <Gem className="w-5 h-5" /> 현재 영혼석: {soulStones} 개
                    </div>
                    <button onClick={handleRebirth} className="w-full py-3 bg-blue-800 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
                      ✨ 환생하기 (예상 획득: {Math.floor((equipment.weapon + equipment.armor + equipment.ring) / 3) + Math.floor(playerData.level / 5)}개)
                    </button>
                  </div>
                  
                  <h4 className="text-sm font-bold text-gray-300 mt-2">고대 유물 (영구 보너스)</h4>
                  {Object.entries(RELICS_CONFIG).map(([id, config]) => {
                    const currentLevel = relics[id];
                    const cost = getRelicCost(config, currentLevel);
                    return (
                      <div key={id} className="flex items-center justify-between p-3 rounded-lg bg-gray-950 border border-gray-800">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-900 rounded-lg text-blue-400"><config.icon className="w-5 h-5" /></div>
                          <div>
                            <div className="text-sm font-bold text-gray-200">{config.name} <span className="text-xs text-blue-400">Lv.{currentLevel}/{config.max}</span></div>
                            <div className="text-xs text-gray-500">{config.desc}</div>
                          </div>
                        </div>
                        <button onClick={() => handleUpgradeRelic(id)} disabled={soulStones < cost || currentLevel >= config.max} className="px-3 py-1.5 bg-blue-900/50 hover:bg-blue-800 text-blue-300 rounded-md transition-colors disabled:opacity-30 text-xs font-bold whitespace-nowrap">
                          {currentLevel >= config.max ? 'MAX' : `${cost}석`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ghost PvP Arena Modal */}
            {activeModal === 'arena' && (
              <div>
                <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2 text-red-400"><Swords className="w-5 h-5" /> 비동기 투기장</h3>
                
                {arenaResult ? (
                  <div className="flex flex-col gap-4 animate-in zoom-in-95 duration-300">
                    <div className={`rounded-xl p-5 border text-center relative overflow-hidden ${arenaResult.isWin ? 'bg-yellow-950/30 border-yellow-700/50' : 'bg-red-950/30 border-red-900/50'}`}>
                      <h2 className={`text-2xl font-bold mb-2 ${arenaResult.isWin ? 'text-yellow-400' : 'text-red-500'}`}>
                        {arenaResult.isWin ? '결투 승리!' : '결투 패배...'}
                      </h2>
                      <div className="flex justify-around items-center mb-4 text-sm font-mono border-y border-gray-800/50 py-3">
                        <div className="text-center">
                          <span className="text-gray-500 block text-[10px] mb-1">내 굴림</span>
                          <span className="text-white font-bold">{arenaResult.myRoll.toLocaleString()}</span>
                        </div>
                        <span className="text-gray-600 font-bold">VS</span>
                        <div className="text-center">
                          <span className="text-gray-500 block text-[10px] mb-1">적 굴림 (-{arenaResult.mitigation}%)</span>
                          <span className="text-red-400 font-bold">{arenaResult.oppRoll.toLocaleString()}</span>
                        </div>
                      </div>
                      {arenaResult.isWin ? (
                        <div className="flex items-center justify-center gap-2 text-yellow-300 font-bold"><Coins className="w-5 h-5" /> 보상: {arenaResult.reward.toLocaleString()}G</div>
                      ) : <div className="text-gray-500 text-sm">연승이 초기화되었습니다.</div>}
                    </div>
                    <button onClick={() => { setArenaResult(null); setArenaOpponent(null); }} className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors">계속하기</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="bg-gray-950 rounded-xl p-4 border border-gray-800 text-center relative overflow-hidden">
                      <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-yellow-500 font-bold"><Medal className="w-3 h-3"/> {winStreak}연승</div>
                      <p className="text-sm text-gray-400 mb-2">당신의 무력 (예상치)</p>
                      <p className="text-2xl font-mono text-white mb-1">{baseComputedDamage.toLocaleString()}</p>
                      <p className="text-[10px] text-blue-400">방어구 피해 감소: {(getDamageMitigation(equipment.armor) * 100).toFixed(0)}%</p>
                    </div>
                    <div className="text-center text-gray-500 font-bold">VS</div>
                    <div className="bg-red-950/20 rounded-xl p-4 border border-red-900/30 text-center min-h-[140px] flex flex-col justify-center">
                      {arenaOpponent ? (
                        <div className="animate-in fade-in duration-300">
                          <h4 className="text-md font-bold text-gray-200 mb-1">{arenaOpponent.name} <span className="text-xs text-gray-500">(Lv.{arenaOpponent.playerLevel})</span></h4>
                          <p className={`text-sm mb-3 ${arenaOpponent.grade.color}`}>+{arenaOpponent.weaponLevel} 무기 [{arenaOpponent.grade.name}]</p>
                          <p className="text-xs text-gray-400 mb-1">상대 전투력 (예상치)</p>
                          <p className="text-xl font-mono text-red-300">{arenaOpponent.damage.toLocaleString()}</p>
                        </div>
                      ) : <p className="text-sm text-gray-400">상대를 찾고 있습니다...</p>}
                    </div>
                    {arenaOpponent ? (
                      <button onClick={handleArenaClash} disabled={isAttacking} className="w-full py-3 bg-red-800 hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50">
                        {isAttacking ? '격돌 중...' : '⚔️ 무기 격돌 시작'}
                      </button>
                    ) : <button onClick={generateArenaOpponent} className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors">상대 탐색</button>}
                  </div>
                )}
              </div>
            )}

            {/* Traits & Allocator Modal Content */}
            {activeModal === 'traits' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white text-lg font-bold flex items-center gap-2"><User className="w-5 h-5" /> 스탯 & 특성</h3>
                  <div className="bg-purple-900/50 px-3 py-1 rounded-full border border-purple-500/50 flex items-center gap-2">
                    <span className="text-xs text-purple-300 font-bold">보유 TP</span>
                    <span className="font-mono text-white">{playerData.traitPoints}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 pb-2">
                  <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                    <h4 className="text-xs font-bold text-gray-400 mb-3 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> 스탯 분배 (Max Lv.50)</h4>
                    <div className="flex flex-col gap-2">
                      {Object.values(CUSTOM_STATS_CONFIG).map((stat) => (
                        <div key={stat.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-900 border border-gray-800/50">
                          <div className="flex items-center gap-2">
                            <stat.icon className="w-4 h-4 text-purple-400" />
                            <div>
                              <div className="text-sm font-bold text-gray-200">{stat.name} <span className="text-xs font-mono text-purple-400 ml-1">Lv.{allocatedStats[stat.id]}/{stat.maxLevel}</span></div>
                              <div className="text-[10px] text-gray-500">{stat.desc}</div>
                            </div>
                          </div>
                          <button onClick={() => handleAllocateStat(stat.id)} disabled={playerData.traitPoints <= 0 || allocatedStats[stat.id] >= stat.maxLevel} className="p-1.5 bg-purple-900/50 hover:bg-purple-800 text-purple-300 rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-purple-900/50">
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                    <h4 className="text-xs font-bold text-gray-400 mb-3">히든 특성 (스탯 조건 해금)</h4>
                    <div className="flex flex-col gap-2">
                      {dynamicTraits.length === 0 ? <p className="text-xs text-gray-500">해금된 히든 특성이 없습니다.</p> : dynamicTraits.map((t, idx) => (
                        <div key={idx} className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5"><Zap className={`w-3 h-3 ${t.color}`} /><span className={`text-sm font-bold ${t.color}`}>{t.name}</span></div>
                          <span className="text-xs text-gray-500 pl-4">{t.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                    <h4 className="text-xs font-bold text-gray-400 mb-3">기본 성향</h4>
                    <div className="flex flex-col gap-2">
                      {traits.length === 0 ? <p className="text-xs text-gray-500">보유한 성향이 없습니다.</p> : traits.map((t, idx) => (
                        <div key={idx} className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5"><Shield className={`w-3 h-3 ${t.color}`} /><span className={`text-sm font-bold ${t.color}`}>{t.name}</span></div>
                          <span className="text-xs text-gray-500 pl-4">{t.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats & Records Modal Content */}
            {activeModal === 'stats' && (
              <div>
                <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5" /> 누적 통계</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm border-b border-gray-800 pb-2"><span className="text-gray-400">환생 횟수</span><span className="font-mono text-blue-400 font-bold">{stats.rebirthCount} 번</span></div>
                  <div className="flex justify-between items-center text-sm border-b border-gray-800 pb-2"><span className="text-gray-400">처치한 보스</span><span className="font-mono text-white">{stats.bossesDefeated} 마리</span></div>
                  <div className="flex justify-between items-center text-sm border-b border-gray-800 pb-2"><span className="text-gray-400">누적 골드 획득</span><span className="font-mono text-yellow-400">{stats.totalGoldEarned.toLocaleString()}G</span></div>
                  <div className="flex justify-between items-center text-sm border-b border-gray-800 pb-2"><span className="text-gray-400">투기장 승리</span><span className="font-mono text-red-400">{stats.arenaWins} 회</span></div>
                  <div className="flex justify-between items-center text-sm border-b border-gray-800 pb-2"><span className="text-gray-400">주점 방문 횟수</span><span className="font-mono text-emerald-400">{stats.tavernVisits} 회</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="text-gray-400">총 행동 횟수</span><span className="font-mono text-gray-300">{stats.totalClicks.toLocaleString()} 번</span></div>
                </div>
              </div>
            )}

            {/* Achievements Modal Content (2 Grid Layout) */}
            {activeModal === 'achievements' && (
              <div className="w-full">
                <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" /> 다단계 업적</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 pb-2">
                  {ACHIEVEMENTS_CONFIG.map((ach) => {
                    const currentTier = achievementLevels[ach.id] || 0;
                    const maxTier = ach.thresholds.length;
                    const isUnlocked = currentTier > 0;
                    return (
                      <div key={ach.id} className={`p-3 rounded-xl border flex flex-col gap-2 transition-colors ${isUnlocked ? 'bg-gray-800/80 border-gray-600' : 'bg-gray-950/50 border-gray-800/50 opacity-60'}`}>
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-md flex-shrink-0 ${isUnlocked ? 'bg-yellow-500/20 text-yellow-500' : 'bg-gray-900 text-gray-600'}`}><ach.icon className="w-4 h-4" /></div>
                          <span className={`text-sm font-bold flex-1 truncate ${isUnlocked ? 'text-gray-200' : 'text-gray-500'}`}>
                            {ach.name} <span className="text-[10px] ml-1 text-gray-400">Lv.{currentTier}/{maxTier}</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-gray-400 block mb-1">{currentTier < maxTier ? `다음 목표: ${ach.getDesc(ach.thresholds[currentTier])}` : '최종 단계 도달!'}</span>
                          <span className={`text-[10px] font-bold ${isUnlocked ? 'text-purple-400' : 'text-gray-600'}`}>현재 버프: {ach.descPrefix} {(ach.baseValue + ach.valuePerTier * Math.max(0, currentTier - 1)).toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tavern (Bard) Modal Content */}
            {activeModal === 'tavern' && (
              <div>
                <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2 text-emerald-400"><Music className="w-5 h-5" /> 뒷골목 주점</h3>
                <div className="flex flex-col gap-4">
                  <div className="bg-emerald-950/20 rounded-xl p-4 border border-emerald-900/30 text-center relative min-h-[120px] flex flex-col items-center justify-center">
                    {isBardSinging ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                        <p className="text-sm text-emerald-300">음유시인이 류트 줄을 튕기며 영감을 떠올리고 있습니다...</p>
                      </div>
                    ) : bardTale ? (
                      <div className="animate-in fade-in duration-500 text-left w-full">
                        <h4 className="text-md font-bold text-emerald-300 mb-2 border-b border-emerald-900/50 pb-2">"{bardTale.title}"</h4>
                        <p className="text-sm text-gray-300 leading-relaxed italic break-keep text-balance">"{bardTale.content}"</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">"점점 소문 구하기가 어려워지는군. 골드만 충분히 낸다면, 영구적인 영감(Buff)을 줄 이야기를 하나 해주지."</p>
                    )}
                  </div>

                  <button onClick={handleListenBard} disabled={isBardSinging} className="w-full py-3 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    <Coins className="w-4 h-4 text-yellow-400" /> {currentTavernCost.toLocaleString()}G 내고 이야기 듣기 ✨
                  </button>
                  
                  {(tavernBuffs.damage > 0 || tavernBuffs.gold > 0) && (
                     <div className="mt-2 text-center text-xs text-gray-400">
                       현재까지 획득한 주점 버프: 데미지 +{tavernBuffs.damage * 3}%, 골드 +{tavernBuffs.gold * 8}%
                     </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}