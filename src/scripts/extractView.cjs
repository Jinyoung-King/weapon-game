const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'App.jsx');
const destPath = path.join(__dirname, '..', 'components', 'AppView.jsx');
const dirs = path.dirname(destPath);
if (!fs.existsSync(dirs)) fs.mkdirSync(dirs, { recursive: true });

const content = fs.readFileSync(srcPath, 'utf8');
const lines = content.split('\n');

const startIdx = lines.findIndex(l => l.includes('if (appState === \'login\') {')); // 1224
const endIdx = lines.findIndex((l, i) => i > startIdx && l.startsWith('}')); // Last closing brace of App

const viewBody = lines.slice(startIdx, endIdx).join('\n');

const propsDestructured = `  const {
    DEFAULT_STATS, appState, setAppState, playerName, setPlayerName,
    questionIndex, setQuestionIndex, introVotes, setIntroVotes,
    gold, setGold, stones, setStones, soulStones, setSoulStones,
    playerData, setPlayerData, equipment, setEquipment, appraisals, setAppraisals,
    allocatedStats, setAllocatedStats, traits, setTraits, relics, setRelics,
    failStack, setFailStack, statistics, setStatistics, achievementLevels, setAchievementLevels,
    stage, setStage, bossHp, setBossHp, bossRespawnTimeoutRef, bossRespawnScheduledStageRef,
    logs, setLogs, activeModal, setActiveModal, selectedEquip, setSelectedEquip,
    isAnimating, setIsAnimating, isAttacking, setIsAttacking, damageTexts, setDamageTexts,
    user, setUser, rankings, setRankings, isSyncing, setIsSyncing,
    pvpOpponent, setPvpOpponent, pvpResult, setPvpResult, isOfflineMode, setIsOfflineMode,
    pvpHistory, setPvpHistory, pendingLogin, setPendingLogin, pinPrompt, setPinPrompt,
    pinSettings, setPinSettings, uiSettings, setUiSettings, isScreenSaver, setIsScreenSaver,
    screenSaverLocked, setScreenSaverLocked, unlockPrompt, setUnlockPrompt, idleTimerRef,
    feedbackItems, setFeedbackItems, feedbackDraft, setFeedbackDraft, isPostingFeedback, setIsPostingFeedback,
    idleRewardSummary, setIdleRewardSummary, isMining, setIsMining, mineCharge, setMineCharge,
    mineChargeRef, mineTimerRef, activeBuffs, myCombatPower, hasLocalPin,
    addLog, resetGameForNewProfile, loadGameFromSave, handleLogin, closePinPrompt,
    confirmPinLogin, resetProfileWithoutPin, saveNewPin, changePin, removePin,
    wakeScreenSaver, confirmUnlock, postFeedback, gainExp, recordClick,
    completeMining, startMining, stopMining, handleEnhance, handleAppraisal,
    handleAttack, handleRebirth, syncProfile, quickMatch, executePvp
  } = props;`;

const icons = `import { X, Shield, PlusCircle, Settings, MessageSquare, Trophy, Swords, User, BrainCircuit, ZapOff, Loader2, CheckCircle2, Save, Trash2, Cloud, Sparkles, Coins, Gem, TrendingUp, Target, Pickaxe, Hammer, ScrollText, Timer, Infinity as InfinityIcon, Skull } from 'lucide-react';`;

const constants = `import { PERSONALITY_QUESTIONS, TRAITS, ENHANCE_TIERS, EQUIP_TYPES, MAX_LEVEL, APPRAISAL_GRADES, ACHIEVEMENTS_CONFIG, RELICS_CONFIG, CUSTOM_STATS_CONFIG, DEFAULT_UI_SETTINGS } from '../config/constants';
import { getBossConfig, getRelicCost } from '../utils/gameUtils';`;

const finalFile = `import React from 'react';\n${icons}\n${constants}\n\nexport function AppView(props) {\n${propsDestructured}\n\n${viewBody}\n}\n`;

fs.writeFileSync(destPath, finalFile);
console.log('AppView extracted!');
