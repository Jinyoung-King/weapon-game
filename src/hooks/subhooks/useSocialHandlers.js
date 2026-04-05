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
  const { setFeedbackDraft, setIsPostingFeedback, setFeedbackItems, setIsAnimating } = setters.ui;
  const { addLog, getFullStateToSave } = utils;

  const syncCloudSave = useCallback(async () => {
    if (pvp.isOfflineMode || !pvp.user || !ui.playerName || ui.appState !== 'playing') return;
    setIsSyncing(true);
    try {
      const stateData = getFullStateToSave();
      const profileRef = doc(db, 'artifacts', appId, 'public', 'data', 'profiles', ui.playerName);
      await setDoc(profileRef, { state: stateData, lastSavedAt: serverTimestamp(), uid: pvp.user.uid }, { merge: true });
      
      const pvpRankRef = doc(db, 'artifacts', appId, 'public', 'data', 'pvp_ranks', pvp.user.uid);
      await setDoc(pvpRankRef, { 
        uid: pvp.user.uid, 
        name: ui.playerName, 
        level: game.playerData.level, 
        weaponLevel: game.equipment.weapon,
        combatPower: combat.myCombatPower, 
        arenaPoints: ui.statistics.arenaPoints || 1000,
        lastActive: serverTimestamp() 
      }, { merge: true });
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
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'pvp_ranks'), orderBy('combatPower', 'desc'), limit(50));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => d.data());
      setRankings(list);
      setLastRankingsFetch(now);
    } catch (err) {
      console.error('Fetch Rankings Error:', err);
    }
  }, [pvp.isOfflineMode, pvp.lastRankingsFetch, pvp.rankings.length, setRankings, setLastRankingsFetch]);

  const fetchPvpLogs = useCallback(async (force = false) => {
    if (pvp.isOfflineMode || !pvp.user) return;
    
    const now = Date.now();
    if (!force && now - pvp.lastDefenseFetch < 300000 && pvp.defenseLogs.length > 0) {
      console.log('[Firestore] Fetch PvP Logs Skipped (Cached)');
      return;
    }

    setIsFetchingLogs(true);
    try {
      const q = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'profiles', ui.playerName, 'pvp_logs'),
        orderBy('at', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      setDefenseLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLastDefenseFetch(now);
    } catch (err) {
      console.error('Fetch PvP Logs Error:', err);
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
    const candidates = pvp.rankings.filter(r => r.uid !== pvp.user.uid && (r.combatPower || r.cp) > myCP * 0.7 && (r.combatPower || r.cp) < myCP * 1.5);
    
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

  const fetchFeedback = useCallback(async () => {
    if (pvp.isOfflineMode) return;
    try {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'feedback'), orderBy('clientAt', 'desc'), limit(30));
      const snap = await getDocs(q);
      setFeedbackItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Fetch Feedback Error:', err);
    }
  }, [pvp.isOfflineMode, setFeedbackItems]);

  const postFeedback = async () => {
    if (pvp.isOfflineMode || !ui.feedbackDraft.trim() || ui.isPostingFeedback) return;
    setIsPostingFeedback(true);
    try {
      const docRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'feedback'));
      await setDoc(docRef, {
        name: ui.playerName,
        text: ui.feedbackDraft,
        clientAt: Date.now(),
        uid: pvp.user?.uid || 'anonymous'
      });
      setFeedbackDraft('');
      addLog('[피드백] 소중한 의견 감사합니다!', 'success');
      await fetchFeedback();
    } catch (err) {
      console.error('Post Feedback Error:', err);
      addLog('피드백 등록 실패', 'danger');
    } finally {
      setIsPostingFeedback(false);
    }
  };

  const executePvp = async () => {
    if (!pvp.pvpOpponent || ui.isAnimating) return;
    
    setIsAnimating(true);
    addLog(`[전투] ${pvp.pvpOpponent.name}님과 대결을 시작합니다!`, 'info');
    
    // 쿨타임 업데이트용 통계 기록
    setStatistics(prev => ({ ...prev, lastPvpAt: Date.now() }));

    // 1.5초 후 결과 계산 (애니메이션 효과 연출을 위해)
    setTimeout(async () => {
      const myCP = combat.myCombatPower;
      const oppCP = pvp.pvpOpponent.combatPower || pvp.pvpOpponent.cp || 0;
      
      // 승률 계산: 기본 50% + 내 전투력이 높으면 가산, 낮으면 감산 (최소 5%, 최대 95%)
      const winChance = Math.max(0.05, Math.min(0.95, 0.5 + (myCP - oppCP) / (myCP + oppCP + 1)));
      const isWin = Math.random() < winChance;
      
      const pointDelta = isWin ? 25 : -15;
      const rewardGold = isWin ? Math.floor(oppCP * 0.1) : 0;
      
      const result = { isWin, pointDelta, rewardGold };
      setPvpResult(result);
      
      // 내 정보 갱신
      if (isWin) {
        setGold(g => g + rewardGold);
        setStatistics(prev => ({ 
          ...prev, 
          pvpWins: (prev.pvpWins || 0) + 1,
          arenaPoints: Math.max(0, (prev.arenaPoints || 1000) + pointDelta)
        }));
        addLog(`[투기장] 승리! +${pointDelta} AP / +${rewardGold}G 획득`, 'success');
        updateQuestProgress('pvp_master', 1);
      } else {
        setStatistics(prev => ({ 
          ...prev, 
          pvpLosses: (prev.pvpLosses || 0) + 1,
          arenaPoints: Math.max(0, (prev.arenaPoints || 1000) + pointDelta)
        }));
        addLog(`[투기장] 패배... ${pointDelta} AP`, 'danger');
      }

      // 전적 기록 남기기 (나-공격자 & 상대-방어자)
      if (!pvp.isOfflineMode) {
        try {
          const now = Date.now();
          // 내 기록 (공격)
          const myLogRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'profiles', ui.playerName, 'pvp_logs'));
          await setDoc(myLogRef, {
            type: 'attack',
            oppId: pvp.pvpOpponent.uid,
            oppName: pvp.pvpOpponent.name,
            oppCombatPower: oppCP,
            myCombatPower: myCP,
            isWin: isWin,
            pointDelta,
            rewardGold,
            at: now
          });

          // 상대 기록 (방어)
          const oppLogRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'profiles', pvp.pvpOpponent.name, 'pvp_logs'));
          await setDoc(oppLogRef, {
            type: 'defense',
            oppId: pvp.user?.uid || 'unknown',
            oppName: ui.playerName,
            oppCombatPower: myCP,
            myCombatPower: oppCP,
            isWin: !isWin, // 상대방 입장에서는 패배/승리가 반대
            at: now
          });
        } catch (err) {
          console.error('Record PvP log fail:', err);
        }
      }

      setIsAnimating(false);
      // 기록 갱신 호출 (캐시 무시)
      await fetchPvpLogs(true);
    }, 1500);
  };

  return { 
    syncCloudSave, 
    handleRebirth, 
    updateQuestProgress, 
    claimDailyQuestReward,
    fetchRankings,
    fetchPvpLogs,
    quickMatch,
    setPvpOpponent,
    setPvpResult,
    fetchFeedback,
    postFeedback,
    executePvp
  };
}
