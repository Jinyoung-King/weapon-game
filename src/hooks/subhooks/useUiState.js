import { useState, useRef } from 'react';
import { DEFAULT_UI_SETTINGS } from '../../config/constants';

export function useUiState() {
  const [appState, setAppState] = useState('login'); // 'login', 'intro', 'playing'
  const [playerName, setPlayerName] = useState('');
  const [logs, setLogs] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedEquip, setSelectedEquip] = useState('weapon');
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTab, setCurrentTab] = useState('COMBAT');
  const [uiSettings, setUiSettings] = useState(DEFAULT_UI_SETTINGS);
  const [isScreenSaver, setIsScreenSaver] = useState(false);
  const [screenSaverLocked, setScreenSaverLocked] = useState(false);
  
  const [isMining, setIsMining] = useState(false);
  const [mineCharge, setMineCharge] = useState(0);

  const [feedbackDraft, setFeedbackDraft] = useState('');
  const [isPostingFeedback, setIsPostingFeedback] = useState(false);
  const [feedbackItems, setFeedbackItems] = useState([]);
  
  const [statistics, setStatistics] = useState({
    totalGoldEarned: 1000,
    bossesDefeated: 0,
    totalClicks: 0,
    pvpWins: 0,
    pvpLosses: 0,
    arenaPoints: 1000,
    lastPvpAt: 0
  });

  const [achievementLevels, setAchievementLevels] = useState({});
  const [viewedAchievementLevels, setViewedAchievementLevels] = useState({});
  const [idleRewardSummary, setIdleRewardSummary] = useState(null);

  const idleTimerRef = useRef(null);

  return {
    state: { 
      appState, playerName, logs, activeModal, selectedEquip, isAnimating, currentTab, 
      uiSettings, isScreenSaver, screenSaverLocked,
      isMining, mineCharge, statistics, achievementLevels, viewedAchievementLevels, idleRewardSummary,
      feedbackDraft, isPostingFeedback, feedbackItems
    },
    setters: { 
      setAppState, setPlayerName, setLogs, setActiveModal, setSelectedEquip, setIsAnimating, 
      setCurrentTab, setUiSettings, setIsScreenSaver, setScreenSaverLocked,
      setIsMining, setMineCharge, setStatistics, setAchievementLevels, setViewedAchievementLevels, setIdleRewardSummary,
      setFeedbackDraft, setIsPostingFeedback, setFeedbackItems
    },
    refs: { idleTimerRef }
  };
}
