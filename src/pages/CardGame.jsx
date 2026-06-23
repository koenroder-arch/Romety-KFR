import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useUser } from '@/lib/useUser';
import { useTheme } from '@/lib/ThemeContext';
import { ArrowLeft, Check, X, Instagram, Camera, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// ─── Question bank ────────────────────────────────────────────────────
const QUESTIONS = {
  oppervlakkig: [
    "Heb je weleens een handdoek of mini-shampoo gejat uit een hotel?",
    "Ben je een honden- of kattenmens?",
    "Is je pinpas weleens geweigerd bij de kassa omdat je saldo op was?",
    "Luister je weleens naar kerstmuziek midden in de zomer?",
    "Heb je op dit moment een app op je telefoon die je echt moet deleten?",
    "Zou je meedoen aan een foute realityshow voor een dikke zak geld?",
    "Heb je vandaag al gecheckt hoe je haar zit in de spiegel voor je hierheen kwam?",
    "Heb je weleens per ongeluk een foute snap of app naar je baas of ouders gestuurd?",
    "Slaap je altijd aan exact dezelfde kant van het bed?",
    "Ben je weleens weggedoken in de supermarkt om een bekende te ontwijken?",
    "Bestel jij standaard hetzelfde als je uit eten gaat?",
    "Heb je weleens een hele serie in één weekend gebingewatched?",
    "Zing je weleens keihard mee in de auto als je alleen bent?",
    "Ben je weleens weggelopen uit de bioscoop omdat de film echt gaar was?",
    "Heb je kleding in je kast hangen met het prijskaartje er nog aan?",
    "Eet je de korstjes van je pizza altijd op?",
    "Heb je weleens een flinke blauwe plek opgelopen tijdens het uitgaan?",
    "Ben je weleens stiekem een VIP-area of feestje binnen geglipt?",
    "Check je de menukaart al online voordat je überhaupt in het restaurant zit?",
    "Heb je deze week al een smoesje gebruikt om ergens onderuit te komen?",
    "Ben je weleens verdwaald in de Ikea?",
    "Heb je weleens een TikTok-dansje geprobeerd te doen voor de spiegel?",
    "Heb je je wekker vanochtend gesnoozed?",
  ],
  diepgaand: [
    "Geloof je in liefde op het eerste gezicht of is dat onzin?",
    "Heb je weleens een sappige roddel doorverteld die echt geheim moest blijven?",
    "Ben je op dit moment helemaal happy met waar je staat in het leven?",
    "Vind je het lastig om grenzen aan te geven bij mensen die close met je zijn?",
    "Heb je weleens spijt gehad nadat je het had uitgemaakt met je ex?",
    "Zou je morgen meteen je ontslag indienen als je de loterij wint?",
    "Heb je weleens gedaan alsof het je niks deed toen iemand je hart brak?",
    "Geloof je dat mensen echt 180 graden kunnen veranderen?",
    "Vind je het makkelijk om je fouten toe te geven en sorry te zeggen?",
    "Heb je weleens een vriendschap verbroken omdat diegene te toxic werd?",
    "Ben je weleens onzeker of je wel goed genoeg bent voor je vrienden?",
    "Maak je keuzes puur op gevoel in plaats van met je verstand?",
    "Lig je weleens wakker van een cringe actie van jaren geleden?",
    "Vind je het chill om een paar dagen helemaal alleen te zijn en op te laden?",
    "Heb je weleens een andere persoonlijkheid aangenomen om erbij te horen?",
    "Is er een event in je leven geweest dat je compleet heeft veranderd?",
    "Geloof je in 'everything happens for a reason'?",
    "Vind je het moeilijk om hulp te vragen als je mentaal vastloopt?",
    "Heb je weleens huilend in de auto gezeten terwijl je muziek luisterde?",
    "Word je weleens een beetje jaloers van die perfecte leventjes op Insta?",
    "Zou je een geheim gatekeepen als je weet dat de waarheid iemand pijn doet?",
    "Heb je een grote droom die je aan niemand vertelt omdat je denkt dat het delulu is?",
    "Ben je stiekem een beetje bang om ouder te worden?",
    "Heb je het gevoel dat je gewoon honderd procent jezelf kunt zijn bij mij?",
  ],
  spicy: [
    "Heb je weleens een one-night stand gehad waarbij je dacht: ik moet hier NU weg?",
    "Vind je dat je goede rizz hebt in de slaapkamer?",
    "Heb je weleens per ongeluk een pikante foto naar de verkeerde gestuurd?",
    "Ben je weleens betrapt terwijl je met iemand lag te vozen?",
    "Vind je het geil als iemand de leiding neemt in bed?",
    "Heb je weleens een trio gehad (of staat dat op je bucketlist)?",
    "Heb je het weleens gedaan op een openbare plek?",
    "Heb je weleens een seksspeeltje gekocht voor jezelf of je partner?",
    "Hou je van een beetje dirty talk tijdens de seks?",
    "Kijk je weleens schaamteloos naar iemands achterwerk als diegene wegloopt?",
    "Ben je weleens op twee mensen tegelijk verliefd geweest?",
    "Heb je een wildste fantasie die je nog met niemand hebt gedeeld?",
  ],
};

// The last round (6) is always the social media question
const SOCIAL_QUESTION = "Wil je je telefoonnummer, Instagram of Snapchat met me delen? 📲";

const CATEGORY_COLORS = {
  oppervlakkig: { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', label: '🤩 Oppervlakkig' },
  diepgaand: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', label: '💭 Diepgaand' },
  spicy: { color: '#FF4B72', bg: 'rgba(255,75,114,0.12)', label: '🌶️ Spicy' },
};

function getRandomCards(roundNumber) {
  if (roundNumber === 6) {
    return [{ question: SOCIAL_QUESTION, category: 'final' }];
  }
  // Pick 4 random questions from mixed pool
  const allQ = [
    ...QUESTIONS.oppervlakkig.map(q => ({ question: q, category: 'oppervlakkig' })),
    ...QUESTIONS.diepgaand.map(q => ({ question: q, category: 'diepgaand' })),
    ...QUESTIONS.spicy.map(q => ({ question: q, category: 'spicy' })),
  ];
  // Shuffle
  for (let i = allQ.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allQ[i], allQ[j]] = [allQ[j], allQ[i]];
  }
  return allQ.slice(0, 4);
}

export default function CardGame() {
  const user = useUser();
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const bg = isDark ? '#08090E' : '#F8F9FB';
  const cardBg = isDark ? '#141521' : '#FFFFFF';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)';

  const [session, setSession] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [partnerProfile, setPartnerProfile] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const cardsRef = useRef([]);
  cardsRef.current = cards;
  const [selectedCard, setSelectedCard] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState('main'); // 'main' | 'answer' | 'social_result'
  // Social media state (round 6)
  const [socialType, setSocialType] = useState('instagram');
  const [socialHandle, setSocialHandle] = useState('');
  const [answerSocialType, setAnswerSocialType] = useState('phone');
  const [answerSocialHandle, setAnswerSocialHandle] = useState('');

  const pollRef = useRef(null);

  const sessionId = new URLSearchParams(window.location.search).get('session');

  useEffect(() => {
    if (user !== undefined && sessionId) loadData();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [user, sessionId]);

  const loadData = async (silent = false) => {
    if (!user || !sessionId) return;
    if (!silent) setLoading(true);

    const [sessions, roundData] = await Promise.all([
      base44.entities.GameSession.filter({ player1_email: user.email }),
      base44.entities.CardGameRound.filter({ session_id: sessionId }),
    ]);

    // Also check as player2
    const sessionsP2 = await base44.entities.GameSession.filter({ player2_email: user.email });
    const allSessions = [...sessions, ...sessionsP2];
    const sess = allSessions.find(s => s.id === sessionId);

    if (!sess) { setLoading(false); return; }
    setSession(sess);

    // Sort rounds
    const sortedRounds = roundData.sort((a, b) => a.round_number - b.round_number);
    setRounds(sortedRounds);

    // Load profiles
    const partnerEmail = sess.player1_email === user.email ? sess.player2_email : sess.player1_email;
    const [myProfs, partnerProfs] = await Promise.all([
      base44.entities.UserProfile.filter({ user_email: user.email }),
      base44.entities.UserProfile.filter({ user_email: partnerEmail }),
    ]);
    setMyProfile(myProfs[0] || null);
    setPartnerProfile(partnerProfs[0] || null);

    // Generate cards for current round if it's my turn
    const currentRound = sortedRounds.length + 1;
    const myTurn = isMyTurn(sess, sortedRounds, user.email);

    if (myTurn && currentRound <= 6 && !cardsRef.current.length) {
      // Check if there's an unanswered round for me (I need to answer)
      const pendingAnswer = sortedRounds.find(r =>
        r.asker_email !== user.email && !r.answer
      );
      if (!pendingAnswer) {
        const cacheKey = `game_cards_${sessionId}_${currentRound}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            setCards(JSON.parse(cached));
          } catch (e) {
            const newCards = getRandomCards(currentRound);
            localStorage.setItem(cacheKey, JSON.stringify(newCards));
            setCards(newCards);
          }
        } else {
          const newCards = getRandomCards(currentRound);
          localStorage.setItem(cacheKey, JSON.stringify(newCards));
          setCards(newCards);
        }
      }
    }

    if (!silent) setLoading(false);

    // Start polling
    if (!pollRef.current) {
      pollRef.current = setInterval(() => loadData(true), 5000);
    }
  };

  const handleDrawNewCards = (roundNum) => {
    const newCards = getRandomCards(roundNum);
    const cacheKey = `game_cards_${sessionId}_${roundNum}`;
    localStorage.setItem(cacheKey, JSON.stringify(newCards));
    setCards(newCards);
  };

  const isMyTurn = (sess, sortedRounds, email) => {
    // 1. If there is any unanswered round, nobody can ask.
    const unanswered = sortedRounds.find(r => !r.answer);
    if (unanswered) return false;

    // 2. If no rounds played yet, player1 starts.
    if (sortedRounds.length === 0) {
      return sess.player1_email === email;
    }

    // 3. Otherwise, the player who did NOT ask the last round gets to ask.
    const lastRound = sortedRounds[sortedRounds.length - 1];
    return lastRound.asker_email !== email;
  };

  const getPendingAnswerRound = () => {
    return rounds.find(r => r.asker_email !== user?.email && !r.answer);
  };

  const handleSendQuestion = async () => {
    const q = (rounds.length + 1 === 6) ? { question: SOCIAL_QUESTION, category: 'final' } : selectedCard;
    if (!q || submitting) return;
    setSubmitting(true);
    try {
      const nextRound = rounds.length + 1;
      const isLastRound = nextRound === 6;

      await base44.entities.CardGameRound.create({
        session_id: sessionId,
        round_number: nextRound,
        asker_email: user.email,
        question: q.question,
        question_category: q.category,
      });

      await base44.entities.GameSession.update(sessionId, { last_activity: new Date().toISOString() });

      toast.success('Vraag verstuurd! ✅');
      setSelectedCard(null);
      setCards([]);
      loadData(true);
    } catch (e) {
      toast.error('Er ging iets mis');
    }
    setSubmitting(false);
  };

  const handleAnswer = async (round, answer, social = null) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const updateData = { answer, answered_at: new Date().toISOString() };
      if (social) {
        updateData.social_type = social.type;
        updateData.social_handle = social.handle;
      }

      await base44.entities.CardGameRound.update(round.id, updateData);
      await base44.entities.GameSession.update(sessionId, { last_activity: new Date().toISOString() });

      // Check if game is finished (6 answered rounds)
      const newRounds = [...rounds];
      const idx = newRounds.findIndex(r => r.id === round.id);
      if (idx > -1) newRounds[idx] = { ...newRounds[idx], ...updateData };

      const answeredCount = newRounds.filter(r => !!r.answer).length;
      if (answeredCount >= 6) {
        await base44.entities.GameSession.update(sessionId, { status: 'finished', finished_at: new Date().toISOString() });
        toast.success('🎉 Spel afgerond!');
      }

      loadData(true);
    } catch (e) {
      toast.error('Er ging iets mis');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <div className="w-10 h-10 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: bg }}>
        <p className={`font-black text-lg ${textMain}`}>Spel niet gevonden</p>
        <button onClick={() => window.history.back()} className="mt-4 px-6 py-2 rounded-full text-white font-bold" style={{ background: '#FF4B72' }}>Terug</button>
      </div>
    );
  }

  const partnerEmail = session.player1_email === user?.email ? session.player2_email : session.player1_email;
  const partnerName = partnerProfile?.avatar?.split(' ').slice(1).join(' ') || 'je supermatch';
  const totalAnswered = rounds.filter(r => !!r.answer).length;
  const pendingRound = getPendingAnswerRound();
  const myTurn = !pendingRound && isMyTurn(session, rounds, user?.email);
  const nextRoundNum = rounds.length + 1;
  const isFinished = session.status === 'finished' || totalAnswered >= 6;

  return (
    <div className="absolute inset-y-0 left-0 w-full flex flex-col" style={{ background: bg, fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 pt-5 pb-4 flex-shrink-0"
        style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}
      >
        <button onClick={() => window.history.back()} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
          <ArrowLeft className="w-5 h-5" style={{ color: isDark ? 'white' : '#333' }} />
        </button>
        <div className="flex-1">
          <h1 className="font-black text-base" style={{ color: '#FF4B72' }}>🃏 Kaarten Spel</h1>
          <p className="text-xs" style={{ color: textSub }}>Met {partnerName}</p>
        </div>
        {/* Partner avatar */}
        <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6' }}>
          {partnerProfile?.photo_url ? <img src={partnerProfile.photo_url} alt="" className="w-full h-full object-cover" /> : <span className="text-lg">{partnerProfile?.avatar?.split(' ')[0] || '👤'}</span>}
        </div>
      </div>

      <div className="flex-1 px-5 pt-4 space-y-6 overflow-y-auto pb-32">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold tracking-tight text-gray-500 dark:text-gray-300">Voortgang</span>
            <span className="text-sm font-bold text-[#FF4B72]">{totalAnswered}/6 rondes</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: '#FF4B72' }}
              initial={{ width: 0 }}
              animate={{ width: `${(totalAnswered / 6) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Section Heading: GESCHIEDENIS */}
        <div className="pt-2">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">GESCHIEDENIS</p>
        </div>

        {/* Unified chronological list flow */}
        <div className="space-y-4">
          {/* Answered Rounds */}
          {rounds.filter(r => !!r.answer).map((round) => {
            const askedByMe = round.asker_email === user?.email;
            const catInfo = CATEGORY_COLORS[round.question_category] || { color: '#888', bg: 'rgba(128,128,128,0.1)', label: 'Ronde' };
            
            return (
              <div 
                key={round.id} 
                className="rounded-[24px] p-5 flex items-center justify-between gap-4 shadow-[0_4px_16px_rgba(0,0,0,0.02)] border" 
                style={{ 
                  background: cardBg, 
                  borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' 
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span 
                      className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider" 
                      style={{ background: catInfo.bg, color: catInfo.color }}
                    >
                      {catInfo.label || 'Vraag'}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">Ronde {round.round_number}</span>
                  </div>
                  <p className="text-sm font-black text-gray-900 dark:text-white leading-tight">
                    {askedByMe ? 'Jij vroeg:' : `${partnerName} vroeg:`}
                  </p>
                  <p className="text-sm mt-1 text-gray-500 dark:text-gray-300 leading-normal">
                    "{round.question}"
                  </p>
                  
                  {round.social_handle && (
                    <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      {round.social_type === 'phone' ? (
                        <Phone className="w-3.5 h-3.5" />
                      ) : round.social_type === 'instagram' ? (
                        <Instagram className="w-3.5 h-3.5" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
                      <span>{round.social_type === 'phone' ? '' : '@'}{round.social_handle}</span>
                    </div>
                  )}
                </div>

                {/* Checked / Cross indicator */}
                <div 
                  className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
                  style={{
                    background: round.answer === 'yes' ? '#ECFDF5' : '#FEF2F2',
                    color: round.answer === 'yes' ? '#10B981' : '#EF4444',
                  }}
                >
                  {round.answer === 'yes' ? (
                    <Check className="w-5 h-5 stroke-[3]" />
                  ) : (
                    <X className="w-5 h-5 stroke-[3]" />
                  )}
                </div>
              </div>
            );
          })}

          {/* Active Round / Turn State (Waiting, Answering, Asking, or Finished) */}
          {!isFinished && (
            pendingRound ? (
              /* Your turn to ANSWER */
              <div 
                className="rounded-[24px] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02)] border" 
                style={{ 
                  background: cardBg, 
                  borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' 
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span 
                    className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider" 
                    style={{ 
                      background: 'rgba(255,75,114,0.12)', 
                      color: '#FF4B72' 
                    }}
                  >
                    👉 Jouw Beurt
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">Ronde {pendingRound.round_number}</span>
                </div>
                
                <p className="text-sm font-black text-gray-900 dark:text-white leading-tight">
                  {partnerName} vraagt:
                </p>
                <p className="text-sm mt-1 text-gray-500 dark:text-gray-300 leading-normal mb-5">
                  "{pendingRound.question}"
                </p>

                {/* Social media round */}
                {pendingRound.round_number === 6 || pendingRound.question_category === 'final' ? (
                  <div className="space-y-3">
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        onClick={() => { setAnswerSocialType('phone'); }}
                        className="flex-1 min-w-[90px] py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                        style={{
                          background: answerSocialType === 'phone' ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.03)',
                          border: answerSocialType === 'phone' ? '1.5px solid rgba(16,185,129,0.4)' : '1.5px solid transparent',
                          color: answerSocialType === 'phone' ? '#10B981' : (isDark ? 'white' : '#666'),
                        }}
                      >
                        <Phone className="w-3.5 h-3.5" /> Nummer
                      </button>
                      <button
                        onClick={() => { setAnswerSocialType('instagram'); }}
                        className="flex-1 min-w-[90px] py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                        style={{
                          background: answerSocialType === 'instagram' ? 'rgba(139,92,246,0.15)' : 'rgba(0,0,0,0.03)',
                          border: answerSocialType === 'instagram' ? '1.5px solid rgba(139,92,246,0.4)' : '1.5px solid transparent',
                          color: answerSocialType === 'instagram' ? '#8B5CF6' : (isDark ? 'white' : '#666'),
                        }}
                      >
                        <Instagram className="w-3.5 h-3.5" /> Instagram
                      </button>
                      <button
                        onClick={() => { setAnswerSocialType('snapchat'); }}
                        className="flex-1 min-w-[90px] py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                        style={{
                          background: answerSocialType === 'snapchat' ? 'rgba(255,212,0,0.1)' : 'rgba(0,0,0,0.03)',
                          border: answerSocialType === 'snapchat' ? '1.5px solid rgba(255,212,0,0.4)' : '1.5px solid transparent',
                          color: answerSocialType === 'snapchat' ? '#D97706' : (isDark ? 'white' : '#666'),
                        }}
                      >
                        <Camera className="w-3.5 h-3.5" /> Snapchat
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAnswer(pendingRound, 'no')}
                        disabled={submitting}
                        className="flex-1 py-3 rounded-2xl font-black text-sm transition-all active:scale-95 text-[#EF4444]"
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.15)' }}
                      >
                        ❌ Nee
                      </button>
                      <div className="flex-1 space-y-2">
                        <input
                          value={answerSocialHandle}
                          onChange={e => setAnswerSocialHandle(e.target.value)}
                          placeholder={`Jouw ${answerSocialType === 'phone' ? 'nummer' : (answerSocialType === 'instagram' ? 'Insta' : 'Snap')}…`}
                          className={`w-full px-3 py-2.5 rounded-xl text-sm font-bold outline-none ${
                            isDark ? 'bg-white/5 border-white/20 text-white placeholder-white/40' : 'bg-black/5 border-black/10 text-gray-900 placeholder-gray-400'
                          }`}
                          style={{ border: '1px solid' }}
                        />
                        <button
                          onClick={() => {
                            if (!answerSocialHandle.trim()) { toast.error('Vul je gegevens in'); return; }
                            handleAnswer(pendingRound, 'yes', { type: answerSocialType, handle: answerSocialHandle.trim() });
                          }}
                          disabled={submitting}
                          className="w-full py-2.5 rounded-xl font-black text-sm text-white transition-all active:scale-95 bg-[#10B981] hover:bg-[#059669]"
                        >
                          ✅ Ja, deel!
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Normal yes/no */
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAnswer(pendingRound, 'no')}
                      disabled={submitting}
                      className="flex-1 py-3.5 rounded-[16px] font-black text-base transition-all active:scale-95"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.15)', color: '#EF4444' }}
                    >
                      ❌ Nee
                    </button>
                    <button
                      onClick={() => handleAnswer(pendingRound, 'yes')}
                      disabled={submitting}
                      className="flex-1 py-3.5 rounded-[16px] font-black text-base transition-all active:scale-95"
                      style={{ background: 'rgba(16,185,129,0.08)', border: '1.5px solid rgba(16,185,129,0.15)', color: '#10B981' }}
                    >
                      ✅ Ja
                    </button>
                  </div>
                )}
              </div>
            ) : myTurn ? (
              /* Your turn to ASK */
              <div className="space-y-3 pt-2">
                <div className="px-1">
                  <p className="text-xs font-black uppercase tracking-wider text-[#8B5CF6]">
                    Kies een vraagkaart voor {partnerName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-300 mt-0.5">Kies 1 van de 4 onderstaande vragen om te stellen:</p>
                </div>

                {nextRoundNum === 6 ? (
                  /* Round 6: automatic social question */
                  <div className="space-y-4">
                    <div 
                      className="rounded-[24px] p-5 border" 
                      style={{ 
                        background: cardBg, 
                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' 
                      }}
                    >
                      <p className="text-xs font-bold mb-2 text-[#8B5CF6]">🏆 Laatste ronde</p>
                      <p className="text-base font-black text-gray-900 dark:text-white leading-snug">{SOCIAL_QUESTION}</p>
                    </div>
                    <button
                      onClick={() => handleSendQuestion()}
                      disabled={submitting}
                      className="w-full py-4 rounded-2xl font-black text-white text-base transition-all active:scale-[0.97]"
                      style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }}
                    >
                      Verstuur vraag 📲
                    </button>
                  </div>
                ) : (
                  /* Normal round: pick a card */
                  <>

                    <div className="grid grid-cols-2 gap-3">
                      {cards.map((card, i) => {
                        const catInfo = CATEGORY_COLORS[card.category] || { color: '#888', bg: 'rgba(128,128,128,0.1)', label: '' };
                        const isSelected = selectedCard?.question === card.question;
                        return (
                          <motion.button
                            key={i}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setSelectedCard(isSelected ? null : card)}
                            className="rounded-2xl p-4 text-left transition-all flex flex-col justify-between"
                            style={{
                              background: isSelected ? catInfo.bg : (isDark ? '#141521' : '#FFFFFF'),
                              border: isSelected ? `2px solid ${catInfo.color}` : `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                              minHeight: 110,
                            }}
                          >
                            <div>
                              <span className="text-[9px] font-black block mb-1.5" style={{ color: catInfo.color }}>{catInfo.label}</span>
                              <p className="text-xs font-bold leading-snug" style={{ color: isDark ? 'rgba(255,255,255,0.85)' : '#333' }}>{card.question}</p>
                            </div>
                            {isSelected && (
                              <div className="mt-2 flex justify-end">
                                <Check className="w-4 h-4" style={{ color: catInfo.color }} />
                              </div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>

                    <AnimatePresence>
                      {selectedCard && (
                        <motion.button
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          onClick={handleSendQuestion}
                          disabled={submitting}
                          className="w-full py-3.5 rounded-2xl font-black text-white text-base transition-all active:scale-[0.97]"
                          style={{ background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)', boxShadow: '0 8px 24px rgba(255,75,114,0.2)' }}
                        >
                          Verstuur deze vraag →
                        </motion.button>
                      )}
                    </AnimatePresence>


                  </>
                )}
              </div>
            ) : (
              /* Waiting state (inline) */
              <div 
                className="rounded-[24px] p-8 text-center border shadow-[0_4px_16px_rgba(0,0,0,0.02)]" 
                style={{ 
                  background: cardBg, 
                  borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' 
                }}
              >
                <div className="text-4xl mb-4">⏳</div>
                <p className="font-black text-base text-gray-900 dark:text-white">Wachten op {partnerName}...</p>
              </div>
            )
          )}

          {/* Finished State (inline) */}
          {isFinished && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="rounded-[24px] p-6 text-center border" 
              style={{ 
                background: 'rgba(16,185,129,0.05)', 
                borderColor: 'rgba(16,185,129,0.15)' 
              }}
            >
              <div className="text-4xl mb-3">🎉</div>
              <p className="font-black text-base text-gray-900 dark:text-white mb-1">Spel afgerond!</p>
              <p className="text-xs text-gray-500 dark:text-gray-300">Jullie hebben alle 6 rondes gespeeld</p>
              <button 
                onClick={() => window.history.back()} 
                className="mt-4 px-6 py-2.5 rounded-xl font-bold text-white text-xs bg-[#10B981] hover:bg-[#059669]"
              >
                Terug naar spellen
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
