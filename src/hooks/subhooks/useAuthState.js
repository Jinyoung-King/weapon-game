import { useState } from 'react';

export function useAuthState() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [introVotes, setIntroVotes] = useState([]);
  const [pendingLogin, setPendingLogin] = useState(null);
  const [pinPrompt, setPinPrompt] = useState({ open: false, pin: '', error: '', busy: false });
  const [pinSettings, setPinSettings] = useState({ current: '', next: '', confirm: '', error: '', busy: false });
  const [unlockPrompt, setUnlockPrompt] = useState({ open: false, pin: '', error: '', busy: false });
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });

  return {
    state: { isLoggingIn, questionIndex, introVotes, pendingLogin, pinPrompt, pinSettings, unlockPrompt, confirmModal },
    setters: { setIsLoggingIn, setQuestionIndex, setIntroVotes, setPendingLogin, setPinPrompt, setPinSettings, setUnlockPrompt, setConfirmModal }
  };
}
