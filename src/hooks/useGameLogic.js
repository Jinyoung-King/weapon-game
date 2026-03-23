/* eslint-disable no-unused-vars */
/* global __initial_auth_token */
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  DEFAULT_UI_SETTINGS, UI_SETTINGS_KEY, 
  ACHIEVEMENTS_CONFIG, ENHANCE_TIERS, EQUIP_TYPES, MAX_LEVEL,
  CUSTOM_STATS_CONFIG, RELICS_CONFIG, PERSONALITY_QUESTIONS, TRAITS,
  APPRAISAL_GRADES, IDLE_REWARD_MAX_MS, IDLE_REWARD_MIN_MS, PBKDF2_ITERATIONS,
  DAILY_QUESTS
} from '../config/constants';
import { 
  appId, auth, db, firebaseConfig
} from '../config/firebase';
import { signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, addDoc, query, orderBy, limit, serverTimestamp, onSnapshot, where, getDocs } from 'firebase/firestore';
import { 
  getSaveKey, getPinKey, isValidPin, getStoredPinRecord, 
  readUiSettings, clampNumber, getReqExp, getRelicCost, applyExpOffline, 
  getBossConfig, generateLocalAppraisal, getActiveBuffs,
  peekLastSessionSave, persistLastSession
} from '../utils/gameUtils';
import { hashPin, verifyPin } from '../utils/cryptoUtils';

