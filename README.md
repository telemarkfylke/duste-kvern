# duste-kvern
Henter jobber fra db, kverner data, og oppdaterer i db

## Server og servicebruker
### Moduler og åpninger på server
- Get-AdUser
- NewtonsoftJSON.dll (spør en bjørn)
- Nodejs
- Powershell
- Nettverksåpning mot mongodb-cluster
- Nettverksåpning mot BAS-server (når kjørte IDM-et siste-filer)
- Nettverksåpning mot equitrac
- Nettverksåpning mot FEIDE-server (ad)
### Tilganger for servicebruker som trengs
- Lese filer på nettverksshare (hvis noen filer ligger der)
- Lese employeeNumber

## update-db-users
--Henter brukere fra lokalt ad - kverner dem sammen og laster opp i mongodb (det er brukerne man får opp når man søker i DUST) - kjøres som egen scheduled task et par ganger om dan--
Henter nå brukere fra EntraID, grunnnet elever i sky
Sorteres på ulike brukertyper (ansattVFYLKE, ansattVTFK, elev osv...)

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
- Sjekke om elev / lærer har skoleforhold i begge fylker! FEIDE-test  "eduPersonOrgUnitDN": [
    "OU=Thor Heyerdahl videregående skole,OU=Units,OU=Feide,DC=vtfk,DC=no"
  ], - sof03051 elev har skole i begge fylker, ver1809 - lærer skoler i begge fylker






