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
  wrong: { bg: 'rgba(255,255,255,0.12)', border: 'rgba(255,255,255,0.2)', text: 'white' },
  gift: { bg: 'rgba(139,92,246,0.35)', border: 'rgba(139,92,246,0.7)', text: '#DDD6FE' },
  empty: { bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.15)', text: 'rgba(255,255,255,0.3)' },
};

const RESULT_STYLES_LIGHT = {
  correct: { bg: '#10B981', border: '#059669', text: 'white' },
  close: { bg: '#F59E0B', border: '#D97706', text: 'white' },
  wrong: { bg: 'rgba(0,0,0,0.08)', border: 'rgba(0,0,0,0.15)', text: 'rgba(0,0,0,0.6)' },
  gift: { bg: 'rgba(139,92,246,0.2)', border: 'rgba(139,92,246,0.5)', text: '#6D28D9' },
  empty: { bg: 'rgba(0,0,0,0.05)', border: 'rgba(0,0,0,0.1)', text: 'rgba(0,0,0,0.3)' },
};

function DigitRow({ digits, result = null, giftDigits = [], isDark }) {
  const styles = isDark ? RESULT_STYLES : RESULT_STYLES_LIGHT;
  return (
    <div className="flex gap-1 sm:gap-1.5 justify-center">
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
            className="w-[26px] sm:w-[28px] h-[34px] sm:h-[36px] rounded-lg flex items-center justify-center font-black text-xs sm:text-sm transition-all shadow-sm"
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
    <div className="flex gap-1 sm:gap-1.5 justify-center cursor-pointer" onClick={onBoxClick}>
      {Array.from({ length: 10 }).map((_, i) => {
        const giftIdx = giftDigits.find(g => g.index === i);
        const hasTyped = guessInput[i] !== undefined;
        
        let displayDigit = '';
        let style = styles.empty;

        if (hasTyped) {
          displayDigit = guessInput[i];
          style = {
            bg: isDark ? 'rgba(236,72,153,0.3)' : 'rgba(236,72,153,0.15)',
            border: '#EC4899',
            text: isDark ? 'white' : '#BE185D'
          };
        } else if (giftIdx) {
          displayDigit = giftIdx.digit;
          style = styles.gift;
        }

        return (
          <div
            key={i}
            className={`w-[26px] sm:w-[28px] h-[34px] sm:h-[36px] rounded-lg flex items-center justify-center font-black text-xs sm:text-sm transition-all ${
              hasTyped ? 'scale-105 shadow-md border-2 animate-pulse' : ''
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

  const [session, setSession] = useState(null);
  const [myState, setMyState] = useState(null);
  const [partnerState, setPartnerState] = useState(null);
  const [partnerProfile, setPartnerProfile] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Inputs
  const [phoneInput, setPhoneInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  
  // UI states & refs
  const [historyTab, setHistoryTab] = useState('mine');
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

    const [asP1, asP2, myProfs] = await Promise.all([
      base44.entities.GameSession.filter({ player1_email: user.email }),
      base44.entities.GameSession.filter({ player2_email: user.email }),
      base44.entities.UserProfile.filter({ user_email: user.email }),
    ]);
    const allSessions = [...asP1, ...asP2];
    const sess = allSessions.find(s => s.id === sessionId);
    if (!sess) { setLoading(false); return; }
    setSession(sess);
    if (myProfs && myProfs.length > 0) setMyProfile(myProfs[0]);

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

      const partnerEmail = session.player1_email === user.email ? session.player2_email : session.player1_email;
      await base44.entities.Notification.create({
        to_email: partnerEmail,
        from_email: user.email,
        type: 'game',
        from_name: myProfile?.display_name || 'Je match',
      }).catch(err => console.error("Error creating game notification:", err));

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
    setSubmitting(true);
    try {
      const partnerPhone = partnerState?.phone_number || '';
      const result = scoreGuess(guessInput, partnerPhone);
      const newGuesses = [...(myState.guesses || []), { digits: guessInput, result, created_at: new Date().toISOString() }];

      await base44.entities.NumberGameState.update(myState.id, { guesses: newGuesses });
      await base44.entities.GameSession.update(sessionId, { last_activity: new Date().toISOString() });

      const partnerEmail = session.player1_email === user.email ? session.player2_email : session.player1_email;
      await base44.entities.Notification.create({
        to_email: partnerEmail,
        from_email: user.email,
        type: 'game',
        from_name: myProfile?.display_name || 'Je match',
      }).catch(err => console.error("Error creating game notification:", err));

      const isWinner = result.filter(r => r.result === 'correct').length === 10;
      if (isWinner) {
        await base44.entities.GameSession.update(sessionId, { status: 'finished', winner_email: user.email, finished_at: new Date().toISOString() });
        toast.success('🎉 JE HEBT HET NUMMER GERADEN! 🏆');
      } else {
        toast.success('Gok verstuurd!');
      }

      setGuessInput('');
      loadData(true);
    } catch (e) {
      toast.error('Er ging iets mis bij het gokken');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0E15]">
        <div className="w-12 h-12 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0D0E15] text-white">
        <p className="font-black text-xl mb-4">Spel niet gevonden</p>
        <button onClick={() => window.history.back()} className="px-6 py-2.5 rounded-full bg-purple-600 font-bold">Terug</button>
      </div>
    );
  }

  const activeMyState = myState;
  const activePartnerState = partnerState;
  const partnerName = partnerProfile?.display_name || partnerProfile?.avatar?.split(' ').slice(1).join(' ') || 'je match';

  const bothSetup = activeMyState && activePartnerState;
  const isFinished = session.status === 'finished';
  const activeWinnerEmail = session.winner_email;

  const myGuessCount = (activeMyState?.guesses || []).length;
  const partnerGuessCount = (activePartnerState?.guesses || []).length;
  const isPlayer1 = session.player1_email === user?.email;
  const isMyTurn = bothSetup && !isFinished && (isPlayer1 ? myGuessCount === partnerGuessCount : myGuessCount < partnerGuessCount);

  return (
    <div className={`min-h-screen w-full relative overflow-x-hidden flex flex-col justify-between select-none ${isDark ? 'bg-[#0D0E15] text-white' : 'bg-[#F8F9FB] text-gray-900'}`} style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Ambient Background Glows (Matching CardGame style) */}
      {isDark && (
        <>
          <div className="absolute top-[-5%] left-[-10%] w-[380px] h-[380px] rounded-full bg-gradient-to-br from-purple-600/30 via-indigo-500/20 to-transparent blur-[100px] pointer-events-none" />
          <div className="absolute top-[5%] right-[-10%] w-[380px] h-[380px] rounded-full bg-gradient-to-bl from-pink-500/30 via-rose-500/20 to-transparent blur-[100px] pointer-events-none" />
        </>
      )}

      {/* Main Container */}
      <div className="relative z-10 flex-1 flex flex-col max-w-md mx-auto w-full px-4 pt-12 sm:pt-14 pb-12">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between py-2 mb-2">
          <button 
            onClick={() => window.history.back()} 
            className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border transition-all active:scale-95 ${isDark ? 'bg-white/10 border-white/15 text-white hover:bg-white/20' : 'bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200'}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${isDark ? 'bg-white/10 border-white/10 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-700'}`}>
            {bothSetup ? `POGING #${myGuessCount + 1}` : 'INSTELLEN'}
          </span>
        </div>

        {/* Title */}
        <div className="text-center my-2">
          <h1 className={`text-3xl font-black tracking-tight drop-shadow-md ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Nummer Spel
          </h1>
        </div>

        {/* Avatars with Connecting Beam (Matching CardGame style) */}
        <div className="flex items-center justify-center my-4">
          <div className="relative flex items-center gap-8">
            {/* Beam between avatars */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-[3px] bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400 shadow-[0_0_15px_rgba(236,72,153,0.9)] rounded-full" />
            
            {/* My Avatar */}
            <div className="relative z-10 w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr from-purple-500 via-pink-500 to-rose-400 shadow-[0_0_20px_rgba(168,85,247,0.5)]">
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-900 flex items-center justify-center">
                {myProfile?.photo_url ? (
                  <img src={myProfile.photo_url} alt="You" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{myProfile?.avatar?.split(' ')[0] || '👤'}</span>
                )}
              </div>
            </div>

            {/* Partner Avatar */}
            <div className="relative z-10 w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr from-rose-400 via-pink-500 to-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.5)]">
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-900 flex items-center justify-center">
                {partnerProfile?.photo_url ? (
                  <img src={partnerProfile.photo_url} alt={partnerName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{partnerProfile?.avatar?.split(' ')[0] || '👤'}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Speech Bubble Card Container */}
        <div className="relative mt-2 mb-6 w-full">
          <div className="relative rounded-[32px] p-6 sm:p-7 bg-gradient-to-b from-[#FFFDF9] via-[#FAF3FF] to-[#F2E7FE] text-gray-900 shadow-[0_25px_60px_rgba(0,0,0,0.45)] border border-white/60">
            {/* Speech Bubble Notch */}
            <div 
              className={`w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-b-[16px] border-b-[#FFFDF9] absolute -top-[15px] transition-all duration-300 ${
                !bothSetup ? 'left-1/2 -translate-x-1/2' : isMyTurn ? 'left-16' : 'right-16'
              }`}
            />

            {/* ── SETUP PHASE ── */}
            {!activeMyState && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-500/15 flex items-center justify-center text-2xl shadow-sm">
                  🔒
                </div>
                <div>
                  <h3 className="font-black text-xl text-gray-900 mb-1">Stel je nummer in</h3>
                  <p className="text-xs text-gray-600 font-medium">Vul je geheime 10-cijferige telefoonnummer in om de game te starten.</p>
                </div>

                <div className="my-3">
                  <InputDigitRow 
                    digits={phoneInput} 
                    giftDigits={[]} 
                    guessInput={phoneInput} 
                    isDark={false} 
                    onBoxClick={() => phoneInputRef.current?.focus()} 
                  />
                </div>

                <div className="flex gap-2">
                  <input
                    ref={phoneInputRef}
                    value={phoneInput}
                    onChange={e => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="0612345678"
                    className="flex-1 min-w-0 px-4 py-3.5 rounded-2xl font-black text-center text-lg tracking-widest outline-none bg-white border border-purple-200 text-gray-900 placeholder-gray-300 focus:ring-2 focus:ring-purple-400 shadow-inner"
                    inputMode="numeric"
                    maxLength={10}
                  />
                  <button
                    onClick={handleSetupNumber}
                    disabled={submitting || phoneInput.length !== 10}
                    className="px-6 py-3.5 rounded-2xl font-black text-white transition-all active:scale-95 shadow-lg disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)' }}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 font-medium">
                  Zodra je dit opslaat, krijgt {partnerName} 4 willekeurige cijfers cadeau om te raden!
                </p>
              </motion.div>
            )}

            {/* ── WAITING FOR PARTNER SETUP ── */}
            {activeMyState && !activePartnerState && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4 text-center">
                <div className="text-4xl mb-3 animate-bounce">⏳</div>
                <h3 className="font-black text-xl text-gray-900 mb-1">Wachten op {partnerName}…</h3>
                <p className="text-xs text-gray-600 font-medium max-w-xs mx-auto">
                  De ander stelt zijn nummer nog in. Zodra dat gedaan is kun je beginnen met gokken!
                </p>
              </motion.div>
            )}

            {/* ── GAME PLAY PHASE ── */}
            {bothSetup && (
              <>
                {/* Winner State */}
                {isFinished ? (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-2">
                    <Trophy className="w-14 h-14 mx-auto mb-2 text-amber-500 drop-shadow-md" />
                    <h2 className="font-black text-2xl text-gray-900 mb-1">🎉 Spel afgerond!</h2>
                    {activeWinnerEmail === user?.email ? (
                      <p className="text-sm font-black text-emerald-600">Jij hebt het gewonnen! 🏆</p>
                    ) : (
                      <p className="text-sm font-bold text-purple-700">{partnerName} heeft jouw nummer geraden</p>
                    )}

                    {activePartnerState?.phone_number && (
                      <div className="mt-5 p-4 rounded-2xl bg-purple-50 border border-purple-200 flex flex-col items-center gap-1.5 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-wider text-purple-700">
                          Telefoonnummer van {partnerName}
                        </p>
                        <span className="text-2xl font-black tracking-widest text-gray-900 select-all">
                          {activePartnerState.phone_number}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(activePartnerState.phone_number);
                            toast.success('Telefoonnummer gekopieerd! 📋');
                          }}
                          className="mt-2 px-5 py-2.5 rounded-xl font-black text-xs text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all flex items-center gap-1.5 shadow-md"
                        >
                          📋 Kopieer Nummer
                        </button>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  /* Active Turn State */
                  isMyTurn ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-purple-100">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                            🟢 Jouw Beurt
                          </span>
                          <h3 className="font-black text-lg text-gray-900 mt-1.5">Raad het nummer!</h3>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 font-medium">Vul de vakjes aan met je gok naar het nummer van {partnerName}:</p>

                      <div className="my-2">
                        <InputDigitRow 
                          digits="" 
                          giftDigits={activePartnerState?.gift_digits || []} 
                          guessInput={guessInput} 
                          isDark={false} 
                          onBoxClick={() => guessInputRef.current?.focus()} 
                        />
                      </div>

                      <div className="flex gap-2 pt-1">
                        <input
                          ref={guessInputRef}
                          value={guessInput}
                          onChange={e => setGuessInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="0612345678"
                          className="flex-1 min-w-0 px-4 py-3.5 rounded-2xl font-black text-center text-base tracking-widest outline-none bg-white border border-purple-200 text-gray-900 placeholder-gray-300 focus:ring-2 focus:ring-purple-400 shadow-inner"
                          inputMode="numeric"
                          maxLength={10}
                        />
                        <button
                          onClick={handleGuess}
                          disabled={submitting || guessInput.length !== 10}
                          className="px-6 py-3.5 rounded-2xl font-black text-white transition-all active:scale-95 flex items-center justify-center flex-shrink-0 shadow-lg disabled:opacity-40"
                          style={{ background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)' }}
                        >
                          <Send className="w-4 h-4 mr-1.5" />
                          Gokken
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    /* Waiting for partner turn */
                    <div className="py-4 text-center space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center text-2xl animate-pulse">
                        ⏳
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                          Wachten
                        </span>
                        <h3 className="font-black text-lg text-gray-900 mt-2">Wachten op {partnerName}…</h3>
                        <p className="text-xs text-gray-600 font-medium max-w-xs mx-auto mt-1">
                          De ander is nu een poging aan het doen om jouw nummer te raden.
                        </p>
                      </div>

                      {/* Revealed gift digits summary */}
                      <div className="pt-4 mt-2 border-t border-purple-100 text-left">
                        <p className="text-[11px] font-black uppercase tracking-wider text-purple-700 mb-2 text-center">
                          Cadeau-cijfers van {partnerName}
                        </p>
                        <DigitRow 
                          digits={Array(10).fill('').map((_, i) => activePartnerState?.gift_digits?.find(g => g.index === i)?.digit || '')} 
                          giftDigits={activePartnerState?.gift_digits || []} 
                          isDark={false} 
                        />
                      </div>
                    </div>
                  )
                )}
              </>
            )}
          </div>
        </div>

        {/* ── GAME HISTORY & LEGEND (Outside Speech Bubble) ── */}
        {bothSetup && (
          <div className="space-y-4">
            {/* Legend */}
            <div className={`rounded-2xl p-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
              <p className={`text-xs font-black mb-2.5 ${isDark ? 'text-white/80' : 'text-gray-900'}`}>Kleur uitleg</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-emerald-500 flex-shrink-0" />
                  <span className="text-[11px] font-bold text-emerald-400">Goed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-amber-500 flex-shrink-0" />
                  <span className="text-[11px] font-bold text-amber-400">±3 Verschil</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-purple-500/40 border border-purple-400 flex-shrink-0" />
                  <span className="text-[11px] font-bold text-purple-300">Cadeau</span>
                </div>
              </div>
            </div>

            {/* History Tabs & List */}
            <div className="space-y-3">
              <p className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Gokgeschiedenis</p>
              
              <div className={`flex rounded-2xl p-1 border ${isDark ? 'bg-black/40 border-white/10' : 'bg-gray-200/60 border-gray-300/50'}`}>
                <button
                  onClick={() => setHistoryTab('mine')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                    historyTab === 'mine' 
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md' 
                      : isDark ? 'text-white/60 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Jouw gokken ({(activeMyState?.guesses || []).length})
                </button>
                <button
                  onClick={() => setHistoryTab('theirs')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                    historyTab === 'theirs' 
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md' 
                      : isDark ? 'text-white/60 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Gokken van {partnerName} ({(activePartnerState?.guesses || []).length})
                </button>
              </div>

              <div className="space-y-3">
                {historyTab === 'mine' ? (
                  (activeMyState?.guesses || []).length > 0 ? (
                    [...(activeMyState?.guesses || [])].reverse().map((g, idx, arr) => (
                      <div key={idx} className={`rounded-2xl p-4 space-y-2 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <DigitRow digits={g.digits} result={g.result} giftDigits={activePartnerState?.gift_digits || []} isDark={isDark} />
                        <p className={`text-center text-[11px] font-bold ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                          Poging {arr.length - idx} · {g.result?.filter(r => r.result === 'correct').length}/10 correct
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-xs py-8 text-gray-400 italic">Je hebt nog geen gokken gedaan.</p>
                  )
                ) : (
                  (activePartnerState?.guesses || []).length > 0 ? (
                    [...(activePartnerState?.guesses || [])].reverse().map((g, idx, arr) => {
                      const result = scoreGuess(g.digits, activeMyState?.phone_number || '');
                      return (
                        <div key={idx} className={`rounded-2xl p-4 space-y-2 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                          <DigitRow digits={g.digits} result={result} giftDigits={activeMyState?.gift_digits || []} isDark={isDark} />
                          <p className={`text-center text-[11px] font-bold ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                            Poging {arr.length - idx} · {result.filter(r => r.result === 'correct').length}/10 correct
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-xs py-8 text-gray-400 italic">{partnerName} heeft nog geen gokken gedaan.</p>
                  )
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
