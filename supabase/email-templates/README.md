# E-mailsjablonen voor Supabase

Deze sjablonen plak je in Supabase: **Authentication → Emails → Templates**.

| Sjabloon in Supabase | Bestand | Onderwerp |
|---|---|---|
| Magic Link | `magic-link.html` | Je inlogcode voor Romety |
| Confirm signup | `confirm-signup.html` | Welkom bij Romety, bevestig je e-mailadres |

- `{{ .Token }}` is de code die gebruikers in de app invullen.
- Het logo komt van `{{ .SiteURL }}/romety-logo-email.png`. De **Site URL** in Supabase
  (Authentication → URL Configuration) moet dus het adres van de live app zijn, en
  `public/romety-logo-email.png` moet daar online staan.
