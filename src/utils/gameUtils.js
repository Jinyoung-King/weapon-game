import { 
  SAVE_PREFIX, PIN_KEY_SUFFIX, UI_SETTINGS_KEY, DEFAULT_UI_SETTINGS,
  BOSS_LIST, APPRAISAL_GRADES, CUSTOM_STATS_CONFIG, ACHIEVEMENTS_CONFIG, RELICS_CONFIG
} from '../config/constants';
import { Crown } from 'lucide-react';

export const getSaveKey = (name) => `${SAVE_PREFIX}${name}`;
export const getPinKey = (name) => `${SAVE_PREFIX}${name}${PIN_KEY_SUFFIX}`;
export const isValidPin = (pin) => typeof pin === 'string' && /^\d{4,12}$/.test(pin);

export const readUiSettings = () => {
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

export const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

export const getReqExp = (level) => Math.floor(100 * Math.pow(1.5, level - 1));
export const getRelicCost = (config, level) => Math.floor(config.costBase * Math.pow(config.costMult, level));

export const applyExpOffline = (playerData, expAmount) => {
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

export const getStoredPinRecord = (name) => {
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

export const getBossConfig = (stage) => {
  if (stage < BOSS_LIST.length) return BOSS_LIST[stage];
  const overStage = stage - BOSS_LIST.length + 1;
  return {
    name: `심연의 파편 (Lv.${overStage})`, icon: Crown,
    maxHp: Math.floor(15000 * Math.pow(1.8, overStage)),
    rewardGold: 20000 + (10000 * overStage), rewardStone: 40 + (10 * overStage), color: 'text-fuchsia-500'
  };
};

export const generateLocalAppraisal = (typeId, level) => {
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

export const getActiveBuffs = (traits, stats, achievements, relics, appraisals = {}, equipment = { weapon: 0, armor: 0, ring: 0 }) => {
  const buffs = [];
  traits.forEach(t => buffs.push({ effect: t.effect, value: t.value }));
  
  if (stats.ATTACK > 0) buffs.push({ effect: 'damage_bonus', value: 1 + (stats.ATTACK * CUSTOM_STATS_CONFIG.ATTACK.valuePerPoint) });
  if (stats.SUCCESS > 0) buffs.push({ effect: 'success_bonus', value: stats.SUCCESS * CUSTOM_STATS_CONFIG.SUCCESS.valuePerPoint });
  if (stats.CRIT > 0) buffs.push({ effect: 'crit_chance_bonus', value: stats.CRIT * CUSTOM_STATS_CONFIG.CRIT.valuePerPoint });
  if (stats.WEALTH > 0) buffs.push({ effect: 'farm_bonus', value: 1 + (stats.WEALTH * CUSTOM_STATS_CONFIG.WEALTH.valuePerPoint) });

  // Equipment Level Bonuses
  if (equipment.armor > 0) buffs.push({ effect: 'safety_bonus', value: equipment.armor * 1.0, label: '갑옷 보너스' });
  if (equipment.ring > 0) buffs.push({ effect: 'success_bonus', value: equipment.ring * 0.5, label: '반지 보너스' });

  Object.entries(achievements).forEach(([id, tier]) => {
    const ach = ACHIEVEMENTS_CONFIG.find(a => a.id === id);
    if (ach && tier > 0) {
      const val = ach.baseValue + (ach.valuePerTier * (tier - 1));
      buffs.push({ effect: ach.effect, value: val, label: ach.name });
    }
  });

  Object.entries(relics).forEach(([id, level]) => {
    const rel = RELICS_CONFIG[id];
    if (rel && level > 0) {
      let val = level * rel.valuePerLevel;
      if (rel.effect.includes('bonus')) val += 1;
      buffs.push({ effect: rel.effect, value: val, label: rel.name });
    }
  });

  // Set Bonus (Synergy)
  if (appraisals.weapon && appraisals.armor && appraisals.ring) {
    const wG = appraisals.weapon.grade.id;
    const aG = appraisals.armor.grade.id;
    const rG = appraisals.ring.grade.id;
    if (wG === aG && aG === rG) {
      buffs.push({ effect: 'damage_bonus', value: 1.15, label: `세트 효과 (${appraisals.weapon.grade.name})` });
      buffs.push({ effect: 'enhance_cost_reduction', value: 0.10 });
    }
  }

  return buffs;
};
