import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useUser } from '@/lib/useUser';
import { useTheme } from '@/lib/ThemeContext';
import { ArrowLeft, Send, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// ─── Number Game Logic ─────────────────────────────────────────────
function pickGiftDigits(phone) {
  // Give 4 random digit positions as gifts
  const positions = [];
  while (positions.length < 4) {
    const idx = Math.floor(Math.random() * phone.length);
    if (!positions.includes(idx)) positions.push(idx);
  }
  return positions.sort((a, b) => a - b).map(idx => ({ index: idx, digit: phone[idx] }));
}

function scoreGuess(guess, secret) {
  // Returns array of { digit, result: 'correct' | 'close' | 'wrong' } per char
  return guess.split('').map((ch, i) => {
    if (ch === secret[i]) return { digit: ch, result: 'correct' };
    const diff = Math.abs(parseInt(ch, 10) - parseInt(secret[i], 10));
    if (!isNaN(diff) && diff <= 3) return { digit: ch, result: 'close' };
    return { digit: ch, result: 'wrong' };
  });
}

const RESULT_STYLES = {
  correct: { bg: '#10B981', border: '#059669', text: 'white' },
  close: { bg: '#F59E0B', border: '#D97706', text: 'white' },
  wrong: { bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.15)', text: 'rgba(255,255,255,0.6)' },
  gift: { bg: 'rgba(139,92,246,0.3)', border: 'rgba(139,92,246,0.6)', text: '#A78BFA' },
  empty: { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.25)' },
};

const RESULT_STYLES_LIGHT = {
  correct: { bg: '#10B981', border: '#059669', text: 'white' },
  close: { bg: '#F59E0B', border: '#D97706', text: 'white' },
  wrong: { bg: 'rgba(0,0,0,0.06)', border: 'rgba(0,0,0,0.1)', text: 'rgba(0,0,0,0.4)' },
  gift: { bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.4)', text: '#7C3AED' },
  empty: { bg: 'rgba(0,0,0,0.04)', border: 'rgba(0,0,0,0.08)', text: 'rgba(0,0,0,0.2)' },
};

function DigitRow({ digits, result = null, giftDigits = [], isDark }) {
  const styles = isDark ? RESULT_STYLES : RESULT_STYLES_LIGHT;
  return (
    <div className="flex gap-1.5 justify-center">
      {Array.from({ length: 10 }).map((_, i) => {
        const giftIdx = giftDigits.find(g => g.index === i);
        let style = styles.empty;
        let displayDigit = digits?.[i] || '';

        if (giftIdx) {
          style = styles.gift;
          displayDigit = giftIdx.digit;
        } else if (result) {
          style = styles[result[i]?.result] || styles.wrong;
        }

        return (
          <div
            key={i}
            className="w-[28px] h-[36px] rounded-lg flex items-center justify-center font-black text-sm transition-all"
            style={{ background: style.bg, border: `1.5px solid ${style.border}`, color: style.text }}
          >
            {displayDigit}
          </div>
        );
      })}
    </div>
  );
}

function InputDigitRow({ digits = '', giftDigits = [], guessInput = '', isDark, onBoxClick }) {
  const styles = isDark ? RESULT_STYLES : RESULT_STYLES_LIGHT;
  
  return (
    <div className="flex gap-1.5 justify-center cursor-pointer" onClick={onBoxClick}>
      {Array.from({ length: 10 }).map((_, i) => {
        const giftIdx = giftDigits.find(g => g.index === i);
        const hasTyped = guessInput[i] !== undefined;
        
        let displayDigit = '';
        let style = styles.empty;

        if (hasTyped) {
          displayDigit = guessInput[i];
          style = {
            bg: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.08)',
            border: '#8B5CF6',
            text: isDark ? 'white' : '#8B5CF6'
          };
        } else if (giftIdx) {
          displayDigit = giftIdx.digit;
          style = styles.gift;
        }

        return (
          <div
            key={i}
            className={`w-[28px] h-[36px] rounded-lg flex items-center justify-center font-black text-sm transition-all ${
              hasTyped ? 'scale-105 shadow-sm border-2 animate-pulse' : ''
            }`}
            style={{ 
              background: style.bg, 
              border: hasTyped ? `2px solid ${style.border}` : `1.5px solid ${style.border}`, 
              color: style.text 
            }}
          >
            {displayDigit || '_'}
          </div>
        );
      })}
    </div>
  );
}

