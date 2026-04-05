import { 
  Sword, Coins, Hammer, Pickaxe, Target, Circle, 
  Shirt, Ghost, Skull, ShieldAlert, Flame, Crown, Swords, Wind, Zap
} from 'lucide-react';

export const SAVE_PREFIX = 'JINY_SAVE_V4_';
export const LAST_SESSION_KEY = 'JINY_LAST_PROFILE_V1';
export const PIN_KEY_SUFFIX = '__PIN_V1';
export const UI_SETTINGS_KEY = 'JINY_UI_V1';
export const PBKDF2_ITERATIONS = 120_000;
export const DEFAULT_UI_SETTINGS = { screenSaverEnabled: true, screenSaverIdleMs: 120_000 };
export const IDLE_REWARD_MAX_MS = 8 * 60 * 60 * 1000;
export const IDLE_REWARD_MIN_MS = 30 * 1000;

export const MAX_LEVEL = 60;

export const ENHANCE_TIERS = [
  { threshold: 5, success: 100, drop: 0, destroy: 0, gold: 100, stone: 1, color: 'text-gray-300', glow: 'shadow-gray-500/50' },
  { threshold: 10, success: 85, drop: 0, destroy: 0, gold: 500, stone: 3, color: 'text-green-400', glow: 'shadow-green-500/50' },
  { threshold: 15, success: 55, drop: 15, destroy: 0, gold: 1500, stone: 5, color: 'text-blue-400', glow: 'shadow-blue-500/50' },
  { threshold: 20, success: 35, drop: 30, destroy: 5, gold: 5000, stone: 10, color: 'text-purple-500', glow: 'shadow-purple-500/50' },
  { threshold: 30, success: 15, drop: 40, destroy: 15, gold: 25000, stone: 30, color: 'text-red-500', glow: 'shadow-red-500/70' },
  { threshold: 40, success: 8, drop: 50, destroy: 25, gold: 100000, stone: 100, color: 'text-red-600', glow: 'shadow-red-600/80' },
  { threshold: 50, success: 3, drop: 60, destroy: 40, gold: 500000, stone: 300, color: 'text-red-700', glow: 'shadow-red-700/90' },
  { threshold: 61, success: 1, drop: 70, destroy: 60, gold: 2000000, stone: 1000, color: 'text-amber-500', glow: 'shadow-amber-500/95' }
];

export const APPRAISAL_GRADES = [
  { id: 'NORMAL', name: '일반', mult: 1.0, color: 'text-gray-400', reqRoll: 0 },
  { id: 'RARE', name: '희귀', mult: 1.25, color: 'text-blue-400', reqRoll: 40 },
  { id: 'EPIC', name: '영웅', mult: 1.6, color: 'text-purple-500', reqRoll: 75 },
  { id: 'LEGENDARY', name: '전설', mult: 2.2, color: 'text-yellow-400', reqRoll: 95 },
  { id: 'MYTHIC', name: '신화', mult: 4.5, color: 'text-red-500', reqRoll: 120 }
];

export const EQUIP_TYPES = {
  weapon: { id: 'weapon', name: '무기', icon: Sword },
  armor: { id: 'armor', name: '방어구', icon: Shirt },
  ring: { id: 'ring', name: '반지', icon: Circle }
};

export const TRAITS = {
  MINER: { id: 'MINER', name: '광부의 인내', desc: '채굴 골드 20% 증가', effect: 'farm_bonus', value: 1.2, color: 'text-yellow-400' },
  ARTISAN: { id: 'ARTISAN', name: '장인의 혼', desc: '강화 확률 5%p 증가', effect: 'success_bonus', value: 5, color: 'text-green-400' },
  SURVIVOR: { id: 'SURVIVOR', name: '불굴의 의지', desc: '실패 페널티 5%p 감소', effect: 'safety_bonus', value: 5, color: 'text-blue-400' },
  WARRIOR: { id: 'WARRIOR', name: '전사의 심장', desc: '최종 데미지 20% 증가', effect: 'damage_bonus', value: 1.2, color: 'text-red-400' }
};

