import React from 'react';
import { Book, CheckCircle2, Circle, Shield, Sword, Lock, Sparkles, Star } from 'lucide-react';
import { APPRAISAL_GRADES } from '../../../config/constants';

const ARCHIVE_DATA = {
  weapon: { name: '무기 도감', icon: Sword, pre: ["전설의", "불타는", "얼어붙은", "심연의", "고결한"], suf: ["검", "대검", "도끼", "망치", "창"] },
  armor: { name: '방어구 도감', icon: Shield, pre: ["불굴의", "철갑의", "은빛", "용의"], suf: ["갑옷", "흉갑", "가죽옷"] },
  ring: { name: '반지 도감', icon: Circle, pre: ["지혜의", "탐욕의", "행운의", "영생의"], suf: ["반지", "고리", "인장"] }
};

export function ArchiveView({ state }) {
  const { game } = state;

  return (
    <div className="w-full max-w-md flex flex-col gap-6 items-center animate-in fade-in slide-in-from-right-4 duration-500 pb-32 px-4 mt-2">
      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <h2 className="text-xl font-black mb-1 flex items-center gap-2 text-emerald-500">
          <Book className="w-5 h-5" /> 장비 도감
        </h2>
        <p className="text-xs text-zinc-500 mb-6 font-bold uppercase tracking-widest text-left">Ancient Equipment Archive</p>
        
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-8">
          {Object.entries(ARCHIVE_DATA).map(([key, data]) => {
            const Icon = data.icon;
            return (
              <div key={key} className="space-y-4">
                <div className="flex items-center gap-3 border-b border-zinc-800 pb-2">
                  <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400"><Icon className="w-4 h-4" /></div>
                  <h3 className="text-sm font-black text-zinc-200">{data.name}</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                   {data.pre.map(p => (
                     <div key={p} className="bg-zinc-950 border border-zinc-800/50 rounded-xl p-3 flex flex-col items-center justify-center group hover:border-zinc-700 transition-colors">
                        <span className="text-[10px] text-zinc-500 font-bold mb-1 uppercase tracking-tighter opacity-60">접두사</span>
                        <div className="text-xs font-black text-zinc-300 group-hover:text-blue-400 transition-colors">{p}</div>
                     </div>
                   ))}
                </div>
              </div>
            );
          })}
          
          <div className="space-y-4 pt-4">
             <div className="flex items-center gap-3 border-b border-zinc-800 pb-2">
                <div className="p-2 bg-zinc-800 rounded-lg text-yellow-500"><Star className="w-4 h-4 fill-yellow-500" /></div>
                <h3 className="text-sm font-black text-zinc-200">희귀 등격 컬렉션</h3>
             </div>
             
             <div className="grid grid-cols-5 gap-2">
                {APPRAISAL_GRADES.map(g => (
                   <div key={g.id} className={`flex flex-col items-center gap-2 p-3 rounded-2xl border ${g.color} bg-black/40 border-zinc-800/50`}>
                      <div className={`w-8 h-8 rounded-full border border-current flex items-center justify-center shadow-lg ${g.color.replace('text-', 'shadow-')}/20 shadow-xl opacity-60`}>
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-black">{g.name}</span>
                   </div>
                ))}
             </div>
          </div>
        </div>
      </div>
      
      <div className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center gap-4 text-xs font-bold text-zinc-400">
        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><Lock className="w-4 h-4" /></div>
        접두사별 특수 효과 도감은 추후 업데이트 예정입니다.
      </div>
    </div>
  );
}
