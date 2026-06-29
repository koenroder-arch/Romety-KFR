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
  const [view, setView] = useState('main');

  const [socialType, setSocialType] = useState('instagram');
  const [socialHandle, setSocialHandle] = useState('');
  const [answerSocialType, setAnswerSocialType] = useState('phone');
  const [answerSocialHandle, setAnswerSocialHandle] = useState('');

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

    const [sessions, roundData] = await Promise.all([
      base44.entities.GameSession.filter({ player1_email: user.email }),
      base44.entities.CardGameRound.filter({ session_id: sessionId }),
    ]);

    const sessionsP2 = await base44.entities.GameSession.filter({ player2_email: user.email });
    const allSessions = [...sessions, ...sessionsP2];
    const sess = allSessions.find(s => s.id === sessionId);

    if (!sess) { setLoading(false); return; }
    setSession(sess);

    const sortedRounds = roundData.sort((a, b) => a.round_number - b.round_number);
    setRounds(sortedRounds);

    const partnerEmail = sess.player1_email === user.email ? sess.player2_email : sess.player1_email;
    const [myProfs, partnerProfs] = await Promise.all([
      base44.entities.UserProfile.filter({ user_email: user.email }),
      base44.entities.UserProfile.filter({ user_email: partnerEmail }),
    ]);
    setMyProfile(myProfs[0] || null);
    setPartnerProfile(partnerProfs[0] || null);

    const currentRound = sortedRounds.length + 1;
    const myTurn = isMyTurn(sess, sortedRounds, user.email);

    if (myTurn && currentRound <= 6 && !cardsRef.current.length) {
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

    if (!pollRef.current) {
      pollRef.current = setInterval(() => loadData(true), 5000);
    }
  };

  const isMyTurn = (sess, sortedRounds, email) => {
    const unanswered = sortedRounds.find(r => !r.answer);
    if (unanswered) return false;
    if (sortedRounds.length === 0) return sess.player1_email === email;
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
      <div className="min-h-screen flex items-center justify-center bg-[#0D0E15]">
        <div className="w-12 h-12 rounded-full border-4 border-pink-500/20 border-t-pink-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0D0E15] text-white">
        <p className="font-black text-xl mb-4">Spel niet gevonden</p>
        <button onClick={() => window.history.back()} className="px-6 py-2.5 rounded-full bg-pink-500 font-bold">Terug</button>
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

  const sharedSocialRound = rounds.find(r => r.social_handle && r.answer === 'yes');
  const socialRoundData = sharedSocialRound ? { social_type: sharedSocialRound.social_type, social_handle: sharedSocialRound.social_handle } : null;

  return (
    <div className={`min-h-screen w-full relative overflow-x-hidden flex flex-col justify-between select-none ${isDark ? 'bg-[#0D0E15] text-white' : 'bg-[#F8F9FB] text-gray-900'}`} style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Ambient Background Glows */}
      {isDark && (
        <>
          <div className="absolute top-[-5%] left-[-10%] w-[380px] h-[380px] rounded-full bg-gradient-to-br from-orange-500/30 via-pink-500/20 to-transparent blur-[100px] pointer-events-none" />
          <div className="absolute top-[5%] right-[-10%] w-[380px] h-[380px] rounded-full bg-gradient-to-bl from-purple-600/30 via-indigo-500/20 to-transparent blur-[100px] pointer-events-none" />
        </>
      )}

      {/* Main Container */}
      <div className="relative z-10 flex-1 flex flex-col max-w-md mx-auto w-full px-4 pt-4 pb-12">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between py-2 mb-2">
          <button 
            onClick={() => window.history.back()} 
            className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border transition-all active:scale-95 ${isDark ? 'bg-white/10 border-white/15 text-white hover:bg-white/20' : 'bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200'}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-black tracking-wider text-xl text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-rose-400 to-purple-400">
            ROMETY
          </span>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${isDark ? 'bg-white/10 border-white/10 text-pink-300' : 'bg-pink-50 border-pink-200 text-pink-700'}`}>
            {totalAnswered}/6 RONDEN
          </span>
        </div>

        {/* Title */}
        <div className="text-center my-2">
          <h1 className={`text-3xl font-black tracking-tight drop-shadow-md ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Icebreaker
          </h1>
        </div>

        {/* Avatars with Connecting Beam */}
        <div className="flex items-center justify-center my-4">
          <div className="relative flex items-center gap-8">
            {/* Beam between avatars */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-[3px] bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 shadow-[0_0_15px_rgba(236,72,153,0.9)] rounded-full" />
            
            {/* My Avatar */}
            <div className="relative z-10 w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr from-orange-400 via-pink-500 to-rose-400 shadow-[0_0_20px_rgba(249,115,22,0.5)]">
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-900 flex items-center justify-center">
                {myProfile?.photo_url ? (
                  <img src={myProfile.photo_url} alt="You" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{myProfile?.avatar?.split(' ')[0] || '👤'}</span>
                )}
              </div>
            </div>

            {/* Partner Avatar */}
            <div className="relative z-10 w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr from-purple-500 via-pink-500 to-indigo-400 shadow-[0_0_20px_rgba(168,85,247,0.5)]">
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
                pendingRound ? 'right-16' : myTurn ? 'left-16' : 'left-1/2 -translate-x-1/2'
              }`}
            />

            {/* CARD CONTENT STATES */}
            {!isFinished && (
              pendingRound ? (
                /* ── State 1: Answer Question ── */
                <div className="space-y-6">
                  <div className="text-center">
                    <span className="inline-block text-[11px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full mb-3 bg-pink-500/10 text-pink-600">
                      Ronde {pendingRound.round_number} • {partnerName} vraagt
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black leading-tight text-gray-900 px-2">
                      "{pendingRound.question}"
                    </h2>
                  </div>

                  {/* Social round answering */}
                  {pendingRound.round_number === 6 || pendingRound.question_category === 'final' ? (
                    <div className="space-y-4">
                      <div className="flex gap-2 p-1.5 bg-black/5 rounded-2xl">
                        {['phone', 'instagram', 'snapchat'].map((type) => (
                          <button
                            key={type}
                            onClick={() => setAnswerSocialType(type)}
                            className={`flex-1 py-2.5 rounded-xl font-black text-xs capitalize transition-all flex items-center justify-center gap-1.5 ${
                              answerSocialType === type 
                                ? 'bg-white text-gray-900 shadow-sm' 
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            {type === 'phone' && <Phone className="w-3.5 h-3.5" />}
                            {type === 'instagram' && <Instagram className="w-3.5 h-3.5" />}
                            {type === 'snapchat' && <Camera className="w-3.5 h-3.5" />}
                            {type}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleAnswer(pendingRound, 'no')}
                          disabled={submitting}
                          className="px-5 py-3.5 rounded-2xl font-black text-sm bg-red-100 text-red-600 hover:bg-red-200 transition-all active:scale-95"
                        >
                          ❌ Nee
                        </button>
                        <div className="flex-1 space-y-2">
                          <input
                            value={answerSocialHandle}
                            onChange={e => setAnswerSocialHandle(e.target.value)}
                            placeholder={`Jouw ${answerSocialType === 'phone' ? 'nummer' : (answerSocialType === 'instagram' ? 'Insta' : 'Snap')}…`}
                            className="w-full px-4 py-3 rounded-2xl text-sm font-bold bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <button
                            onClick={() => {
                              if (!answerSocialHandle.trim()) { toast.error('Vul je gegevens in'); return; }
                              handleAnswer(pendingRound, 'yes', { type: answerSocialType, handle: answerSocialHandle.trim() });
                            }}
                            disabled={submitting}
                            className="w-full py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-105 transition-all active:scale-95 shadow-md"
                          >
                            ✅ Ja, deel!
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Standard Yes / No option buttons */
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <button
                        onClick={() => handleAnswer(pendingRound, 'no')}
                        disabled={submitting}
                        className="group relative rounded-2xl p-5 flex flex-col items-center justify-center text-center text-white font-black text-lg transition-all transform active:scale-95 shadow-lg overflow-hidden bg-gradient-to-br from-red-400 via-rose-500 to-red-600 hover:brightness-105"
                        style={{ minHeight: '130px' }}
                      >
                        <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">❌</span>
                        <span>Nee</span>
                      </button>

                      <button
                        onClick={() => handleAnswer(pendingRound, 'yes')}
                        disabled={submitting}
                        className="group relative rounded-2xl p-5 flex flex-col items-center justify-center text-center text-white font-black text-lg transition-all transform active:scale-95 shadow-lg overflow-hidden bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 hover:brightness-105"
                        style={{ minHeight: '130px' }}
                      >
                        <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">✅</span>
                        <span>Ja</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : myTurn ? (
                /* ── State 2: Ask Question ── */
                <div className="space-y-5">
                  <div className="text-center">
                    <span className="inline-block text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-2 bg-purple-500/10 text-purple-700">
                      Ronde {nextRoundNum} • Jouw beurt
                    </span>
                    <h2 className="text-xl font-black text-gray-900">
                      {nextRoundNum === 6 ? 'Social Media Vraag 📲' : `Kies een vraag voor ${partnerName}:`}
                    </h2>
                  </div>

                  {nextRoundNum === 6 ? (
                    <div className="space-y-4 pt-2">
                      <p className="text-base font-bold text-gray-800 bg-white/80 p-5 rounded-2xl border border-purple-100 text-center leading-relaxed shadow-sm">
                        "{SOCIAL_QUESTION}"
                      </p>
                      <button
                        onClick={() => handleSendQuestion()}
                        disabled={submitting}
                        className="w-full py-4 rounded-2xl font-black text-white text-base bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 shadow-lg hover:brightness-105 transition-all active:scale-95"
                      >
                        Verstuur vraag 📲
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        {cards.map((card, i) => {
                          const catInfo = CATEGORY_COLORS[card.category] || { color: '#888', label: 'Vraag' };
                          const isSelected = selectedCard?.question === card.question;
                          return (
                            <button
                              key={i}
                              onClick={() => setSelectedCard(isSelected ? null : card)}
                              className={`rounded-2xl p-4 text-left transition-all flex flex-col justify-between min-h-[115px] relative overflow-hidden transform active:scale-95 ${
                                isSelected 
                                  ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md ring-4 ring-purple-300' 
                                  : 'bg-white text-gray-900 border border-gray-200/80 hover:border-purple-300 shadow-sm'
                              }`}
                            >
                              <div>
                                <span className={`text-[10px] font-black uppercase tracking-wider block mb-1.5 ${isSelected ? 'text-pink-200' : ''}`} style={{ color: isSelected ? undefined : catInfo.color }}>
                                  {catInfo.label}
                                </span>
                                <p className="text-xs font-bold leading-snug">
                                  {card.question}
                                </p>
                              </div>
                              {isSelected && (
                                <div className="mt-2 flex justify-end">
                                  <Check className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </button>
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
                            className="w-full py-4 rounded-2xl font-black text-white text-base bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 shadow-lg hover:brightness-105 transition-all active:scale-95"
                          >
                            Verstuur vraag naar {partnerName} →
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              ) : (
                /* ── State 3: Waiting ── */
                <div className="py-8 text-center space-y-3">
                  <div className="text-5xl animate-bounce">⏳</div>
                  <h2 className="text-xl font-black text-gray-900">Wachten op {partnerName}...</h2>
                  <p className="text-xs text-gray-500 font-medium">Zodra {partnerName} reageert zie je het hier meteen!</p>
                </div>
              )
            )}

            {/* Finished State */}
            {isFinished && (
              socialRoundData ? (
                <div className="py-4 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-400 flex items-center justify-center text-3xl shadow-lg animate-bounce">
                    {socialRoundData.social_type === 'phone' ? '📞' : socialRoundData.social_type === 'instagram' ? '📸' : '👻'}
                  </div>
                  
                  <div>
                    <span className="inline-block text-[11px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full mb-2 bg-purple-500/10 text-purple-700">
                      🎉 Supermatch Contact!
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                      {partnerName} heeft {socialRoundData.social_type === 'phone' ? 'telefoonnummer' : socialRoundData.social_type === 'instagram' ? 'Instagram' : 'Snapchat'} gedeeld!
                    </h2>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-purple-200 shadow-md flex items-center justify-center gap-3 my-2">
                    {socialRoundData.social_type === 'phone' ? (
                      <Phone className="w-6 h-6 text-emerald-600" />
                    ) : socialRoundData.social_type === 'instagram' ? (
                      <Instagram className="w-6 h-6 text-pink-600" />
                    ) : (
                      <Camera className="w-6 h-6 text-amber-500" />
                    )}
                    <span className="text-xl font-black text-gray-900 tracking-wide select-all">
                      {socialRoundData.social_type === 'phone' ? '' : '@'}{socialRoundData.social_handle}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(socialRoundData.social_handle);
                        toast.success('Gekopieerd naar klembord!');
                      }}
                      className="flex-1 py-3 rounded-2xl font-black text-xs bg-gray-100 text-gray-800 hover:bg-gray-200 transition-all active:scale-95 shadow-sm"
                    >
                      📋 Kopieer
                    </button>
                    {socialRoundData.social_type === 'instagram' && (
                      <a
                        href={`https://instagram.com/${socialRoundData.social_handle.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-3 rounded-2xl font-black text-xs text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:brightness-105 transition-all active:scale-95 text-center flex items-center justify-center shadow-md"
                      >
                        Open Insta ↗
                      </a>
                    )}
                  </div>

                  <button 
                    onClick={() => window.history.back()} 
                    className="mt-2 w-full py-3 rounded-2xl font-bold text-gray-500 text-xs hover:text-gray-900 transition-all"
                  >
                    Terug naar spellen
                  </button>
                </div>
              ) : (
                <div className="py-6 text-center space-y-4">
                  <div className="text-5xl animate-bounce">🎉</div>
                  <h2 className="text-2xl font-black text-gray-900">Spel Afgerond!</h2>
                  <p className="text-sm font-bold text-gray-600">Jullie hebben alle 6 rondes succesvol gespeeld!</p>
                  <button 
                    onClick={() => window.history.back()} 
                    className="px-8 py-3.5 rounded-2xl font-black text-white text-sm bg-gradient-to-r from-emerald-500 to-teal-600 shadow-md hover:brightness-105 active:scale-95 transition-all"
                  >
                    Terug naar spellen
                  </button>
                </div>
              )
            )}

          </div>
        </div>

        {/* History Section (Geschiedenis) */}
        <div className="mt-4 space-y-3">
          <p className={`text-xs font-black uppercase tracking-widest px-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            GESCHIEDENIS ({rounds.filter(r => !!r.answer).length}/6)
          </p>

          <div className="space-y-3">
            {rounds.filter(r => !!r.answer).map((round) => {
              const askedByMe = round.asker_email === user?.email;
              
              return (
                <div 
                  key={round.id} 
                  className={`rounded-2xl p-4 flex items-center justify-between gap-3 border backdrop-blur-sm ${
                    isDark 
                      ? 'bg-white/5 border-white/10' 
                      : 'bg-white border-gray-200/80 shadow-sm'
                  }`} 
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                        isDark ? 'bg-white/10 text-pink-300' : 'bg-pink-100 text-pink-700'
                      }`}>
                        Ronde {round.round_number}
                      </span>
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{askedByMe ? 'Jij vroeg' : `${partnerName} vroeg`}</span>
                    </div>
                    <p className={`text-xs font-bold truncate ${isDark ? 'text-white/90' : 'text-gray-900'}`}>
                      "{round.question}"
                    </p>
                    {round.social_handle && (
                      <div className={`mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {round.social_type === 'phone' ? <Phone className="w-3 h-3" /> : round.social_type === 'instagram' ? <Instagram className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
                        <span>{round.social_type === 'phone' ? '' : '@'}{round.social_handle}</span>
                      </div>
                    )}
                  </div>

                  <div 
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-xs"
                    style={{
                      background: round.answer === 'yes' ? (isDark ? 'rgba(16,185,129,0.2)' : '#D1FAE5') : (isDark ? 'rgba(239,68,68,0.2)' : '#FEE2E2'),
                      color: round.answer === 'yes' ? (isDark ? '#34D399' : '#047857') : (isDark ? '#F87171' : '#B91C1C'),
                    }}
                  >
                    {round.answer === 'yes' ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-4 h-4 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

