import React, { useState, useEffect } from 'react';
import { Swords, History, Loader2, Shield, Skull, ShieldAlert, TrendingUp, Coins, Gem } from 'lucide-react';

export function ArenaView({ state, actions }) {
  const { game, ui, pvp } = state;
  const [pvpTab, setPvpTab] = useState(0); // 0: Rankings, 1: Defense Logs

  useEffect(() => {
    if (pvpTab === 1) {
      actions.fetchPvpLogs();
    }
  }, [pvpTab]);

  return (
    <div className="w-full max-w-md flex flex-col items-center animate-in fade-in slide-in-from-right-4 duration-500 pb-24 px-4 mt-2">
      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-4 shadow-xl">
        <h2 className="text-xl font-black mb-1 flex items-center gap-2 text-red-500">
          <Swords className="w-5 h-5" /> 통합 투기장
        </h2>
        <p className="text-xs text-zinc-500 mb-6 font-bold uppercase tracking-widest text-left">Arena Rankings & Logs</p>

        <div className="flex items-center justify-between text-sm font-bold mb-2">
          <span className="text-zinc-400">내 랭킹 점수</span>
          <span className="text-red-400 font-mono text-lg">{Number(game.statistics.arenaPoints || 0).toLocaleString()} AP</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-zinc-500 pb-4 border-b border-zinc-800/50 mb-4">
          <span>전적 · 순위</span>
          <span className="font-mono">{Number(game.statistics.pvpWins || 0)}승 / {Number(game.statistics.pvpLosses || 0)}패{pvp.user ? ` · #${Math.max(1, pvp.rankings.findIndex(r => r?.uid === pvp.user.uid) + 1)}위` : ''}</span>
        </div>
        
        <button 
          onClick={actions.quickMatch} 
          disabled={ui.isAnimating} 
          className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 active:scale-95 transition-all disabled:opacity-50"
        >
          {ui.isAnimating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Swords className="w-5 h-5" />} 빠른 대전 매칭
        </button>
      </div>

      <div className="w-full flex bg-zinc-900/50 p-1.5 rounded-2xl mb-4 border border-zinc-800/50">
        <button onClick={() => setPvpTab(0)} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${pvpTab === 0 ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>실시간 순위표</button>
        <button onClick={() => setPvpTab(1)} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${pvpTab === 1 ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <History className="w-3.5 h-3.5" /> 전적 기록
        </button>
      </div>

      {pvpTab === 1 && (
        <div className="w-full flex justify-end mb-3 px-1">
          <button 
            onClick={() => actions.fetchPvpLogs(true)} 
            disabled={pvp.isFetchingLogs}
            className="text-[10px] font-bold text-zinc-500 flex items-center gap-1.5 hover:text-white transition-colors"
          >
            {pvp.isFetchingLogs ? <Loader2 className="w-3 h-3 animate-spin" /> : <History className="w-3 h-3" />}
            기록 새로고침
          </button>
        </div>
      )}

      <div className="w-full space-y-2 overflow-y-auto max-h-[45vh] custom-scrollbar pr-1">
        {pvpTab === 0 ? (
          <>
            {pvp.isOfflineMode ? (
              <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 p-6 rounded-2xl text-sm text-center flex flex-col items-center gap-2">
                <ShieldAlert className="w-6 h-6" />
                오프라인 모드에서는 순위표를 볼 수 없습니다.
              </div>
            ) : pvp.rankings.length === 0 ? (
                <div className="text-center text-zinc-600 text-sm py-20 italic bg-zinc-950/50 rounded-2xl border border-zinc-900">랭킹 정보를 불러오는 중...</div>
            ) : pvp.rankings.map((rk, idx) => (
              <div key={rk.uid} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${rk.uid === pvp.user?.uid ? 'bg-blue-900/20 border-blue-500/50 shadow-lg shadow-blue-900/20' : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'}`}>
                <span className={`text-xl font-black w-8 text-center ${idx < 3 ? 'text-yellow-500' : 'text-zinc-600'}`}>{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold flex items-center gap-2 truncate text-zinc-100">{String(rk.name)} <span className="text-[10px] text-zinc-500 font-mono">Lv.{rk.level}</span></div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate uppercase tracking-tighter">CP: {(rk.combatPower || 0).toLocaleString()}</div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <div className="text-[11px] font-black text-red-400 font-mono">{(rk.arenaPoints || 0).toLocaleString()} AP</div>
                  <button onClick={() => actions.setPvpOpponent(rk)} disabled={rk.uid === pvp.user?.uid} className="text-[10px] bg-red-950/50 text-red-500 border border-red-900/50 px-3 py-1.5 rounded-lg mt-1 font-bold hover:bg-red-800 transition-colors disabled:opacity-0 active:scale-95">결투</button>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            {pvp.isFetchingLogs ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 bg-zinc-950/50 rounded-2xl border border-zinc-900">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-700" />
                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">기록 불러오는 중...</span>
              </div>
            ) : pvp.defenseLogs.length === 0 ? (
              <div className="text-center text-zinc-600 text-sm py-20 italic bg-zinc-950/50 rounded-2xl border border-zinc-900">아직 전적 기록이 없습니다.</div>
            ) : (
              pvp.defenseLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${log.isWin ? 'bg-green-500/10 text-green-500 border border-green-500/20 shadow-lg shadow-green-900/10' : 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-lg shadow-red-900/10'}`}>
                    {log.type === 'attack' ? <Swords className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-zinc-200 truncate">
                      <span className="text-zinc-500 mr-2 text-[10px] uppercase font-black tracking-widest">{log.type === 'attack' ? 'Challenger' : 'Defender'}:</span>{log.oppName || 'Unknown'}
                      <span className={`ml-2 text-[9px] px-1.5 rounded ${log.isWin ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {log.isWin ? '승리' : '패배'}
                      </span>
                    </div>
                    <div className="text-[9px] text-zinc-600 mt-1 font-mono uppercase tracking-widest">
                      {new Date(log.at).toLocaleString()} {log.pointDelta !== undefined ? `(${log.pointDelta > 0 ? '+' : ''}${log.pointDelta} AP)` : ''}
                    </div>
                  </div>
                  {!log.isWin && (
                    <button 
                      onClick={() => {
                        const opp = pvp.rankings.find(r => r.uid === log.oppId) || { uid: log.oppId, name: log.oppName, combatPower: log.oppCombatPower };
                        actions.setPvpOpponent(opp);
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black shadow-lg shadow-red-900/40 active:scale-95 transition-all text-center"
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
    </div>
  );
}
