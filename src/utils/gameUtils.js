import {
  SAVE_PREFIX,
  LAST_SESSION_KEY,
  PIN_KEY_SUFFIX,
  UI_SETTINGS_KEY,
  DEFAULT_UI_SETTINGS,
  BOSS_LIST,
  APPRAISAL_GRADES,
  CUSTOM_STATS_CONFIG,
  ACHIEVEMENTS_CONFIG,
  RELICS_CONFIG,
} from "../config/constants";
import { Crown } from "lucide-react";

export const getSaveKey = (name) => `${SAVE_PREFIX}${name}`;
export const getPinKey = (name) => `${SAVE_PREFIX}${name}${PIN_KEY_SUFFIX}`;

export const persistLastSession = (name) => {
  try {
    const t = name == null ? "" : String(name).trim();
    if (!t || t.length > 10) localStorage.removeItem(LAST_SESSION_KEY);
    else localStorage.setItem(LAST_SESSION_KEY, t);
  } catch {
    /* ignore */
  }
};

export const peekLastSessionSave = () => {
  try {
    const name = (localStorage.getItem(LAST_SESSION_KEY) || "").trim();
    if (!name || name.length > 10) return null;
    const raw = localStorage.getItem(getSaveKey(name));
    return raw ? { name, raw } : null;
  } catch {
    return null;
  }
};

export const isValidPin = (pin) =>
  typeof pin === "string" && /^\d{4,12}$/.test(pin);

export const readUiSettings = () => {
  try {
    const raw = localStorage.getItem(UI_SETTINGS_KEY);
    if (!raw) return DEFAULT_UI_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      screenSaverEnabled: Boolean(
        parsed?.screenSaverEnabled ?? DEFAULT_UI_SETTINGS.screenSaverEnabled,
      ),
      screenSaverIdleMs: Math.max(
        10_000,
        Number(
          parsed?.screenSaverIdleMs ?? DEFAULT_UI_SETTINGS.screenSaverIdleMs,
        ) || DEFAULT_UI_SETTINGS.screenSaverIdleMs,
      ),
    };
  } catch {
    return DEFAULT_UI_SETTINGS;
  }
};

export const clampNumber = (value, min, max) =>
  Math.min(max, Math.max(min, value));

export const getReqExp = (level) => Math.floor(100 * Math.pow(1.5, level - 1));
export const getRelicCost = (config, level) =>
  Math.floor(config.costBase * Math.pow(config.costMult, level));

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
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.salt !== "string" || typeof parsed.hash !== "string")
      return null;
    return parsed;
  } catch {
    return null;
  }
};

export const getBossConfig = (stage) => {
  const bosses = [
    { name: '블루 슬라임', image: '/assets/slime.png', maxHp: 100, dmg: 5, rewardGold: 200, rewardStone: 1, color: 'text-blue-400' },
    { name: '고대 골렘', image: '/assets/golem.png', maxHp: 500, dmg: 12, rewardGold: 800, rewardStone: 3, color: 'text-amber-600' },
    { name: '심연의 파편', image: '/assets/golem.png', maxHp: 2000, dmg: 25, rewardGold: 2500, rewardStone: 8, color: 'text-fuchsia-500' }
  ];

  if (stage < bosses.length) return bosses[stage];
  
  const overStage = stage - bosses.length + 1;
  return {
    name: `심연의 군주 (Lv.${overStage})`,
    image: '/assets/golem.png',
    maxHp: Math.floor(25000 * Math.pow(1.8, overStage)),
    rewardGold: 50000 + 20000 * overStage,
    rewardStone: 100 + 50 * overStage,
    color: "text-red-700",
  };
};

export const generateLocalAppraisal = (typeId, level) => {
  const assets = {
    weapon: {
      pre: ["전설의", "불타는", "얼어붙은", "심연의", "고결한"],
      suf: ["검", "대검", "도끼", "망치", "창"],
    },
    armor: {
      pre: ["불굴의", "철갑의", "은빛", "용의"],
      suf: ["갑옷", "흉갑", "가죽옷"],
    },
    ring: {
      pre: ["지혜의", "탐욕의", "행운의", "영생의"],
      suf: ["반지", "고리", "인장"],
    },
  }[typeId];

  const roll = Math.random() * 100 + level * 1.5;
  const grade = APPRAISAL_GRADES.filter((g) => roll >= g.reqRoll).pop();
  const name = `${assets.pre[Math.floor(Math.random() * assets.pre.length)]} ${assets.suf[Math.floor(Math.random() * assets.suf.length)]}`;
  return { grade, name, text: "고대 마력이 느껴지는 장비입니다." };
};

export const getActiveBuffs = (
  traits,
  stats,
  achievements,
  relics,
  appraisals = {},
  equipment = { weapon: 0, armor: 0, ring: 0 },
) => {
  const buffs = [];
  traits.forEach((t) => buffs.push({ effect: t.effect, value: t.value }));

  if (stats.ATTACK > 0)
    buffs.push({
      effect: "damage_bonus",
      value: 1 + stats.ATTACK * CUSTOM_STATS_CONFIG.ATTACK.valuePerPoint,
    });
  if (stats.SUCCESS > 0)
    buffs.push({
      effect: "success_bonus",
      value: stats.SUCCESS * CUSTOM_STATS_CONFIG.SUCCESS.valuePerPoint,
    });
  if (stats.CRIT > 0)
    buffs.push({
      effect: "crit_chance_bonus",
      value: stats.CRIT * CUSTOM_STATS_CONFIG.CRIT.valuePerPoint,
    });
  if (stats.WEALTH > 0)
    buffs.push({
      effect: "farm_bonus",
      value: 1 + stats.WEALTH * CUSTOM_STATS_CONFIG.WEALTH.valuePerPoint,
    });

  // Equipment Level Bonuses
  if (equipment.armor > 0)
    buffs.push({
      effect: "safety_bonus",
      value: equipment.armor * 1.0,
      label: "갑옷 보너스",
    });
  if (equipment.ring > 0)
    buffs.push({
      effect: "success_bonus",
      value: equipment.ring * 0.5,
      label: "반지 보너스",
    });

  Object.entries(achievements).forEach(([id, tier]) => {
    const ach = ACHIEVEMENTS_CONFIG.find((a) => a.id === id);
    if (ach && tier > 0) {
      const val = ach.baseValue + ach.valuePerTier * (tier - 1);
      buffs.push({ effect: ach.effect, value: val, label: ach.name });
    }
  });

  Object.entries(relics).forEach(([id, level]) => {
    const rel = RELICS_CONFIG[id];
    if (rel && level > 0) {
      let val = level * rel.valuePerLevel;
      if (rel.effect.includes("bonus")) val += 1;
      buffs.push({ effect: rel.effect, value: val, label: rel.name });
    }
  });

  // Set Bonus (Synergy)
  if (appraisals.weapon && appraisals.armor && appraisals.ring) {
    const wG = appraisals.weapon.grade.id;
    const aG = appraisals.armor.grade.id;
    const rG = appraisals.ring.grade.id;
    if (wG === aG && aG === rG) {
      buffs.push({
        effect: "damage_bonus",
        value: 1.15,
        label: `세트 효과 (${appraisals.weapon.grade.name})`,
      });
      buffs.push({ effect: "enhance_cost_reduction", value: 0.1 });
    }
  }

  return buffs;
};
