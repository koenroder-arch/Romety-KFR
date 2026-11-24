# Romety

Datingapp voor uitgaan: kies waar je vanavond heen gaat, zie wie daar ook is en match.
Gebouwd met React + Vite, als native Android/iOS-app verpakt met Capacitor, met Supabase
als backend (database, inloggen, opslag en realtime).

## Lokaal draaien

1. `npm install`
2. Maak `.env.local` met:

   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<publishable/anon key>
   ```

   Zet hier nooit de `service_role`-sleutel: deze code draait op de telefoon.
3. `npm run dev` (http://localhost:5173)

## Native app bouwen

```
npm run build
npx cap sync
npx cap open android   # of: npx cap open ios
```

De Android-release wordt ondertekend met `android/keystore.properties`. Dat bestand
staat niet in Git.

## Mappen

- `src/pages` – schermen (de routes staan in `src/pages.config.js`)
- `src/components/welove` – onderdelen van de schermen
- `src/lib` – logica (inloggen, matchen, chats, blokkeren, vertalingen)
- `src/api/base44Client.js` – dunne laag over Supabase (naam is historisch)
- `supabase/migrations` – databasewijzigingen (beveiligingsregels, functies)
- `supabase/rollback` – scripts om migraties terug te draaien
- `supabase/email-templates` – e-mails voor inloggen en aanmelden
- `supabase/legacy` – oude, handmatig uitgevoerde SQL (alleen naslag)
