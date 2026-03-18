/* global __firebase_config, __app_id, __initial_auth_token */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sword, Coins, Gem, Hammer, Pickaxe, AlertCircle, Sparkles, Flame, 
  ScrollText, Loader2, BrainCircuit, Shield, Ghost, Skull, ShieldAlert, 
  Crown, Target, Trophy, BarChart3, User, CheckCircle2, Circle, X, 
  Zap, ArrowUpCircle, Swords, Medal, Music, PlusCircle, TrendingUp, 
  Crosshair, Shirt, Infinity as InfinityIcon, Settings, Save, Trash2, Cloud, Users, MessageSquare,
  ZapOff, Timer
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, addDoc, query, orderBy, limit, serverTimestamp, onSnapshot } from 'firebase/firestore';

// ==========================================
// 1. Constants & Configurations (Firebase Settings)
// ==========================================

// TODO: 본인의 Firebase 콘솔에서 발급받은 설정값을 아래에 붙여넣으세요.
const localFirebaseConfig = {
  apiKey: "AIzaSyAoCTTBL4BnQCKYKvsoAI1Ok4eEsrMeqXg",
  authDomain: "weapon-game-4c382.firebaseapp.com",
  projectId: "weapon-game-4c382",
  storageBucket: "weapon-game-4c382.firebasestorage.app",
  messagingSenderId: "40692170716",
  appId: "1:40692170716:web:7bb9a609c9ccfc634d9919",
  measurementId: "G-C1GVWLZJMW"
};


// Canvas 샌드박스 환경 변수가 존재하면 우선 사용하고, 로컬 환경이면 localFirebaseConfig를 사용합니다.
const firebaseConfig = typeof __firebase_config !== 'undefined' && __firebase_config 
  ? JSON.parse(__firebase_config) 
  : localFirebaseConfig;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'jiny-weapon-soul-v4';

const SAVE_PREFIX = 'JINY_SAVE_V4_';
const PIN_KEY_SUFFIX = '__PIN_V1';
const UI_SETTINGS_KEY = 'JINY_UI_V1';
const PBKDF2_ITERATIONS = 120_000;
const DEFAULT_UI_SETTINGS = { screenSaverEnabled: true, screenSaverIdleMs: 120_000 };
const IDLE_REWARD_MAX_MS = 8 * 60 * 60 * 1000;
const IDLE_REWARD_MIN_MS = 30 * 1000;

const getSaveKey = (name) => `${SAVE_PREFIX}${name}`;
const getPinKey = (name) => `${SAVE_PREFIX}${name}${PIN_KEY_SUFFIX}`;
const isValidPin = (pin) => typeof pin === 'string' && /^\d{4,12}$/.test(pin);

const readUiSettings = () => {
  try {
    const raw = localStorage.getItem(UI_SETTINGS_KEY);
    if (!raw) return DEFAULT_UI_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      screenSaverEnabled: Boolean(parsed?.screenSaverEnabled ?? DEFAULT_UI_SETTINGS.screenSaverEnabled),
      screenSaverIdleMs: Math.max(10_000, Number(parsed?.screenSaverIdleMs ?? DEFAULT_UI_SETTINGS.screenSaverIdleMs) || DEFAULT_UI_SETTINGS.screenSaverIdleMs)
    };
  } catch {
    return DEFAULT_UI_SETTINGS;
  }
};

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

const applyExpOffline = (playerData, expAmount) => {
  let nextLevel = playerData.level || 1;
  let nextExp = (playerData.exp || 0) + expAmount;
  let nextTraitPoints = playerData.traitPoints || 0;

  while (nextExp >= getReqExp(nextLevel)) {
    nextExp -= getReqExp(nextLevel);
    nextLevel += 1;
    nextTraitPoints += 3;
  }

  return { level: nextLevel, exp: nextExp, traitPoints: nextTraitPoints };
};

const bytesToBase64 = (bytes) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};

const base64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

