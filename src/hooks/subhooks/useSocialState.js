import { useState } from 'react';
import { DAILY_QUESTS } from '../../config/constants';

export function useSocialState() {
  const [user, setUser] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pvpOpponent, setPvpOpponent] = useState(null);
  const [pvpResult, setPvpResult] = useState(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [pvpHistory, setPvpHistory] = useState([]);
  const [defenseLogs, setDefenseLogs] = useState([]);
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);
  const [dailyQuests, setDailyQuests] = useState(DAILY_QUESTS.map(q => ({ ...q, current: 0, claimed: false })));

  const [lastRankingsFetch, setLastRankingsFetch] = useState(0);
  const [lastDefenseFetch, setLastDefenseFetch] = useState(0);

  return {
    state: { user, rankings, isSyncing, pvpOpponent, pvpResult, isOfflineMode, pvpHistory, defenseLogs, isFetchingLogs, dailyQuests, lastRankingsFetch, lastDefenseFetch },
    setters: { setUser, setRankings, setIsSyncing, setPvpOpponent, setPvpResult, setIsOfflineMode, setPvpHistory, setDefenseLogs, setIsFetchingLogs, setDailyQuests, setLastRankingsFetch, setLastDefenseFetch }
  };
}