export const PERSONALITY_QUESTIONS = [
  { text: "[질문 1/4] 낡은 대장간에서 심상치 않은 광석을 발견했습니다. 다음 행동은?", answers: [ { text: "창고에 보관하고 채굴에 집중한다.", trait: TRAITS.MINER }, { text: "아끼는 망치를 들어 제련한다.", trait: TRAITS.ARTISAN } ] },
  { text: "[질문 2/4] 전투 중 절체절명의 위기! 당신의 선택은?", answers: [ { text: "방패를 굳게 쥐고 버틴다.", trait: TRAITS.SURVIVOR }, { text: "모든 힘을 쥐어짜내 공격한다.", trait: TRAITS.WARRIOR } ] },
  { text: "[질문 3/4] 광산 갱도에서 붕괴가 시작됩니다. 가장 먼저 하는 행동은?", answers: [ { text: "광석 주머니를 꽉 쥐고 출구를 찾는다.", trait: TRAITS.MINER }, { text: "동료를 붙잡고 안전한 길을 만든다.", trait: TRAITS.SURVIVOR } ] },
  { text: "[질문 4/4] 강력한 적이 눈앞에 나타났습니다. 준비하는 방식은?", answers: [ { text: "무기 균형을 다시 맞추고 완벽을 추구한다.", trait: TRAITS.ARTISAN }, { text: "기회를 기다리지 않고 선제 공격한다.", trait: TRAITS.WARRIOR } ] }
];

export const CUSTOM_STATS_CONFIG = {
  ATTACK: { id: 'ATTACK', name: '근력', desc: '데미지 +3%', valuePerPoint: 0.03, maxLevel: 100, icon: Sword },
  SUCCESS: { id: 'SUCCESS', name: '손재주', desc: '강화 확률 +0.3%p', valuePerPoint: 0.3, maxLevel: 100, icon: Hammer },
  CRIT: { id: 'CRIT', name: '통찰력', desc: '크리티컬 확률 +1%p', valuePerPoint: 0.01, maxLevel: 100, icon: Target },
  WEALTH: { id: 'WEALTH', name: '매력', desc: '골드 획득 +5%', valuePerPoint: 0.05, maxLevel: 100, icon: Coins }
};

export const ACHIEVEMENTS_CONFIG = [
  { id: 'boss_slayer', name: '보스 학살자', descPrefix: '보스 처치', thresholds: [1, 5, 20, 50, 150], getDesc: (t) => `보스 ${t}마리 처치`, effect: 'damage_bonus', baseValue: 1.05, valuePerTier: 0.05, icon: Skull },
  { id: 'rich', name: '황금빛 손길', descPrefix: '누적 골드', thresholds: [50000, 200000, 1000000, 5000000, 20000000], getDesc: (t) => `누적 ${t.toLocaleString()}G`, effect: 'farm_bonus', baseValue: 1.1, valuePerTier: 0.1, icon: Coins },
  { id: 'clicker', name: '광속의 클릭', descPrefix: '누적 행동', thresholds: [100, 500, 2000, 10000, 50000], getDesc: (t) => `행동 ${t}회`, effect: 'stone_drop_bonus', baseValue: 0.05, valuePerTier: 0.02, icon: Pickaxe },
  { id: 'level_up', name: '한계 돌파', descPrefix: '플레이어 레벨', thresholds: [10, 20, 30, 50, 80], getDesc: (t) => `레벨 ${t} 달성`, effect: 'damage_bonus', baseValue: 1.1, valuePerTier: 0.1, icon: Target },
  { id: 'enhancer', name: '장인의 집념', descPrefix: '장비 총합 강화', thresholds: [15, 30, 45, 60, 90], getDesc: (t) => `총합 강화 ${t}단계`, effect: 'success_bonus', baseValue: 1, valuePerTier: 1, icon: Hammer },
  { id: 'pvp_master', name: '투기장의 제왕', descPrefix: '아레나 점수', thresholds: [1100, 1300, 1600, 2000, 3000], getDesc: (t) => `아레나 ${t}점`, effect: 'damage_bonus', baseValue: 1.05, valuePerTier: 0.05, icon: Swords },
  { id: 'arena_slayer', name: '무패의 검투사', descPrefix: '아레나 승리', thresholds: [1, 5, 20, 100, 500], getDesc: (t) => `아레나 ${t}승`, effect: 'safety_bonus', baseValue: 2, valuePerTier: 2, icon: ShieldAlert }
];

