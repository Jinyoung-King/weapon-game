const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'App.jsx');
const destPath = path.join(__dirname, '..', 'hooks', 'useGameLogic.js');

const content = fs.readFileSync(srcPath, 'utf8').replace(/\r\n/g, '\n');
const lines = content.split('\n');

const startIdx = lines.findIndex(l => l.includes('const DEFAULT_STATS = {'));
const endIdx = lines.findIndex(l => l.includes('if (appState === \'login\') {')); 

let hookBody = lines.slice(startIdx, endIdx - 2).join('\n');

// Re-apply wobble fix: replace isAnimating with isAttacking in handleAttack
hookBody = hookBody.replace(
  'const handleAttack = () => {\n    if (bossHp <= 0 || isAnimating) return;\n    setIsAnimating(true); recordClick();',
  'const handleAttack = () => {\n    if (bossHp <= 0 || isAttacking) return;\n    setIsAttacking(true); recordClick();'
);
hookBody = hookBody.replace(
  'setTimeout(() => setIsAnimating(false), 150);',
  'setTimeout(() => setIsAttacking(false), 150);'
);

const returnVars = [
  'DEFAULT_STATS', 'appState', 'setAppState', 'playerName', 'setPlayerName',
  'questionIndex', 'setQuestionIndex', 'introVotes', 'setIntroVotes',
  'gold', 'setGold', 'stones', 'setStones', 'soulStones', 'setSoulStones',
  'playerData', 'setPlayerData', 'equipment', 'setEquipment', 'appraisals', 'setAppraisals',
  'allocatedStats', 'setAllocatedStats', 'traits', 'setTraits', 'relics', 'setRelics',
  'failStack', 'setFailStack', 'statistics', 'setStatistics', 'achievementLevels', 'setAchievementLevels',
  'stage', 'setStage', 'bossHp', 'setBossHp', 'suppressBossHpResetRef', 'bossRespawnTimeoutRef', 'bossRespawnScheduledStageRef',
  'logs', 'setLogs', 'activeModal', 'setActiveModal', 'selectedEquip', 'setSelectedEquip',
  'isAnimating', 'setIsAnimating', 'isAttacking', 'setIsAttacking', 'damageTexts', 'setDamageTexts',
  'user', 'setUser', 'rankings', 'setRankings', 'isSyncing', 'setIsSyncing',
  'pvpOpponent', 'setPvpOpponent', 'pvpResult', 'setPvpResult', 'isOfflineMode', 'setIsOfflineMode',
  'pvpHistory', 'setPvpHistory', 'pendingLogin', 'setPendingLogin', 'pinPrompt', 'setPinPrompt',
  'pinSettings', 'setPinSettings', 'uiSettings', 'setUiSettings', 'isScreenSaver', 'setIsScreenSaver',
  'screenSaverLocked', 'setScreenSaverLocked', 'unlockPrompt', 'setUnlockPrompt', 'idleTimerRef',
  'feedbackItems', 'setFeedbackItems', 'feedbackDraft', 'setFeedbackDraft', 'isPostingFeedback', 'setIsPostingFeedback',
  'idleRewardSummary', 'setIdleRewardSummary', 'isMining', 'setIsMining', 'mineCharge', 'setMineCharge',
  'mineChargeRef', 'mineTimerRef', 'activeBuffs', 'myCombatPower', 'hasLocalPin',
  'addLog', 'resetGameForNewProfile', 'loadGameFromSave', 'handleLogin', 'closePinPrompt',
  'confirmPinLogin', 'resetProfileWithoutPin', 'saveNewPin', 'changePin', 'removePin',
  'wakeScreenSaver', 'confirmUnlock', 'postFeedback', 'gainExp', 'recordClick',
  'completeMining', 'startMining', 'stopMining', 'handleEnhance', 'handleAppraisal',
  'handleAttack', 'handleRebirth', 'syncProfile', 'quickMatch', 'executePvp'
];

const hookContent = `/* eslint-disable no-undef, no-unused-vars */
/* global __initial_auth_token */
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  DEFAULT_UI_SETTINGS, UI_SETTINGS_KEY, 
  ACHIEVEMENTS_CONFIG, ENHANCE_TIERS, EQUIP_TYPES, MAX_LEVEL,
  CUSTOM_STATS_CONFIG, RELICS_CONFIG, PERSONALITY_QUESTIONS, TRAITS,
  APPRAISAL_GRADES, IDLE_REWARD_MAX_MS, IDLE_REWARD_MIN_MS, PBKDF2_ITERATIONS
} from '../config/constants';
import { 
  appId, auth, db, firebaseConfig,
  signInAnonymously, signInWithCustomToken, onAuthStateChanged,
  collection, doc, setDoc, addDoc, query, orderBy, limit, serverTimestamp, onSnapshot
} from '../config/firebase';
import { 
  getSaveKey, getPinKey, isValidPin, getStoredPinRecord, 
  readUiSettings, clampNumber, getReqExp, getRelicCost, applyExpOffline, 
  getBossConfig, generateLocalAppraisal, getActiveBuffs
} from '../utils/gameUtils';
import { hashPin, verifyPin } from '../utils/cryptoUtils';

export function useGameLogic() {
${hookBody}

  return {
    ${returnVars.join(',\n    ')}
  };
}
`;
fs.writeFileSync(destPath, hookContent);
console.log('Hook successfully rebuilt perfectly!');
