const { success, error } = require('../lib/test-result')
const systemNames = require('../systems/system-names')
const adTests = require('../systems/ad/common-tests')
const azureTests = require('../systems/azure/common-tests')
const fintAnsattTests = require('../systems/fint-ansatt/common-tests')
const syncTests = require('../systems/sync/common-tests')
const feideTests = require('../systems/feide/common-tests')
const fintLarerTests = require('../systems/fint-larer/common-tests')
const { APPREG: { TENANT_NAME } } = require('../config')

const systemsAndTests = [
  // System
  {
    id: 'ad',
    name: systemNames.ad,
    // Tester
    tests: [
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
          if (!data.userPrincipalName.endsWith(`@${TENANT_NAME}.no`)) return error({ message: 'UPN (brukernavn til Microsoft 365) er ikke korrekt', raw: data, solution: 'Sak meldes til arbeidsgruppe identitet' })
          return success({ message: 'UPN (brukernavn til Microsoft 365) er korrekt for ansatt', raw: data })
        }
      },
      adTests.adAktiveringAnsatt,
      adTests.adHvilkenOU,
      adTests.adLocked,
      adTests.adFnr,
      adTests.adStateLicense,
      adTests.adExt4,
      adTests.adExt9,
      adTests.adGroupMembership
    ]
  },
  {
    id: 'azure',
    name: systemNames.azure,
    // Tester
    tests: [
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
          if (!data.userPrincipalName.endsWith(`@${TENANT_NAME}.no`)) return error({ message: 'UPN (brukernavn til Microsoft 365) er ikke korrekt', raw: data, solution: 'Sak meldes til arbeidsgruppe identitet' })
          return success({ message: 'UPN (brukernavn til Microsoft 365) er korrekt for ansatt', raw: data })
        }
      },
      azureTests.azureAktiveringAnsatt,
      azureTests.azureUpnEqualsMail,
      azureTests.azureLicense,
      azureTests.azurePwdSync,
      azureTests.azurePwdKluss,
      azureTests.azureMfa,
      azureTests.azureAdInSync,
      azureTests.azureGroups,
      azureTests.azureConditionalAccessPersonaGroup,
      azureTests.azureRiskyUser,
      azureTests.azureLastSignin,
      azureTests.azureSignInInfo
    ]
  },
  {
    id: 'fint-ansatt',
    name: systemNames.fintAnsatt,
    tests: [
      fintAnsattTests.fintAnsattData,
      fintAnsattTests.fintAnsattAktivStilling,
      fintAnsattTests.fintAnsattKategori,
      fintAnsattTests.fintAnsattFnr,
      fintAnsattTests.fintAnsattOrgTilknytning,
      fintAnsattTests.fintAnsattMobile,
      fintAnsattTests.fintAnsattRopebokstaver,
      fintAnsattTests.fintAnsattArbeidsforhold,
      fintAnsattTests.fintAnsattSlutterBruker
    ]
  },
  {
    id: 'fint-larer',
    name: systemNames.fintLarer,
    // Tester
    tests: [
      fintLarerTests.fintData,
      fintLarerTests.fintKontaktlarer,
      fintLarerTests.fintDuplicateKontaktlarergrupper,
      fintLarerTests.fintSkoleforhold,
      fintLarerTests.fintUndervisningsgrupper,
      fintLarerTests.fintFodselsnummer,
      fintLarerTests.fintMobilnummer,
      fintLarerTests.fintFeideVis
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
      feideTests.feideAnsatt
    ]
  }
]

module.exports = { systemsAndTests }
