const { success, error } = require('../lib/test-result')
const systemNames = require('../systems/system-names')
const azureTests = require('../systems/azure/common-tests')
const syncTests = require('../systems/sync/common-tests')
const feideTests = require('../systems/feide/common-tests')
const nettsperreTests = require('../systems/nettsperre/common-tests')
const { APPREG: { TENANT_NAME } } = require('../config')

const systemsAndTests = [
  // System
  {
    id: 'azure',
    name: systemNames.azure,
    // Tester
    tests: [
      {
        id: 'azure-enabled',
        title: 'Er kontoen aktiv',
        description: 'Sjekker at azure-konto (entra ID) er enabled',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          const data = {
            enabled: systemData.accountEnabled
          }
          if (!data.enabled) return error({ message: 'Konto er ikke aktivert 😬', raw: data, solution: `Bruker må aktivere sin konto via minkonto.${TENANT_NAME}.no eller servicedesk kan gjøre det direkte i ${systemNames.ad}` })
          return success({ message: 'Kontoen er aktivert', raw: data })
        }
      },
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
      azureTests.azureUpnEqualsMail,
      azureTests.azureLicense,
      azureTests.azureMfa,
      azureTests.azurePwdKluss,
      azureTests.azureGroups,
      azureTests.azureConditionalAccessPersonaGroup,
      azureTests.azureRiskyUser,
      azureTests.azureLastSignin,
      azureTests.azureSignInInfo,
      azureTests.azureUserDevices
    ]
  },
  {
    id: 'sync',
    name: systemNames.sync,
    // Tester
    tests: [
      // syncTests.syncIdm,
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
  },
  {
    id: 'nettsperre',
    name: systemNames.nettsperre,
    // Tester
    tests: [
      nettsperreTests.nettsperreHarNettsperre,
      nettsperreTests.nettsperrePending,
      nettsperreTests.nettsperreOverlappende
    ]
  }
]

module.exports = { systemsAndTests }
