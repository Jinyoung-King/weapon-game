import React from 'react';
import { Shield } from 'lucide-react';
import { PERSONALITY_QUESTIONS, TRAITS } from '../../config/constants';

export function IntroView({ session, actions }) {
  const { questionIndex, introVotes } = session;
  const q = PERSONALITY_QUESTIONS[questionIndex];

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 animate-in fade-in">
        <h1 className="text-xl font-bold mb-6 text-center text-blue-400">당신의 본질을 묻습니다</h1>
        <p className="text-zinc-300 mb-8 min-h-[3rem] text-center leading-relaxed">{q.text}</p>
        <div className="space-y-3">
          {q.answers.map((ans, idx) => (
            <button key={idx} onClick={() => actions.nextIntroQuestion([...introVotes, ans.trait])}
              className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm border border-zinc-700 transition-all text-left flex justify-between"
            >
              {ans.text} <Shield className={`w-4 h-4 ${ans.trait.color}`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
