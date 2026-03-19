import React from 'react';
import { BrainCircuit, ZapOff, Shield, X, Loader2, CheckCircle2 } from 'lucide-react';

export function LoginView({ session, pvp, actions }) {
  const { isOfflineMode } = pvp;
  const { pendingLogin, pinPrompt, hasLocalPin } = session;

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-sans relative">
      {isOfflineMode && (
        <div className="absolute top-4 w-full max-w-md bg-yellow-500/20 border border-yellow-500 text-yellow-500 p-3 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-2">
          <ZapOff className="w-4 h-4" /> 오프라인 모드: 클라우드 연동 불가
        </div>
      )}
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl animate-in zoom-in">
        <BrainCircuit className="w-16 h-16 text-blue-500 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-center mb-2">모험의 서</h1>
        <p className="text-zinc-500 text-center text-sm mb-8">기존 플레이어는 동일한 이름을 입력하여 데이터를 불러오세요.</p>
        <input
          type="text" placeholder="이름 입력 (최대 10자)" maxLength={10}
          onKeyDown={(e) => { if (e.key === 'Enter') actions.handleLogin(e.target.value); }}
          className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-4 text-center text-xl font-bold focus:border-blue-500 outline-none mb-4"
        />
        <p className="text-xs text-zinc-600 text-center">입력 후 Enter 키를 누르세요.</p>
      </div>

      {pinPrompt.open && (
        <div className="fixed inset-0 bg-black/90 z-[60] p-6 flex items-center justify-center animate-in fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative" onClick={e => e.stopPropagation()}>
            <button onClick={actions.closePinPrompt} className="absolute top-4 right-4 text-zinc-500"><X /></button>
            <h2 className="text-xl font-black mb-2 flex items-center gap-2"><Shield className="w-5 h-5 text-blue-500" /> PIN 확인</h2>
            <p className="text-xs text-zinc-500 mb-4">프로필: <span className="text-zinc-300 font-bold">{pendingLogin?.name}</span></p>
            <input
              type="password"
              inputMode="numeric"
              placeholder="PIN (4~12자리 숫자)"
              value={pinPrompt.pin}
              onChange={(e) => actions.setPinPromptValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') actions.confirmPinLogin(); }}
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-center text-lg font-black tracking-widest focus:border-blue-500 outline-none"
            />
            {pinPrompt.error && <div className="mt-3 text-xs text-red-400 font-bold">{pinPrompt.error}</div>}
            <button onClick={actions.confirmPinLogin} disabled={pinPrompt.busy} className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-black disabled:opacity-50 flex items-center justify-center gap-2">
              {pinPrompt.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} 확인
            </button>
            <button onClick={actions.resetProfileWithoutPin} disabled={pinPrompt.busy} className="w-full mt-2 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold text-xs disabled:opacity-50">
              PIN 분실? 새로 시작(데이터 삭제)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
