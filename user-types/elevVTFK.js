const { success, error } = require('../lib/test-result')
const systemNames = require('../systems/system-names')
const visTests = require('../systems/fint-elev/common-tests')
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
      adTests.adAktiveringElev,
      adTests.adHvilkenOU,
      adTests.adLocked,
      adTests.adFnr,
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
      azureTests.azureAktiveringElev,
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
    id: 'fint-elev',
    name: systemNames.vis,
    // Tester
    tests: [
      visTests.fintStudentFeidenavn,
      visTests.fintFodselsnummer,
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
