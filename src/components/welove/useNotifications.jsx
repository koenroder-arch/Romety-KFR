import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

export function useNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let unsubscribe = null;

    // Initial unread count
    base44.entities.Notification.filter({ to_email: user.email, is_read: false }).then(notifs => {
      setUnreadCount(notifs.length);
    }).catch(() => {});

    // Real-time subscription
    unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && event.data?.to_email === user.email) {
        setUnreadCount(prev => prev + 1);
        const msg = event.data.type === 'match'
          ? `🎉 Match! Jij en ${event.data.from_name || 'iemand'} liken elkaar!`
          : `💜 ${event.data.from_name || 'Iemand'} heeft jouw profiel geliked!`;
        toast(msg, { duration: 4000 });
      }
      if (event.type === 'update' && event.data?.to_email === user.email && event.data?.is_read) {
        base44.entities.Notification.filter({ to_email: user.email, is_read: false }).then(notifs => {
          setUnreadCount(notifs.length);
        }).catch(() => {});
      }
    });

    return () => { if (unsubscribe) unsubscribe(); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    const notifs = await base44.entities.Notification.filter({ to_email: user.email, is_read: false });
    await Promise.all(notifs.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    setUnreadCount(0);
  };

  return { unreadCount, markAllRead };
}