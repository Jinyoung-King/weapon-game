import React from 'react';

export function TraitResultView({ game, actions }) {
  const { traits } = game;

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 animate-in fade-in">
        <h1 className="text-xl font-black mb-2 text-center text-blue-400">특성 부여 완료</h1>
        <p className="text-zinc-500 text-center text-sm mb-6">당신에게 부여된 특성(상위 2개)입니다.</p>

        <div className="space-y-3 mb-6">
          {traits.length === 0 ? (
            <div className="text-center text-zinc-500 text-sm py-6">특성을 결정하지 못했습니다.</div>
          ) : (
            traits.map(t => (
              <div key={t.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <div className={`text-sm font-black ${t.color}`}>{t.name}</div>
                <div className="text-[11px] text-zinc-500 mt-1">{t.desc}</div>
              </div>
            ))
          )}
        </div>

        <button onClick={() => { actions.setAppState('playing'); actions.addLog('특성이 결정되었습니다. 모험을 시작합니다.', 'success'); }} className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black">
          게임 시작
        </button>
        <button onClick={actions.resetIntro} className="w-full mt-2 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-bold text-xs">
          다시 선택
        </button>
      </div>
    </div>
  );
}
