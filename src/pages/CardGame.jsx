import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useUser } from '@/lib/useUser';
import { useTheme } from '@/lib/ThemeContext';
import { ArrowLeft, Check, X, Instagram, Camera, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { trNow } from '@/lib/LanguageContext';
import { dt } from '@/lib/displayText';

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

// Engelse versies, in exact dezelfde volgorde als QUESTIONS hierboven.
// In de database blijft de Nederlandse vraag staan; op het scherm tonen we qText(vraag).
const QUESTIONS_EN = {
  oppervlakkig: [
    "Have you ever nicked a towel or mini shampoo from a hotel?",
    "Are you a dog person or a cat person?",
    "Has your bank card ever been declined at the checkout because your balance was empty?",
    "Do you ever listen to Christmas music in the middle of summer?",
    "Do you have an app on your phone right now that you really should delete?",
    "Would you join a trashy reality show for a big bag of money?",
    "Did you check your hair in the mirror today before you came here?",
    "Have you ever accidentally sent a wrong snap or text to your boss or parents?",
    "Do you always sleep on exactly the same side of the bed?",
    "Have you ever ducked away in the supermarket to avoid someone you know?",
    "Do you always order the same thing when you eat out?",
    "Have you ever binge-watched an entire series in one weekend?",
    "Do you ever sing along at the top of your lungs in the car when you're alone?",
    "Have you ever walked out of the cinema because the movie was really bad?",
    "Do you have clothes in your closet with the price tag still on?",
    "Do you always eat your pizza crusts?",
    "Have you ever got a big bruise while going out?",
    "Have you ever sneaked into a VIP area or party?",
    "Do you check the menu online before you're even in the restaurant?",
    "Have you already used an excuse this week to get out of something?",
    "Have you ever got lost in Ikea?",
    "Have you ever tried to do a TikTok dance in front of the mirror?",
    "Did you hit snooze on your alarm this morning?",
  ],
  diepgaand: [
    "Do you believe in love at first sight or is that nonsense?",
    "Have you ever passed on a juicy piece of gossip that really had to stay secret?",
    "Are you completely happy with where you are in life right now?",
    "Do you find it hard to set boundaries with people close to you?",
    "Have you ever regretted breaking up with your ex?",
    "Would you hand in your notice tomorrow if you won the lottery?",
    "Have you ever pretended not to care when someone broke your heart?",
    "Do you believe people can really change 180 degrees?",
    "Do you find it easy to admit your mistakes and say sorry?",
    "Have you ever ended a friendship because that person became too toxic?",
    "Are you ever unsure whether you're good enough for your friends?",
    "Do you make choices purely on feeling instead of with your head?",
    "Do you ever lie awake over a cringe moment from years ago?",
    "Do you enjoy being completely alone for a few days to recharge?",
    "Have you ever taken on a different personality to fit in?",
    "Has there been an event in your life that changed you completely?",
    "Do you believe in 'everything happens for a reason'?",
    "Do you find it hard to ask for help when you're stuck mentally?",
    "Have you ever sat crying in the car while listening to music?",
    "Do you ever get a bit jealous of those perfect lives on Insta?",
    "Would you gatekeep a secret if you knew the truth would hurt someone?",
    "Do you have a big dream you tell no one because you think it's delulu?",
    "Are you secretly a bit scared of getting older?",
    "Do you feel like you can be one hundred percent yourself with me?",
  ],
  spicy: [
    "Have you ever had a one-night stand where you thought: I need to get out of here NOW?",
    "Do you think you have good rizz in the bedroom?",
    "Have you ever accidentally sent a spicy photo to the wrong person?",
    "Have you ever been caught making out with someone?",
    "Do you find it hot when someone takes the lead in bed?",
    "Have you ever had a threesome (or is it on your bucket list)?",
    "Have you ever done it in a public place?",
    "Have you ever bought a sex toy for yourself or your partner?",
    "Do you like a bit of dirty talk during sex?",
    "Do you ever shamelessly check out someone's behind as they walk away?",
    "Have you ever been in love with two people at the same time?",
    "Do you have a wildest fantasy you haven't shared with anyone yet?",
  ],
};

// The last round (6) is always the social media question
const SOCIAL_QUESTION = "Wil je je telefoonnummer, Instagram of Snapchat met me delen? 📲";
const SOCIAL_QUESTION_EN = "Do you want to share your phone number, Instagram or Snapchat with me? 📲";

// Nederlandse vraag → Engelse vraag (op index)
const QUESTION_EN_MAP = Object.fromEntries([
  [SOCIAL_QUESTION, SOCIAL_QUESTION_EN],
  ...Object.keys(QUESTIONS).flatMap((cat) => QUESTIONS[cat].map((q, i) => [q, QUESTIONS_EN[cat]?.[i] || q])),
]);
const QUESTION_NL_MAP = Object.fromEntries(Object.entries(QUESTION_EN_MAP).map(([nl, en]) => [en, nl]));

// Toon een (opgeslagen) vraag in de taal van de kijker
const qText = (q) => (trNow('nl', 'en') === 'en' ? (QUESTION_EN_MAP[q] || q) : (QUESTION_NL_MAP[q] || q));

const CATEGORY_COLORS = {
  oppervlakkig: { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', get label() { return trNow('🤩 Oppervlakkig', '🤩 Light'); } },
  diepgaand: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', get label() { return trNow('💭 Diepgaand', '💭 Deep'); } },
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
  const initialLoadedRef = useRef(false);
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

  const userEmail = user?.email || (user ? 'logged_in' : null);
  useEffect(() => {
    if (user !== undefined && sessionId) {
      loadData(initialLoadedRef.current);
      pollRef.current = setInterval(() => {
        loadData(true);
      }, 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [userEmail, user === undefined, sessionId]);

  const loadData = async (silent = false) => {
    if (!user || !sessionId) return;
    if (!initialLoadedRef.current && !silent) setLoading(true);

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

    setLoading(false);
    initialLoadedRef.current = true;

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

      const partnerEmail = session.player1_email === user.email ? session.player2_email : session.player1_email;
      await base44.entities.Notification.create({
        to_email: partnerEmail,
        from_email: user.email,
        type: 'game',
        from_name: myProfile?.display_name || 'Je match',
      }).catch(err => console.error("Error creating game notification:", err));

      toast.success(trNow('Vraag verstuurd! ✅', 'Question sent! ✅'));
      setSelectedCard(null);
      setCards([]);
      loadData(true);
    } catch (e) {
      toast.error(trNow('Er ging iets mis', 'Something went wrong'));
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

      const partnerEmail = session.player1_email === user.email ? session.player2_email : session.player1_email;
      await base44.entities.Notification.create({
        to_email: partnerEmail,
        from_email: user.email,
        type: 'game',
        from_name: myProfile?.display_name || 'Je match',
      }).catch(err => console.error("Error creating game notification:", err));

      const newRounds = [...rounds];
      const idx = newRounds.findIndex(r => r.id === round.id);
      if (idx > -1) newRounds[idx] = { ...newRounds[idx], ...updateData };

      const answeredCount = newRounds.filter(r => !!r.answer).length;
      if (answeredCount >= 6) {
        await base44.entities.GameSession.update(sessionId, { status: 'finished', finished_at: new Date().toISOString() });
        toast.success(trNow('🎉 Spel afgerond!', '🎉 Game finished!'));
      }

      loadData(true);
    } catch (e) {
      toast.error(trNow('Er ging iets mis', 'Something went wrong'));
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
        <p className="font-black text-xl mb-4">{trNow('Spel niet gevonden', 'Game not found')}</p>
        <button onClick={() => window.history.back()} className="px-6 py-2.5 rounded-full bg-pink-500 font-bold">{trNow('Terug', 'Back')}</button>
      </div>
    );
  }

  const partnerEmail = session.player1_email === user?.email ? session.player2_email : session.player1_email;
  const partnerName = dt(partnerProfile?.avatar?.split(' ').slice(1).join(' ')) || trNow('je supermatch', 'your supermatch');
  
  const totalAnswered = rounds.filter(r => !!r.answer).length;
  const pendingRound = getPendingAnswerRound();
  const myTurn = !pendingRound && isMyTurn(session, rounds, user?.email);
  const nextRoundNum = rounds.length + 1;
  const isFinished = session.status === 'finished' || totalAnswered >= 6;

  const sharedSocialRound = rounds.find(r => r.social_handle && r.answer === 'yes');
  const socialRoundData = sharedSocialRound ? { social_type: sharedSocialRound.social_type, social_handle: sharedSocialRound.social_handle } : null;
  const didIShare = sharedSocialRound ? (sharedSocialRound.asker_email !== user?.email) : false;

  return (
    <div className={`min-h-screen w-full max-w-md mx-auto relative overflow-x-hidden flex flex-col justify-between select-none ${isDark ? 'bg-[#0D0E15] text-white' : 'bg-[#F8F9FB] text-gray-900'}`} style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Ambient Background Glows */}
      {isDark && (
        <>
          <div className="absolute top-[-5%] left-[-10%] w-[380px] h-[380px] rounded-full bg-gradient-to-br from-orange-500/30 via-pink-500/20 to-transparent blur-[100px] pointer-events-none" />
          <div className="absolute top-[5%] right-[-10%] w-[380px] h-[380px] rounded-full bg-gradient-to-bl from-purple-600/30 via-indigo-500/20 to-transparent blur-[100px] pointer-events-none" />
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
                      {trNow('Ronde', 'Round')} {pendingRound.round_number} • {partnerName} {trNow('vraagt', 'asks')}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black leading-tight text-gray-900 px-2">
                      "{qText(pendingRound.question)}"
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
                          ❌ {trNow('Nee', 'No')}
                        </button>
                        <div className="flex-1 space-y-2">
                          <input
                            value={answerSocialHandle}
                            onChange={e => setAnswerSocialHandle(e.target.value)}
                            placeholder={`${trNow('Jouw', 'Your')} ${answerSocialType === 'phone' ? trNow('nummer', 'number') : (answerSocialType === 'instagram' ? 'Insta' : 'Snap')}…`}
                            className="w-full px-4 py-3 rounded-2xl text-sm font-bold bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <button
                            onClick={() => {
                              if (!answerSocialHandle.trim()) { toast.error(trNow('Vul je gegevens in', 'Fill in your details')); return; }
                              handleAnswer(pendingRound, 'yes', { type: answerSocialType, handle: answerSocialHandle.trim() });
                            }}
                            disabled={submitting}
                            className="w-full py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-105 transition-all active:scale-95 shadow-md"
                          >
                            ✅ {trNow('Ja, deel!', 'Yes, share!')}
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
                        <span>{trNow('Nee', 'No')}</span>
                      </button>

                      <button
                        onClick={() => handleAnswer(pendingRound, 'yes')}
                        disabled={submitting}
                        className="group relative rounded-2xl p-5 flex flex-col items-center justify-center text-center text-white font-black text-lg transition-all transform active:scale-95 shadow-lg overflow-hidden bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 hover:brightness-105"
                        style={{ minHeight: '130px' }}
                      >
                        <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">✅</span>
                        <span>{trNow('Ja', 'Yes')}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : myTurn ? (
                /* ── State 2: Ask Question ── */
                <div className="space-y-5">
                  <div className="text-center">
                    <span className="inline-block text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-2 bg-purple-500/10 text-purple-700">
                      {trNow('Ronde', 'Round')} {nextRoundNum} • {trNow('Jouw beurt', 'Your turn')}
                    </span>
                    <h2 className="text-xl font-black text-gray-900">
                      {nextRoundNum === 6 ? trNow('Social Media Vraag 📲', 'Social Media Question 📲') : trNow(`Kies een vraag voor ${partnerName}:`, `Choose a question for ${partnerName}:`)}
                    </h2>
                  </div>

                  {nextRoundNum === 6 ? (
                    <div className="space-y-4 pt-2">
                      <p className="text-base font-bold text-gray-800 bg-white/80 p-5 rounded-2xl border border-purple-100 text-center leading-relaxed shadow-sm">
                        "{qText(SOCIAL_QUESTION)}"
                      </p>
                      <button
                        onClick={() => handleSendQuestion()}
                        disabled={submitting}
                        className="w-full py-4 rounded-2xl font-black text-white text-base bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 shadow-lg hover:brightness-105 transition-all active:scale-95"
                      >
                        {trNow('Verstuur vraag 📲', 'Send question 📲')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        {cards.map((card, i) => {
                          const catInfo = CATEGORY_COLORS[card.category] || { color: '#888', label: trNow('Vraag', 'Question') };
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
                                  {qText(card.question)}
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
                  <h2 className="text-xl font-black text-gray-900">{trNow('Wachten op', 'Waiting for')} {partnerName}...</h2>
                  <p className="text-xs text-gray-500 font-medium">{trNow(`Zodra ${partnerName} reageert zie je het hier meteen!`, `As soon as ${partnerName} responds you will see it here right away!`)}</p>
                </div>
              )
            )}

            {/* Finished State */}
            {/* Finished State */}
            {isFinished && (
              socialRoundData ? (
                didIShare ? (
                  <div className="py-6 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center text-3xl shadow-lg animate-bounce">
                      ✅
                    </div>
                    <div>
                      <span className="inline-block text-[11px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full mb-2 bg-emerald-500/10 text-emerald-700">
                        {trNow('Antwoord verstuurd!', 'Answer sent!')}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                        {trNow('Je hebt je', 'You shared your')} {socialRoundData.social_type === 'phone' ? trNow('telefoonnummer', 'phone number') : socialRoundData.social_type === 'instagram' ? 'Instagram' : 'Snapchat'} {trNow('gedeeld met', 'with')} {partnerName}!
                      </h2>
                    </div>
                    <button 
                      onClick={() => window.history.back()} 
                      className="w-full py-4 rounded-2xl font-black text-white text-base bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg hover:brightness-105 transition-all active:scale-95"
                    >
                      {trNow('Terug naar spellen', 'Back to games')}
                    </button>
                  </div>
                ) : (
                  <div className="py-4 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-400 flex items-center justify-center text-3xl shadow-lg animate-bounce">
                      {socialRoundData.social_type === 'phone' ? '📞' : socialRoundData.social_type === 'instagram' ? '📸' : '👻'}
                    </div>
                    
                    <div>
                      <span className="inline-block text-[11px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full mb-2 bg-purple-500/10 text-purple-700">
                        🎉 Supermatch Contact!
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                        {partnerName} {trNow('heeft', 'shared')} {socialRoundData.social_type === 'phone' ? trNow('telefoonnummer', 'phone number') : socialRoundData.social_type === 'instagram' ? 'Instagram' : 'Snapchat'}{trNow(' gedeeld!', '!')}
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
                          toast.success(trNow('Gekopieerd naar klembord!', 'Copied to clipboard!'));
                        }}
                        className="flex-1 py-3 rounded-2xl font-black text-xs bg-gray-100 text-gray-800 hover:bg-gray-200 transition-all active:scale-95 shadow-sm"
                      >
                        📋 {trNow('Kopieer', 'Copy')}
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
                      {trNow('Terug naar spellen', 'Back to games')}
                    </button>
                  </div>
                )
              ) : (
                <div className="py-6 text-center space-y-4">
                  <div className="text-5xl animate-bounce">🎉</div>
                  <h2 className="text-2xl font-black text-gray-900">{trNow('Spel Afgerond!', 'Game Finished!')}</h2>
                  <p className="text-sm font-bold text-gray-600">{trNow('Jullie hebben alle 6 rondes succesvol gespeeld!', 'You played all 6 rounds successfully!')}</p>
                  <button 
                    onClick={() => window.history.back()} 
                    className="px-8 py-3.5 rounded-2xl font-black text-white text-sm bg-gradient-to-r from-emerald-500 to-teal-600 shadow-md hover:brightness-105 active:scale-95 transition-all"
                  >
                    {trNow('Terug naar spellen', 'Back to games')}
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
                        {trNow('Ronde', 'Round')} {round.round_number}
                      </span>
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{askedByMe ? trNow('Jij vroeg', 'You asked') : `${partnerName} ${trNow('vroeg', 'asked')}`}</span>
                    </div>
                    <p className={`text-xs font-bold truncate ${isDark ? 'text-white/90' : 'text-gray-900'}`}>
                      "{qText(round.question)}"
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

