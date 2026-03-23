import { useCallback } from 'react';
import { 
  auth, db, appId 
} from '../../config/firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { hashPin, verifyPin } from '../../utils/cryptoUtils';
import { getStoredPinRecord, getPinKey } from '../../utils/gameUtils';
import { PBKDF2_ITERATIONS } from '../../config/constants';

export function useAuthHandlers({ state, setters, utils }) {
  const { auth: authState, ui } = state;
  const { setAppState, setPlayerName, addLog, loadGameFromSave } = utils;
  const { setIsLoggingIn, setQuestionIndex, setIntroVotes, setPendingLogin, setPinPrompt, setPinSettings } = setters.auth;
  const { setUser } = setters.pvp; // pvp is social.setters in bundle

  const handleLogin = async (name) => {
    const trimmed = name.trim();
    if (!trimmed || authState.isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const { user } = await signInAnonymously(auth);
      setUser(user);
      
      const profileRef = doc(db, 'artifacts', appId, 'public', 'data', 'profiles', trimmed);
      const snap = await getDoc(profileRef);
      
      if (snap.exists()) {
        const data = snap.data();
        const storedPinRecord = getStoredPinRecord(trimmed);
        if (storedPinRecord) {
          setPendingLogin({ name: trimmed, user, state: data.state });
          setPinPrompt({ open: true, pin: '', error: '', busy: false });
        } else {
          loadGameFromSave(data.state);
          setPlayerName(trimmed);
          setAppState('playing');
          addLog(`[로그인] 환영합니다, ${trimmed}님!`, 'success');
        }
      } else {
        setPlayerName(trimmed);
        setAppState('intro');
      }
    } catch (err) {
      console.error('Login Error:', err);
      addLog('로그인 실패: ' + err.message, 'danger');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const setPinPromptValue = (v) => setPinPrompt(prev => ({ ...prev, pin: v }));
  
  const closePinPrompt = () => {
    setPinPrompt({ open: false, pin: '', error: '', busy: false });
    setPendingLogin(null);
  };

  const confirmPinLogin = async () => {
    const { pinPrompt, pendingLogin } = authState;
    if (!pendingLogin) return;
    
    setPinPrompt(prev => ({ ...prev, busy: true, error: '' }));
    try {
      const record = getStoredPinRecord(pendingLogin.name);
      const ok = await verifyPin(pinPrompt.pin, record, PBKDF2_ITERATIONS);
      if (ok) {
        loadGameFromSave(pendingLogin.state);
        setPlayerName(pendingLogin.name);
        setAppState('playing');
        closePinPrompt();
        addLog(`[PIN] 인증 성공! 환영합니다.`, 'success');
      } else {
        setPinPrompt(prev => ({ ...prev, pin: '', error: 'PIN이 일치하지 않습니다.' }));
      }
    } catch (err) {
      setPinPrompt(prev => ({ ...prev, error: '인증 중 오류 발생' }));
    } finally {
      setPinPrompt(prev => ({ ...prev, busy: false }));
    }
  };

  const resetProfileWithoutPin = () => {
    const { pendingLogin } = authState;
    if (!pendingLogin) return;
    
    // Clear local PIN
    localStorage.removeItem(getPinKey(pendingLogin.name));
    setPlayerName(pendingLogin.name);
    setAppState('intro');
    closePinPrompt();
    addLog(`[PIN] 로컬 데이터를 초기화하고 새로 시작합니다.`, 'warning');
  };

  const saveNewPin = async () => {
    const { next, confirm, busy } = authState.pinSettings;
    if (busy || !next || next !== confirm) return setPinSettings(p => ({ ...p, error: 'PIN이 일치하지 않거나 비어 있습니다.' }));
    
    setPinSettings(p => ({ ...p, busy: true, error: '' }));
    try {
      const record = await hashPin(next, null, PBKDF2_ITERATIONS);
      localStorage.setItem(getPinKey(ui.playerName), JSON.stringify(record));
      setPinSettings(p => ({ ...p, current: '', next: '', confirm: '' }));
      addLog('[보안] 새로운 PIN이 설정되었습니다.', 'success');
    } catch (err) {
      setPinSettings(p => ({ ...p, error: '설정 실패' }));
    } finally {
      setPinSettings(p => ({ ...p, busy: false }));
    }
  };

  const changePin = async () => {
    const { current, next, confirm, busy } = authState.pinSettings;
    if (busy) return;
    
    const stored = getStoredPinRecord(ui.playerName);
    if (!stored) return saveNewPin();

    setPinSettings(p => ({ ...p, busy: true, error: '' }));
    try {
      const ok = await verifyPin(current, stored, PBKDF2_ITERATIONS);
      if (!ok) throw new Error('현재 PIN이 틀립니다.');
      if (!next || next !== confirm) throw new Error('새 PIN이 일치하지 않습니다.');
      
      const record = await hashPin(next, null, PBKDF2_ITERATIONS);
      localStorage.setItem(getPinKey(ui.playerName), JSON.stringify(record));
      setPinSettings(p => ({ ...p, current: '', next: '', confirm: '' }));
      addLog('[보안] PIN이 변경되었습니다.', 'success');
    } catch (err) {
      setPinSettings(p => ({ ...p, error: err.message }));
    } finally {
      setPinSettings(p => ({ ...p, busy: false }));
    }
  };

  const removePin = async () => {
    const { current, busy } = authState.pinSettings;
    if (busy) return;
    
    setPinSettings(p => ({ ...p, busy: true, error: '' }));
    try {
      const stored = getStoredPinRecord(ui.playerName);
      if (stored) {
        const ok = await verifyPin(current, stored, PBKDF2_ITERATIONS);
        if (!ok) throw new Error('현재 PIN이 틀립니다.');
      }
      localStorage.removeItem(getPinKey(ui.playerName));
      setPinSettings(p => ({ ...p, current: '', next: '', confirm: '' }));
      addLog('[보안] PIN이 해제되었습니다.', 'info');
    } catch (err) {
      setPinSettings(p => ({ ...p, error: err.message }));
    } finally {
      setPinSettings(p => ({ ...p, busy: false }));
    }
  };

  const closeConfirmModal = () => setters.auth.setConfirmModal({ open: false, title: '', message: '', onConfirm: null });

  const updatePinSettings = (updates) => setPinSettings(prev => ({ ...prev, ...updates }));

  const handleLogout = () => {
    setAppState('login');
    setPlayerName('');
    setUser(null);
    addLog('[시스템] 로그아웃 되었습니다.', 'info');
  };

  const handleIntroSelection = (selectionId) => {
    setIntroVotes(prev => [...prev, selectionId]);
    setQuestionIndex(q => q + 1);
  };

  return { 
    handleLogin, 
    handleIntroSelection, 
    setPinPromptValue, 
    closePinPrompt, 
    confirmPinLogin, 
    resetProfileWithoutPin,
    saveNewPin,
    changePin,
    removePin,
    closeConfirmModal,
    updatePinSettings,
    handleLogout
  };
}
