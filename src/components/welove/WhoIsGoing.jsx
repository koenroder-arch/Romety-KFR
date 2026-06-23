import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import ProfileSwiper from './ProfileSwiper';

export default function WhoIsGoing({ myCheckIn, currentUserEmail, allDestinations = [], isDark = true }) {
  const [goingProfiles, setGoingProfiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!myCheckIn) { setGoingProfiles([]); return; }
    loadProfiles();
  }, [myCheckIn?.venue_id, myCheckIn?.venue_name]);

  const loadProfiles = async () => {
    setLoading(true);
    const venueId = myCheckIn.venue_id;
    const venueName = myCheckIn.venue_name;
    const now = new Date().toISOString();

    // Get all destinations for this venue
    const dests = allDestinations.filter((d) => {
      const sameVenue = (venueId && d.venue_id === venueId) || d.venue_name === venueName;
      const active = d.status === 'active' && (!d.expires_at || d.expires_at > now);
      return sameVenue && active && d.user_email !== currentUserEmail;
    });

    if (dests.length === 0) { setGoingProfiles([]); setLoading(false); return; }

    const emails = [...new Set(dests.map((d) => d.user_email))];
    const allProfiles = await base44.entities.UserProfile.list('-created_date', 200);
    const profiles = allProfiles.filter(
      (p) => emails.includes(p.user_email) && p.onboarding_complete
    );

    setGoingProfiles(profiles);
    setLoading(false);
  };

  if (!myCheckIn || goingProfiles.length === 0) return null;

  const cardBg = isDark ? '#1A1A2E' : '#FFFFFF';
  const plainCardBorder = isDark ? '1px solid rgba(255,255,255,0.06)' : 'none';
  const plainCardShadow = isDark ? 'none' : '0 4px 16px rgba(0,0,0,0.06)';
  const textMain = isDark ? 'text-white' : 'text-gray-900';

  return (
    <div className="rounded-[20px] p-4" style={{ background: cardBg, border: plainCardBorder, boxShadow: plainCardShadow }}>
      <ProfileSwiper
        profiles={goingProfiles}
        isPremium={true}
        currentUserEmail={currentUserEmail}
        allDestinations={allDestinations}
        onShowPremium={() => {}}
        onVenueClick={() => {}}
      />
    </div>
  );
}