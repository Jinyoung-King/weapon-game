/* eslint-disable no-unused-vars */
import React from 'react';
import { Loader2 } from 'lucide-react';
import { LoginView } from './game/LoginView';
import { IntroView } from './game/IntroView';
import { TraitResultView } from './game/TraitResultView';
import { Header } from './game/Header';
import { CombatPanel } from './game/CombatPanel';
import { EquipmentPanel } from './game/EquipmentPanel';
import { ActionButtons } from './game/ActionButtons';
import { ModalManager } from './game/ModalManager';
import { ScreenSaver } from './game/ScreenSaver';

export function AppView({ state, actions }) {
  const { session, game, combat, pvp, ui } = state;

  if (session.appState === 'bootstrapping') {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center font-sans">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" aria-label="불러오는 중" />
      </div>
    );
  }

  if (session.appState === 'login') {
    return <LoginView session={session} pvp={pvp} actions={actions} />;
  }

  if (session.appState === 'intro') {
    return <IntroView session={session} actions={actions} />;
  }

  if (session.appState === 'trait_result') {
    return <TraitResultView game={game} actions={actions} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 flex flex-col items-center select-none overflow-x-hidden relative">
      <Header session={session} game={game} pvp={pvp} ui={ui} actions={actions} />
      <CombatPanel combat={combat} actions={actions} />
      <EquipmentPanel game={game} ui={ui} combat={combat} actions={actions} />
      <ActionButtons game={game} ui={ui} combat={combat} actions={actions} />
      <ModalManager session={session} game={game} combat={combat} pvp={pvp} ui={ui} actions={actions} />
      <ScreenSaver ui={ui} actions={actions} />
    </div>
  );
}
