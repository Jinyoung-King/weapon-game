import { useCallback } from 'react';
import { 
  db, appId 
} from '../../config/firebase';
import { doc, setDoc, getDoc, serverTimestamp, query, collection, orderBy, limit, getDocs } from 'firebase/firestore';
import { DAILY_QUEST_ALL_DONE_REWARD } from '../../config/constants';
import { getBossConfig } from '../../utils/gameUtils';

export function useSocialHandlers({ state, setters, utils }) {
  const { game, combat, pvp, ui } = state;
  const { setGold, setStones, setSoulStones, setPlayerData, setEquipment, setAppraisals, setAllocatedStats, setTraits, setRelics, setFailStack, setStatistics, setAchievementLevels } = setters.game;
  const { setStage, setBossHp, setMana, setMaxMana, setRunBuffs, setTempBuffs, setIsAttacking } = setters.combat;
  const { setIsSyncing, setRankings, setDailyQuests, setPvpResult, setPvpOpponent, setDefenseLogs, setIsFetchingLogs, setLastRankingsFetch, setLastDefenseFetch } = setters.pvp;
  const { addLog, getFullStateToSave } = utils;

  const syncCloudSave = useCallback(async () => {
    if (pvp.isOfflineMode || !pvp.user || !ui.playerName || ui.appState !== 'playing') return;
    setIsSyncing(true);
    try {
      const stateData = getFullStateToSave();
      const profileRef = doc(db, 'artifacts', appId, 'public', 'data', 'profiles', ui.playerName);
      await setDoc(profileRef, { state: stateData, lastSavedAt: serverTimestamp(), uid: pvp.user.uid }, { merge: true });
      
      const pvpRankRef = doc(db, 'artifacts', appId, 'public', 'data', 'pvp_ranks', pvp.user.uid);
      await setDoc(pvpRankRef, { uid: pvp.user.uid, name: ui.playerName, level: game.playerData.level, cp: combat.myCombatPower, lastActive: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [pvp.isOfflineMode, pvp.user, ui.playerName, ui.appState, getFullStateToSave, game.playerData.level, combat.myCombatPower, setIsSyncing]);

  const handleRebirth = () => {
    setSoulStones(s => s + Math.floor(game.playerData.level / 10));
    setPlayerData({ level: 1, exp: 0, traitPoints: 0 });
    setEquipment({ weapon: 0, armor: 0, ring: 0 });
    setAppraisals({ weapon: null, armor: null, ring: null });
    setAllocatedStats({ ATTACK: 0, SUCCESS: 0, CRIT: 0, WEALTH: 0 });
    setStage(0);
    setBossHp(getBossConfig(0).maxHp);
    setMana(100);
    setRunBuffs([]);
    setTempBuffs([]);
    setIsAttacking(false);
    addLog(`[환생] 기점으로 모든 장비와 스탯이 초기화되고 영혼석을 획득했습니다.`, 'success');
  };

  const updateQuestProgress = (type, amount = 1) => {
    setDailyQuests(prev => prev.map(q => q.id === type ? { ...q, current: Math.min(q.goal, (q.current || 0) + amount) } : q));
  };

  const claimDailyQuestReward = (id) => {
    if (id === 'ALL') {
      const allDone = pvp.dailyQuests.length > 0 && pvp.dailyQuests.every(q => q.current >= q.goal);
      const allClaimed = pvp.dailyQuests.every(q => q.claimed);
      if (!allDone || allClaimed) return;
      
      setDailyQuests(prev => prev.map(q => ({ ...q, claimed: true })));
      setGold(g => g + DAILY_QUEST_ALL_DONE_REWARD.amount);
      setStones(s => s + DAILY_QUEST_ALL_DONE_REWARD.stone);
      addLog(`[일일 퀘스트] 모든 보너스 보상 획득!`, 'success');
      return;
    }

    const quest = pvp.dailyQuests.find(q => q.id === id);
    if (!quest || quest.current < quest.goal || quest.claimed) return;
    
    setDailyQuests(prev => prev.map(q => q.id === id ? { ...q, claimed: true } : q));
    if (quest.reward.type === 'gold') setGold(g => g + quest.reward.amount);
    if (quest.reward.type === 'stone') setStones(s => s + quest.reward.amount);
    addLog(`[일일 퀘스트] '${quest.name}' 보상 획득!`, 'success');
  };

  const fetchRankings = useCallback(async (force = false) => {
    if (pvp.isOfflineMode) return;
    
    const now = Date.now();
    // 5분(300초) 쿨다운: 강제 새로고침이 아니고, 마지막 호출로부터 5분이 지나지 않았으며 데이터가 있는 경우 생략
    if (!force && now - pvp.lastRankingsFetch < 300000 && pvp.rankings.length > 0) {
      console.log('[Firestore] Fetch Rankings Skipped (Cached)');
      return;
    }

    try {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'pvp_ranks'), orderBy('cp', 'desc'), limit(50));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => d.data());
      setRankings(list);
      setLastRankingsFetch(now);
    } catch (err) {
      console.error('Fetch Rankings Error:', err);
    }
  }, [pvp.isOfflineMode, pvp.lastRankingsFetch, pvp.rankings.length, setRankings, setLastRankingsFetch]);

  const fetchDefenseLogs = useCallback(async (force = false) => {
    if (pvp.isOfflineMode || !pvp.user) return;
    
    const now = Date.now();
    if (!force && now - pvp.lastDefenseFetch < 300000 && pvp.defenseLogs.length > 0) {
      console.log('[Firestore] Fetch Defense Logs Skipped (Cached)');
      return;
    }

    setIsFetchingLogs(true);
    try {
      const q = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'profiles', ui.playerName, 'defense_logs'),
        orderBy('at', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      setDefenseLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLastDefenseFetch(now);
    } catch (err) {
      console.error('Fetch Defense Logs Error:', err);
    } finally {
      setIsFetchingLogs(false);
    }
  }, [pvp.isOfflineMode, pvp.user, ui.playerName, pvp.lastDefenseFetch, pvp.defenseLogs.length, setDefenseLogs, setIsFetchingLogs, setLastDefenseFetch]);

  const quickMatch = async () => {
    if (pvp.isOfflineMode || pvp.isSyncing) return;
    addLog('[투기장] 적절한 상대를 찾는 중...', 'info');
    await fetchRankings();
    
    // Simple matching: pick someone within +/- 30% of our CP
    const myCP = combat.myCombatPower;
    const candidates = pvp.rankings.filter(r => r.uid !== pvp.user.uid && r.cp > myCP * 0.7 && r.cp < myCP * 1.5);
    
    if (candidates.length > 0) {
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      setPvpOpponent(target);
      addLog(`[투기장] 상대를 찾았습니다: ${target.name}`, 'success');
    } else {
      // Pick anyone if no close match
      const others = pvp.rankings.filter(r => r.uid !== pvp.user.uid);
      if (others.length > 0) {
        const target = others[Math.floor(Math.random() * others.length)];
        setPvpOpponent(target);
      } else {
        addLog('[투기장] 현재 대전 가능한 상대가 없습니다.', 'warning');
      }
    }
  };

  return { 
    syncCloudSave, 
    handleRebirth, 
    updateQuestProgress, 
    claimDailyQuestReward,
    fetchRankings,
    fetchDefenseLogs,
    quickMatch,
    setPvpOpponent,
    setPvpResult
  };
}
