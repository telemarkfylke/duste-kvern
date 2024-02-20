const { success, error } = require('../lib/test-result')
const systemNames = require('../systems/system-names')
const adTests = require('../systems/ad/common-tests')
const azureTests = require('../systems/azure/common-tests')
const equitracTests = require('../systems/equitrac/common-tests')
const syncTests = require('../systems/sync/common-tests')
const feideTests = require('../systems/feide/common-tests')

const systemsAndTests = [
  // System
  {
    id: 'ad',
    name: systemNames.ad,
    // Tester
    tests: [
      {
        id: 'ad-enabled',
        title: 'Er kontoen aktiv',
        description: 'Sjekker at ad-konto er enabled',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          const data = {
            enabled: systemData.enabled
          }
          if (!data.enabled) return error({ message: 'Konto er ikke aktivert 😬', raw: data, solution: `Bruker må aktivere sin konto via minkonto.vtfk.no eller servicedesk kan gjøre det direkte i ${systemNames.ad}` })
          return success({ message: 'Kontoen er aktivert', raw: data })
        }
      },
      {
        id: 'ad-upn',
        title: 'UPN er korrekt',
        description: 'Sjekker at UPN er korrekt',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          if (!systemData.userPrincipalName) return error({ message: 'UPN mangler 😬', raw: systemData })
          const data = {
            userPrincipalName: systemData.userPrincipalName
          }
          if (!data.userPrincipalName.endsWith('@skole.vtfk.no')) return error({ message: 'UPN (brukernavn til Microsoft 365) er ikke korrekt', raw: data, solution: 'Sak meldes til arbeidsgruppe identitet' })
          return success({ message: 'UPN (brukernavn til Microsoft 365) er korrekt for ansatt', raw: data })
        }
      },
      adTests.adHvilkenOU,
      adTests.adLocked,
      adTests.adFnr,
      adTests.adStateLicense,
      adTests.adExt4,
      adTests.adExt14,
      adTests.adGroupMembership
    ]
  },
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
          if (!data.enabled) return error({ message: 'Konto er ikke aktivert 😬', raw: data, solution: `Bruker må aktivere sin konto via minkonto.vtfk.no eller servicedesk kan gjøre det direkte i ${systemNames.ad}` })
          return success({ message: 'Kontoen er aktivert', raw: data })
        }
      },
      {
        id: 'azure_upn',
        title: 'UPN er korrekt',
        description: 'Sjekker at UPN er korrekt for ansatt',
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
          if (!data.userPrincipalName.endsWith('@skole.vtfk.no')) return error({ message: 'UPN (brukernavn til Microsoft 365) er ikke korrekt', raw: data, solution: 'Sak meldes til arbeidsgruppe identitet' })
          return success({ message: 'UPN (brukernavn til Microsoft 365) er korrekt', raw: data })
        }
      },
      azureTests.azureUpnEqualsMail,
      azureTests.azureLicense,
      azureTests.azurePwdSync,
      azureTests.azureAdInSync,
      azureTests.azureGroups,
      azureTests.azureRiskyUser,
      azureTests.azureLastSignin
    ]
  },
  {
    id: 'equitrac',
    name: systemNames.equitrac,
    description: 'Eeieie bøbaaja',
    // Tester
    tests: [
      equitracTests.equitracLocked,
      equitracTests.equitracEmailEqualUpn
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
