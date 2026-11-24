# Oude SQL-scripts

Deze scripts stonden eerder los in de hoofdmap. Ze zijn ooit met de hand in de
Supabase SQL Editor uitgevoerd, vóór er migraties in `supabase/migrations` waren.

Ze worden niet automatisch uitgevoerd en de app gebruikt ze niet. Ze blijven hier
bewaard als naslag voor hoe het schema is ontstaan.

Let op: sommige scripts zijn destructief (bijvoorbeeld `recreate_hint_table.sql`
gooit de tabel `Hint` weg). Voer ze niet opnieuw uit op de live database.