export function useGameLogic() {
  const DEFAULT_STATS = {
    totalGoldEarned: 1000,
    bossesDefeated: 0,
    totalClicks: 0,
    pvpWins: 0,
    pvpLosses: 0,
    arenaPoints: 1000,
    lastPvpAt: 0
  };

  const [appState, setAppState] = useState(() =>
    typeof window !== 'undefined' && peekLastSessionSave() ? 'bootstrapping' : 'login'
  );
  const [playerName, setPlayerName] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
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
  const [relics, setRelics] = useState({ DAMAGE: 0, GOLD: 0, CRIT: 0, SUCCESS: 0 });
  const [failStack, setFailStack] = useState(0);
  
  // --- Trackers & Progression ---
  const [statistics, setStatistics] = useState(DEFAULT_STATS);
  const [achievementLevels, setAchievementLevels] = useState({});
  const [viewedAchievementLevels, setViewedAchievementLevels] = useState({});
  const [stage, setStage] = useState(0);
  const [bossHp, setBossHp] = useState(0);
  const bossRespawnTimeoutRef = useRef(null);
  const bossRespawnScheduledStageRef = useRef(null);

  // --- UI State ---
  const [logs, setLogs] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedEquip, setSelectedEquip] = useState('weapon');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isAttacking, setIsAttacking] = useState(false);
  const [damageTexts, setDamageTexts] = useState([]);
  const [attackEffects, setAttackEffects] = useState([]);

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
  const [defenseLogs, setDefenseLogs] = useState([]);
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });
  const idleTimerRef = useRef(null);

  // --- Feedback Board ---
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [feedbackDraft, setFeedbackDraft] = useState('');
  const [isPostingFeedback, setIsPostingFeedback] = useState(false);
  const [dailyQuests, setDailyQuests] = useState({ state: {}, claimed: [], lastReset: 0 });

  // --- Idle Rewards ---
  const [idleRewardSummary, setIdleRewardSummary] = useState(null);

  // --- Idle Mining State ---
  const [isMining, setIsMining] = useState(false);
  const [mineCharge, setMineCharge] = useState(0);
  const mineChargeRef = useRef(0);
  const mineTimerRef = useRef(null);

  // --- Derived State ---
  const activeBuffs = getActiveBuffs(traits, allocatedStats, achievementLevels, relics, appraisals, equipment);
  const myCombatPower = Math.floor(
    (playerData.level * 10 + equipment.weapon * 25 + equipment.armor * 10 + equipment.ring * 10) 
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
  const addLog = (text, type = 'info') => {
    const id = Date.now() + Math.random();
    setLogs(prev => {
      const newLogs = [...prev, { id, text, type, at: Date.now() }];
      return newLogs.slice(-30);
    });
  };

  const updateQuestProgress = (id, amount = 1) => {
    setDailyQuests(prev => {
      const today = new Date().toDateString();
      const last = new Date(prev.lastReset || 0).toDateString();
      const isNewDay = today !== last;
      
      const nextProgress = isNewDay ? {} : { ...prev.state };
      const nextClaimed = isNewDay ? [] : [...prev.claimed];
      
      nextProgress[id] = (nextProgress[id] || 0) + amount;
      
      return { 
        state: nextProgress, 
        claimed: nextClaimed, 
        lastReset: isNewDay ? Date.now() : prev.lastReset 
      };
    });
  };

  const claimDailyReward = (id) => {
    const quest = DAILY_QUESTS.find(q => q.id === id);
    if (!quest) return;
    
    const progress = dailyQuests.state[id] || 0;
    const isDone = progress >= quest.goal;
    const isClaimed = dailyQuests.claimed.includes(id);
    
    if (isDone && !isClaimed) {
      if (quest.reward.type === 'gold') setGold(g => g + quest.reward.amount);
      if (quest.reward.type === 'stone') setStones(s => s + quest.reward.amount);
      
      setDailyQuests(prev => ({
        ...prev,
        claimed: [...prev.claimed, id]
      }));
      addLog(`${quest.name} 보름 수령 완료!`, 'success');
    }
  };

	  const resetGameForNewProfile = () => {
    setGold(1000);
    setStones(5);
    setSoulStones(0);
    setPlayerData({ level: 1, exp: 0, traitPoints: 0 });
    setEquipment({ weapon: 0, armor: 0, ring: 0 });
    setAppraisals({ weapon: null, armor: null, ring: null });
    setAllocatedStats({ ATTACK: 0, SUCCESS: 0, CRIT: 0, WEALTH: 0 });
    setTraits([]);
    setRelics({ DAMAGE: 0, GOLD: 0, CRIT: 0, SUCCESS: 0 });
    setFailStack(0);
    setStatistics(DEFAULT_STATS);
    setAchievementLevels({});
    setViewedAchievementLevels({});

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
      const buffs = getActiveBuffs(
        data.traits || [], 
        data.allocatedStats || { ATTACK: 0, SUCCESS: 0, CRIT: 0, WEALTH: 0 }, 
        data.achievementLevels || {}, 
        data.relics || { DAMAGE: 0, GOLD: 0 }, 
        data.appraisals || {},
        data.equipment || { weapon: 0, armor: 0, ring: 0 }
      );
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
    setRelics(data.relics || { DAMAGE: 0, GOLD: 0, CRIT: 0, SUCCESS: 0 });
    setFailStack(data.failStack || 0);
    setStatistics(nextStatistics);
    setAchievementLevels(data.achievementLevels || {});
    setViewedAchievementLevels(data.viewedAchievementLevels || data.achievementLevels || {});
    setPvpHistory(Array.isArray(data.pvpHistory) ? data.pvpHistory : []);

	    setStage(nextStage);
	    setBossHp(nextBossHp);
	  };

  useEffect(() => {
    if (appState !== 'bootstrapping') return;
    const peek = peekLastSessionSave();
    if (!peek) {
      persistLastSession(null);
      setAppState('login');
      return;
    }
    try {
      setPlayerName(peek.name);
      loadGameFromSave(JSON.parse(peek.raw));
      setAppState('playing');
      addLog(`[자동 복구] ${peek.name}님, 환영합니다!`, 'success');
    } catch (e) {
      console.error('Session restore failed:', e);
      persistLastSession(null);
      setAppState('login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState]);

  useEffect(() => {
    if (appState === 'playing' && playerName) persistLastSession(playerName);
  }, [appState, playerName]);

  const logout = () => {
    persistLastSession(null);
    setPendingLogin(null);
    setPinPrompt({ open: false, pin: '', error: '', busy: false });
    setPlayerName('');
    resetGameForNewProfile();
    setQuestionIndex(0);
    setIntroVotes([]);
    setTraits([]);
    setAppState('login');
  };

  const handleLogin = async (name) => {
    const trimmed = name.trim();
    if (!trimmed || isLoggingIn) return;

    setIsLoggingIn(true);
    try {
      // 1. Check LocalStorage First
      const localSaved = localStorage.getItem(getSaveKey(trimmed));
      if (localSaved) {
        const data = JSON.parse(localSaved);
        const localPinRecord = getStoredPinRecord(trimmed);
        if (localPinRecord) {
          setPendingLogin({ name: trimmed, data, pinSource: 'local' });
          setPinPrompt({ open: true, pin: '', error: '', busy: false });
          return;
        }
        setPlayerName(trimmed);
        loadGameFromSave(data);
        setAppState('playing');
        addLog(`[로컬 복구] 환영합니다, ${trimmed}님!`, 'success');
        return;
      }

      // 2. Check Cloud (Firestore)
      if (isOfflineMode) {
        // Fallback for offline mode when no local data
        setPlayerName(trimmed);
        resetGameForNewProfile();
        setAppState('intro');
        return;
      }

      const docSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', trimmed));
      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        if (cloudData.pinRecord) {
          setPendingLogin({ name: trimmed, data: cloudData.state, pinRecord: cloudData.pinRecord, pinSource: 'cloud' });
          setPinPrompt({ open: true, pin: '', error: '', busy: false });
          return;
        }
        setPlayerName(trimmed);
        loadGameFromSave(cloudData.state);
        setAppState('playing');
        addLog(`[클라우드 복구] 환영합니다, ${trimmed}님!`, 'success');
        // Save to local for next time
        localStorage.setItem(getSaveKey(trimmed), JSON.stringify(cloudData.state));
      } else {
        // 3. New Profile
        setPlayerName(trimmed);
        setQuestionIndex(0);
        setIntroVotes([]);
        resetGameForNewProfile();
        setAppState('intro');
      }
    } catch (e) {
      console.error('Login error:', e);
      addLog('로그인 중 오류가 발생했습니다. 오프라인 모드로 시작합니다.', 'warning');
      setPlayerName(trimmed);
      setAppState('intro');
    } finally {
      setIsLoggingIn(false);
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

    setPinPrompt(p => ({ ...p, busy: true, error: '' }));
    try {
      let record;
      if (pendingLogin.pinSource === 'cloud') {
        record = pendingLogin.pinRecord;
      } else {
        record = getStoredPinRecord(pendingLogin.name);
      }

      if (!record) {
        setPlayerName(pendingLogin.name);
        loadGameFromSave(pendingLogin.data);
        setAppState('playing');
        closePinPrompt();
        return;
      }

      const ok = await verifyPin(pin, record);
      if (!ok) {
        setPinPrompt(p => ({ ...p, error: 'PIN이 일치하지 않습니다.' }));
        return;
      }

      setPlayerName(pendingLogin.name);
      loadGameFromSave(pendingLogin.data);
      setAppState('playing');
      addLog(`[보안] PIN 확인 완료 (${pendingLogin.pinSource})`, 'success');
      // If cloud, sync PIN to local
      if (pendingLogin.pinSource === 'cloud') {
        localStorage.setItem(getPinKey(pendingLogin.name), JSON.stringify(record));
      }
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
      const stateToSave = { gold, stones, soulStones, playerData, equipment, appraisals, allocatedStats, traits, relics, failStack, statistics, achievementLevels, viewedAchievementLevels, stage, bossHp, pvpHistory, lastSavedAt: Date.now() };
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
	      setStage((s) => {
	        const next = s + 1;
	        setBossHp(getBossConfig(next).maxHp);
	        return next;
	      });
	    }, 1000);

	    return () => {
	      if (bossRespawnTimeoutRef.current) {
	        clearTimeout(bossRespawnTimeoutRef.current);
	        bossRespawnTimeoutRef.current = null;
	      }
	    };
	  }, [bossHp, stage, appState]);

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
      if (ach.id === 'level_up') val = playerData.level;
      if (ach.id === 'enhancer') val = equipment.weapon + equipment.armor + equipment.ring;
      if (ach.id === 'pvp_master') val = statistics.arenaPoints;
      if (ach.id === 'arena_slayer') val = statistics.pvpWins;
      
      if (val >= ach.thresholds[currentTier]) {
        newAchs[ach.id] = currentTier + 1; updated = true;
        addLog(`🏆 [업적 달성] ${ach.name} Lv.${currentTier + 1} - 영구 버프 획득!`, 'success');
      }
    });
    if (updated) setAchievementLevels(newAchs);
  }, [statistics, appState, achievementLevels, addLog, playerData.level, equipment]);

  const hasNewAchievements = Object.entries(achievementLevels).some(([id, lv]) => lv > (viewedAchievementLevels[id] || 0));

  useEffect(() => {
    if (activeModal === 'achievements') {
      setViewedAchievementLevels({ ...achievementLevels });
    }
  }, [activeModal, achievementLevels]);

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
      updateQuestProgress('MINING');
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
    updateQuestProgress('ENHANCE');
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
    const currentAppraisal = appraisals[selectedEquip];
    const level = equipment[selectedEquip];
    const cost = 500 + (level * 250);
    if (gold < cost) return addLog(`감정 비용(${cost.toLocaleString()}G)이 부족합니다.`, 'danger');

    const proceed = () => {
      setGold(g => g - cost);
      const result = generateLocalAppraisal(selectedEquip, level);
      setAppraisals(prev => ({ ...prev, [selectedEquip]: result }));
      addLog(`[감정] [${result.grade.name}] ${result.name} 획득!`, 'success');
      setConfirmModal({ open: false });
    };

    if (currentAppraisal && ['EPIC', 'LEGENDARY', 'MYTHIC'].includes(currentAppraisal.grade.id)) {
      setConfirmModal({
        open: true,
        title: '장비 재감정 경고',
        message: `현재 [${currentAppraisal.grade.name}] 등급의 장비를 보유 중입니다. 정말 다시 감정하시겠습니까? 이전 등급은 소멸됩니다.`,
        onConfirm: proceed
      });
      return;
    }

    proceed();
  };

  const handleAttack = () => {
    if (bossHp <= 0 || isAttacking) return;
    setIsAttacking(true); recordClick();

    const critBonus = activeBuffs.filter(b => b.effect === 'crit_chance_bonus').reduce((acc, b) => acc + b.value, 0);
    const isCrit = Math.random() < (0.1 + critBonus);
    let dmg = Math.floor(myCombatPower * (0.9 + Math.random() * 0.2));
    if (isCrit) dmg = Math.floor(dmg * 2);

    const id = Date.now();
    setDamageTexts(prev => [...prev, { id, amount: dmg, isCrit, x: Math.random() * 60 - 30, y: Math.random() * 20 - 10 }]);
    setTimeout(() => setDamageTexts(prev => prev.filter(t => t.id !== id)), 800);

    const effectId = id + 1;
    setAttackEffects(prev => [...prev, { id: effectId, isCrit, x: Math.random() * 60 - 30, y: Math.random() * 40 - 20, rotate: Math.random() * 360 }]);
    setTimeout(() => setAttackEffects(prev => prev.filter(e => e.id !== effectId)), 300);

    const nextHp = Math.max(0, bossHp - dmg);
    setBossHp(nextHp);
    updateQuestProgress('BOSS');

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
    setTimeout(() => setIsAttacking(false), 150);
  };

  const handleRebirth = () => {
    if (playerData.level < 20) return addLog('환생은 레벨 20 이상부터 가능합니다.', 'warning');
    const earned = Math.floor((equipment.weapon + equipment.armor + equipment.ring) / 3) + Math.floor(playerData.level / 5);
    setSoulStones(s => s + earned);
    setEquipment({ weapon: 0, armor: 0, ring: 0 }); setAppraisals({ weapon: null, armor: null, ring: null });
    setPlayerData({ level: 1, exp: 0, traitPoints: 0 }); setAllocatedStats({ ATTACK: 0, SUCCESS: 0, CRIT: 0, WEALTH: 0 });
    setGold(0); setStones(0); setStage(0); setBossHp(getBossConfig(0).maxHp); setFailStack(0);
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

    if (isWin) updateQuestProgress('PVP');

    if (!isOfflineMode && user) {
      try {
        const pvpLogCol = collection(db, 'artifacts', appId, 'public', 'data', 'pvp_logs');
        await addDoc(pvpLogCol, {
          attackerId: user.uid,
          attackerName: playerName,
          defenderId: pvpOpponent.uid,
          defenderName: pvpOpponent.name,
          isWin,
          myCombatPower,
          oppCombatPower: pvpOpponent.combatPower || 0,
          at: nextLast
        });
      } catch (e) {
        console.error('PvP log failed:', e);
      }
    }

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

  // ==========================================
  // [Interface] Action Wrappers (Encapsulation)
  // ==========================================
  
  const actions = {
    // Session Actions
    setAppState: (state) => setAppState(state),
    setPlayerName: (name) => setPlayerName(name),
    nextIntroQuestion: (votes) => {
      setIntroVotes(votes);
      if (questionIndex < PERSONALITY_QUESTIONS.length - 1) {
        setQuestionIndex(p => p + 1);
      } else {
        const counts = votes.reduce((acc, t) => ({ ...acc, [t.id]: (acc[t.id] || 0) + 1 }), {});
        const ranked = Object.values(TRAITS).slice().sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0) || a.id.localeCompare(b.id));
        const finalTraits = ranked.filter(t => (counts[t.id] || 0) > 0).slice(0, 2);
        setTraits(finalTraits);
        setAppState('trait_result');
      }
    },
    resetIntro: () => {
      setQuestionIndex(0);
      setIntroVotes([]);
      setTraits([]);
      setAppState('intro');
    },
    handleLogin: (name) => handleLogin(name),
    confirmPinLogin: () => confirmPinLogin(),
    closePinPrompt: () => closePinPrompt(),
    resetProfileWithoutPin: () => resetProfileWithoutPin(),
    logout: () => logout(),

    // Game Actions
    handleAttack: () => handleAttack(),
    handleEnhance: () => handleEnhance(),
    handleAppraisal: () => handleAppraisal(),
    handleRebirth: () => handleRebirth(),
    startMining: () => startMining(),
    stopMining: () => stopMining(),
    allocateStat: (statId) => {
      if (playerData.traitPoints > 0 && allocatedStats[statId] < CUSTOM_STATS_CONFIG[statId].maxLevel) {
        setPlayerData(p => ({ ...p, traitPoints: p.traitPoints - 1 }));
        setAllocatedStats(s => ({ ...s, [statId]: s[statId] + 1 }));
      }
    },
    buyRelic: (id) => {
      const config = RELICS_CONFIG[id];
      const currentLevel = relics[id];
      const cost = getRelicCost(config, currentLevel);
      if (soulStones >= cost && currentLevel < config.max) {
        setSoulStones(s => s - cost);
        setRelics(r => ({ ...r, [id]: currentLevel + 1 }));
      }
    },

    // UI & Settings Actions
    setActiveModal: (name) => setActiveModal(name),
    setSelectedEquip: (key) => setSelectedEquip(key),
    addLog: (text, type) => addLog(text, type),
    updateUiSettings: (newSettings) => setUiSettings(s => ({ ...s, ...newSettings })),
    setFeedbackDraft: (text) => setFeedbackDraft(text),
    postFeedback: () => postFeedback(),
    wakeScreenSaver: () => wakeScreenSaver(),
    confirmUnlock: () => confirmUnlock(),
    setUnlockPin: (pin) => setUnlockPrompt(p => ({ ...p, pin, error: '' })),
    setPinPromptValue: (pin) => setPinPrompt(p => ({ ...p, pin, error: '' })),
    
    // PIN Management Actions
    updatePinSettings: (updates) => setPinSettings(s => ({ ...s, ...updates, error: '' })),
    saveNewPin: () => saveNewPin(),
    changePin: () => changePin(),
    removePin: () => removePin(),

    // PvP Actions
    syncProfile: () => syncProfile(),
    quickMatch: () => quickMatch(),
    executePvp: () => executePvp(),
    setPvpOpponent: (opp) => { setPvpOpponent(opp); setPvpResult(null); setActiveModal('pvp_clash'); },
    closeConfirmModal: () => setConfirmModal({ open: false, title: '', message: '', onConfirm: null }),
    claimDailyReward,
    fetchDefenseLogs: async () => {
      if (isOfflineMode || !user) return;
      setIsFetchingLogs(true);
      try {
        const pvpLogCol = collection(db, 'artifacts', appId, 'public', 'data', 'pvp_logs');
        const q = query(pvpLogCol, where('defenderId', '==', user.uid), orderBy('at', 'desc'), limit(15));
        const snap = await getDocs(q);
        const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setDefenseLogs(logs);
      } catch (e) {
        console.error('Fetch logs failed:', e);
      } finally {
        setIsFetchingLogs(false);
      }
    }
  };

  return {
    state: {
      session: { appState, playerName, questionIndex, introVotes, pendingLogin, pinPrompt, pinSettings, hasLocalPin },
      game: { gold, stones, soulStones, playerData, equipment, appraisals, allocatedStats, traits, relics, failStack, statistics, achievementLevels, viewedAchievementLevels, hasNewAchievements },
      combat: { stage, bossHp, isAttacking, damageTexts, attackEffects, myCombatPower, activeBuffs },
      pvp: { user, rankings, isSyncing, pvpOpponent, pvpResult, pvpHistory, isOfflineMode, defenseLogs, isFetchingLogs, dailyQuests },
      ui: { logs, activeModal, selectedEquip, isAnimating, uiSettings, isScreenSaver, screenSaverLocked, unlockPrompt, confirmModal, feedbackItems, feedbackDraft, isPostingFeedback, idleRewardSummary, isMining, mineCharge }
    },
    actions
  };
}
