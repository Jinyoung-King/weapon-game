import React, { useState, useEffect } from 'react';
import { X, Shield, PlusCircle, Trophy, Swords, User, BrainCircuit, ZapOff, Loader2, CheckCircle2, Save, Trash2, Cloud, Sparkles, Coins, Gem, TrendingUp, Infinity as InfinityIcon, Skull, MessageSquare, ShieldAlert, AlertTriangle, History, BookOpen, LayoutGrid, ChevronRight, Settings, LogOut, Activity } from 'lucide-react';
import { ACHIEVEMENTS_CONFIG, RELICS_CONFIG, CUSTOM_STATS_CONFIG, DEFAULT_UI_SETTINGS, IDLE_REWARD_MAX_MS, DAILY_QUESTS, DAILY_QUEST_ALL_DONE_REWARD } from '../../config/constants';

const ModalWrapper = ({ children, title, icon: Icon, colorClass = "text-blue-500", onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
    <div className="absolute inset-0 bg-black/90 animate-in fade-in duration-200" onClick={onClose} />
    <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative animate-in zoom-in-95 duration-200 shadow-2xl" onClick={e => e.stopPropagation()}>
      <button 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }} 
        className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors z-[110] outline-none"
      >
        <X className="w-5 h-5" />
      </button>
      <h2 className={`text-2xl font-black flex items-center gap-2 mb-6 ${colorClass}`}>
        {Icon && <Icon className="w-6 h-6" />} {title}
      </h2>
      {children}
    </div>
  </div>
);

