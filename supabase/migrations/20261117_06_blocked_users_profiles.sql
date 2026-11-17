-- Lijst met geblokkeerde gebruikers mét hun profiel, zodat je bij het deblokkeren ziet wie het is.
-- Profielen van geblokkeerde gebruikers zijn door de blokkeerregels verborgen; deze functie geeft
-- ze alleen terug aan degene die zelf blokkeerde (nooit aan de geblokkeerde persoon).
-- Terugdraaien: DROP FUNCTION IF EXISTS public.my_blocked_users();

CREATE OR REPLACE FUNCTION public.my_blocked_users()
RETURNS TABLE (
  id uuid,
  created_date timestamptz,
  blocked_name text,
  display_name text,
  age integer,
  bio text,
  photo_url text,
  photos text[],
  avatar text,
  traits jsonb,
  interests jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT b.id, b.created_date, b.blocked_name,
         p.display_name, p.age, p.bio, p.photo_url, p.photos, p.avatar,
         to_jsonb(p.traits), to_jsonb(p.interests)
    FROM public."BlockedUser" b
    LEFT JOIN LATERAL (
      SELECT u.display_name, u.age, u.bio, u.photo_url, u.photos, u.avatar, u.traits, u.interests
        FROM public."UserProfile" u
       WHERE lower(u.user_email) = b.blocked_email
       LIMIT 1
    ) p ON true
   WHERE b.blocker_email = public.my_email()
   ORDER BY b.created_date DESC;
$$;

REVOKE ALL ON FUNCTION public.my_blocked_users() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_blocked_users() TO authenticated;
