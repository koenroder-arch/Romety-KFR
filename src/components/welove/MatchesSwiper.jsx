import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import MatchAnimation from './MatchAnimation';
import StoriesViewer from './StoriesViewer';
import { Heart, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

export default function MatchesSwiper({ profiles, initialLikedIds = [], isPremium, currentUserEmail, onShowPremium, isMutual = false, isDark = true, onSendHint, hasSentToday }) {
  const navigate = useNavigate();
  const [matchAnim, setMatchAnim] = useState(null);
  const [myProfileCache, setMyProfileCache] = useState(null);
  const [likedProfiles, setLikedProfiles] = useState(new Set(initialLikedIds));
  const [doubleTapAnims, setDoubleTapAnims] = useState([]);
  
  // Story viewer state
  const [selectedStoryGroup, setSelectedStoryGroup] = useState(null);

  React.useEffect(() => {
    setLikedProfiles(new Set(initialLikedIds));
  }, [initialLikedIds]);

  const bg = isDark ? 'transparent' : 'transparent';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';

  const handleLike = async (profile) => {
    if (likedProfiles.has(profile.id)) {
      // Remove Like
      setLikedProfiles(prev => { const n = new Set(prev); n.delete(profile.id); return n; });
      const existing = await base44.entities.Like.filter({ from_email: currentUserEmail, to_email: profile.user_email });
      for (const l of existing) {
        await base44.entities.Like.delete(l.id);
      }
      return;
    }
    
    // Add Like
    setLikedProfiles(prev => new Set(prev).add(profile.id));

    let myProf = myProfileCache;
    if (!myProf) {
      const myProfs = await base44.entities.UserProfile.filter({ user_email: currentUserEmail });
      myProf = myProfs[0] || null;
      setMyProfileCache(myProf);
    }
    const myName = myProf?.display_name || 'Iemand';

    await base44.entities.Like.create({ from_email: currentUserEmail, to_email: profile.user_email });

    const existingLikes = await base44.entities.Like.filter({ from_email: profile.user_email, to_email: currentUserEmail });
    if (existingLikes.length > 0) {
      await Promise.all([
        base44.entities.Notification.create({ to_email: profile.user_email, from_email: currentUserEmail, type: 'match', from_name: myName }),
        base44.entities.Notification.create({ to_email: currentUserEmail, from_email: profile.user_email, type: 'match', from_name: 'Een Match' }),
      ]);
      setMatchAnim({ myProfile: myProf, matchedProfile: profile });
    } else {
      await base44.entities.Notification.create({ to_email: profile.user_email, from_email: currentUserEmail, type: 'like', from_name: myName });
    }
  };

  const handleDoubleTap = (e, profile) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const animId = Date.now() + Math.random();
    setDoubleTapAnims(prev => [...prev, { id: animId, profileId: profile.id, x, y }]);
    
    handleLike(profile);
    
    setTimeout(() => {
      setDoubleTapAnims(prev => prev.filter(a => a.id !== animId));
    }, 1000);
  };

  const handleSingleClick = async (profile) => {
    // Fetch stories for this user
    try {
      const nineHoursAgo = new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString();
      const userStories = await base44.entities.Story.filter({ user_email: profile.user_email }, '-created_date', 50);
      const activeStories = userStories.filter(s => s.created_date >= nineHoursAgo);
      
      if (activeStories.length > 0) {
        setSelectedStoryGroup({
          user_email: profile.user_email,
          profile: profile,
          items: activeStories.reverse() // show oldest to newest
        });
      }
    } catch (err) {
      console.error("Error fetching stories:", err);
    }
  };

  if (profiles.length === 0) return (
    <div className="h-full flex flex-col items-center justify-center py-10 px-6 text-center" style={{ background: bg }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: isDark ? 'rgba(255,107,74,0.1)' : 'rgba(255,107,74,0.05)' }}>
        <p className="text-4xl">📭</p>
      </div>
      <p className={`text-lg font-black mb-2 ${textMain}`}>Nog geen {isMutual ? 'super matches' : 'matches'}</p>
      <p className="text-sm max-w-xs mb-6" style={{ color: textSub }}>
        Er is op dit moment niemand nieuw op jouw locatie die aan je voorkeuren voldoet.
      </p>
      <button
        onClick={() => window.location.href = '/pinpoint'}
        className="px-6 py-3 rounded-full font-black text-sm text-white shadow-lg active:scale-95 transition-transform"
        style={{ background: GRAD, boxShadow: '0 8px 24px rgba(255,107,74,0.3)' }}
      >
        🗺️ Bekijk andere clubs
      </button>
    </div>
  );

  if (matchAnim) return (
    <MatchAnimation 
      myProfile={matchAnim.myProfile} 
      matchedProfile={matchAnim.matchedProfile} 
      onDone={() => setMatchAnim(null)} 
      onSendHint={(profile) => {
        setMatchAnim(null);
        if (onSendHint) onSendHint(profile);
      }}
    />
  );

  return (
    <div className="h-full overflow-y-auto snap-y snap-mandatory scroll-smooth flex flex-col" style={{ background: bg }}>
      {profiles.map((profile, index) => {
        const isLiked = likedProfiles.has(profile.id);
        const activeAnims = doubleTapAnims.filter(a => a.profileId === profile.id);

        return (
          <div key={profile.id} className="w-full h-full flex-shrink-0 snap-start snap-always relative">
            
            {/* Photo Background */}
            <div 
              className="absolute inset-0 z-0 bg-gray-900 cursor-pointer"
              onClick={(e) => {
                // Prevent single click firing when double clicking
                if (e.detail === 1) {
                  setTimeout(() => {
                    // Only open story if not double-tapped recently
                    handleSingleClick(profile);
                  }, 250);
                }
              }}
              onDoubleClick={(e) => handleDoubleTap(e, profile)}
            >
              {profile.photo_url ? (
                <img src={profile.photo_url} alt="" className="w-full h-full object-cover select-none pointer-events-none" />
              ) : (
                <div 
                  className="w-full h-full flex flex-col items-center justify-center relative" 
                  style={{ background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 50%, #8A2387 100%)' }}
                >
                  <div className="text-[120px] animate-bounce select-none pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)]">
                    {profile.avatar ? profile.avatar.split(' ')[0] : '👤'}
                  </div>
                  {profile.avatar && (
                    <div className="absolute bottom-32 text-center text-white/50 text-xs font-bold tracking-widest uppercase bg-black/30 px-3.5 py-1.5 rounded-full">
                      {profile.avatar.split(' ').slice(1).join(' ')}
                    </div>
                  )}
                </div>
              )}
              {/* Gradient overlay to make text readable */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
              
              {/* Double Tap Hearts Animation */}
              <AnimatePresence>
                {activeAnims.map(anim => (
                  <motion.div
                    key={anim.id}
                    initial={{ scale: 0, opacity: 1, x: '-50%', y: '-50%' }}
                    animate={{ scale: [0, 1.2, 1], opacity: [1, 1, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, times: [0, 0.4, 1] }}
                    className="absolute pointer-events-none z-20"
                    style={{ left: anim.x, top: anim.y }}
                  >
                    <Heart className="w-24 h-24" fill="#FF6B4A" color="#FF6B4A" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Foreground Content */}
            <div className="relative z-10 flex flex-col h-full p-6 pb-[100px] pointer-events-none">
              {/* Top Right Avatar Badge */}
              <div className="absolute top-6 right-6 z-10 pointer-events-auto">
                {profile.avatar && (
                  <div className="px-3.5 py-1.5 rounded-full text-white font-black text-[14px] flex items-center gap-1 shadow-md tracking-wide" style={{ background: '#FF6B4A' }}>
                    <span>{profile.avatar.split(' ')[0]}</span>
                    <span>{profile.avatar.split(' ').slice(1).join(' ')}</span>
                  </div>
                )}
              </div>

              <div className="mt-auto pointer-events-auto flex flex-col">
                {/* Name/Age/Height */}
                <h2 className="text-[32px] font-black text-white drop-shadow-md leading-none mb-4 tracking-wide">
                  {profile.age} jaar {profile.height_cm ? `• ${profile.height_cm} cm` : ''}
                </h2>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {[...(profile.interests || []), ...(profile.traits || [])].map((tag) => (
                    <span key={tag} className="px-4 py-1.5 rounded-full text-[14px] font-semibold text-white bg-black/35 backdrop-blur-[2px] shadow-sm">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button 
                    onClick={() => handleLike(profile)} 
                    className="flex-1 py-3.5 px-4 rounded-full border border-white/20 bg-black/35 backdrop-blur-sm flex items-center justify-center gap-2.5 text-white font-bold text-[16px] active:scale-95 transition-transform"
                  >
                    <Heart className="w-5 h-5" color={isLiked ? '#FF5A43' : 'white'} fill={isLiked ? '#FF5A43' : 'transparent'} strokeWidth={2.2} />
                    Like
                  </button>
                  <button 
                    onClick={() => !hasSentToday && onSendHint && onSendHint(profile)} 
                    disabled={hasSentToday}
                    className="flex-1 py-3.5 px-4 rounded-full border border-white/20 bg-black/35 backdrop-blur-sm flex items-center justify-center gap-2.5 text-white font-bold text-[16px] active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <MessageCircle className="w-5 h-5" color="white" strokeWidth={2.2} />
                    Hint
                  </button>
                </div>
              </div>
            </div>

          </div>
        );
      })}

      {/* Stories Viewer Overlay */}
      {selectedStoryGroup && (
        <StoriesViewer
          group={selectedStoryGroup}
          allGroups={null} // Only viewing one profile's stories
          onClose={() => setSelectedStoryGroup(null)}
          isDark={isDark}
        />
      )}
    </div>
  );
}