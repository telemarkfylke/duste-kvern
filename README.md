# duste-kvern
Henter jobber fra db, kverner data, og oppdaterer i db

##
VT-alle-lærere i update-db-users (ps1 scriptet) må fikses for å sjekke om det er en lærer ???

## update-db-users
Henter brukere fra lokalt ad - kverner dem sammen og laster opp i mongodb (det er brukerne man får opp når man søker i DUST) - kjøres som egen scheduled task et par ganger om dan

## duste-kverna
### index.js
- Henter nye rapporter fra mongodb
  - Setter rapporter til hentet, slik at de ikke hentes dobbelt opp
- Mellomlagrer data (i tilfelle noe går krøll)
- Kjører handle-dust-report på alle rapporter (promiseAll for litt fart)

### handle-dust-report.js
- Setter opp systemer og tester basert på userType (setup-user-tests.js) (som kommer fra mongodb users collection, som igjen kommer fra update-db-users)
- Skriver tilbake til mongodb hvilke tester og systemer som skal kjøres for live updates
- Fyrer av datahenting for alle systemer + kjører tester som kun trenger data fra sitt eget system
- Resultatet av tester dunkes opp til mongodb når de er ferdige for live updates
- Fyrer så av system-tests som er avhengig av andre systemers data (for da er data hentet)
- Resultatet av tester dunkes opp til mongodb når de er ferdige for live updates
- Rapporten settes til ferdig i mongodb, og slettes fra cache på server
- Oppretter et element i statistikk-databasen for å kunne skryte


## IDEER TIL TESTER
- Sjekk om eleven er i sperremodus






