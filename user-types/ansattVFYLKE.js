const { success, warn, error } = require('../lib/test-result')
const systemNames = require('../systems/system-names')

const systemsAndTests = [
  // System
  {
    id: 'ad',
    name: systemNames.ad,
    // Tester
    tests: [
      {
        id: 'ad-aktivering',
        title: 'Kontoen er aktivert',
        description: 'Sjekker at kontoen er aktivert i AD',
        waitForAllData: true, // Trenger ikke mer enn systemdataene
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData, allData) => {
          if (!allData.visma) return error({ message: `Mangler data i ${systemNames.visma}`, raw: { user }, solution: `Rettes i ${systemNames.visma}` })
          const data = {
            enabled: systemData.enabled,
            visma: {
              person: allData.visma.person.message,
              activePosition: allData.visma.activePosition.message,
              activePositionCategory: {
                message: allData.visma.activePositionCategory.message,
                description: allData.visma.activePositionCategory.raw.description
              },
              active: allData.visma.activePosition.raw.employment.active
            }
          }
          if (systemData.enabled && data.visma.active) return success({ message: 'Kontoen er aktivert', raw: data })
          if (systemData.enabled && !data.visma.active) return error({ message: 'Kontoen er aktivert selvom ansatt har sluttet', raw: data, solution: `Rettes i ${systemNames.visma}` })
          if (!systemData.enabled && data.visma.active) return warn({ message: 'Kontoen er deaktivert. Ansatt må aktivere sin konto', raw: data, solution: `Ansatt må aktivere sin konto via minkonto.vtfk.no eller servicedesk kan gjøre det direkte i ${systemNames.ad}` })
          if (!systemData.enabled && !data.visma.active) return warn({ message: 'Kontoen er deaktivert', raw: data, solution: `Rettes i ${systemNames.visma}` })
        }
      },
      {
        id: 'azure_hahah',
        title: 'Finner vi noe snusk?',
        description: 'Sjekker om bruker har gjort noe sykt',
        waitForAllData: true, // Trenger ikke mer enn systemdataene
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          // return success({ message: "ahaahaha" })
          // if (systemData.riskyUser.length > 0) return error({ message: "Ånei den er risky", solution: "Be dem være litt mer forsiktig" })
          return success({ message: 'Brukeren har ikke gjort noe gærnt' })
        }
      }
    ]
  },
  {
    id: 'azure',
    name: 'Azure (Microsoft 365)',
    description: 'Azure',
    // Tester
    tests: [
      {
        id: 'azure_risky_user',
        title: 'Har bruker havna i risky user?',
        description: 'Sjekker om bruker finnes i risky users i Entra ID',
        waitForAllData: false, // Trenger ikke mer enn systemdataene
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          // return success({ message: "ahaahaha" })
          // if (systemData.riskyUser.length > 0) return error({ message: "Ånei den er risky", solution: "Be dem være litt mer forsiktig" })
          return success({ message: 'Brukeren er ikke risky' })
        }
      },
      {
        id: 'azure_hahah',
        title: 'Finner vi noe snusk?',
        description: 'Sjekker om bruker har gjort noe sykt',
        waitForAllData: true, // Trenger ikke mer enn systemdataene
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          // return success({ message: "ahaahaha" })
          // if (systemData.riskyUser.length > 0) return error({ message: "Ånei den er risky", solution: "Be dem være litt mer forsiktig" })
          return success({ message: 'Brukeren har ikke gjort noe gærnt' })
        }
      }
    ]
  },
  {
    id: 'fint-ansatt',
    name: 'FINT',
    description: 'FINT ansatt-data',
    // Tester
    tests: [
      {
        id: 'fint_tullball',
        title: 'Er det noen bruker her da?',
        description: 'Sjekker om brukeren er dum',
        waitForAllData: false, // Trenger ikke mer enn systemdataene
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          return warn({ message: 'Brukeren er dum', solution: 'FIks det', raw: { heisann: 'Noe data' } })
        }
      },
      {
        id: 'fint_tullball_2',
        title: 'En annen test',
        description: 'Sjekker om brukeren er smart',
        waitForAllData: false, // Trenger ikke mer enn systemdataene
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          return error({ message: 'Brukeren er ikke smart', solution: 'SEnd på kurs', raw: { heisann: 'Noe data igjen' } })
        }
      }
    ]
  },
  {
    id: 'visma',
    name: 'Visma HRM',
    description: 'Visma bøbaaja',
    // Tester
    tests: [
      {
        id: 'visma_tullball',
        title: 'Er det noen bruker her da?',
        description: 'Sjekker om brukeren er dum',
        waitForAllData: false, // Trenger ikke mer enn systemdataene
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          return success({ message: 'Brukeren er dum', solution: 'FIks det', raw: { heisann: 'Noe data' } })
        }
      },
      {
        id: 'visma_tullball_2',
        title: 'En annen test',
        description: 'Sjekker om brukeren er smart',
        waitForAllData: false, // Trenger ikke mer enn systemdataene
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          return error({ message: 'Brukeren er ikke smart', solution: 'SEnd på kurs', raw: { heisann: 'Noe data igjen' } })
        }
      }
    ]
  },
  {
    id: 'equitrac',
    name: 'Equitrac (printløsning)',
    description: 'Eeieie bøbaaja',
    // Tester
    tests: [
      {
        id: 'equitrac_tullball',
        title: 'Er det noen bruker her da?',
        description: 'Sjekker om brukeren er dum',
        waitForAllData: false, // Trenger ikke mer enn systemdataene
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          return success({ message: 'Brukeren er dum', solution: 'FIks det', raw: { heisann: 'Noe data' } })
        }
      },
      {
        id: 'equitrac_tullball_2',
        title: 'En annen test',
        description: 'Sjekker om brukeren er smart',
        waitForAllData: false, // Trenger ikke mer enn systemdataene
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          return error({ message: 'Brukeren er ikke smart', solution: 'SEnd på kurs', raw: { heisann: 'Noe data igjen' } })
        }
      }
    ]
  },
  {
    id: 'sync',
    name: 'Synkronisertingskfjdkjfdfj',
    description: 'Eeieie bøbaaja',
    // Tester
    tests: [
      {
        id: 'sync_tullball',
        title: 'Er det noen bruker her da?',
        description: 'Sjekker om brukeren er dum',
        waitForAllData: false, // Trenger ikke mer enn systemdataene
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          return success({ message: 'Brukeren er dum', solution: 'FIks det', raw: { heisann: 'Noe data' } })
        }
      },
      {
        id: 'sync_tullball_2',
        title: 'En annen test',
        description: 'Sjekker om brukeren er smart',
        waitForAllData: false, // Trenger ikke mer enn systemdataene
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          return error({ message: 'Brukeren er ikke smart', solution: 'SEnd på kurs', raw: { heisann: 'Noe data igjen' } })
        }
      }
    ]
  },
  {
    id: 'feide',
    name: 'Feide',
    description: 'Eeieie bøbaaja',
    // Tester
    tests: [
      {
        id: 'feide_tullball',
        title: 'Er det noen bruker her da?',
        description: 'Sjekker om brukeren er dum',
        waitForAllData: false, // Trenger ikke mer enn systemdataene
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          return success({ message: 'Brukeren er dum', solution: 'FIks det', raw: { heisann: 'Noe data' } })
        }
      },
      {
        id: 'feide_tullball_2',
        title: 'En annen test',
        description: 'Sjekker om brukeren er smart',
        waitForAllData: false, // Trenger ikke mer enn systemdataene
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          return error({ message: 'Brukeren er ikke smart', solution: 'SEnd på kurs', raw: { heisann: 'Noe data igjen' } })
        }
      }
    ]
  }
]

module.exports = { systemsAndTests }