export function ModalManager({ session, game, combat, pvp, ui, actions }) {
  const { activeModal, confirmModal } = ui;
  const [pvpTab, setPvpTab] = useState(0); // 0: Rankings, 1: logs
  const [, setT] = useState(0);

  useEffect(() => {
    let timer;
    if (activeModal === 'pvp_clash') {
      timer = setInterval(() => setT(t => t + 1), 500);
    }
    return () => clearInterval(timer);
  }, [activeModal]);

  useEffect(() => {
    if (activeModal === 'pvp' && pvpTab === 1) {
      actions.fetchPvpLogs();
    }
  }, [activeModal, pvpTab]);

  const renderActiveModal = () => {
    switch (activeModal) {
      case 'stats':
        return (
          <ModalWrapper title="캐릭터 정보" icon={PlusCircle} onClose={() => actions.setActiveModal(null)}>
            <div className="bg-blue-600 px-3 py-1 rounded-full text-xs font-black absolute top-6 right-12">포인트: {game.playerData.traitPoints}</div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-4">
              <div className="text-[10px] font-black text-zinc-500 uppercase mb-2">당신의 본질</div>
              {game.traits.length === 0 ? (
                <div className="text-xs text-zinc-600">부여된 특성이 없습니다.</div>
              ) : (
                <div className="space-y-2">
                  {game.traits.map(t => (
                    <div key={t.id} className="flex items-center justify-between">
                      <span className={`text-xs font-black ${t.color}`}>{t.name}</span>
                      <span className="text-[10px] text-zinc-500">{t.desc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 세트 시너지 효과 */}
            {combat.activeBuffs.find(b => b.label?.includes('세트')) && (
              <div className="bg-blue-600/10 border border-blue-500/30 rounded-2xl p-4 mb-4 animate-in fade-in slide-in-from-top-2">
                <div className="text-[10px] font-black text-blue-400 uppercase mb-2">세트 시너지</div>
                <div className="text-xs font-bold text-zinc-100">{combat.activeBuffs.find(b => b.label?.includes('세트')).label}</div>
                <div className="text-[10px] text-zinc-400 mt-1">최종 데미지 +15% / 강화 비용 -10% 적용 중</div>
              </div>
            )}

            <div className="space-y-3">
              {Object.values(CUSTOM_STATS_CONFIG).map(stat => {
                const StatIcon = stat.icon;
                return (
                  <div key={stat.id} className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatIcon className="w-5 h-5 text-zinc-500" />
                      <div>
                        <div className="text-sm font-bold">{stat.name} <span className="text-blue-500">Lv.{game.allocatedStats[stat.id]}</span></div>
                        <div className="text-[10px] text-zinc-500">{stat.desc}</div>
                      </div>
                    </div>
                    <button onClick={() => actions.allocateStat(stat.id)} disabled={game.playerData.traitPoints <= 0 || game.allocatedStats[stat.id] >= stat.maxLevel} className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 disabled:opacity-20"><PlusCircle className="w-5 h-5" /></button>
                  </div>
                );
              })}
            </div>
          </ModalWrapper>
        );

      case 'security':
        return (
          <ModalWrapper title="보안 설정" icon={Shield} onClose={() => actions.setActiveModal(null)}>
            <p className="text-xs text-zinc-500 mb-6">로컬 저장 데이터(이 PC/브라우저)의 간단 잠금용 PIN입니다. 서버 계정 비밀번호가 아닙니다.</p>
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-4">
              <div className="flex justify-between items-center"><span className="text-xs font-bold text-zinc-400">상태</span><span className={`text-xs font-black ${session.hasLocalPin ? 'text-green-400' : 'text-zinc-500'}`}>{session.hasLocalPin ? '설정됨' : '미설정'}</span></div>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-6">
              <div className="text-[10px] font-black text-zinc-500 uppercase mb-3">화면 보호기</div>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="text-zinc-300 font-bold">사용</span>
                <input type="checkbox" checked={ui.uiSettings.screenSaverEnabled} onChange={(e) => actions.updateUiSettings({ screenSaverEnabled: e.target.checked })} />
              </label>
              <div className="flex items-center justify-between gap-3 mt-3">
                <span className="text-zinc-300 font-bold text-sm">대기(초)</span>
                <input type="number" min={10} max={3600} value={Math.round((ui.uiSettings.screenSaverIdleMs || DEFAULT_UI_SETTINGS.screenSaverIdleMs) / 1000)} onChange={(e) => actions.updateUiSettings({ screenSaverIdleMs: Math.max(10, Math.min(3600, Number(e.target.value || 0) || 10)) * 1000 })} className="w-24 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-center font-mono text-sm" />
              </div>
            </div>
            {!session.hasLocalPin ? (
              <div className="space-y-3">
                <input type="password" inputMode="numeric" placeholder="새 PIN (4~12자리 숫자)" value={session.pinSettings.next} onChange={(e) => actions.updatePinSettings({ next: e.target.value })} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-center font-black tracking-widest focus:border-blue-500 outline-none" />
                <input type="password" inputMode="numeric" placeholder="새 PIN 확인" value={session.pinSettings.confirm} onChange={(e) => actions.updatePinSettings({ confirm: e.target.value })} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-center font-black tracking-widest focus:border-blue-500 outline-none" />
                {session.pinSettings.error && <div className="text-xs text-red-400 font-bold">{session.pinSettings.error}</div>}
                <button onClick={actions.saveNewPin} disabled={session.pinSettings.busy} className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-black disabled:opacity-50 flex items-center justify-center gap-2">
                  {session.pinSettings.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} PIN 설정
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input type="password" inputMode="numeric" placeholder="현재 PIN" value={session.pinSettings.current} onChange={(e) => actions.updatePinSettings({ current: e.target.value })} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-center font-black tracking-widest focus:border-blue-500 outline-none" />
                <input type="password" inputMode="numeric" placeholder="새 PIN (변경 시)" value={session.pinSettings.next} onChange={(e) => actions.updatePinSettings({ next: e.target.value })} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-center font-black tracking-widest focus:border-blue-500 outline-none" />
                <input type="password" inputMode="numeric" placeholder="새 PIN 확인" value={session.pinSettings.confirm} onChange={(e) => actions.updatePinSettings({ confirm: e.target.value })} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-center font-black tracking-widest focus:border-blue-500 outline-none" />
                {session.pinSettings.error && <div className="text-xs text-red-400 font-bold">{session.pinSettings.error}</div>}
                <button onClick={actions.changePin} disabled={session.pinSettings.busy} className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-black disabled:opacity-50 flex items-center justify-center gap-2">
                  {session.pinSettings.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} PIN 변경
                </button>
                <button onClick={actions.removePin} disabled={session.pinSettings.busy} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-black text-red-300 disabled:opacity-50 flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> PIN 해제</button>
              </div>
            )}
            <div className="mt-6 pt-4 border-t border-zinc-800">
              <button 
                onClick={() => {
                  actions.setActiveModal(null);
                  actions.handleLogout();
                }}
                className="w-full py-4 bg-red-900/20 hover:bg-red-900/40 text-red-500 rounded-2xl font-black flex items-center justify-center gap-2 border border-red-500/20 transition-all"
              >
                <LogOut className="w-5 h-5" /> 로그아웃
              </button>
            </div>
          </ModalWrapper>
        );

      case 'achievements':
        return (
          <ModalWrapper title="모험 도감 (업적)" icon={Trophy} colorClass="text-yellow-500" onClose={() => actions.setActiveModal(null)}>
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-5 mb-6">
               <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-zinc-500" />
                  <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">나의 모험 기록</h4>
               </div>
               <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                  {[
                    { label: '보스 처치', val: game.statistics.bossesDefeated, unit: '마리' },
                    { label: '누적 골드', val: game.statistics.totalGoldEarned.toLocaleString(), unit: 'G' },
                    { label: '아레나 점수', val: game.statistics.arenaPoints.toLocaleString(), unit: 'AP' },
                    { label: '장비 총합', val: Object.values(game.equipment).reduce((a,b)=>a+b,0), unit: '강' }
                  ].map(s => (
                    <div key={s.label}>
                       <div className="text-[9px] font-bold text-zinc-600 mb-1 uppercase">{s.label}</div>
                       <div className="text-sm font-black text-zinc-200 font-mono">{s.val} <span className="text-[10px] font-bold text-zinc-600 ml-0.5">{s.unit}</span></div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar pb-6">
              {ACHIEVEMENTS_CONFIG.map(ach => {
                const tier = game.achievementLevels[ach.id] || 0;
                const isMax = tier >= ach.thresholds.length;
                const AchIcon = ach.icon;
                
                let currentVal = 0;
                switch (ach.id) {
                    case 'boss_slayer': currentVal = game.statistics.bossesDefeated; break;
                    case 'rich': currentVal = game.statistics.totalGoldEarned; break;
                    case 'clicker': currentVal = game.statistics.totalClicks; break;
                    case 'level_up': currentVal = game.playerData.level; break;
                    case 'enhancer': currentVal = Object.values(game.equipment).reduce((a, b) => a + b, 0); break;
                    case 'pvp_master': currentVal = game.statistics.arenaPoints; break;
                    case 'arena_slayer': currentVal = game.statistics.pvpWins; break;
                    default: break;
                }
                
                const nextGoal = isMax ? ach.thresholds[ach.thresholds.length-1] : ach.thresholds[tier];
                const prevGoal = tier === 0 ? 0 : ach.thresholds[tier-1];
                const progressPercent = isMax ? 100 : Math.min(100, ((currentVal - prevGoal) / (nextGoal - prevGoal)) * 100);

                return (
                  <div key={ach.id} className={`p-4 rounded-3xl border transition-all ${tier > 0 ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-950 border-zinc-900 opacity-40'}`}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`p-3 rounded-2xl relative ${tier > 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-white shadow-lg shadow-yellow-900/40' : 'bg-zinc-800 text-zinc-600'}`}>
                        <AchIcon className="w-5 h-5" />
                        {tier > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-yellow-950 text-[9px] font-black flex items-center justify-center rounded-full border border-zinc-900">{tier}</div>}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                           <h3 className="text-sm font-black text-white">{ach.name}</h3>
                           <span className="text-[10px] font-black text-zinc-500">Lv.{tier} / {ach.thresholds.length}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 font-bold leading-tight">
                            {isMax ? '모든 목표를 달성했습니다!' : ach.getDesc(nextGoal)}
                        </p>
                      </div>
                    </div>
                    
                    {!isMax && (
                       <div className="space-y-1.5 mb-4">
                          <div className="flex justify-between text-[9px] font-bold">
                             <span className="text-zinc-600">진행률</span>
                             <span className="text-zinc-400 font-mono">{currentVal.toLocaleString()} / {nextGoal.toLocaleString()}</span>
                          </div>
                          <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                             <div className="h-full bg-gradient-to-r from-yellow-600 to-amber-500 transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
                          </div>
                       </div>
                    )}

                    <div className={`flex items-center gap-2 p-2.5 rounded-xl bg-black/40 border border-zinc-800/50 ${tier > 0 ? 'text-amber-400' : 'text-zinc-600'}`}>
                       <TrendingUp className="w-3.5 h-3.5" />
                       <span className="text-[10px] font-black uppercase tracking-tight">수집 효과: {ach.descPrefix} +{((ach.baseValue + ach.valuePerTier * Math.max(0, tier - 1) - 1)*100).toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ModalWrapper>
        );

      case 'rebirth':
        return (
          <ModalWrapper title="환생 및 유물" icon={InfinityIcon} colorClass="text-purple-400" onClose={() => actions.setActiveModal(null)}>
            <div className="bg-purple-950/20 rounded-xl p-4 border border-purple-900/30 text-center mb-6">
              <div className="flex justify-center items-center gap-2 text-purple-300 font-bold text-lg mb-4"><Gem className="w-5 h-5" /> 보유 영혼석: {game.soulStones}</div>
              <button onClick={actions.handleRebirth} className="w-full py-3 bg-purple-800 hover:bg-purple-700 text-white font-bold rounded-xl text-sm">✨ 환생하기 (Lv.20+)</button>
            </div>
            <h4 className="text-xs font-bold text-zinc-500 mb-2 uppercase">고대 유물 강화</h4>
            <div className="space-y-2">
              {Object.entries(RELICS_CONFIG).map(([id, config]) => {
                const currentLevel = game.relics[id]; const cost = ((config.costBase * Math.pow(config.costMult, currentLevel)) || 1);
                const RelicIcon = config.icon;
                return (
                  <div key={id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <RelicIcon className="w-4 h-4 text-blue-400" />
                      <div>
                        <div className="text-xs font-bold text-gray-200">{config.name} <span className="text-blue-400">Lv.{currentLevel}</span></div>
                        <div className="text-[9px] text-zinc-500">{config.desc}</div>
                      </div>
                    </div>
                    <button onClick={() => actions.buyRelic(id)} disabled={game.soulStones < cost || currentLevel >= config.max} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-blue-300 rounded-lg text-[10px] font-bold disabled:opacity-30">{currentLevel >= config.max ? 'MAX' : `${cost}석`}</button>
                  </div>
                );
              })}
            </div>
          </ModalWrapper>
        );

      case 'feedback':
        return (
          <ModalWrapper title="개발자에게 피드백" icon={MessageSquare} colorClass="text-emerald-400" onClose={() => actions.setActiveModal(null)}>
            {pvp.isOfflineMode ? (
              <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 p-4 rounded-xl text-sm text-center mb-4"><ZapOff className="w-6 h-6 mx-auto mb-2 opacity-80" />현재 오프라인 모드입니다.</div>
            ) : (
              <>
                <textarea value={ui.feedbackDraft} onChange={(e) => actions.setFeedbackDraft(e.target.value)} placeholder="버그/개선점/밸런스/감상 등 자유롭게 남겨주세요 (400자)" maxLength={400} className="w-full h-24 bg-black border border-zinc-700 rounded-2xl px-4 py-3 text-sm outline-none focus:border-emerald-500 resize-none" />
                <div className="flex justify-between items-center mt-2 mb-4">
                  <span className="text-[10px] text-zinc-500">{String(ui.feedbackDraft || '').length}/400</span>
                  <button onClick={actions.postFeedback} disabled={ui.isPostingFeedback || !String(ui.feedbackDraft || '').trim()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-black text-sm disabled:opacity-40 flex items-center gap-2">{ui.isPostingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 등록</button>
                </div>
                <div className="text-[10px] font-black text-zinc-500 uppercase mb-2">최근 피드백</div>
                <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
                  {ui.feedbackItems.length === 0 ? <div className="text-center text-zinc-500 text-sm py-6">아직 글이 없습니다.</div> : ui.feedbackItems.map((it) => (
                    <div key={it.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2"><div className="text-xs font-black text-zinc-300">{String(it.name || 'Anonymous')}</div><div className="text-[10px] text-zinc-600 font-mono">{it.clientAt ? new Date(Number(it.clientAt)).toLocaleString() : ''}</div></div>
                      <div className="text-xs text-zinc-300 whitespace-pre-wrap break-words">{String(it.text || '')}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </ModalWrapper>
        );

      case 'idle_rewards':
        return (
          <ModalWrapper title="방치 보상" icon={Sparkles} colorClass="text-yellow-400" onClose={() => actions.setActiveModal(null)}>
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-4">
              <div className="flex justify-between text-sm font-bold"><span className="text-zinc-400">누적 시간</span><span className="text-zinc-200 font-mono">{Number(ui.idleRewardSummary?.minutes || 0).toLocaleString()}분</span></div>
              {ui.idleRewardSummary?.capped && <div className="text-[11px] text-zinc-600 mt-2">최대 {Math.floor(IDLE_REWARD_MAX_MS / 3_600_000)}시간까지만 보상이 계산됩니다.</div>}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="bg-black/40 border border-zinc-800 rounded-2xl p-3 text-center"><Coins className="w-4 h-4 text-yellow-500 mx-auto mb-1" /><div className="text-[10px] text-zinc-500 font-black">GOLD</div><div className="text-sm font-black font-mono text-zinc-200">+{Number(ui.idleRewardSummary?.gold || 0).toLocaleString()}</div></div>
              <div className="bg-black/40 border border-zinc-800 rounded-2xl p-3 text-center"><Gem className="w-4 h-4 text-cyan-400 mx-auto mb-1" /><div className="text-[10px] text-zinc-500 font-black">STONES</div><div className="text-sm font-black font-mono text-zinc-200">+{Number(ui.idleRewardSummary?.stones || 0).toLocaleString()}</div></div>
              <div className="bg-black/40 border border-zinc-800 rounded-2xl p-3 text-center"><TrendingUp className="w-4 h-4 text-green-400 mx-auto mb-1" /><div className="text-[10px] text-zinc-500 font-black">EXP</div><div className="text-sm font-black font-mono text-zinc-200">+{Number(ui.idleRewardSummary?.exp || 0).toLocaleString()}</div></div>
            </div>
            <button onClick={() => actions.setActiveModal(null)} className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black">확인</button>
          </ModalWrapper>
        );

      case 'card_selection':
        return (
          <ModalWrapper title="특별 성장 선택" icon={Sparkles} colorClass="text-yellow-400" onClose={() => {}}>
            <p className="text-xs text-zinc-500 mb-6 font-bold uppercase tracking-widest text-center">보스 돌파 기념 희귀 정수를 선택하세요</p>
            <div className="space-y-3">
              {(combat.pendingCards || []).map((card, i) => (
                <button
                  key={i}
                  onClick={() => actions.handleChooseRunBuff(card)}
                  className={`w-full group relative p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-left transition-all hover:bg-zinc-800 hover:border-zinc-500 active:scale-95 overflow-hidden`}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`p-3 rounded-xl bg-black/50 ${card.color} shadow-lg group-hover:scale-110 transition-transform`}>
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-white">{card.name}</div>
                      <div className="text-[10px] font-bold text-zinc-500 mt-0.5">{card.desc}</div>
                    </div>
                  </div>
                  {/* Decorative Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${card.color.includes('red') ? 'from-red-500/5' : card.color.includes('blue') ? 'from-blue-500/5' : 'from-yellow-500/5'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                </button>
              ))}
            </div>
          </ModalWrapper>
        );

      case 'pvp':
        return (
          <ModalWrapper title="통합 투기장" icon={Swords} colorClass="text-red-500" onClose={() => actions.setActiveModal(null)}>
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between text-sm font-bold"><span className="text-zinc-300">내 랭킹 점수</span><span className="text-red-300 font-mono">{Number(game.statistics.arenaPoints || 0).toLocaleString()} AP</span></div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1"><span>전적 · 순위</span><span className="font-mono">{Number(game.statistics.pvpWins || 0)}승 / {Number(game.statistics.pvpLosses || 0)}패{pvp.user ? ` · #${Math.max(1, pvp.rankings.findIndex(r => r?.uid === pvp.user.uid) + 1)}위` : ''}</span></div>
              <button onClick={actions.quickMatch} disabled={ui.isAnimating} className="w-full mt-3 py-3 bg-red-950/60 hover:bg-red-900 rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50">{ui.isAnimating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />} 빠른 대전 매칭</button>
            </div>
                <div className="flex bg-black/40 p-1 rounded-xl mb-4 border border-zinc-800">
              <button onClick={() => setPvpTab(0)} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${pvpTab === 0 ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>순위표</button>
              <button onClick={() => setPvpTab(1)} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 ${pvpTab === 1 ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <History className="w-3 h-3" /> 전적 기록
              </button>
            </div>

            {pvpTab === 1 && (
              <div className="flex justify-end mb-3 px-1">
                <button 
                  onClick={() => actions.fetchPvpLogs(true)} 
                  disabled={pvp.isFetchingLogs}
                  className="text-[10px] font-black text-zinc-500 flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  {pvp.isFetchingLogs ? <Loader2 className="w-3 h-3 animate-spin" /> : <History className="w-3 h-3" />}
                  기록 새로고침
                </button>
              </div>
            )}

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar min-h-[200px]">
              {pvpTab === 0 ? (
                <>
                  {pvp.isOfflineMode ? <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 p-4 rounded-xl text-sm text-center">오프라인 모드입니다.</div> : pvp.rankings.map((rk, idx) => (
                    <div key={rk.uid} className={`flex items-center gap-4 p-3 rounded-xl border ${rk.uid === pvp.user?.uid ? 'bg-blue-900/20 border-blue-500/50' : 'bg-zinc-950 border-zinc-800'}`}>
                      <span className={`text-lg font-black w-6 text-center ${idx < 3 ? 'text-yellow-500' : 'text-zinc-600'}`}>{idx + 1}</span>
                      <div className="flex-1">
                        <div className="text-sm font-bold flex items-center gap-2">{String(rk.name)} <span className="text-[10px] text-zinc-500">Lv.{rk.level}</span></div>
                        <div className="text-[10px] text-zinc-400 font-mono">무기: +{rk.weaponLevel} CP: {(rk.combatPower || 0).toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-black text-red-300">{(rk.arenaPoints || 0).toLocaleString()} AP</div>
                        <button onClick={() => actions.setPvpOpponent(rk)} disabled={rk.uid === pvp.user?.uid} className="text-[10px] bg-red-950/50 text-red-400 border border-red-900/50 px-3 py-1 rounded-lg mt-1 font-bold hover:bg-red-900 disabled:opacity-0">대결</button>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {pvp.isFetchingLogs ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
                        <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">불러오는 중...</span>
                      </div>
                  ) : pvp.defenseLogs.length === 0 ? (
                    <div className="text-center text-zinc-600 text-sm py-20 italic">아직 전적 기록이 없습니다.</div>
                  ) : (
                    pvp.defenseLogs.map((log) => (
                      <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${log.isWin ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {log.type === 'attack' ? <Swords className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-bold text-zinc-200">
                            <span className="text-zinc-500 mr-1">{log.type === 'attack' ? 'Challenger' : 'Defender'}:</span>{log.oppName || 'Unknown'}
                            <span className={`ml-2 text-[9px] px-1.5 rounded ${log.isWin ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {log.isWin ? '승리' : '패배'}
                            </span>
                          </div>
                          <div className="text-[9px] text-zinc-500 mt-0.5 font-mono">
                            {new Date(log.at).toLocaleString()} {log.pointDelta !== undefined ? `(${log.pointDelta > 0 ? '+' : ''}${log.pointDelta} AP)` : ''}
                          </div>
                        </div>
                        {!log.isWin && (
                          <button 
                            onClick={() => {
                              const opp = pvp.rankings.find(r => r.uid === log.oppId) || { uid: log.oppId, name: log.oppName, combatPower: log.oppCombatPower };
                              actions.setPvpOpponent(opp);
                            }}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-black shadow-lg shadow-red-900/40"
                          >
                            복수
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
            <button onClick={actions.syncProfile} disabled={pvp.isSyncing || pvp.isOfflineMode} className="w-full mt-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 text-sm transition-all">{pvp.isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />} 동기화</button>
          </ModalWrapper>
        );

      case 'pvp_clash':
        return (
          <div className="fixed inset-0 bg-black/95 z-[60] p-6 flex flex-col items-center justify-center animate-in zoom-in">
            <div className="w-full max-w-sm text-center">
              <h2 className="text-4xl font-black mb-12 italic tracking-tighter text-red-600 animate-pulse">대결</h2>
              <div className="grid grid-cols-2 gap-8 mb-12 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-24 bg-zinc-800" />
                <div className="flex flex-col items-center"><div className="w-20 h-20 bg-zinc-900 rounded-full border border-blue-500 flex items-center justify-center mb-4"><User className="w-10 h-10 text-blue-400" /></div><span className="text-xs font-bold text-zinc-500 mb-1">당신</span><span className="text-lg font-black">{session.playerName}</span><span className="text-xl font-mono text-blue-400">{combat.myCombatPower.toLocaleString()}</span></div>
                <div className="flex flex-col items-center"><div className="w-20 h-20 bg-zinc-900 rounded-full border border-red-500 flex items-center justify-center mb-4"><Skull className="w-10 h-10 text-red-500" /></div><span className="text-xs font-bold text-zinc-500 mb-1">상대</span><span className="text-lg font-black">{pvp.pvpOpponent?.name}</span><span className="text-xl font-mono text-red-400">{(pvp.pvpOpponent?.combatPower || 0).toLocaleString()}</span></div>
              </div>
              {pvp.pvpResult ? (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                  <div className={`text-4xl font-black mb-4 ${pvp.pvpResult.isWin ? 'text-yellow-400' : 'text-zinc-600'}`}>{pvp.pvpResult.isWin ? '승리' : '패배'}</div>
                  <div className="text-sm font-black mb-8 text-zinc-300">
                    {pvp.pvpResult.pointDelta >= 0 ? `+${pvp.pvpResult.pointDelta}` : `${pvp.pvpResult.pointDelta}`} AP
                    {pvp.pvpResult.rewardGold > 0 ? ` / +${pvp.pvpResult.rewardGold}G` : ''}
                  </div>
                  <button onClick={() => actions.setActiveModal('pvp')} className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-black">투기장 복귀</button>
                </div>
              ) : (
                (() => {
                  const now = Date.now();
                  const cooldownMs = 10_000;
                  const nextPvpAt = (game.statistics.lastPvpAt || 0) + cooldownMs;
                  const remainSec = Math.ceil((nextPvpAt - now) / 1000);
                  const isCooldown = remainSec > 0;
                  
                  return (
                    <button 
                      onClick={actions.executePvp} 
                      disabled={ui.isAnimating || isCooldown} 
                      className={`w-full py-6 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all shadow-lg ${isCooldown ? 'bg-zinc-800 text-zinc-500 border border-zinc-700' : 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/40'}`}
                    >
                      {ui.isAnimating ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : isCooldown ? (
                        <><History className="w-6 h-6 animate-pulse" /> 대기 중 ({remainSec}s)</>
                      ) : (
                        <><Swords className="w-6 h-6" /> 전투 시작</>
                      )}
                    </button>
                  );
                })()
              )}
            </div>
            <button onClick={() => actions.setActiveModal('pvp')} className="absolute top-8 right-8 p-3 text-zinc-600 hover:text-white transition-colors"><X className="w-8 h-8" /></button>
          </div>
        );

      case 'quests':
      return (
        <ModalWrapper title="일일 퀘스트" icon={BookOpen} colorClass="text-cyan-400" onClose={() => actions.setActiveModal(null)}>
          <div className="text-[10px] text-zinc-500 mb-4 bg-zinc-950 p-2 rounded-lg border border-zinc-800 text-center">
            매일 오전 00:00에 퀘스트가 초기화됩니다.
          </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {(() => {
                const allDone = pvp.dailyQuests.length > 0 && pvp.dailyQuests.every(q => q.current >= q.goal);
                const allClaimed = pvp.dailyQuests.every(q => q.claimed);
                
                if (allDone) {
                  return (
                    <div className={`p-5 rounded-2xl border-2 mb-4 animate-in zoom-in duration-300 ${allClaimed ? 'bg-zinc-950 border-zinc-900 opacity-60' : 'bg-gradient-to-br from-yellow-900/40 via-amber-900/20 to-zinc-900 border-yellow-500/50 shadow-xl shadow-yellow-900/20'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl ${allClaimed ? 'bg-zinc-800' : 'bg-gradient-to-br from-yellow-400 to-amber-600 shadow-lg shadow-yellow-500/50'}`}>
                            <Sparkles className={`w-6 h-6 ${allClaimed ? 'text-zinc-500' : 'text-white'}`} />
                          </div>
                          <div>
                            <div className="text-sm font-black text-zinc-100">일일 퀘스트 올 클리어!</div>
                            <div className="text-[10px] text-yellow-500 font-bold">보상: {DAILY_QUEST_ALL_DONE_REWARD.amount.toLocaleString()}G + 강화석 {DAILY_QUEST_ALL_DONE_REWARD.stone}개</div>
                          </div>
                        </div>
                        {allClaimed ? (
                          <span className="text-xs font-black text-zinc-600">수령 완료</span>
                        ) : (
                          <button 
                            onClick={() => actions.claimDailyQuestReward('ALL')}
                            className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-lg animate-pulse"
                          >
                            최종 보상 받기
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              
              {pvp.dailyQuests.map(q => {
              const progress = q.current || 0;
              const isClaimed = q.claimed;
              const isDone = progress >= q.goal;
              const percent = Math.min(100, (progress / q.goal) * 100);
              const Icon = q.icon;

              return (
                <div key={q.id} className={`p-4 rounded-2xl border transition-all ${isClaimed ? 'bg-zinc-950 border-zinc-900 opacity-60' : isDone ? 'bg-cyan-950/20 border-cyan-500/50' : 'bg-zinc-900 border-zinc-800'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isDone ? 'bg-cyan-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-200">{q.name}</div>
                        <div className="text-[10px] text-zinc-500">보상: {q.reward.amount.toLocaleString()}{q.reward.type === 'gold' ? 'G' : ' 강화석'}</div>
                      </div>
                    </div>
                    {isClaimed ? (
                      <span className="text-[10px] font-black text-zinc-600">수령 완료</span>
                    ) : isDone ? (
                      <button onClick={() => actions.claimDailyQuestReward(q.id)} className="bg-cyan-500 hover:bg-cyan-400 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg shadow-cyan-900/40 animate-bounce">보상 받기</button>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-400">{progress} / {q.goal}</span>
                    )}
                  </div>
                  <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${isDone ? 'bg-cyan-500' : 'bg-zinc-700'}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ModalWrapper>
      );
      case 'menu':
        return (
          <ModalWrapper title="전체 메뉴" icon={LayoutGrid} colorClass="text-zinc-400" onClose={() => actions.setActiveModal(null)}>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => actions.setActiveModal('achievements')}
                className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-2xl flex flex-col items-center gap-2 hover:bg-zinc-800 transition-all relative outline-none"
              >
                <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-500"><Trophy className="w-6 h-6" /></div>
                <span className="text-xs font-black">업적</span>
                <span className="text-[9px] text-zinc-500 font-bold">보상 및 명예</span>
                {game.hasNewAchievements && <div className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full animate-bounce" />}
              </button>

              <button 
                onClick={() => actions.setActiveModal('rebirth')}
                className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-2xl flex flex-col items-center gap-2 hover:bg-zinc-800 transition-all outline-none"
              >
                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400"><InfinityIcon className="w-6 h-6" /></div>
                <span className="text-xs font-black">환생</span>
                <span className="text-[9px] text-zinc-500 font-bold">한계 돌파</span>
              </button>

              <button 
                onClick={() => actions.setActiveModal('security')}
                className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col items-center gap-2 hover:bg-zinc-800 transition-all outline-none"
              >
                <div className="p-3 bg-zinc-700/10 rounded-xl text-zinc-400"><Settings className="w-6 h-6" /></div>
                <span className="text-xs font-black">보안 설정</span>
                <span className="text-[9px] text-zinc-500 font-bold">PIN 및 계정</span>
              </button>

              <button 
                onClick={() => actions.setActiveModal('feedback')}
                className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col items-center gap-2 hover:bg-zinc-800 transition-all outline-none"
              >
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400"><MessageSquare className="w-6 h-6" /></div>
                <span className="text-xs font-black">피드백</span>
                <span className="text-[9px] text-zinc-500 font-bold">건의 및 문의</span>
              </button>
            </div>
            <div className="mt-4 p-3 bg-black/30 rounded-xl border border-zinc-800 flex items-center justify-between text-[10px] text-zinc-600">
              <span className="font-bold uppercase tracking-widest text-cyan-400/80">System v1.2.4</span>
              <span className="font-mono italic opacity-50">dev. Jinyoung-King</span>
            </div>
          </ModalWrapper>
        );

    default: return null;
    }
  };

  return (
    <>
      {renderActiveModal()}
      {confirmModal?.open && (
        <div className="fixed inset-0 bg-black/90 z-[100] p-6 flex items-center justify-center animate-in fade-in zoom-in duration-200">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse" />
            </div>
            <h2 className="text-xl font-black text-center text-white mb-2">{confirmModal.title}</h2>
            <p className="text-sm text-zinc-400 text-center mb-8 leading-relaxed px-2">
              {confirmModal.message}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={actions.closeConfirmModal} className="py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black rounded-2xl transition-all">취소</button>
              <button onClick={confirmModal.onConfirm} className="py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl shadow-lg shadow-red-900/40 transition-all">확인</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
