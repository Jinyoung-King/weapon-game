import { useState } from 'react';

export function useEconomyState() {
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

  return {
    state: { gold, stones, soulStones, playerData, equipment, appraisals, allocatedStats, traits, relics, failStack },
    setters: { setGold, setStones, setSoulStones, setPlayerData, setEquipment, setAppraisals, setAllocatedStats, setTraits, setRelics, setFailStack }
  };
}
