const { success, error } = require('../lib/test-result')
const systemNames = require('../systems/system-names')
const visTests = require('../systems/fint-elev/common-tests')
const azureTests = require('../systems/azure/common-tests')
const syncTests = require('../systems/sync/common-tests')
const feideTests = require('../systems/feide/common-tests')
const { APPREG: { TENANT_NAME } } = require('../config')

const systemsAndTests = [
  // System
  {
    id: 'azure',
    name: systemNames.azure,
    // Tester
    tests: [
      {
        id: 'azure_upn',
        title: 'UPN er korrekt',
        description: 'Sjekker at UPN er korrekt for bruker',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          const data = {
            userPrincipalName: systemData.userPrincipalName
          }
          if (systemData.userPrincipalName.includes('.onmicrosoft.com')) return error({ message: 'UPN (brukernavn til Microsoft 365) er ikke korrekt 😬', raw: data, solution: 'Meld sak til arbeidsgruppe identitet' })
          if (!data.userPrincipalName.endsWith(`@skole.${TENANT_NAME}.no`)) return error({ message: 'UPN (brukernavn til Microsoft 365) er ikke korrekt', raw: data, solution: 'Sak meldes til arbeidsgruppe identitet' })
          return success({ message: 'UPN (brukernavn til Microsoft 365) er korrekt', raw: data })
        }
      },
      azureTests.azureAktiveringElev,
      azureTests.azureUpnEqualsMail,
      azureTests.azureLicense,
      azureTests.azureMfa,
      azureTests.azureGroups,
      azureTests.azureRiskyUser,
      azureTests.azureLastSignin
    ]
  },
  {
    id: 'fint-elev',
    name: systemNames.vis,
    // Tester
    tests: [
      visTests.fintStudentFeidenavn,
      visTests.fintGyldigFodselsnummer,
      visTests.fintStudentSkoleforhold,
      visTests.fintStudentProgramomrader,
      visTests.fintStudentBasisgrupper,
      visTests.fintStudentUndervisningsgrupper,
      visTests.fintStudentFaggrupper,
      visTests.fintStudentKontaktlarer,
      visTests.fintStudentUtgattElevforhold
    ]
  },
  {
    id: 'sync',
    name: systemNames.sync,
    // Tester
    tests: [
      syncTests.syncIdm,
      syncTests.syncAzure
    ]
  },
  {
    id: 'feide',
    name: systemNames.feide,
    // Tester
    tests: [
      feideTests.feideElev
    ]
  }
]

module.exports = { systemsAndTests }