const getStoredPinRecord = (name) => {
  try {
    const raw = localStorage.getItem(getPinKey(name));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.salt !== 'string' || typeof parsed.hash !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
};

const hashPin = async (pin, saltB64) => {
  const subtle = globalThis?.crypto?.subtle;
  if (!subtle) throw new Error('WebCrypto not available');

  const salt = saltB64 ? base64ToBytes(saltB64) : globalThis.crypto.getRandomValues(new Uint8Array(16));
  const pinBytes = new TextEncoder().encode(pin);

  const keyMaterial = await subtle.importKey('raw', pinBytes, 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );

  return { salt: bytesToBase64(salt), hash: bytesToBase64(new Uint8Array(bits)) };
};

const verifyPin = async (pin, record) => {
  const { salt, hash } = await hashPin(pin, record.salt);
  return salt === record.salt && hash === record.hash;
};

const MAX_LEVEL = 30;

const ENHANCE_TIERS = [
  { threshold: 5, success: 100, drop: 0, destroy: 0, gold: 100, stone: 1, color: 'text-gray-300', glow: 'shadow-gray-500/50' },
  { threshold: 10, success: 85, drop: 0, destroy: 0, gold: 500, stone: 3, color: 'text-green-400', glow: 'shadow-green-500/50' },
  { threshold: 15, success: 55, drop: 15, destroy: 0, gold: 1500, stone: 5, color: 'text-blue-400', glow: 'shadow-blue-500/50' },
  { threshold: 20, success: 35, drop: 30, destroy: 5, gold: 5000, stone: 10, color: 'text-purple-500', glow: 'shadow-purple-500/50' },
  { threshold: 30, success: 15, drop: 40, destroy: 15, gold: 25000, stone: 30, color: 'text-red-500', glow: 'shadow-red-500/70' }
];

const APPRAISAL_GRADES = [
  { id: 'NORMAL', name: '일반', mult: 1.0, color: 'text-gray-400', reqRoll: 0 },
  { id: 'RARE', name: '희귀', mult: 1.25, color: 'text-blue-400', reqRoll: 40 },
  { id: 'EPIC', name: '영웅', mult: 1.6, color: 'text-purple-500', reqRoll: 75 },
  { id: 'LEGENDARY', name: '전설', mult: 2.2, color: 'text-yellow-400', reqRoll: 95 },
  { id: 'MYTHIC', name: '신화', mult: 4.5, color: 'text-red-500', reqRoll: 120 }
];

const EQUIP_TYPES = {
  weapon: { id: 'weapon', name: '무기', icon: Sword },
  armor: { id: 'armor', name: '방어구', icon: Shirt },
  ring: { id: 'ring', name: '반지', icon: Circle }
};

const TRAITS = {
  MINER: { id: 'MINER', name: '광부의 인내', desc: '채굴 골드 20% 증가', effect: 'farm_bonus', value: 1.2, color: 'text-yellow-400' },
  ARTISAN: { id: 'ARTISAN', name: '장인의 혼', desc: '강화 확률 5%p 증가', effect: 'success_bonus', value: 5, color: 'text-green-400' },
  SURVIVOR: { id: 'SURVIVOR', name: '불굴의 의지', desc: '실패 페널티 5%p 감소', effect: 'safety_bonus', value: 5, color: 'text-blue-400' },
  WARRIOR: { id: 'WARRIOR', name: '전사의 심장', desc: '최종 데미지 20% 증가', effect: 'damage_bonus', value: 1.2, color: 'text-red-400' }
};

const PERSONALITY_QUESTIONS = [
  { text: "[질문 1/4] 낡은 대장간에서 심상치 않은 광석을 발견했습니다. 다음 행동은?", answers: [ { text: "창고에 보관하고 채굴에 집중한다.", trait: TRAITS.MINER }, { text: "아끼는 망치를 들어 제련한다.", trait: TRAITS.ARTISAN } ] },
  { text: "[질문 2/4] 전투 중 절체절명의 위기! 당신의 선택은?", answers: [ { text: "방패를 굳게 쥐고 버틴다.", trait: TRAITS.SURVIVOR }, { text: "모든 힘을 쥐어짜내 공격한다.", trait: TRAITS.WARRIOR } ] },
  { text: "[질문 3/4] 광산 갱도에서 붕괴가 시작됩니다. 가장 먼저 하는 행동은?", answers: [ { text: "광석 주머니를 꽉 쥐고 출구를 찾는다.", trait: TRAITS.MINER }, { text: "동료를 붙잡고 안전한 길을 만든다.", trait: TRAITS.SURVIVOR } ] },
  { text: "[질문 4/4] 강력한 적이 눈앞에 나타났습니다. 준비하는 방식은?", answers: [ { text: "무기 균형을 다시 맞추고 완벽을 추구한다.", trait: TRAITS.ARTISAN }, { text: "기회를 기다리지 않고 선제 공격한다.", trait: TRAITS.WARRIOR } ] }
];

const CUSTOM_STATS_CONFIG = {
  ATTACK: { id: 'ATTACK', name: '근력', desc: '데미지 +3%', valuePerPoint: 0.03, maxLevel: 100, icon: Sword },
  SUCCESS: { id: 'SUCCESS', name: '손재주', desc: '강화 확률 +0.3%p', valuePerPoint: 0.3, maxLevel: 100, icon: Hammer },
  CRIT: { id: 'CRIT', name: '통찰력', desc: '크리티컬 확률 +1%p', valuePerPoint: 0.01, maxLevel: 100, icon: Target },
  WEALTH: { id: 'WEALTH', name: '매력', desc: '골드 획득 +5%', valuePerPoint: 0.05, maxLevel: 100, icon: Coins }
};

const ACHIEVEMENTS_CONFIG = [
  { id: 'boss_slayer', name: '학살자', descPrefix: '보스 처치', thresholds: [1, 5, 20, 50], getDesc: (t) => `보스 ${t}마리 처치`, effect: 'damage_bonus', baseValue: 1.05, valuePerTier: 0.05, icon: Skull },
  { id: 'rich', name: '재벌', descPrefix: '누적 골드', thresholds: [50000, 200000, 1000000], getDesc: (t) => `누적 ${t.toLocaleString()}G`, effect: 'safety_bonus', baseValue: 3, valuePerTier: 2, icon: Coins },
  { id: 'clicker', name: '행동대장', descPrefix: '누적 행동', thresholds: [100, 500, 2000], getDesc: (t) => `행동 ${t}회`, effect: 'stone_drop_bonus', baseValue: 0.05, valuePerTier: 0.02, icon: Pickaxe }
];

const RELICS_CONFIG = {
  DAMAGE: { id: 'DAMAGE', name: '고대 투신의 검집', desc: '최종 데미지 +15%', effect: 'damage_bonus', valuePerLevel: 0.15, max: 10, costBase: 1, costMult: 2, icon: Sword },
  GOLD: { id: 'GOLD', name: '황금 고블린의 자루', desc: '획득 골드 +30%', effect: 'farm_bonus', valuePerLevel: 0.3, max: 10, costBase: 1, costMult: 2, icon: Coins }
};

const BOSS_LIST = [
  { name: '떠돌이 고블린', icon: Ghost, maxHp: 150, rewardGold: 300, rewardStone: 2, color: 'text-green-500' },
  { name: '동굴 트롤', icon: Skull, maxHp: 800, rewardGold: 1000, rewardStone: 5, color: 'text-gray-400' },
  { name: '타락한 기사', icon: ShieldAlert, maxHp: 3500, rewardGold: 4000, rewardStone: 12, color: 'text-blue-500' },
  { name: '화염의 드래곤', icon: Flame, maxHp: 15000, rewardGold: 15000, rewardStone: 30, color: 'text-red-500' }
];

// ==========================================
// 2. Pure Functions & Generators
// ==========================================
const getReqExp = (level) => Math.floor(100 * Math.pow(1.5, level - 1));
const getRelicCost = (config, level) => Math.floor(config.costBase * Math.pow(config.costMult, level));

const getBossConfig = (stage) => {
  if (stage < BOSS_LIST.length) return BOSS_LIST[stage];
  const overStage = stage - BOSS_LIST.length + 1;
  return {
    name: `심연의 파편 (Lv.${overStage})`, icon: Crown,
    maxHp: Math.floor(15000 * Math.pow(1.8, overStage)),
    rewardGold: 20000 + (10000 * overStage), rewardStone: 40 + (10 * overStage), color: 'text-fuchsia-500'
  };
};

const generateLocalAppraisal = (typeId, level) => {
  const assets = {
    weapon: { pre: ["전설의", "불타는", "얼어붙은", "심연의", "고결한"], suf: ["검", "대검", "도끼", "망치", "창"] },
    armor: { pre: ["불굴의", "철갑의", "은빛", "용의"], suf: ["갑옷", "흉갑", "가죽옷"] },
    ring: { pre: ["지혜의", "탐욕의", "행운의", "영생의"], suf: ["반지", "고리", "인장"] }
  }[typeId];
  
  const roll = Math.random() * 100 + (level * 1.5);
  const grade = APPRAISAL_GRADES.filter(g => roll >= g.reqRoll).pop();
  const name = `${assets.pre[Math.floor(Math.random() * assets.pre.length)]} ${assets.suf[Math.floor(Math.random() * assets.suf.length)]}`;
  return { grade, name, text: "고대 마력이 느껴지는 장비입니다." };
};

const getActiveBuffs = (traits, stats, achievements, relics) => {
  const buffs = [];
  traits.forEach(t => buffs.push({ effect: t.effect, value: t.value }));
  
  if (stats.ATTACK > 0) buffs.push({ effect: 'damage_bonus', value: 1 + (stats.ATTACK * CUSTOM_STATS_CONFIG.ATTACK.valuePerPoint) });
  if (stats.SUCCESS > 0) buffs.push({ effect: 'success_bonus', value: stats.SUCCESS * CUSTOM_STATS_CONFIG.SUCCESS.valuePerPoint });
  if (stats.CRIT > 0) buffs.push({ effect: 'crit_chance_bonus', value: stats.CRIT * CUSTOM_STATS_CONFIG.CRIT.valuePerPoint });
  if (stats.WEALTH > 0) buffs.push({ effect: 'farm_bonus', value: 1 + (stats.WEALTH * CUSTOM_STATS_CONFIG.WEALTH.valuePerPoint) });

  Object.entries(achievements).forEach(([id, tier]) => {
    const ach = ACHIEVEMENTS_CONFIG.find(a => a.id === id);
    if (ach && tier > 0) buffs.push({ effect: ach.effect, value: ach.baseValue + (ach.valuePerTier * (tier - 1)) });
  });

  Object.entries(relics).forEach(([id, level]) => {
    const rel = RELICS_CONFIG[id];
    if (rel && level > 0) {
      let val = level * rel.valuePerLevel;
      if (rel.effect.includes('bonus')) val += 1;
      buffs.push({ effect: rel.effect, value: val });
    }
  });

  return buffs;
};

// ==========================================
// 3. Main Component Structure
// ==========================================
export default function App() {
  const DEFAULT_STATS = {
    totalGoldEarned: 1000,
    bossesDefeated: 0,
    totalClicks: 0,
    pvpWins: 0,
    pvpLosses: 0,
    arenaPoints: 1000,
    lastPvpAt: 0
  };

  // --- App State ---
  const [appState, setAppState] = useState('login'); // 'login', 'intro', 'playing'
  const [playerName, setPlayerName] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [introVotes, setIntroVotes] = useState([]);

  // --- Core Game State ---
  const [gold, setGold] = useState(1000);
  const [stones, setStones] = useState(5);
  const [soulStones, setSoulStones] = useState(0);
  const [playerData, setPlayerData] = useState({ level: 1, exp: 0, traitPoints: 0 });
  const [equipment, setEquipment] = useState({ weapon: 0, armor: 0, ring: 0 });
  const [appraisals, setAppraisals] = useState({ weapon: null, armor: null, ring: null });
  const [allocatedStats, setAllocatedStats] = useState({ ATTACK: 0, SUCCESS: 0, CRIT: 0, WEALTH: 0 });
  const [traits, setTraits] = useState([]);
  const [relics, setRelics] = useState({ DAMAGE: 0, GOLD: 0 });
  const [failStack, setFailStack] = useState(0);
  
  // --- Trackers & Progression ---
  const [statistics, setStatistics] = useState(DEFAULT_STATS);
  const [achievementLevels, setAchievementLevels] = useState({});
	  const [stage, setStage] = useState(0);
	  const [bossHp, setBossHp] = useState(0);
	  const suppressBossHpResetRef = useRef(null); // stage number to suppress once
	  const bossRespawnTimeoutRef = useRef(null);
	  const bossRespawnScheduledStageRef = useRef(null);

  // --- UI State ---
  const [logs, setLogs] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedEquip, setSelectedEquip] = useState('weapon');
  const [isAnimating, setIsAnimating] = useState(false);
  const [damageTexts, setDamageTexts] = useState([]);

  // --- PvP State ---
  const [user, setUser] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pvpOpponent, setPvpOpponent] = useState(null);
  const [pvpResult, setPvpResult] = useState(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [pvpHistory, setPvpHistory] = useState([]);

  // --- Local PIN (Optional) ---
  const [pendingLogin, setPendingLogin] = useState(null); // { name, data }
  const [pinPrompt, setPinPrompt] = useState({ open: false, pin: '', error: '', busy: false });
  const [pinSettings, setPinSettings] = useState({ current: '', next: '', confirm: '', error: '', busy: false });

  // --- UI Settings & Screen Saver ---
  const [uiSettings, setUiSettings] = useState(DEFAULT_UI_SETTINGS);
  const [isScreenSaver, setIsScreenSaver] = useState(false);
  const [screenSaverLocked, setScreenSaverLocked] = useState(false);
  const [unlockPrompt, setUnlockPrompt] = useState({ open: false, pin: '', error: '', busy: false });
  const idleTimerRef = useRef(null);

  // --- Feedback Board ---
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [feedbackDraft, setFeedbackDraft] = useState('');
  const [isPostingFeedback, setIsPostingFeedback] = useState(false);

  // --- Idle Rewards ---
  const [idleRewardSummary, setIdleRewardSummary] = useState(null);

  // --- Idle Mining State ---
  const [isMining, setIsMining] = useState(false);
  const [mineCharge, setMineCharge] = useState(0);
  const mineChargeRef = useRef(0);
  const mineTimerRef = useRef(null);

  // --- Derived State ---
  const activeBuffs = getActiveBuffs(traits, allocatedStats, achievementLevels, relics);
  const myCombatPower = Math.floor(
    (playerData.level * 10 + equipment.weapon * 25) 
    * (activeBuffs.filter(b => b.effect === 'damage_bonus').reduce((acc, b) => acc * b.value, 1))
    * (appraisals.weapon ? appraisals.weapon.grade.mult : 1.0)
  );
  const hasLocalPin = Boolean(playerName && getStoredPinRecord(playerName));

  useEffect(() => {
    setUiSettings(readUiSettings());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(uiSettings));
    } catch {
      // ignore
    }
  }, [uiSettings]);

  useEffect(() => {
    if (!uiSettings.screenSaverEnabled) {
      setIsScreenSaver(false);
      setScreenSaverLocked(false);
      setUnlockPrompt({ open: false, pin: '', error: '', busy: false });
    }
  }, [uiSettings.screenSaverEnabled]);

  // ==========================================
  // [Logic] Initialization & Auth
  // ==========================================
  const addLog = useCallback((text, type = 'info') => {
    setLogs(prev => [...prev.slice(-29), { id: Date.now() + Math.random(), text, type }]);
  }, []);

	  const resetGameForNewProfile = () => {
    setGold(1000);
    setStones(5);
    setSoulStones(0);
    setPlayerData({ level: 1, exp: 0, traitPoints: 0 });
    setEquipment({ weapon: 0, armor: 0, ring: 0 });
    setAppraisals({ weapon: null, armor: null, ring: null });
    setAllocatedStats({ ATTACK: 0, SUCCESS: 0, CRIT: 0, WEALTH: 0 });
    setTraits([]);
    setRelics({ DAMAGE: 0, GOLD: 0 });
    setFailStack(0);
    setStatistics(DEFAULT_STATS);
    setAchievementLevels({});

	    // Keep current HP when setting stage to the same value (0).
	    // Suppress only for the stage we are setting once, then clear on the next stage effect run.
	    suppressBossHpResetRef.current = 0;
	    setStage(0);
	    setBossHp(getBossConfig(0).maxHp);

    setLogs([]);
    setActiveModal(null);
    setSelectedEquip('weapon');
    setIsAnimating(false);
    setDamageTexts([]);
    setPvpOpponent(null);
    setPvpResult(null);
  };

	  const loadGameFromSave = (data) => {
    const now = Date.now();
    const lastSavedAt = Number(data.lastSavedAt || data.savedAt || 0);
    const rawElapsedMs = lastSavedAt > 0 ? now - lastSavedAt : 0;
    const eligibleMs = clampNumber(rawElapsedMs, 0, IDLE_REWARD_MAX_MS);
    const shouldReward = eligibleMs >= IDLE_REWARD_MIN_MS;

    const nextStage = data.stage || 0;
    const nextBossHp = typeof data.bossHp === 'number' ? data.bossHp : getBossConfig(nextStage).maxHp;

    const baseGold = Number(data.gold || 0);
    const baseStones = Number(data.stones || 0);
    const basePlayerData = data.playerData || { level: 1, exp: 0, traitPoints: 0 };
    const baseStatistics = { ...DEFAULT_STATS, ...(data.statistics || {}) };

    let bonusGold = 0;
    let bonusStones = 0;
    let bonusExp = 0;

    if (shouldReward) {
      const minutes = eligibleMs / 60_000;
      const buffs = getActiveBuffs(data.traits || [], data.allocatedStats || { ATTACK: 0, SUCCESS: 0, CRIT: 0, WEALTH: 0 }, data.achievementLevels || {}, data.relics || { DAMAGE: 0, GOLD: 0 });
      const farmBonus = buffs.filter(b => b.effect === 'farm_bonus').reduce((acc, b) => acc * b.value, 1);

      const stageBonus = 10 + (nextStage * 3);
      const powerBonus = Math.max(0, Math.floor(((basePlayerData.level || 1) * 2) + (Number(data.equipment?.weapon || 0) * 4)));
      const goldPerMin = Math.max(15, stageBonus + powerBonus);

      bonusGold = Math.floor(goldPerMin * farmBonus * minutes);
      bonusStones = Math.floor(minutes / 12);
      bonusExp = Math.floor(bonusGold / 2);

      setIdleRewardSummary({
        minutes: Math.floor(eligibleMs / 60_000),
        gold: bonusGold,
        stones: bonusStones,
        exp: bonusExp,
        capped: rawElapsedMs > IDLE_REWARD_MAX_MS
      });
      setActiveModal('idle_rewards');
      addLog(`[방치 보상] ${Math.floor(eligibleMs / 60_000)}분`, 'success');
    } else {
      setIdleRewardSummary(null);
    }

    const nextGold = baseGold + bonusGold;
    const nextStones = baseStones + bonusStones;
    const nextPlayerData = bonusExp > 0 ? applyExpOffline(basePlayerData, bonusExp) : basePlayerData;
    const nextStatistics = {
      ...baseStatistics,
      totalGoldEarned: Number(baseStatistics.totalGoldEarned || 0) + bonusGold
    };

    setGold(nextGold);
    setStones(nextStones);
    setSoulStones(data.soulStones || 0);
    setPlayerData(nextPlayerData);
    setEquipment(data.equipment);
    setAppraisals(data.appraisals);
    setAllocatedStats(data.allocatedStats);
    setTraits(data.traits || []);
    setRelics(data.relics || { DAMAGE: 0, GOLD: 0 });
    setFailStack(data.failStack || 0);
    setStatistics(nextStatistics);
    setAchievementLevels(data.achievementLevels || {});
    setPvpHistory(Array.isArray(data.pvpHistory) ? data.pvpHistory : []);

	    // Prevent the stage-change effect from overwriting bossHp restored from the save.
	    suppressBossHpResetRef.current = nextStage;
	    setStage(nextStage);
	    setBossHp(nextBossHp);
	  };

  const handleLogin = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const saved = localStorage.getItem(getSaveKey(trimmed));
    if (saved) {
      const data = JSON.parse(saved);
      const record = getStoredPinRecord(trimmed);
      if (record) {
        setPendingLogin({ name: trimmed, data });
        setPinPrompt({ open: true, pin: '', error: '', busy: false });
        return;
      }

      setPlayerName(trimmed);
      loadGameFromSave(data);
      setAppState('playing');
      addLog(`[세션 복구] 환영합니다, ${trimmed}님!`, 'success');
    } else {
      setPlayerName(trimmed);
      setQuestionIndex(0);
      setIntroVotes([]);
      resetGameForNewProfile();
      setAppState('intro');
    }
  };

  const closePinPrompt = () => {
    setPinPrompt({ open: false, pin: '', error: '', busy: false });
    setPendingLogin(null);
  };

  const confirmPinLogin = async () => {
    if (!pendingLogin) return;
    const pin = String(pinPrompt.pin || '').trim();
    if (!isValidPin(pin)) {
      setPinPrompt(p => ({ ...p, error: 'PIN은 4~12자리 숫자만 가능합니다.' }));
      return;
    }

    const record = getStoredPinRecord(pendingLogin.name);
    if (!record) {
      setPlayerName(pendingLogin.name);
      loadGameFromSave(pendingLogin.data);
      setAppState('playing');
      closePinPrompt();
      return;
    }

    setPinPrompt(p => ({ ...p, busy: true, error: '' }));
    try {
      const ok = await verifyPin(pin, record);
      if (!ok) {
        setPinPrompt(p => ({ ...p, error: 'PIN이 일치하지 않습니다.' }));
        return;
      }

      setPlayerName(pendingLogin.name);
      loadGameFromSave(pendingLogin.data);
      setAppState('playing');
      addLog('[보안] PIN 확인 완료', 'success');
      closePinPrompt();
    } catch (e) {
      console.error('PIN verify failed:', e);
      setPinPrompt(p => ({ ...p, error: 'PIN 확인 중 오류가 발생했습니다.' }));
    } finally {
      setPinPrompt(p => ({ ...p, busy: false }));
    }
  };

  const resetProfileWithoutPin = () => {
    if (!pendingLogin) return;
    localStorage.removeItem(getSaveKey(pendingLogin.name));
    localStorage.removeItem(getPinKey(pendingLogin.name));
    const name = pendingLogin.name;
    closePinPrompt();
    setPlayerName(name);
    resetGameForNewProfile();
    setAppState('intro');
  };

  const saveNewPin = async () => {
    const next = String(pinSettings.next || '').trim();
    const confirm = String(pinSettings.confirm || '').trim();
    if (!isValidPin(next)) return setPinSettings(s => ({ ...s, error: 'PIN은 4~12자리 숫자만 가능합니다.' }));
    if (next !== confirm) return setPinSettings(s => ({ ...s, error: 'PIN 확인이 일치하지 않습니다.' }));

    setPinSettings(s => ({ ...s, busy: true, error: '' }));
    try {
      const record = await hashPin(next);
      localStorage.setItem(getPinKey(playerName), JSON.stringify({ ...record, v: 1, iterations: PBKDF2_ITERATIONS, createdAt: Date.now() }));
      setPinSettings({ current: '', next: '', confirm: '', error: '', busy: false });
      addLog('[보안] 로컬 PIN 설정 완료', 'success');
    } catch (e) {
      console.error('PIN set failed:', e);
      setPinSettings(s => ({ ...s, error: 'PIN 설정 중 오류가 발생했습니다.' }));
    } finally {
      setPinSettings(s => ({ ...s, busy: false }));
    }
  };

  const changePin = async () => {
    const current = String(pinSettings.current || '').trim();
    const next = String(pinSettings.next || '').trim();
    const confirm = String(pinSettings.confirm || '').trim();
    if (!isValidPin(current)) return setPinSettings(s => ({ ...s, error: '현재 PIN을 입력하세요.' }));
    if (!isValidPin(next)) return setPinSettings(s => ({ ...s, error: '새 PIN은 4~12자리 숫자만 가능합니다.' }));
    if (next !== confirm) return setPinSettings(s => ({ ...s, error: '새 PIN 확인이 일치하지 않습니다.' }));

    const record = getStoredPinRecord(playerName);
    if (!record) return setPinSettings(s => ({ ...s, error: '설정된 PIN을 찾지 못했습니다.' }));

    setPinSettings(s => ({ ...s, busy: true, error: '' }));
    try {
      const ok = await verifyPin(current, record);
      if (!ok) return setPinSettings(s => ({ ...s, error: '현재 PIN이 일치하지 않습니다.' }));

      const nextRecord = await hashPin(next);
      localStorage.setItem(getPinKey(playerName), JSON.stringify({ ...nextRecord, v: 1, iterations: PBKDF2_ITERATIONS, createdAt: Date.now() }));
      setPinSettings({ current: '', next: '', confirm: '', error: '', busy: false });
      addLog('[보안] 로컬 PIN 변경 완료', 'success');
    } catch (e) {
      console.error('PIN change failed:', e);
      setPinSettings(s => ({ ...s, error: 'PIN 변경 중 오류가 발생했습니다.' }));
    } finally {
      setPinSettings(s => ({ ...s, busy: false }));
    }
  };

  const removePin = async () => {
    const current = String(pinSettings.current || '').trim();
    if (!isValidPin(current)) return setPinSettings(s => ({ ...s, error: '현재 PIN을 입력하세요.' }));

    const record = getStoredPinRecord(playerName);
    if (!record) return setPinSettings(s => ({ ...s, error: '설정된 PIN을 찾지 못했습니다.' }));

    setPinSettings(s => ({ ...s, busy: true, error: '' }));
    try {
      const ok = await verifyPin(current, record);
      if (!ok) return setPinSettings(s => ({ ...s, error: '현재 PIN이 일치하지 않습니다.' }));

      localStorage.removeItem(getPinKey(playerName));
      setPinSettings({ current: '', next: '', confirm: '', error: '', busy: false });
      addLog('[보안] 로컬 PIN 해제 완료', 'success');
    } catch (e) {
      console.error('PIN remove failed:', e);
      setPinSettings(s => ({ ...s, error: 'PIN 해제 중 오류가 발생했습니다.' }));
    } finally {
      setPinSettings(s => ({ ...s, busy: false }));
    }
  };

  const wakeScreenSaver = () => {
    if (!isScreenSaver) return;
    if (screenSaverLocked) {
      setUnlockPrompt({ open: true, pin: '', error: '', busy: false });
      return;
    }
    setIsScreenSaver(false);
  };

  const confirmUnlock = async () => {
    const pin = String(unlockPrompt.pin || '').trim();
    if (!isValidPin(pin)) return setUnlockPrompt(p => ({ ...p, error: 'PIN은 4~12자리 숫자만 가능합니다.' }));

    const record = playerName ? getStoredPinRecord(playerName) : null;
    if (!record) {
      setScreenSaverLocked(false);
      setUnlockPrompt({ open: false, pin: '', error: '', busy: false });
      setIsScreenSaver(false);
      return;
    }

    setUnlockPrompt(p => ({ ...p, busy: true, error: '' }));
    try {
      const ok = await verifyPin(pin, record);
      if (!ok) return setUnlockPrompt(p => ({ ...p, error: 'PIN이 일치하지 않습니다.' }));

      setScreenSaverLocked(false);
      setUnlockPrompt({ open: false, pin: '', error: '', busy: false });
      setIsScreenSaver(false);
    } catch (e) {
      console.error('unlock failed:', e);
      setUnlockPrompt(p => ({ ...p, error: 'PIN 확인 중 오류가 발생했습니다.' }));
    } finally {
      setUnlockPrompt(p => ({ ...p, busy: false }));
    }
  };

  const postFeedback = async () => {
    if (isOfflineMode) return addLog('[피드백] 오프라인 모드에서는 전송할 수 없습니다.', 'danger');
    if (!user) return addLog('[피드백] 로그인 정보를 확인할 수 없습니다.', 'danger');

    const text = String(feedbackDraft || '').trim();
    if (!text) return;
    if (text.length > 400) return addLog('[피드백] 400자 이내로 작성해 주세요.', 'warning');

    setIsPostingFeedback(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'feedback'), {
        uid: user.uid,
        name: String(playerName || 'Anonymous'),
        text,
        createdAt: serverTimestamp(),
        clientAt: Date.now()
      });
      setFeedbackDraft('');
      addLog('[피드백] 전송 완료!', 'success');
    } catch (e) {
      console.error('postFeedback failed:', e);
      if (e?.code === 'permission-denied') {
        addLog('[피드백] Firestore 권한이 없어 전송할 수 없습니다. (Rules 확인 필요)', 'danger');
        setIsOfflineMode(true);
      } else {
        addLog('[피드백] 전송 실패', 'danger');
      }
    } finally {
      setIsPostingFeedback(false);
    }
  };

  useEffect(() => {
    if (activeModal !== 'feedback') return;
    if (!user || isOfflineMode) {
      setFeedbackItems([]);
      return;
    }

    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'feedback'),
      orderBy('createdAt', 'desc'),
      limit(30)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const rows = [];
        snapshot.forEach((d) => rows.push({ id: d.id, ...d.data() }));
        setFeedbackItems(rows);
      },
      (err) => {
        console.error('feedback subscribe failed:', err);
        if (err?.code === 'permission-denied') {
          addLog('[피드백] Firestore 권한이 없어 게시판을 불러올 수 없습니다. (Rules 확인 필요)', 'danger');
          setFeedbackItems([]);
          setIsOfflineMode(true);
        }
      }
    );

    return unsub;
  }, [activeModal, user, isOfflineMode, addLog, playerName]);

  useEffect(() => {
    if (appState !== 'playing') return;
    if (!uiSettings.screenSaverEnabled) return;

    const arm = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setIsScreenSaver(true);
        const locked = Boolean(hasLocalPin);
        setScreenSaverLocked(locked);
        setUnlockPrompt(locked ? { open: true, pin: '', error: '', busy: false } : { open: false, pin: '', error: '', busy: false });
      }, uiSettings.screenSaverIdleMs);
    };

    const onActivity = () => {
      if (isScreenSaver) return;
      arm();
    };

    arm();
    const opts = { passive: true };
    window.addEventListener('mousemove', onActivity, opts);
    window.addEventListener('mousedown', onActivity, opts);
    window.addEventListener('keydown', onActivity, opts);
    window.addEventListener('touchstart', onActivity, opts);
    window.addEventListener('scroll', onActivity, opts);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', onActivity, opts);
      window.removeEventListener('mousedown', onActivity, opts);
      window.removeEventListener('keydown', onActivity, opts);
      window.removeEventListener('touchstart', onActivity, opts);
      window.removeEventListener('scroll', onActivity, opts);
    };
  }, [appState, uiSettings.screenSaverEnabled, uiSettings.screenSaverIdleMs, isScreenSaver, hasLocalPin]);

  useEffect(() => {
    if (appState === 'playing' && playerName) {
      const stateToSave = { gold, stones, soulStones, playerData, equipment, appraisals, allocatedStats, traits, relics, failStack, statistics, achievementLevels, stage, bossHp, pvpHistory, lastSavedAt: Date.now() };
      const handle = setTimeout(() => {
        localStorage.setItem(getSaveKey(playerName), JSON.stringify(stateToSave));
      }, 500);
      return () => clearTimeout(handle);
    }
  }, [appState, playerName, gold, stones, soulStones, playerData, equipment, appraisals, allocatedStats, traits, relics, failStack, statistics, achievementLevels, stage, bossHp, pvpHistory]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // 방어 로직: API Key가 누락된 경우 오프라인 모드로 전환하여 앱 크래시 방지
        if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
          console.warn("[경고] Firebase API Key가 설정되지 않았습니다. 투기장 동기화 기능이 제한된 오프라인 모드로 실행됩니다.");
          setIsOfflineMode(true);
          return;
        }

        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { 
        console.error("Auth Failed:", e); 
        setIsOfflineMode(true);
      }
    };
    initAuth();

    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
      return onAuthStateChanged(auth, setUser);
    }
  }, []);

  useEffect(() => {
    if (!user || isOfflineMode) return;

    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'pvp_ranks'),
      orderBy('arenaPoints', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = [];
        snapshot.forEach(d => data.push(d.data()));
        setRankings(
          data
            .sort((a, b) =>
              (b.arenaPoints || 0) - (a.arenaPoints || 0) ||
              (b.combatPower || 0) - (a.combatPower || 0)
            )
            .slice(0, 50)
        );
      },
      (err) => {
        console.error("Firestore Subscribe Error:", err);
        if (err?.code === 'permission-denied') {
          addLog('[PvP] Firestore 권한이 없어 랭킹을 불러올 수 없습니다. (Rules 확인 필요)', 'danger');
          setRankings([]);
          setIsOfflineMode(true);
        }
      }
    );

    return unsub;
  }, [user, isOfflineMode, addLog]);

	  // ==========================================
	  // [Logic] Progression & Achievements
	  // ==========================================
	  useEffect(() => {
	    if (appState !== 'playing') return;

	    if (bossHp > 0) {
	      bossRespawnScheduledStageRef.current = null;
	      if (bossRespawnTimeoutRef.current) {
	        clearTimeout(bossRespawnTimeoutRef.current);
	        bossRespawnTimeoutRef.current = null;
	      }
	      return;
	    }

	    if (bossRespawnScheduledStageRef.current === stage) return;
	    bossRespawnScheduledStageRef.current = stage;

	    if (bossRespawnTimeoutRef.current) clearTimeout(bossRespawnTimeoutRef.current);
	    bossRespawnTimeoutRef.current = setTimeout(() => {
	      bossRespawnTimeoutRef.current = null;
	      setStage((s) => s + 1);
	    }, 1000);

	    return () => {
	      if (bossRespawnTimeoutRef.current) {
	        clearTimeout(bossRespawnTimeoutRef.current);
	        bossRespawnTimeoutRef.current = null;
	      }
	    };
	  }, [bossHp, stage, appState]);

	  useEffect(() => {
	    setBossHp((prev) => {
	      if (suppressBossHpResetRef.current === stage) {
	        suppressBossHpResetRef.current = null;
	        return prev;
	      }

	      suppressBossHpResetRef.current = null;
	      return getBossConfig(stage).maxHp;
	    });
	  }, [stage]);

  useEffect(() => {
    if (appState !== 'playing') return;
    let updated = false;
    const newAchs = { ...achievementLevels };
    ACHIEVEMENTS_CONFIG.forEach(ach => {
      const currentTier = newAchs[ach.id] || 0;
      if (currentTier >= ach.thresholds.length) return;
      let val = 0;
      if (ach.id === 'boss_slayer') val = statistics.bossesDefeated;
      if (ach.id === 'rich') val = statistics.totalGoldEarned;
      if (ach.id === 'clicker') val = statistics.totalClicks;
      
      if (val >= ach.thresholds[currentTier]) {
        newAchs[ach.id] = currentTier + 1; updated = true;
        addLog(`🏆 [업적 달성] ${ach.name} Lv.${currentTier + 1} - 영구 버프 획득!`, 'success');
      }
    });
    if (updated) setAchievementLevels(newAchs);
  }, [statistics, appState, achievementLevels, addLog]);

  const gainExp = useCallback((amount) => {
    setPlayerData(prev => {
      let newExp = prev.exp + amount; let newLv = prev.level; let newTp = prev.traitPoints;
      while (newExp >= getReqExp(newLv)) {
        newExp -= getReqExp(newLv); newLv++; newTp += 3;
        addLog(`🎉 레벨 업! Level ${newLv} 달성! (TP +3)`, 'success');
      }
      return { level: newLv, exp: newExp, traitPoints: newTp };
    });
  }, [addLog]);

  const recordClick = () => setStatistics(s => ({ ...s, totalClicks: s.totalClicks + 1 }));

  // ==========================================
  // [Logic] Actions (Mine, Enhance, Attack)
  // ==========================================
  const completeMining = (chargePercent) => {
    const chargeRatio = Math.max(0, Math.min(100, Number(chargePercent || 0))) / 100;
    const farmBonus = activeBuffs.filter(b => b.effect === 'farm_bonus').reduce((acc, b) => acc * b.value, 1);
    const baseGold = Math.floor(Math.random() * 50) + 20;

    const earnedGold = Math.floor(baseGold * (1 + chargeRatio * 10) * farmBonus);
    const earnedStones = chargeRatio > 0.8 ? (Math.random() < 0.5 ? 2 : 1) : 0;

    if (earnedGold > 0) {
      setGold(g => g + earnedGold);
      setStones(s => s + earnedStones);
      setStatistics(s => ({ ...s, totalGoldEarned: s.totalGoldEarned + earnedGold }));
      gainExp(Math.floor(earnedGold / 2));
      addLog(`채굴: ${earnedGold}G${earnedStones > 0 ? `, 강화석 ${earnedStones}개` : ''} 획득 (충전 ${Math.round(chargeRatio * 100)}%)`, 'success');
    }
  };

  const startMining = () => {
    setIsMining(true);
    mineChargeRef.current = 0;
    setMineCharge(0);
    recordClick();

    mineTimerRef.current = setInterval(() => {
      mineChargeRef.current = Math.min(mineChargeRef.current + 2, 100);
      setMineCharge(mineChargeRef.current);

      if (mineChargeRef.current >= 100) {
        completeMining(100);
        mineChargeRef.current = 0;
        setMineCharge(0);
      }
    }, 50);
  };

  const stopMining = () => {
    if (!isMining) return;
    clearInterval(mineTimerRef.current);
    setIsMining(false);

    completeMining(mineChargeRef.current);
    mineChargeRef.current = 0;
    setMineCharge(0);
  };

  const handleEnhance = () => {
    recordClick();
    const level = equipment[selectedEquip];
    if (level >= MAX_LEVEL) return addLog('최대 강화 수치에 도달했습니다.', 'warning');
    
    const config = ENHANCE_TIERS.find(t => level < t.threshold) || ENHANCE_TIERS[ENHANCE_TIERS.length - 1];
    if (gold < config.gold || stones < config.stone) return addLog('자원이 부족합니다.', 'danger');

    setGold(g => g - config.gold); setStones(s => s - config.stone);
    setIsAnimating(true);

    setTimeout(() => {
      setIsAnimating(false);
      const successBonus = activeBuffs.filter(b => b.effect === 'success_bonus').reduce((acc, b) => acc + b.value, 0);
      const safetyBonus = activeBuffs.filter(b => b.effect === 'safety_bonus').reduce((acc, b) => acc + b.value, 0);
      
      const realSuccess = Math.min(100, config.success + successBonus + (failStack * 1.5));
      const realDrop = Math.max(0, config.drop - safetyBonus);
      const realDestroy = Math.max(0, config.destroy - safetyBonus);
      
      const roll = Math.random() * 100;
      if (roll < realSuccess) {
        setEquipment(prev => ({ ...prev, [selectedEquip]: level + 1 }));
        setAppraisals(prev => ({ ...prev, [selectedEquip]: null })); 
        setFailStack(0);
        addLog(`[성공] ${EQUIP_TYPES[selectedEquip].name} +${level + 1} 달성!`, 'success');
      } else {
        setFailStack(f => f + 1);
        const penaltyRoll = Math.random() * 100;
        if (penaltyRoll < realDestroy) {
          setEquipment(p => ({ ...p, [selectedEquip]: 0 })); addLog(`[파괴] 장비가 산산조각 났습니다.`, 'danger');
        } else if (penaltyRoll < realDrop && level > 0) {
          setEquipment(p => ({ ...p, [selectedEquip]: level - 1 })); addLog(`[하락] 강화 수치가 떨어졌습니다.`, 'warning');
        } else {
          addLog(`[실패] 강화에 실패했습니다. (스택 +1)`, 'warning');
        }
      }
    }, 600);
  };

  const handleAppraisal = () => {
    recordClick();
    if (gold < 500) return addLog('감정 비용(500G)이 부족합니다.', 'danger');
    setGold(g => g - 500);
    const result = generateLocalAppraisal(selectedEquip, equipment[selectedEquip]);
    setAppraisals(prev => ({ ...prev, [selectedEquip]: result }));
    addLog(`[감정] [${result.grade.name}] ${result.name} 획득!`, 'success');
  };

  const handleAttack = () => {
    if (bossHp <= 0 || isAnimating) return;
    setIsAnimating(true); recordClick();

    const critBonus = activeBuffs.filter(b => b.effect === 'crit_chance_bonus').reduce((acc, b) => acc + b.value, 0);
    const isCrit = Math.random() < (0.1 + critBonus);
    let dmg = Math.floor(myCombatPower * (0.9 + Math.random() * 0.2));
    if (isCrit) dmg = Math.floor(dmg * 2);

    const id = Date.now();
    setDamageTexts(prev => [...prev, { id, amount: dmg, isCrit, x: Math.random() * 60 - 30, y: Math.random() * 20 - 10 }]);
    setTimeout(() => setDamageTexts(prev => prev.filter(t => t.id !== id)), 800);

    const nextHp = Math.max(0, bossHp - dmg);
    setBossHp(nextHp);

    const hitGold = Math.max(1, Math.floor(dmg / 10));
    const hitExp = Math.max(1, Math.floor(dmg / 20));
    setGold(g => g + hitGold);
    gainExp(hitExp);

    if (nextHp === 0) {
      const boss = getBossConfig(stage);
      setGold(g => g + boss.rewardGold); setStones(s => s + boss.rewardStone);
      setStatistics(s => ({ ...s, bossesDefeated: s.bossesDefeated + 1, totalGoldEarned: s.totalGoldEarned + boss.rewardGold }));
      gainExp(boss.rewardGold / 10);
      addLog(`[토벌] ${boss.name} 처치! 골드 ${boss.rewardGold.toLocaleString()} 획득.`, 'success');
	      // stage advance handled by the boss respawn effect (also works across refreshes)
	    }
    setTimeout(() => setIsAnimating(false), 150);
  };

  const handleRebirth = () => {
    if (playerData.level < 20) return addLog('환생은 레벨 20 이상부터 가능합니다.', 'warning');
    const earned = Math.floor((equipment.weapon + equipment.armor + equipment.ring) / 3) + Math.floor(playerData.level / 5);
    setSoulStones(s => s + earned);
    setEquipment({ weapon: 0, armor: 0, ring: 0 }); setAppraisals({ weapon: null, armor: null, ring: null });
    setPlayerData({ level: 1, exp: 0, traitPoints: 0 }); setAllocatedStats({ ATTACK: 0, SUCCESS: 0, CRIT: 0, WEALTH: 0 });
    setGold(0); setStones(0); setStage(0); setFailStack(0);
    setActiveModal(null);
    addLog(`✨ [환생] 영혼석 ${earned}개 획득! (스탯/장비/스테이지 초기화)`, 'success');
  };

  const syncProfile = async () => {
    if (isOfflineMode) return addLog('[오프라인] Firebase 연동이 필요합니다.', 'danger');
    if (!user || !playerName) return;
    setIsSyncing(true);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pvp_ranks', user.uid), {
        uid: user.uid,
        name: String(playerName),
        combatPower: Number(myCombatPower),
        level: Number(playerData.level),
        weaponLevel: Number(equipment.weapon),
        pvpWins: Number(statistics.pvpWins || 0),
        pvpLosses: Number(statistics.pvpLosses || 0),
        arenaPoints: Number(statistics.arenaPoints || 0),
        lastPvpAt: Number(statistics.lastPvpAt || 0),
        updatedAt: Date.now()
      }, { merge: true });
      addLog('클라우드에 내 정보를 동기화했습니다.', 'success');
    } catch (e) {
      addLog('동기화 실패: 네트워크 및 설정을 확인하세요.', 'danger');
      console.error(e);
      if (e?.code === 'permission-denied') {
        addLog('[Firestore] 권한 없음: Cloud Firestore Rules에서 read/write 권한을 허용해야 합니다.', 'danger');
        setIsOfflineMode(true);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const quickMatch = () => {
    if (isOfflineMode) return addLog('[PvP] 오프라인 모드에서는 매칭할 수 없습니다.', 'danger');

    const myAp = Number(statistics.arenaPoints || 0);
    const candidates = (rankings || []).filter(rk => rk && rk.uid && rk.uid !== user?.uid);

    const scored = candidates
      .map((rk) => {
        const ap = Number(rk.arenaPoints || 0);
        const cp = Number(rk.combatPower || 0);
        const apDiff = Math.abs(ap - myAp);
        const cpDiff = Math.abs(cp - myCombatPower) / Math.max(1, myCombatPower);
        const score = apDiff + (cpDiff * 200);
        return { rk, score, apDiff };
      })
      .sort((a, b) => a.score - b.score);

    const pool = scored.filter(s => s.apDiff <= 200).slice(0, 7);
    const chosen = (pool.length > 0 ? pool : scored.slice(0, 7))[Math.floor(Math.random() * Math.min(7, Math.max(1, scored.length)))];

    if (!chosen) {
      const botAp = Math.max(0, Math.floor(myAp + (Math.random() * 300 - 150)));
      const bot = {
        uid: `bot_${Date.now()}`,
        name: 'WANDERER',
        level: Math.max(1, Math.floor(playerData.level * (0.8 + Math.random() * 0.4))),
        weaponLevel: Math.max(0, Math.floor(equipment.weapon * (0.7 + Math.random() * 0.6))),
        combatPower: Math.max(1, Math.floor(myCombatPower * (0.75 + Math.random() * 0.5))),
        arenaPoints: botAp
      };
      setPvpOpponent(bot);
    } else {
      setPvpOpponent(chosen.rk);
    }

    setPvpResult(null);
    setActiveModal('pvp_clash');
  };

  /* const executePvp = async () => {
    if (!pvpOpponent) return;
    setIsAnimating(true);
    const myRoll = myCombatPower * (0.8 + Math.random() * 0.4);
    const oppRoll = pvpOpponent.combatPower * (0.8 + Math.random() * 0.4);

    setTimeout(() => {
      setIsAnimating(false);
      const isWin = myRoll >= oppRoll;
      if (isWin) {
        const reward = 1000 + ((pvpOpponent.level || 0) * 100);
        setGold(g => g + reward);
        addLog(`⚔️ 결투 승리! 보상 ${reward}G 획득`, 'success');
      } else { addLog(`⚔️ 결투 패배...`, 'danger'); }
      setPvpResult({ isWin, myRoll: Math.floor(myRoll), oppRoll: Math.floor(oppRoll) });
    }, 1200);
  }; */

  const executePvp = async () => {
    if (!pvpOpponent) return;
    if (isAnimating) return;

    const now = Date.now();
    const cooldownMs = 10_000;
    const until = (statistics.lastPvpAt || 0) + cooldownMs;
    if (now < until) {
      const remain = Math.ceil((until - now) / 1000);
      addLog(`Wait... ${remain}s`, 'warning');
      return;
    }

    setIsAnimating(true);
    const myRoll = myCombatPower * (0.75 + Math.random() * 0.5);
    const oppRoll = Number(pvpOpponent.combatPower || 0) * (0.75 + Math.random() * 0.5);

    await new Promise(r => setTimeout(r, 1200));
    setIsAnimating(false);

    const isWin = myRoll >= oppRoll;
    const rewardGold = isWin ? (700 + (Number(pvpOpponent.level || 0) * 120)) : 0;
    const pointDelta = isWin ? 25 : -15;
    const nextLast = Date.now();

    setPvpResult({
      isWin,
      myRoll: Math.floor(myRoll),
      oppRoll: Math.floor(oppRoll),
      pointDelta,
      rewardGold
    });

    if (rewardGold > 0) setGold(g => g + rewardGold);

    setStatistics(s => ({
      ...s,
      totalGoldEarned: (s.totalGoldEarned || 0) + rewardGold,
      pvpWins: (s.pvpWins || 0) + (isWin ? 1 : 0),
      pvpLosses: (s.pvpLosses || 0) + (isWin ? 0 : 1),
      arenaPoints: Math.max(0, (s.arenaPoints || 0) + pointDelta),
      lastPvpAt: nextLast
    }));

    setPvpHistory((prev) => {
      const entry = {
        at: nextLast,
        opponentUid: String(pvpOpponent.uid || ''),
        opponentName: String(pvpOpponent.name || 'OPPONENT'),
        isWin,
        myRoll: Math.floor(myRoll),
        oppRoll: Math.floor(oppRoll),
        pointDelta,
        rewardGold
      };
      return [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, 20);
    });

    if (isWin) addLog(`VICTORY +${pointDelta} AP / +${rewardGold}G`, 'success');
    else addLog(`DEFEAT ${pointDelta} AP`, 'danger');

    if (!isOfflineMode && user && playerName) {
      try {
        const nextWins = (statistics.pvpWins || 0) + (isWin ? 1 : 0);
        const nextLosses = (statistics.pvpLosses || 0) + (isWin ? 0 : 1);
        const nextAp = Math.max(0, (statistics.arenaPoints || 0) + pointDelta);

        await setDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'pvp_ranks', user.uid),
          {
            uid: user.uid,
            name: String(playerName),
            combatPower: Number(myCombatPower),
            level: Number(playerData.level),
            weaponLevel: Number(equipment.weapon),
            pvpWins: Number(nextWins),
            pvpLosses: Number(nextLosses),
            arenaPoints: Number(nextAp),
            lastPvpAt: Number(nextLast),
            updatedAt: Date.now()
          },
          { merge: true }
        );
      } catch (e) {
        console.error('PvP result sync failed:', e);
        if (e?.code === 'permission-denied') {
          addLog('[PvP] Firestore 저장 권한이 없어 기록을 업로드하지 못했습니다. (Rules 확인 필요)', 'danger');
          setIsOfflineMode(true);
        }
      }
    }
  };

  // ==========================================
  // [Render] View Components
  // ==========================================
  if (appState === 'login') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-sans relative">
        {isOfflineMode && (
          <div className="absolute top-4 w-full max-w-md bg-yellow-500/20 border border-yellow-500 text-yellow-500 p-3 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-2">
            <ZapOff className="w-4 h-4" /> 오프라인 모드: 클라우드 연동 불가
          </div>
        )}
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl animate-in zoom-in">
          <BrainCircuit className="w-16 h-16 text-blue-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-center mb-2">모험의 서</h1>
          <p className="text-zinc-500 text-center text-sm mb-8">기존 플레이어는 동일한 이름을 입력하여 데이터를 불러오세요.</p>
          <input 
            type="text" placeholder="이름 입력 (최대 10자)" maxLength={10}
            onKeyDown={(e) => { if(e.key === 'Enter') handleLogin(e.target.value); }}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-4 text-center text-xl font-bold focus:border-blue-500 outline-none mb-4"
          />
          <p className="text-xs text-zinc-600 text-center">입력 후 Enter 키를 누르세요.</p>
        </div>

        {pinPrompt.open && (
          <div className="fixed inset-0 bg-black/90 z-[60] p-6 flex items-center justify-center animate-in fade-in">
            <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative" onClick={e => e.stopPropagation()}>
              <button onClick={closePinPrompt} className="absolute top-4 right-4 text-zinc-500"><X /></button>
              <h2 className="text-xl font-black mb-2 flex items-center gap-2"><Shield className="w-5 h-5 text-blue-500" /> PIN 확인</h2>
              <p className="text-xs text-zinc-500 mb-4">프로필: <span className="text-zinc-300 font-bold">{pendingLogin?.name}</span></p>
              <input
                type="password"
                inputMode="numeric"
                placeholder="PIN (4~12자리 숫자)"
                value={pinPrompt.pin}
                onChange={(e) => setPinPrompt(p => ({ ...p, pin: e.target.value, error: '' }))}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmPinLogin(); }}
                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-center text-lg font-black tracking-widest focus:border-blue-500 outline-none"
              />
              {pinPrompt.error && <div className="mt-3 text-xs text-red-400 font-bold">{pinPrompt.error}</div>}
              <button onClick={confirmPinLogin} disabled={pinPrompt.busy} className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-black disabled:opacity-50 flex items-center justify-center gap-2">
                {pinPrompt.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} 확인
              </button>
              <button onClick={resetProfileWithoutPin} disabled={pinPrompt.busy} className="w-full mt-2 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold text-xs disabled:opacity-50">
                PIN 분실? 새로 시작(데이터 삭제)
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (appState === 'intro') {
    const q = PERSONALITY_QUESTIONS[questionIndex];
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 animate-in fade-in">
          <h1 className="text-xl font-bold mb-6 text-center text-blue-400">당신의 본질을 묻습니다</h1>
          <p className="text-zinc-300 mb-8 min-h-[3rem] text-center leading-relaxed">{q.text}</p>
          <div className="space-y-3">
            {q.answers.map((ans, idx) => (
              <button key={idx} onClick={() => {
                const newVotes = [...introVotes, ans.trait];
                if (questionIndex < PERSONALITY_QUESTIONS.length - 1) {
                  setIntroVotes(newVotes); setQuestionIndex(p => p + 1);
                } else {
                  const counts = newVotes.reduce((acc, t) => ({ ...acc, [t.id]: (acc[t.id] || 0) + 1 }), {});
                  const ranked = Object.values(TRAITS).slice().sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0) || a.id.localeCompare(b.id));
                  const finalTraits = ranked.filter(t => (counts[t.id] || 0) > 0).slice(0, 2);

                  setTraits(finalTraits);
                  setIntroVotes([]);
                  setQuestionIndex(0);
                  setAppState('trait_result');
                }
              }} className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm border border-zinc-700 transition-all text-left flex justify-between">
                {ans.text} <Shield className={`w-4 h-4 ${ans.trait.color}`} />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'trait_result') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 animate-in fade-in">
          <h1 className="text-xl font-black mb-2 text-center text-blue-400">특성 부여 완료</h1>
          <p className="text-zinc-500 text-center text-sm mb-6">당신에게 부여된 특성(상위 2개)입니다.</p>

          <div className="space-y-3 mb-6">
            {traits.length === 0 ? (
              <div className="text-center text-zinc-500 text-sm py-6">특성을 결정하지 못했습니다.</div>
            ) : (
              traits.map(t => (
                <div key={t.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                  <div className={`text-sm font-black ${t.color}`}>{t.name}</div>
                  <div className="text-[11px] text-zinc-500 mt-1">{t.desc}</div>
                </div>
              ))
            )}
          </div>

          <button onClick={() => { setAppState('playing'); addLog('특성이 결정되었습니다. 모험을 시작합니다.', 'success'); }} className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black">
            게임 시작
          </button>
          <button onClick={() => { setAppState('intro'); setQuestionIndex(0); setIntroVotes([]); setTraits([]); }} className="w-full mt-2 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-bold text-xs">
            다시 선택
          </button>
        </div>
      </div>
    );
  }

  const CurrentEquipIcon = EQUIP_TYPES[selectedEquip].icon;
  const currentBoss = getBossConfig(stage);
  const bossHpPercent = Math.max(0, (bossHp / currentBoss.maxHp) * 100);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 flex flex-col items-center select-none overflow-x-hidden relative">
      
      {/* Floating Resource Bar (우측 상단 고정) */}
      <div className="fixed top-4 right-4 z-50 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-full px-4 py-2 flex items-center gap-4 shadow-2xl">
        <div className="flex items-center gap-1.5"><Coins className="w-4 h-4 text-yellow-500" /><span className="font-mono font-bold text-sm">{gold.toLocaleString()}</span></div>
        <div className="w-px h-4 bg-zinc-700" />
        <div className="flex items-center gap-1.5"><Gem className="w-4 h-4 text-cyan-400" /><span className="font-mono font-bold text-sm">{stones.toLocaleString()}</span></div>
      </div>

      {/* Top Navigation */}
      <div className="w-full max-w-md flex justify-between items-center mb-4 px-2 mt-2">
        <div>
          <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Wanderer</span>
          <h2 className="text-lg font-black flex items-center gap-2">{playerName} <span className="text-blue-500 text-sm">Lv.{playerData.level}</span></h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setActiveModal('security'); setPinSettings({ current: '', next: '', confirm: '', error: '', busy: false }); }} className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-300 relative">
            <Settings className="w-5 h-5" />
            {hasLocalPin && <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />}
          </button>
          <button onClick={() => setActiveModal('feedback')} className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-emerald-300 relative">
            <MessageSquare className="w-5 h-5" />
          </button>
              <button onClick={() => setActiveModal('rebirth')} className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-purple-400"><InfinityIcon className="w-5 h-5" /></button>
          <button onClick={() => setActiveModal('achievements')} className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-yellow-500 relative">
            <Trophy className="w-5 h-5" />
            {Object.keys(achievementLevels).length > 0 && <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />}
          </button>
          <button onClick={() => { setActiveModal('pvp'); if(!isOfflineMode) syncProfile(); }} className="p-2 bg-red-950/40 rounded-lg border border-red-900/50 hover:bg-red-900 text-red-400 relative">
            <Swords className="w-5 h-5" />
            {isOfflineMode && <ZapOff className="w-3 h-3 text-yellow-500 absolute -top-1 -right-1 bg-zinc-900 rounded-full" />}
          </button>
          <button onClick={() => setActiveModal('stats')} className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-blue-400 relative">
            <User className="w-5 h-5" />
            {playerData.traitPoints > 0 && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
          </button>
        </div>
      </div>

      {/* Resources & Boss Panel */}
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4 shadow-xl">
        {/* Boss Raid Panel */}
        <div className="relative overflow-hidden bg-black/50 rounded-xl p-4 border border-zinc-800/50 text-center">
          <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            {damageTexts.map(t => (
              <div key={t.id} className={`absolute left-1/2 top-1/2 font-black whitespace-nowrap -translate-x-1/2 -translate-y-1/2 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards opacity-0 ${t.isCrit ? 'text-red-400 text-2xl drop-shadow-md scale-125' : 'text-white text-lg'}`} style={{ transform: `translate(calc(-50% + ${t.x}px), calc(-50% + ${t.y}px))` }}>
                {t.isCrit && <span className="text-yellow-300 text-[10px] block -mb-1">CRIT</span>}-{t.amount.toLocaleString()}
              </div>
            ))}
          </div>
          <div className="flex justify-between items-end mb-2">
            <div className="flex items-center gap-2 text-sm font-bold"><currentBoss.icon className={`w-5 h-5 ${currentBoss.color}`} /> {currentBoss.name}</div>
            <span className="text-[10px] font-mono text-zinc-500">HP: {bossHp.toLocaleString()} / {currentBoss.maxHp.toLocaleString()}</span>
          </div>
          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden mb-3 border border-zinc-800">
            <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${bossHpPercent}%` }} />
          </div>
          <button onClick={handleAttack} disabled={bossHp <= 0} className="w-full py-2 bg-red-950/40 hover:bg-red-900 border border-red-900/50 text-red-200 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
            <Target className="w-4 h-4" /> {bossHp <= 0 ? '리스폰 대기중...' : '무기 공격'}
          </button>
        </div>
      </div>

      <div className="w-full max-w-md flex justify-between items-end px-2 mb-2">
        <span className="text-xs text-blue-400 font-bold">COMBAT POWER</span>
        <span className="text-xl font-black text-white">{myCombatPower.toLocaleString()} CP</span>
      </div>

      {/* Equipment Display */}
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-4 flex flex-col items-center relative">
        {appraisals[selectedEquip] && <div className={`absolute top-4 left-4 text-[10px] font-black px-2 py-0.5 rounded border border-current ${appraisals[selectedEquip].grade.color}`}>{appraisals[selectedEquip].grade.name}</div>}
        
        <div className="mt-4 mb-6">
          <div className={`w-28 h-28 bg-zinc-950 rounded-full border-2 flex items-center justify-center shadow-2xl transition-all duration-300 ${isAnimating ? 'scale-110 rotate-12 bg-zinc-800' : ''} ${appraisals[selectedEquip] ? 'border-blue-500/50' : 'border-zinc-800'}`}>
            <CurrentEquipIcon className={`w-14 h-14 ${appraisals[selectedEquip]?.grade.color || 'text-zinc-600'} ${equipment[selectedEquip] >= 10 ? 'drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]' : ''}`} />
          </div>
        </div>
        
        <h3 className="text-xl font-black mb-1 text-center"><span className={appraisals[selectedEquip]?.grade.color || 'text-white'}>+{equipment[selectedEquip]} {appraisals[selectedEquip]?.name || `무명의 ${EQUIP_TYPES[selectedEquip].name}`}</span></h3>
        <p className="text-xs text-zinc-500 text-center px-8 mb-4 line-clamp-2 italic">"{appraisals[selectedEquip]?.text || '아직 감정되지 않은 장비입니다.'}"</p>
        
        <div className="w-full bg-zinc-950 rounded-xl p-3 border border-zinc-800 mb-2">
          <div className="flex justify-between text-[10px] text-zinc-500 font-bold mb-1">
            <span>ENHANCE SUCCESS</span><span className="text-green-400">{(ENHANCE_TIERS.find(t => equipment[selectedEquip] < t.threshold)?.success || 10).toFixed(1)}%</span>
          </div>
          <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${ENHANCE_TIERS.find(t => equipment[selectedEquip] < t.threshold)?.success || 10}%` }} /></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full max-w-md flex gap-2 mb-4">
        {Object.entries(EQUIP_TYPES).map(([key, item]) => {
          const Icon = item.icon;
          return (
            <button key={key} onClick={() => setSelectedEquip(key)} className={`flex-1 py-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${selectedEquip === key ? 'bg-zinc-800 border-zinc-600' : 'bg-zinc-900 border-zinc-800 opacity-50'}`}>
              <Icon className="w-4 h-4" /><span className="text-[10px] font-bold">+{equipment[key]}</span>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="w-full max-w-md grid grid-cols-2 gap-3 mb-4">
        <button onMouseDown={startMining} onMouseUp={stopMining} onMouseLeave={stopMining} onTouchStart={startMining} onTouchEnd={stopMining} className={`relative h-20 rounded-2xl border-2 flex flex-col items-center justify-center transition-all overflow-hidden ${isMining ? 'bg-zinc-800 border-blue-500' : 'bg-zinc-900 border-zinc-800'}`}>
          {isMining && <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-75" style={{ width: `${mineCharge}%` }} />}
          <Pickaxe className={`w-6 h-6 mb-1 ${isMining ? 'animate-bounce text-blue-400' : 'text-zinc-500'}`} /><span className="text-xs font-bold uppercase">{isMining ? 'Mining...' : 'Hold to Mine'}</span>
        </button>
        <button onClick={handleEnhance} disabled={isAnimating || isMining} className="h-20 bg-blue-600 hover:bg-blue-500 rounded-2xl flex flex-col items-center justify-center transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50">
          <Hammer className={`w-6 h-6 mb-1 ${isAnimating ? 'animate-spin' : ''}`} /><span className="text-xs font-black uppercase">Enhance</span>
        </button>
      </div>
      <button onClick={handleAppraisal} disabled={isAnimating || isMining || !!appraisals[selectedEquip]} className="w-full max-w-md h-12 bg-zinc-900 border border-zinc-800 rounded-xl mb-4 flex items-center justify-center gap-2 hover:bg-zinc-800 disabled:opacity-30">
        <ScrollText className="w-4 h-4 text-zinc-500" /><span className="text-xs font-bold uppercase">{appraisals[selectedEquip] ? 'Appraised' : 'Appraisal (500G)'}</span>
      </button>

      {/* Logs */}
      <div className="w-full max-w-md bg-black border border-zinc-900 rounded-2xl p-4 h-32 overflow-hidden flex flex-col mb-10">
        <div className="flex items-center gap-2 mb-2 text-[10px] font-black text-zinc-600 uppercase"><Timer className="w-3 h-3" /> System Feed</div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {logs.slice().reverse().map(log => (
            <div key={log.id} className={`text-[10px] font-mono p-1 rounded ${log.type === 'success' ? 'text-green-400 bg-green-400/5' : log.type === 'danger' ? 'text-red-400 bg-red-400/5' : log.type === 'warning' ? 'text-yellow-400 bg-yellow-400/5' : 'text-zinc-500'}`}>
              [{new Date().toLocaleTimeString([], { hour12: false })}] {String(log.text)}
            </div>
          ))}
        </div>
      </div>

      {/* --- Modals --- */}
      {/* 1. Stats Modal */}
      {activeModal === 'stats' && (
        <div className="fixed inset-0 bg-black/90 z-50 p-6 flex items-center justify-center animate-in fade-in" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-zinc-500"><X /></button>
            <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black flex items-center gap-2"><PlusCircle className="w-6 h-6 text-blue-500" /> Stats</h2><div className="bg-blue-600 px-3 py-1 rounded-full text-xs font-black">TP: {playerData.traitPoints}</div></div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-4">
              <div className="text-[10px] font-black text-zinc-500 uppercase mb-2">Traits</div>
              {traits.length === 0 ? (
                <div className="text-xs text-zinc-600">부여된 특성이 없습니다.</div>
              ) : (
                <div className="space-y-2">
                  {traits.map(t => (
                    <div key={t.id} className="flex items-center justify-between">
                      <span className={`text-xs font-black ${t.color}`}>{t.name}</span>
                      <span className="text-[10px] text-zinc-500">{t.desc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {Object.values(CUSTOM_STATS_CONFIG).map(stat => {
                const StatIcon = stat.icon;
                return (
                  <div key={stat.id} className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatIcon className="w-5 h-5 text-zinc-500" />
                      <div>
                        <div className="text-sm font-bold">{stat.name} <span className="text-blue-500">Lv.{allocatedStats[stat.id]}</span></div>
                        <div className="text-[10px] text-zinc-500">{stat.desc}</div>
                      </div>
                    </div>
                    <button onClick={() => {
                        if (playerData.traitPoints > 0 && allocatedStats[stat.id] < stat.maxLevel) {
                          setPlayerData(p => ({ ...p, traitPoints: p.traitPoints - 1 })); setAllocatedStats(s => ({ ...s, [stat.id]: s[stat.id] + 1 }));
                        }
                      }} disabled={playerData.traitPoints <= 0 || allocatedStats[stat.id] >= stat.maxLevel} className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 disabled:opacity-20"><PlusCircle className="w-5 h-5" /></button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 1.5 Security (Local PIN) Modal */}
      {activeModal === 'security' && (
        <div className="fixed inset-0 bg-black/90 z-50 p-6 flex items-center justify-center animate-in fade-in" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-zinc-500"><X /></button>
            <h2 className="text-2xl font-black flex items-center gap-2 mb-2"><Shield className="w-6 h-6 text-blue-500" /> Security</h2>
            <p className="text-xs text-zinc-500 mb-6">로컬 저장 데이터(이 PC/브라우저)의 간단 잠금용 PIN입니다. 서버 계정 비밀번호가 아닙니다.</p>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-400">STATUS</span>
                <span className={`text-xs font-black ${hasLocalPin ? 'text-green-400' : 'text-zinc-500'}`}>{hasLocalPin ? 'PIN SET' : 'NO PIN'}</span>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-6">
              <div className="text-[10px] font-black text-zinc-500 uppercase mb-3">Screen Saver</div>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="text-zinc-300 font-bold">사용</span>
                <input
                  type="checkbox"
                  checked={uiSettings.screenSaverEnabled}
                  onChange={(e) => setUiSettings(s => ({ ...s, screenSaverEnabled: e.target.checked }))}
                />
              </label>
              <div className="flex items-center justify-between gap-3 mt-3">
                <span className="text-zinc-300 font-bold text-sm">대기(초)</span>
                <input
                  type="number"
                  min={10}
                  max={3600}
                  value={Math.round((uiSettings.screenSaverIdleMs || DEFAULT_UI_SETTINGS.screenSaverIdleMs) / 1000)}
                  onChange={(e) => {
                    const seconds = Math.max(10, Math.min(3600, Number(e.target.value || 0) || 10));
                    setUiSettings(s => ({ ...s, screenSaverIdleMs: seconds * 1000 }));
                  }}
                  className="w-24 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-center font-mono text-sm"
                />
              </div>
              <div className="text-[11px] text-zinc-500 mt-3">PIN을 설정한 경우 화면보호기 해제 시 PIN 확인을 요구합니다.</div>
            </div>

            {!hasLocalPin ? (
              <div className="space-y-3">
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="새 PIN (4~12자리 숫자)"
                  value={pinSettings.next}
                  onChange={(e) => setPinSettings(s => ({ ...s, next: e.target.value, error: '' }))}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-center font-black tracking-widest focus:border-blue-500 outline-none"
                />
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="새 PIN 확인"
                  value={pinSettings.confirm}
                  onChange={(e) => setPinSettings(s => ({ ...s, confirm: e.target.value, error: '' }))}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-center font-black tracking-widest focus:border-blue-500 outline-none"
                />
                {pinSettings.error && <div className="text-xs text-red-400 font-bold">{pinSettings.error}</div>}
                <button onClick={saveNewPin} disabled={pinSettings.busy} className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-black disabled:opacity-50 flex items-center justify-center gap-2">
                  {pinSettings.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} PIN 설정
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="현재 PIN"
                  value={pinSettings.current}
                  onChange={(e) => setPinSettings(s => ({ ...s, current: e.target.value, error: '' }))}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-center font-black tracking-widest focus:border-blue-500 outline-none"
                />
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="새 PIN (변경 시)"
                  value={pinSettings.next}
                  onChange={(e) => setPinSettings(s => ({ ...s, next: e.target.value, error: '' }))}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-center font-black tracking-widest focus:border-blue-500 outline-none"
                />
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="새 PIN 확인"
                  value={pinSettings.confirm}
                  onChange={(e) => setPinSettings(s => ({ ...s, confirm: e.target.value, error: '' }))}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-center font-black tracking-widest focus:border-blue-500 outline-none"
                />
                {pinSettings.error && <div className="text-xs text-red-400 font-bold">{pinSettings.error}</div>}
                <button onClick={changePin} disabled={pinSettings.busy} className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-black disabled:opacity-50 flex items-center justify-center gap-2">
                  {pinSettings.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} PIN 변경
                </button>
                <button onClick={removePin} disabled={pinSettings.busy} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-black text-red-300 disabled:opacity-50 flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" /> PIN 해제
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Achievements Modal */}
      {activeModal === 'achievements' && (
        <div className="fixed inset-0 bg-black/90 z-50 p-6 flex items-center justify-center animate-in fade-in" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-zinc-500"><X /></button>
            <h2 className="text-2xl font-black flex items-center gap-2 mb-6"><Trophy className="w-6 h-6 text-yellow-500" /> Achievements</h2>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {ACHIEVEMENTS_CONFIG.map(ach => {
                const tier = achievementLevels[ach.id] || 0;
                const isMax = tier >= ach.thresholds.length;
                const AchIcon = ach.icon;
                return (
                  <div key={ach.id} className={`p-4 rounded-2xl border ${tier > 0 ? 'bg-zinc-800/80 border-zinc-600' : 'bg-zinc-950 border-zinc-800/50 opacity-60'}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${tier > 0 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-zinc-900 text-zinc-600'}`}><AchIcon className="w-4 h-4" /></div>
                      <div>
                        <div className="text-sm font-bold text-gray-200">{ach.name} <span className="text-[10px] text-zinc-500">Lv.{tier}/{ach.thresholds.length}</span></div>
                        <div className="text-[10px] text-zinc-400">{isMax ? '최종 도달!' : `다음: ${ach.getDesc(ach.thresholds[tier])}`}</div>
                      </div>
                    </div>
                    <div className={`text-[10px] font-bold px-2 py-1 rounded bg-black/50 ${tier > 0 ? 'text-purple-400' : 'text-zinc-600'}`}>버프: {ach.descPrefix} {(ach.baseValue + ach.valuePerTier * Math.max(0, tier - 1)).toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. Rebirth & Relics Modal */}
      {activeModal === 'rebirth' && (
        <div className="fixed inset-0 bg-black/90 z-50 p-6 flex items-center justify-center animate-in fade-in" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-zinc-500"><X /></button>
            <h2 className="text-2xl font-black flex items-center gap-2 mb-4 text-purple-400"><InfinityIcon className="w-6 h-6" /> Rebirth</h2>
            <div className="bg-purple-950/20 rounded-xl p-4 border border-purple-900/30 text-center mb-6">
              <div className="flex justify-center items-center gap-2 text-purple-300 font-bold text-lg mb-4"><Gem className="w-5 h-5" /> 보유 영혼석: {soulStones}</div>
              <button onClick={handleRebirth} className="w-full py-3 bg-purple-800 hover:bg-purple-700 text-white font-bold rounded-xl text-sm">✨ 환생하기 (Lv.20+)</button>
            </div>
            <h4 className="text-xs font-bold text-zinc-500 mb-2 uppercase">고대 유물 강화</h4>
            <div className="space-y-2">
              {Object.entries(RELICS_CONFIG).map(([id, config]) => {
                const currentLevel = relics[id]; const cost = getRelicCost(config, currentLevel);
                const RelicIcon = config.icon;
                return (
                  <div key={id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <RelicIcon className="w-4 h-4 text-blue-400" />
                      <div><div className="text-xs font-bold text-gray-200">{config.name} <span className="text-blue-400">Lv.{currentLevel}</span></div></div>
                    </div>
                    <button onClick={() => { if(soulStones >= cost && currentLevel < config.max) { setSoulStones(s => s - cost); setRelics(r => ({ ...r, [id]: currentLevel + 1 })); } }} disabled={soulStones < cost || currentLevel >= config.max} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-blue-300 rounded-lg text-[10px] font-bold disabled:opacity-30">{currentLevel >= config.max ? 'MAX' : `${cost}석`}</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3.5 Feedback Board Modal */}
      {activeModal === 'feedback' && (
        <div className="fixed inset-0 bg-black/90 z-50 p-6 flex items-center justify-center animate-in fade-in" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-zinc-500"><X /></button>
            <div className="flex items-center gap-3 mb-4"><MessageSquare className="w-7 h-7 text-emerald-400" /><h2 className="text-2xl font-black">Feedback</h2></div>

            {isOfflineMode ? (
              <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 p-4 rounded-xl text-sm text-center mb-4">
                <ZapOff className="w-6 h-6 mx-auto mb-2 opacity-80" />
                현재 오프라인 모드입니다. (Firebase/Rules 설정 확인)
              </div>
            ) : (
              <>
                <textarea
                  value={feedbackDraft}
                  onChange={(e) => setFeedbackDraft(e.target.value)}
                  placeholder="버그/개선점/밸런스/감상 등 자유롭게 남겨주세요 (400자)"
                  maxLength={400}
                  className="w-full h-24 bg-black border border-zinc-700 rounded-2xl px-4 py-3 text-sm outline-none focus:border-emerald-500 resize-none"
                />
                <div className="flex justify-between items-center mt-2 mb-4">
                  <span className="text-[10px] text-zinc-500">{String(feedbackDraft || '').length}/400</span>
                  <button onClick={postFeedback} disabled={isPostingFeedback || !String(feedbackDraft || '').trim()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-black text-sm disabled:opacity-40 flex items-center gap-2">
                    {isPostingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 등록
                  </button>
                </div>

                <div className="text-[10px] font-black text-zinc-500 uppercase mb-2">Recent</div>
                <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
                  {feedbackItems.length === 0 ? (
                    <div className="text-center text-zinc-500 text-sm py-6">아직 글이 없습니다.</div>
                  ) : (
                    feedbackItems.map((it) => (
                      <div key={it.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-black text-zinc-300">{String(it.name || 'Anonymous')}</div>
                          <div className="text-[10px] text-zinc-600 font-mono">{it.clientAt ? new Date(Number(it.clientAt)).toLocaleString() : ''}</div>
                        </div>
                        <div className="text-xs text-zinc-300 whitespace-pre-wrap break-words">{String(it.text || '')}</div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeModal === 'idle_rewards' && idleRewardSummary && (
        <div className="fixed inset-0 bg-black/90 z-50 p-6 flex items-center justify-center animate-in fade-in" onClick={() => { setActiveModal(null); setIdleRewardSummary(null); }}>
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setActiveModal(null); setIdleRewardSummary(null); }} className="absolute top-4 right-4 text-zinc-500"><X /></button>
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-7 h-7 text-yellow-400" />
              <h2 className="text-2xl font-black">방치 보상</h2>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-4">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-zinc-400">누적 시간</span>
                <span className="text-zinc-200 font-mono">{Number(idleRewardSummary.minutes || 0).toLocaleString()}분</span>
              </div>
              {idleRewardSummary.capped && (
                <div className="text-[11px] text-zinc-600 mt-2">최대 {Math.floor(IDLE_REWARD_MAX_MS / 3_600_000)}시간까지만 보상이 계산됩니다.</div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="bg-black/40 border border-zinc-800 rounded-2xl p-3 text-center">
                <Coins className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
                <div className="text-[10px] text-zinc-500 font-black">GOLD</div>
                <div className="text-sm font-black font-mono text-zinc-200">+{Number(idleRewardSummary.gold || 0).toLocaleString()}</div>
              </div>
              <div className="bg-black/40 border border-zinc-800 rounded-2xl p-3 text-center">
                <Gem className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                <div className="text-[10px] text-zinc-500 font-black">STONES</div>
                <div className="text-sm font-black font-mono text-zinc-200">+{Number(idleRewardSummary.stones || 0).toLocaleString()}</div>
              </div>
              <div className="bg-black/40 border border-zinc-800 rounded-2xl p-3 text-center">
                <TrendingUp className="w-4 h-4 text-green-400 mx-auto mb-1" />
                <div className="text-[10px] text-zinc-500 font-black">EXP</div>
                <div className="text-sm font-black font-mono text-zinc-200">+{Number(idleRewardSummary.exp || 0).toLocaleString()}</div>
              </div>
            </div>

            <button onClick={() => { setActiveModal(null); setIdleRewardSummary(null); }} className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black">
              확인
            </button>
          </div>
        </div>
      )}

      {/* 4. PvP Rankings & Clash Modals */}
      {activeModal === 'pvp' && (
        <div className="fixed inset-0 bg-black/90 z-50 p-6 flex items-center justify-center animate-in fade-in" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-zinc-500"><X /></button>
            <div className="flex items-center gap-3 mb-6"><Swords className="w-8 h-8 text-red-500" /><h2 className="text-2xl font-black">Arena (Global)</h2></div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="text-zinc-300">My AP</span>
                <span className="text-red-300 font-mono">{Number(statistics.arenaPoints || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1">
                <span>W/L · Rank</span>
                <span className="font-mono">
                  {Number(statistics.pvpWins || 0)} / {Number(statistics.pvpLosses || 0)}
                  {user ? ` · #${Math.max(1, rankings.findIndex(r => r?.uid === user.uid) + 1)}` : ''}
                </span>
              </div>
              <button onClick={quickMatch} disabled={isAnimating} className="w-full mt-3 py-3 bg-red-950/60 hover:bg-red-900 rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {isAnimating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />} Quick Match
              </button>
            </div>

            {pvpHistory.length > 0 && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-black text-zinc-500 uppercase">Recent Matches</div>
                  <div className="text-[10px] text-zinc-600">{pvpHistory.length}/20</div>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {pvpHistory.slice(0, 6).map((h) => (
                    <div key={String(h.at)} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`font-black ${h.isWin ? 'text-yellow-400' : 'text-zinc-500'}`}>{h.isWin ? 'W' : 'L'}</span>
                        <span className="text-zinc-300 truncate">{String(h.opponentName || 'OPPONENT')}</span>
                        <span className="text-[10px] text-zinc-600 font-mono">{h.at ? new Date(Number(h.at)).toLocaleTimeString([], { hour12: false }) : ''}</span>
                      </div>
                      <div className="font-mono text-[11px]">
                        <span className={h.pointDelta >= 0 ? 'text-green-400' : 'text-red-400'}>{h.pointDelta >= 0 ? `+${h.pointDelta}` : `${h.pointDelta}`}</span>
                        <span className="text-zinc-600"> AP</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {isOfflineMode ? (
              <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 p-4 rounded-xl text-sm text-center mb-4">
                <ZapOff className="w-6 h-6 mx-auto mb-2 opacity-80" />
                현재 오프라인 모드로 실행 중입니다. <br/>투기장 기능을 사용하려면 Firebase 설정을 적용해주세요.
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {rankings.length === 0 ? <p className="text-center text-zinc-500 text-sm py-4">서버에서 랭킹을 불러오는 중...</p> : rankings.map((rk, idx) => (
                  <div key={rk.uid} className={`flex items-center gap-4 p-3 rounded-xl border ${rk.uid === user?.uid ? 'bg-blue-900/20 border-blue-500/50' : 'bg-zinc-950 border-zinc-800'}`}>
                    <span className={`text-lg font-black w-6 text-center ${idx < 3 ? 'text-yellow-500' : 'text-zinc-600'}`}>{idx + 1}</span>
                    <div className="flex-1">
                      <div className="text-sm font-bold flex items-center gap-2">{String(rk.name)} <span className="text-[10px] text-zinc-500">Lv.{rk.level}</span></div>
                      <div className="text-[10px] text-zinc-400 font-mono">Weapon: +{rk.weaponLevel}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black text-red-300">AP {(rk.arenaPoints || 0).toLocaleString()}</div>
                      <div className="text-[10px] font-mono text-zinc-500">CP {(rk.combatPower || 0).toLocaleString()}</div>
                      <button onClick={() => { setPvpOpponent(rk); setPvpResult(null); setActiveModal('pvp_clash'); }} disabled={rk.uid === user?.uid} className="text-[10px] bg-red-950/50 text-red-400 border border-red-900/50 px-3 py-1 rounded-lg mt-1 font-bold hover:bg-red-900 disabled:opacity-0">Duel</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={syncProfile} disabled={isSyncing || isOfflineMode} className="w-full mt-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 text-sm transition-all">
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />} 현재 전투력 동기화
            </button>
          </div>
        </div>
      )}

      {activeModal === 'pvp_clash' && (
        <div className="fixed inset-0 bg-black/95 z-[60] p-6 flex flex-col items-center justify-center animate-in zoom-in">
          <div className="w-full max-w-sm text-center">
            <h2 className="text-4xl font-black mb-12 italic tracking-tighter text-red-600 animate-pulse">VERSUS</h2>
            <div className="grid grid-cols-2 gap-8 mb-12 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-24 bg-zinc-800" />
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-zinc-900 rounded-full border border-blue-500 flex items-center justify-center mb-4"><User className="w-10 h-10 text-blue-400" /></div>
                <span className="text-xs font-bold text-zinc-500 mb-1">YOU</span>
                <span className="text-lg font-black">{playerName}</span><span className="text-xl font-mono text-blue-400">{myCombatPower.toLocaleString()}</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-zinc-900 rounded-full border border-red-500 flex items-center justify-center mb-4"><Skull className="w-10 h-10 text-red-500" /></div>
                <span className="text-xs font-bold text-zinc-500 mb-1">OPPONENT</span>
                <span className="text-lg font-black">{pvpOpponent?.name}</span><span className="text-xl font-mono text-red-400">{(pvpOpponent?.combatPower || 0).toLocaleString()}</span>
              </div>
            </div>
            {pvpResult ? (
              <div className="animate-in fade-in slide-in-from-bottom-4">
                <div className={`text-4xl font-black mb-4 ${pvpResult.isWin ? 'text-yellow-400' : 'text-zinc-600'}`}>{pvpResult.isWin ? 'VICTORY' : 'DEFEAT'}</div>
                <div className="flex justify-center gap-8 mb-8 text-sm font-mono text-zinc-500"><div>ROLL: {pvpResult.myRoll}</div><div>ROLL: {pvpResult.oppRoll}</div></div>
                <div className="text-sm font-black mb-8 text-zinc-300">
                  {pvpResult.pointDelta >= 0 ? `+${pvpResult.pointDelta}` : `${pvpResult.pointDelta}`} AP
                  {pvpResult.rewardGold > 0 ? ` / +${pvpResult.rewardGold}G` : ''}
                </div>
                <button onClick={() => { setActiveModal('pvp'); setPvpOpponent(null); }} className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-black">투기장 복귀</button>
              </div>
            ) : (
              <button onClick={executePvp} disabled={isAnimating} className="w-full py-6 bg-red-600 hover:bg-red-500 rounded-2xl font-black text-xl flex items-center justify-center gap-3 disabled:opacity-50">
                {isAnimating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Swords className="w-6 h-6" />} FIGHT
              </button>
            )}
          </div>
        </div>
      )}

      {isScreenSaver && (
        <div className="fixed inset-0 z-[80] bg-black flex items-center justify-center" onMouseDown={wakeScreenSaver} onTouchStart={wakeScreenSaver}>
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.25),rgba(0,0,0,0)_60%)]" />
          <div className="relative w-full max-w-sm text-center p-8">
            <div className="text-xs font-black text-zinc-600 uppercase tracking-widest mb-4">Screen Saver</div>
            <div className="text-5xl font-black text-zinc-200 mb-2 font-mono">{new Date().toLocaleTimeString([], { hour12: false })}</div>
            <div className="text-xs text-zinc-600 mb-8">{new Date().toLocaleDateString()}</div>
            {!screenSaverLocked && <div className="text-xs font-bold text-zinc-500">클릭/터치로 복귀</div>}

            {screenSaverLocked && (
              <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-left" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-2"><Shield className="w-5 h-5 text-blue-500" /><div className="font-black">PIN 잠금</div></div>
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="PIN (4~12자리 숫자)"
                  value={unlockPrompt.pin}
                  onChange={(e) => setUnlockPrompt(p => ({ ...p, pin: e.target.value, error: '' }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmUnlock(); }}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-center text-lg font-black tracking-widest focus:border-blue-500 outline-none"
                />
                {unlockPrompt.error && <div className="mt-3 text-xs text-red-400 font-bold">{unlockPrompt.error}</div>}
                <button onClick={confirmUnlock} disabled={unlockPrompt.busy} className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-black disabled:opacity-50 flex items-center justify-center gap-2">
                  {unlockPrompt.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} 해제
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
