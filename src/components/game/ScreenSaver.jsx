import React from 'react';
import { Shield, Loader2, CheckCircle2 } from 'lucide-react';

export function ScreenSaver({ ui, actions }) {
  const { isScreenSaver, screenSaverLocked, unlockPrompt } = ui;
  if (!isScreenSaver) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black flex items-center justify-center" onMouseDown={actions.wakeScreenSaver} onTouchStart={actions.wakeScreenSaver}>
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.25),rgba(0,0,0,0)_60%)]" />
      <div className="relative w-full max-w-sm text-center p-8">
        <div className="text-xs font-black text-zinc-600 uppercase tracking-widest mb-4">화면 보호기</div>
        <div className="text-5xl font-black text-zinc-200 mb-2 font-mono">{new Date().toLocaleTimeString([], { hour12: false })}</div>
        <div className="text-xs text-zinc-600 mb-8">{new Date().toLocaleDateString()}</div>
        {!screenSaverLocked && <div className="text-xs font-bold text-zinc-500">클릭하거나 터치하여 복귀</div>}

        {screenSaverLocked && (
          <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-left" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2"><Shield className="w-5 h-5 text-blue-500" /><div className="font-black">PIN 잠금</div></div>
            <input
              type="password"
              inputMode="numeric"
              placeholder="PIN (4~12자리 숫자)"
              value={unlockPrompt.pin}
              onChange={(e) => actions.setUnlockPin(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') actions.confirmUnlock(); }}
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-center text-lg font-black tracking-widest focus:border-blue-500 outline-none"
            />
            {unlockPrompt.error && <div className="mt-3 text-xs text-red-400 font-bold">{unlockPrompt.error}</div>}
            <button onClick={actions.confirmUnlock} disabled={unlockPrompt.busy} className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-black disabled:opacity-50 flex items-center justify-center gap-2">
              {unlockPrompt.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} 해제
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
