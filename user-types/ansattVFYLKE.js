const { success, warn, error } = require("../lib/test-result")

const systemsAndTests = [
  // System
  {
    id: 'azure',
    name: 'Azure (Microsoft 365)',
    description: 'Azure',
    // Tester
    tests: [
      {
        id: "azure_risky_user",
        title: 'Har bruker havna i risky user?',
        description: 'Sjekker om bruker finnes i risky users i Entra ID',
        waitForAllData: false, // Trenger ikke mer enn systemdataene
        /**
         * 
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          //return success({ message: "ahaahaha" })
          // if (systemData.riskyUser.length > 0) return error({ message: "Ånei den er risky", solution: "Be dem være litt mer forsiktig" })
          return success({ message: "Brukeren er ikke risky" })
        }
      },
      {
        id: "azure_hahah",
        title: 'Finner vi noe snusk?',
        description: 'Sjekker om bruker har gjort noe sykt',
        waitForAllData: true, // Trenger ikke mer enn systemdataene
        /**
         * 
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          //return success({ message: "ahaahaha" })
          // if (systemData.riskyUser.length > 0) return error({ message: "Ånei den er risky", solution: "Be dem være litt mer forsiktig" })
          return success({ message: "Brukeren har ikke gjort noe gærnt" })
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
        id: "fint_tullball",
        title: 'Er det noen bruker her da?',
        description: 'Sjekker om brukeren er dum',
        waitForAllData: false, // Trenger ikke mer enn systemdataene
        /**
         * 
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          return warn({ message: "Brukeren er dum", solution: "FIks det", raw: { heisann: "Noe data" } })
        }
      },
      {
        id: "fint_tullball_2",
        title: 'En annen test',
        description: 'Sjekker om brukeren er smart',
        waitForAllData: false, // Trenger ikke mer enn systemdataene
        /**
         * 
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          return error({ message: "Brukeren er ikke smart", solution: "SEnd på kurs", raw: { heisann: "Noe data igjen" } })
        }
      }
    ]
  }
]

module.exports = { systemsAndTests }