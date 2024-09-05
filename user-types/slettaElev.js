const { warn } = require('../lib/test-result')
const systemNames = require('../systems/system-names')

const systemsAndTests = [
  // System
  {
    id: 'info',
    name: systemNames.info,
    // Tester
    tests: [
      {
        id: 'info_deleted',
        title: 'Brukeren er sletta',
        description: 'Gir beskjed om at brukeren er sletta',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          return warn({ message: 'Elevens konto er slettet' })
        }
      }
    ]
  },
  {
    id: 'fint-elev',
    name: systemNames.vis,
    // Tester
    tests: [
      {
        id: 'fint_student_utgatte_elevforhold',
        title: 'Har aktiv(e) eller utgått(e) elevforhold',
        description: 'Sjekker om bruker har aktiv(e) eller utgått(e) elevforhold',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          if (!systemData) return warn({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis} dersom eleven ikke skal være sletta` })
          const aktiveElevforhold = systemData.elevforhold.filter(forhold => forhold.aktiv)
          if (aktiveElevforhold.length > 0) return warn({ message: `Har ${aktiveElevforhold.length} aktiv${aktiveElevforhold.length === 1 ? 't' : 'e'} elevforhold, men er sletta!`, raw: systemData.elevforhold, solution: 'Vent på sync, om det ikke hjelper ta kontakt med arbeidsgruppe identitet' })
          const inaktiveElevforhold = systemData.elevforhold.filter(forhold => !forhold.aktiv)
          if (inaktiveElevforhold.length === 0) return warn({ message: 'Har ingen elevforhold i det hele tatt', solution: `Rettes i ${systemNames.vis} dersom eleven skal ha elevforhold` })
          const elevfoholdInTheFuture = inaktiveElevforhold.find(forhold => new Date() < new Date(forhold.gyldighetsperiode.start))
          if (elevfoholdInTheFuture) return warn({ message: `Elevens elevforhold begynner ikke før ${elevfoholdInTheFuture.gyldighetsperiode.start.substring(0,10)}`, solution: `Sannsynligvis ikke noe problem, hvertfall ikke hvis det er like før skolestart. Men om det er midt i skoleåret kan det rettes i ${systemNames.vis}` })
          if (inaktiveElevforhold.length > 0) {
            const mappedRaw = systemData.elevforhold.map(forhold => {
              return {
                systemId: forhold.systemId,
                aktiv: forhold.aktiv,
                gyldighetsperiode: forhold.gyldighetsperiode
              }
            })
            return warn({ message: `Eleven har ingen aktive elevforhold, og er derfor slettet i ${systemNames.azure}. Rettes i ${systemNames.vis} dersom eleven skal ha konto.`, raw: mappedRaw })
          }
          return warn({ message: 'Utvikler har driti seg ut og mangler en case her....' })
        }
      }
    ]
  }
]

module.exports = { systemsAndTests }
