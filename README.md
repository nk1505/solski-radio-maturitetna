# Šolski radio

## Opis naloge

Naloga "Šolski radio" je šolska maturitetna naloga, ki predstavlja spletno aplikacijo za nalaganje in predvajanje v živo glasbe na spletni predvajalnik. Namen naloge je, da se ustvari spletno aplikacijo, ki jo bomo lahko priklopili na naš oddajnik in jo bomo lahko uporabili za predvajanje glasbe.

## Funkcionalnosti

- Nalaganje glasbe v aplikacijo (pomoč z avtomatsko dopolnitvijo imena avtorja in pesmi)
- Baza vseh pesmi z možnostjo dodajanja in odstranjevanja pesmi z liste predvajanja
- Intrgracija z OpenID strežnikom (za namene testiranja sem uporabljal Keycloak)
- Predvajanje pesmi s prikazovanjem pesmi, ki se v tistem trenutku predvaja

## Tehnologije

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js, ...
- **Avtentikacija in avtorizacija:** OpenID
- **Ostalo:** Git (za verzioniranje)

## Namestitev

1. Klonirajte repozitorij na svoj računalnik.
2. Zaženite `npm install` v korenskem direktoriju za namestitev odvisnosti.
3. Konfigurirajte okoljske spremenljivke v datoteki .env
4. Narediš mapi playing ter uploads.
5. V mapi playing in uploads daš vsaj eno pesem v formatu ```Ime avtorja - Ime pesmi.mp3```
6. Zaženite `npm start` za zagon aplikacije.

## Avtor

- [Nejc Kraševec](https://github.com/nk1505)