export const RELICS_CONFIG = {
  DAMAGE: { id: 'DAMAGE', name: '고대 투신의 검집', desc: '최종 데미지 +15%', effect: 'damage_bonus', valuePerLevel: 0.15, max: 10, costBase: 1, costMult: 2.5, icon: Sword },
  GOLD: { id: 'GOLD', name: '황금 고블린의 자루', desc: '획득 골드 +30%', effect: 'farm_bonus', valuePerLevel: 0.3, max: 10, costBase: 1, costMult: 2.5, icon: Coins },
  CRIT: { id: 'CRIT', name: '고대 통찰의 보석', desc: '크리티컬 확률 +5%', effect: 'crit_chance_bonus', valuePerLevel: 0.05, max: 10, costBase: 2, costMult: 3, icon: Target },
  SUCCESS: { id: 'SUCCESS', name: '고대 장인의 망치', desc: '강화 성공률 +1%', effect: 'success_bonus', valuePerLevel: 1, max: 10, costBase: 3, costMult: 3.5, icon: Hammer }
};

export const BOSS_LIST = [
  { name: '슬라임', icon: Circle, maxHp: 100, dmg: 5, rewardGold: 200, rewardStone: 1, color: 'text-green-400' },
  { name: '대지 정령', icon: Wind, maxHp: 500, dmg: 12, rewardGold: 800, rewardStone: 3, color: 'text-emerald-500' },
  { name: '스켈레톤 워리어', icon: Skull, maxHp: 2000, dmg: 25, rewardGold: 2500, rewardStone: 8, color: 'text-gray-300' },
  { name: '유령 기사', icon: Ghost, maxHp: 8000, dmg: 50, rewardGold: 7000, rewardStone: 15, color: 'text-blue-200' },
  { name: '가디언 골렘', icon: ShieldAlert, maxHp: 25000, dmg: 120, rewardGold: 15000, rewardStone: 30, color: 'text-amber-600' },
  { name: '지옥의 불꽃', icon: Flame, maxHp: 75000, dmg: 250, rewardGold: 45000, rewardStone: 60, color: 'text-red-500' },
  { name: '심연의 군주', icon: Crown, maxHp: 200000, dmg: 500, rewardGold: 120000, rewardStone: 150, color: 'text-purple-600' },
  { name: '투신 아레스', icon: Swords, maxHp: 800000, dmg: 1200, rewardGold: 350000, rewardStone: 400, color: 'text-red-700' }
];

export const PASSIVE_SKILLS = [
  { id: 'BLOOD_LUST', name: '피의 갈증', icon: Flame, effect: 'lifesteal', value: 0.1, desc: '공격 시 데미지의 10%만큼 체력 회복' }
];

export const SKILLS = [
  { id: 'SMASH', name: '폭풍 베기', icon: Swords, cost: 25, type: 'damage', multiplier: 6, color: 'text-red-400', desc: '강력한 연속 베기로 공격력의 600% 데미지' },
  { id: 'HEAL', name: '성스러운 빛', icon: Zap, cost: 40, type: 'heal', amount: 0.3, color: 'text-green-400', desc: '신성한 힘으로 최대 체력의 30% 회복' },
  { id: 'SHIELD', name: '절대 방어', icon: ShieldAlert, cost: 30, type: 'buff', effect: 'defense_bonus', value: 0.5, duration: 15000, color: 'text-blue-400', desc: '15초 동안 받는 데미지 50% 감소' }
];

export const ROGUELIKE_BUFF_POOL = [
  { id: 'ATK_UP', name: '불의 권능', desc: '공격력 +15%', effect: 'damage_bonus_p', value: 0.15, color: 'text-red-400' },
  { id: 'HP_UP', name: '생명의 숨결', desc: '최대 체력 +20%', effect: 'hp_bonus_p', value: 0.2, color: 'text-green-400' },
  { id: 'CRIT_UP', name: '심판의 눈', desc: '크리티컬 데미지 +30%', effect: 'crit_dmg_p', value: 0.3, color: 'text-yellow-400' },
  { id: 'MANA_UP', name: '지혜의 축복', desc: '마나 회복량 +50%', effect: 'mana_regen_p', value: 0.5, color: 'text-blue-400' }
];

export const DAILY_QUESTS = [
  { id: 'BOSS', name: '보스 타격 (300회)', goal: 300, reward: { type: 'gold', amount: 20000 }, icon: Target },
  { id: 'PVP', name: '투기장 승리 (3회)', goal: 3, reward: { type: 'gold', amount: 15000 }, icon: Swords },
  { id: 'ENHANCE', name: '장비 강화 시도 (15회)', goal: 15, reward: { type: 'stone', amount: 30 }, icon: Hammer },
  { id: 'MINING', name: '채광 시도 (100회)', goal: 100, reward: { type: 'stone', amount: 15 }, icon: Pickaxe }
];

export const DAILY_QUEST_ALL_DONE_REWARD = { amount: 50000, stone: 30 };