export default function NumberGame() {
  const user = useUser();
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const bg = isDark ? '#08090E' : '#F8F9FB';
  const cardBg = isDark ? '#141521' : '#FFFFFF';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)';

  const [session, setSession] = useState(null);
  const [myState, setMyState] = useState(null); // my NumberGameState
  const [partnerState, setPartnerState] = useState(null); // partner's state
  const [partnerProfile, setPartnerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Setup phase
  const [phoneInput, setPhoneInput] = useState('');
  // Guess phase
  const [guessInput, setGuessInput] = useState('');
  
  // UI states & refs
  const [historyTab, setHistoryTab] = useState('mine'); // 'mine' | 'theirs'
  const [forceTestMode, setForceTestMode] = useState(null); // null | 'setup' | 'turn' | 'win'
  const guessInputRef = useRef(null);
  const phoneInputRef = useRef(null);

  const pollRef = useRef(null);
  const sessionId = new URLSearchParams(window.location.search).get('session');

  useEffect(() => {
    if (user !== undefined && sessionId) {
      loadData();
      pollRef.current = setInterval(() => {
        loadData(true);
      }, 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [user, sessionId]);

  const loadData = async (silent = false) => {
    if (!user || !sessionId) return;
    if (!silent) setLoading(true);

    const [asP1, asP2] = await Promise.all([
      base44.entities.GameSession.filter({ player1_email: user.email }),
      base44.entities.GameSession.filter({ player2_email: user.email }),
    ]);
    const allSessions = [...asP1, ...asP2];
    const sess = allSessions.find(s => s.id === sessionId);
    if (!sess) { setLoading(false); return; }
    setSession(sess);

    const partnerEmail = sess.player1_email === user.email ? sess.player2_email : sess.player1_email;

    const [states, partnerProfs] = await Promise.all([
      base44.entities.NumberGameState.filter({ session_id: sessionId }),
      base44.entities.UserProfile.filter({ user_email: partnerEmail }),
    ]);

    const mine = states.find(s => s.player_email === user.email);
    const theirs = states.find(s => s.player_email === partnerEmail);
    setMyState(mine || null);
    setPartnerState(theirs || null);
    setPartnerProfile(partnerProfs[0] || null);

    if (!silent) setLoading(false);

    if (!pollRef.current) {
      pollRef.current = setInterval(() => loadData(true), 5000);
    }
  };

  const handleSetupNumber = async () => {
    if (phoneInput.length !== 10 || !/^\d+$/.test(phoneInput)) {
      toast.error('Vul een geldig 10-cijferig telefoonnummer in');
      return;
    }
    setSubmitting(true);
    try {
      const gifts = pickGiftDigits(phoneInput);
      const state = await base44.entities.NumberGameState.create({
        session_id: sessionId,
        player_email: user.email,
        phone_number: phoneInput,
        gift_digits: gifts,
        guesses: [],
      });
      setMyState(state);
      await base44.entities.GameSession.update(sessionId, { last_activity: new Date().toISOString() });
      toast.success('Nummer opgeslagen! 🔒');
    } catch (e) {
      toast.error('Er ging iets mis');
    }
    setSubmitting(false);
  };

  const handleGuess = async () => {
    if (guessInput.length !== 10 || !/^\d+$/.test(guessInput)) {
      toast.error('Vul een geldig 10-cijferig nummer in');
      return;
    }
    if (!partnerState) {
      toast.error('Wacht tot de ander ook zijn nummer heeft ingesteld');
      return;
    }
    setSubmitting(true);
    try {
      const result = scoreGuess(guessInput, partnerState.phone_number);
      const isCorrect = result.every(r => r.result === 'correct');

      const newGuess = {
        by_email: user.email,
        digits: guessInput,
        result,
        created_date: new Date().toISOString(),
        is_correct: isCorrect,
      };

      const updatedGuesses = [...(myState.guesses || []), newGuess];
      const updated = await base44.entities.NumberGameState.update(myState.id, { guesses: updatedGuesses });
      setMyState(updated);

      await base44.entities.GameSession.update(sessionId, { last_activity: new Date().toISOString() });

      if (isCorrect) {
        await base44.entities.GameSession.update(sessionId, { status: 'finished', finished_at: new Date().toISOString(), winner_email: user.email });
        toast.success('🎉 Correct! Je hebt het nummer geraden!');
      } else {
        toast.success('Gokkk gedaan!');
      }

      setGuessInput('');
      loadData(true);
    } catch (e) {
      toast.error('Er ging iets mis');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: bg }}>
        <p className={`font-black text-lg ${textMain}`}>Spel niet gevonden</p>
        <button onClick={() => window.history.back()} className="mt-4 px-6 py-2 rounded-full text-white font-bold" style={{ background: '#8B5CF6' }}>Terug</button>
      </div>
    );
  }

  const activeMyState = myState;
  const activePartnerState = partnerState;

  const bothSetup = activeMyState && activePartnerState;
  const isFinished = session.status === 'finished';
  const activeWinnerEmail = session.winner_email;

  const myGuessCount = (activeMyState?.guesses || []).length;
  const partnerGuessCount = (activePartnerState?.guesses || []).length;
  const isPlayer1 = session.player1_email === user?.email;
  const isMyTurn = bothSetup && !isFinished && (isPlayer1 ? myGuessCount === partnerGuessCount : myGuessCount < partnerGuessCount);

  return (
    <div className="absolute inset-y-0 left-0 w-full flex flex-col" style={{ background: bg, fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 pt-5 pb-4 flex-shrink-0"
        style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}
      >
        <button onClick={() => window.history.back()} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
          <ArrowLeft className="w-5 h-5 text-gray-300" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔢</span>
            <h1 className={`font-black text-base truncate ${textMain}`}>Nummer Spel</h1>
          </div>
          <p className="text-xs truncate mt-0.5" style={{ color: textSub }}>
            {partnerProfile ? `Tegen ${partnerProfile.display_name}` : 'Laden...'}
          </p>
        </div>
      </div>

      <div className="flex-1 px-5 pt-4 space-y-6 overflow-y-auto pb-32">


        {/* SETUP PHASE */}
        {!activeMyState && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div 
              className="rounded-3xl p-5" 
              style={{ 
                background: isDark 
                  ? 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.15))' 
                  : 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(99,102,241,0.08))', 
                border: `1.5px solid ${isDark ? 'rgba(139,92,246,0.35)' : 'rgba(139,92,246,0.2)'}`
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: 'rgba(139,92,246,0.2)' }}>🔒</div>
                <div>
                  <p className={`font-black text-sm ${isDark ? 'text-white' : 'text-purple-950'}`}>Stel je nummer in</p>
                  <p className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(109,40,217,0.75)' }}>Dit is je geheime telefoonnummer (10 cijfers)</p>
                </div>
              </div>

              <div className="mb-4">
                <InputDigitRow 
                  digits={phoneInput} 
                  giftDigits={[]} 
                  guessInput={phoneInput} 
                  isDark={isDark} 
                  onBoxClick={() => phoneInputRef.current?.focus()} 
                />
              </div>

              <div className="flex gap-2">
                <input
                  ref={phoneInputRef}
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Typ je nummer..."
                  className={`flex-1 min-w-0 px-4 py-3 rounded-2xl font-black text-center text-lg tracking-widest outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all ${
                    isDark ? 'bg-black/40 border-white/20 text-white placeholder-white/40' : 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                  inputMode="numeric"
                  maxLength={10}
                />
                <button
                  onClick={handleSetupNumber}
                  disabled={submitting || phoneInput.length !== 10}
                  className="px-5 py-3 rounded-2xl font-black text-white transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)', opacity: phoneInput.length !== 10 ? 0.4 : 1 }}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs mt-3 text-center" style={{ color: textSub }}>
                Zodra je dit opslaat, krijgt de ander 4 cijfers cadeau om te raden.
              </p>
            </div>
          </motion.div>
        )}

        {/* Waiting for partner */}
        {activeMyState && !activePartnerState && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-3xl p-6 text-center" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` }}>
            <div className="text-4xl mb-3">⏳</div>
            <p className="font-black text-base" style={{ color: isDark ? 'white' : '#111' }}>Wachten op {partnerName}…</p>
            <p className="text-sm mt-1" style={{ color: textSub }}>De ander stelt zijn nummer nog in</p>
          </motion.div>
        )}

        {/* GAME PHASE */}
        {bothSetup && (
          <>
            {!isFinished && (
              isMyTurn ? (
                <div className="rounded-2xl p-4 flex items-center justify-between shadow-md" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl animate-pulse">🟢</span>
                    <div>
                      <p className="font-black text-sm text-white leading-none">Jouw beurt!</p>
                      <p className="text-[10px] text-white/80 mt-1">Doe een gok naar het nummer van {partnerName}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black uppercase bg-white/20 text-white px-2.5 py-1 rounded-full tracking-wider">AAN DE BEURT</span>
                </div>
              ) : (
                <div className="rounded-2xl p-4 flex items-center justify-between border" style={{ background: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.2)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⏳</span>
                    <div>
                      <p className="font-black text-sm leading-none" style={{ color: '#F59E0B' }}>Wachten op {partnerName}…</p>
                      <p className="text-[10px] mt-1" style={{ color: textSub }}>De ander is nu een poging aan het doen</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black uppercase bg-amber-500/10 px-2.5 py-1 rounded-full tracking-wider" style={{ color: '#F59E0B' }}>WACHTEN</span>
                </div>
              )
            )}

            {isFinished && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="rounded-3xl p-6 text-center" 
                style={{ 
                  background: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)', 
                  border: `1.5px solid ${isDark ? 'rgba(16,185,129,0.35)' : 'rgba(16,185,129,0.2)'}` 
                }}
              >
                <Trophy className="w-12 h-12 mx-auto mb-3" style={{ color: '#10B981' }} />
                <p className={`font-black text-lg mb-1 ${isDark ? 'text-white' : 'text-emerald-950'}`}>🎉 Spel afgerond!</p>
                {activeWinnerEmail === user?.email
                  ? <p className="text-sm font-bold" style={{ color: '#10B981' }}>Jij hebt het gewonnen! 🏆</p>
                  : <p className="text-sm font-medium" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>{partnerName} heeft jouw nummer geraden</p>
                }

                {activePartnerState?.phone_number && (
                  <div className="mt-5 p-4 rounded-2xl bg-white/10 border border-emerald-500/30 flex flex-col items-center gap-2">
                    <p className="text-xs font-black uppercase tracking-wider text-emerald-400">
                      Telefoonnummer van {partnerName}
                    </p>
                    <span className="text-2xl font-black tracking-widest text-white select-all">
                      {activePartnerState.phone_number}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activePartnerState.phone_number);
                        toast.success('Telefoonnummer gekopieerd! 📋');
                      }}
                      className="mt-1 px-5 py-2.5 rounded-xl font-black text-xs text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all flex items-center gap-1.5 shadow-md"
                    >
                      📋 Kopieer Nummer
                    </button>
                  </div>
                )}

                <button onClick={() => window.history.back()} className="mt-5 px-6 py-2.5 rounded-2xl font-black text-white text-sm" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                  Terug naar spellen
                </button>
              </motion.div>
            )}

            {!isFinished && (
              isMyTurn ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl p-5 space-y-4" style={{ background: isDark ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.03)', border: '1.5px solid rgba(139,92,246,0.18)' }}>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: isDark ? '#A78BFA' : '#6D28D9' }}>Raad het nummer van {partnerName}</p>
                    <p className="text-[11px]" style={{ color: textSub }}>Vul de lege vakjes aan met je gok (10 cijfers):</p>
                  </div>
                  <InputDigitRow 
                    digits="" 
                    giftDigits={activePartnerState?.gift_digits || []} 
                    guessInput={guessInput} 
                    isDark={isDark} 
                    onBoxClick={() => guessInputRef.current?.focus()} 
                  />
                  <div className="flex gap-2">
                    <input
                      ref={guessInputRef}
                      value={guessInput}
                      onChange={e => setGuessInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Typ hier 10 cijfers..."
                      className={`flex-1 min-w-0 px-4 py-3.5 rounded-2xl font-black text-center text-base tracking-widest outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all ${
                        isDark ? 'bg-black/40 border-white/20 text-white placeholder-white/40' : 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400'
                      }`}
                      inputMode="numeric"
                      maxLength={10}
                    />
                    <button
                      onClick={handleGuess}
                      disabled={submitting || guessInput.length !== 10}
                      className="px-6 py-3 rounded-2xl font-black text-white transition-all active:scale-95 flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)', opacity: guessInput.length !== 10 ? 0.4 : 1 }}
                    >
                      <Send className="w-4 h-4 mr-1.5" />
                      Gokken
                    </button>
                  </div>
                  <div className="flex justify-between items-center pt-2 text-[10px] border-t border-purple-500/10" style={{ color: textSub }}>
                    <span className="flex items-center gap-1">🟢 Groen = Goed</span>
                    <span className="flex items-center gap-1">🟠 Oranje = ±3 verschil</span>
                    <span className="flex items-center gap-1">⬜ Grijs = Fout</span>
                  </div>
                </motion.div>
              ) : (
                <div className="rounded-2xl p-4 space-y-3" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}` }}>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider" style={{ color: textSub }}>Onthulde cadeaucijfers</p>
                    <p className="text-[10px] mt-0.5" style={{ color: textSub }}>Deze cijfers van {partnerName} heb je al cadeau gekregen:</p>
                  </div>
                  <DigitRow digits={Array(10).fill('').map((_, i) => activePartnerState?.gift_digits?.find(g => g.index === i)?.digit || '')} giftDigits={activePartnerState?.gift_digits || []} isDark={isDark} />
                </div>
              )
            )}

            <div className="space-y-3 pt-2">
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: textSub }}>Gokgeschiedenis</p>
              <div className="flex rounded-xl p-1 bg-black/10 dark:bg-black/30 border border-white/5">
                <button
                  onClick={() => setHistoryTab('mine')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    historyTab === 'mine' 
                      ? 'bg-purple-600 text-white shadow-sm' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Jouw gokken ({(activeMyState?.guesses || []).length})
                </button>
                <button
                  onClick={() => setHistoryTab('theirs')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    historyTab === 'theirs' 
                      ? 'bg-purple-600 text-white shadow-sm' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Gokken van {partnerName} ({(activePartnerState?.guesses || []).length})
                </button>
              </div>

              <div className="space-y-3">
                {historyTab === 'mine' ? (
                  (activeMyState?.guesses || []).length > 0 ? (
                    [...(activeMyState?.guesses || [])].reverse().map((g, idx, arr) => (
                      <div key={idx} className="rounded-2xl p-4 space-y-2" style={{ background: cardBg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                        <DigitRow digits={g.digits} result={g.result} giftDigits={activePartnerState?.gift_digits || []} isDark={isDark} />
                        <p className="text-center text-[11px] font-bold" style={{ color: textSub }}>
                          Poging {arr.length - idx} · {g.result?.filter(r => r.result === 'correct').length}/10 correct
                        </p>
                        {g.result?.filter(r => r.result === 'correct').length === 10 && (
                          <div className="flex justify-center pt-1">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(g.digits);
                                toast.success('Telefoonnummer gekopieerd! 📋');
                              }}
                              className="px-4 py-1.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all flex items-center gap-1 shadow-sm"
                            >
                              📋 Kopieer Nummer
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-xs py-8 text-gray-500 dark:text-gray-400 italic">Je hebt nog geen gokken gedaan.</p>
                  )
                ) : (
                  (activePartnerState?.guesses || []).length > 0 ? (
                    [...(activePartnerState?.guesses || [])].reverse().map((g, idx, arr) => {
                      const result = scoreGuess(g.digits, activeMyState?.phone_number || '');
                      return (
                        <div key={idx} className="rounded-2xl p-4 space-y-2" style={{ background: cardBg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                          <DigitRow digits={g.digits} result={result} giftDigits={activeMyState?.gift_digits || []} isDark={isDark} />
                          <p className="text-center text-[11px] font-bold" style={{ color: textSub }}>
                            Poging {arr.length - idx} · {result.filter(r => r.result === 'correct').length}/10 correct
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-xs py-8 text-gray-500 dark:text-gray-400 italic">{partnerName} heeft nog geen gokken gedaan.</p>
                  )
                )}
              </div>
            </div>
          </>
        )}
        {bothSetup && !isFinished && (
          <div className="rounded-2xl p-4" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
            <p className="text-xs font-black mb-3" style={{ color: textSub }}>Kleur uitleg</p>
            <div className="space-y-2">
              {[
                { color: '#10B981', label: 'Groen', desc: 'Exact goed cijfer!' },
                { color: '#F59E0B', label: 'Oranje', desc: 'Cijfer zit er ±3 naast' },
                { color: isDark ? '#A78BFA' : '#7C3AED', label: 'Paars', desc: 'Cadeau hint (al onthuld)' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-xs font-bold" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#333' }}>{item.label}</span>
                  <span className="text-xs" style={{ color: textSub }}>{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
