const { success, warn, error } = require('../lib/test-result')
const systemNames = require('../systems/system-names')
const { repackVismaData } = require('../systems/visma/repack-data')
const { isValidFnr } = require('../lib/helpers/is-valid-fnr')

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
        waitForAllData: true,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData, allData) => {
          if (!allData.visma) return error({ message: `Mangler data i ${systemNames.visma}`, raw: { user }, solution: `Rettes i ${systemNames.visma}` })
          const vismaData = repackVismaData(allData.visma)
          const data = {
            enabled: systemData.enabled,
            visma: {
              person: vismaData.person.message,
              activePosition: vismaData.activePosition.message,
              activePositionCategory: {
                message: vismaData.activePositionCategory.message,
                description: vismaData.activePositionCategory.raw.description
              },
              active: vismaData.activePosition.raw.employment.active
            }
          }
          if (systemData.enabled && data.visma.active) return success({ message: 'Kontoen er aktivert', raw: data })
          if (systemData.enabled && !data.visma.active) return error({ message: 'Kontoen er aktivert selvom ansatt har sluttet', raw: data, solution: `Rettes i ${systemNames.visma}` })
          if (!systemData.enabled && data.visma.active) return warn({ message: 'Kontoen er deaktivert. Ansatt må aktivere sin konto', raw: data, solution: `Ansatt må aktivere sin konto via minkonto.vtfk.no eller servicedesk kan gjøre det direkte i ${systemNames.ad}` })
          if (!systemData.enabled && !data.visma.active) return warn({ message: 'Kontoen er deaktivert', raw: data, solution: `Rettes i ${systemNames.visma}` })
        }
      },
      {
        id: 'ad-hvilken-ou',
        title: 'Hvilken OU',
        description: 'Sjekker at bruker ligger i rett OU',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          const data = {
            distinguishedName: systemData.distinguishedName
          }
          if (data.distinguishedName.toUpperCase().includes('OU=AUTO DISABLED USERS')) return warn({ message: 'Bruker ligger i OU\'en AUTO DISABLED USERS', raw: data, solution: `Rettes i ${systemNames.visma}` })
          return success({ message: 'Bruker ligger ikke i OU\'en AUTO DISABLED USERS', raw: data })
        }
      },
      {
        id: 'ad-locked',
        title: 'Kontoen er ulåst',
        description: 'Sjekker at kontoen ikke er sperret for pålogging i AD',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          const data = {
            lockedOut: systemData.lockedOut
          }
          if (!systemData.lockedOut) return success({ message: 'Kontoen er ikke sperret for pålogging', raw: data })
          return error({ message: 'Kontoen er sperret for pålogging', raw: data, solution: `Servicedesk må åpne brukerkontoen for pålogging i ${systemNames.ad}. Dette gjøres i Properties på brukerobjektet under fanen Account` })
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
          if (!data.userPrincipalName.endsWith('@vestfoldfylke.no')) return error({ message: 'UPN (brukernavn til Microsoft 365) er ikke korrekt', raw: data, solution: 'Sak meldes til arbeidsgruppe identitet' })
          return success({ message: 'UPN (brukernavn til Microsoft 365) er korrekt for ansatt', raw: data })
        }
      },
      {
        id: 'ad-fnr',
        title: 'Har gyldig fødselsnummer',
        description: 'Sjekker at fødselsnummer er gyldig',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          if (!systemData.employeeNumber) return error({ message: 'Fødselsnummer mangler 😬', raw: systemData })
          const data = {
            employeeNumber: systemData.employeeNumber,
            fnr: isValidFnr(systemData.employeeNumber)
          }
          return data.fnr.valid ? success({ message: `Har gyldig ${data.fnr.type}`, raw: data }) : error({ message: data.fnr.error, raw: data })
        }
      },
      {
        id: 'ad-state',
        title: 'Har state satt for ansatt',
        description: 'Sjekker at state er satt på ansatt',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          if (systemData.state && systemData.state.length > 0) return success({ message: 'Felt for lisens er fylt ut', raw: { state: systemData.state } })
          return error({ message: 'Felt for lisens mangler 😬', raw: systemData, solution: 'Meld sak til arbeidsgruppe identitet' })
        }
      },
      {
        id: 'ad-ext4',
        title: 'Har extensionAttribute4',
        description: 'Sjekker om bruker har extensionAttribute4',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          if (!systemData.extensionAttribute4) return success({ message: 'Er ikke medlem av ekstra personalrom- og mailinglister' })
          const data = {
            extensionAttribute4: systemData.extensionAttribute4.split(',').map(ext => ext.trim())
          }
          return warn({ message: `Er medlem av ${data.extensionAttribute4.length} personalrom- og ${data.extensionAttribute4.length === 0 || data.extensionAttribute4.length > 1 ? 'mailinglister' : 'mailingliste'} ekstra`, solution: `extensionAttribute4 fører til medlemskap i personalrom- og mailinglister. Dersom dette ikke er ønskelig fjernes dette fra brukeren i ${systemNames.ad}`, raw: data })
        }
      },
      {
        id: 'ad-ext9',
        title: 'Har extensionAttribute9',
        description: 'Sjekker om bruker har extensionAttribute9',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          if (!systemData.extensionAttribute9) return error({ message: 'Ansattnummer mangler i extensionAttribute9 😬', raw: systemData, solution: 'Meld sak til arbeidsgruppe identitet' })
          return success({ message: 'Har ansattnummer i extensionAttribute9' })
        }
      },
      {
        id: 'ad-ext14',
        title: 'Har extensionAttribute14 lik VFK',
        description: 'Sjekker om bruker har extensionAttribute14, og at den har verdien VFK',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          if (!systemData.extensionAttribute14 || systemData.extensionAttribute14 !== 'VFK') return error({ message: 'VFK mangler i extensionAttribute14 😬', raw: systemData, solution: 'Meld sak til arbeidsgruppe identitet' })
          return success({ message: 'Har VFK i extensionAttribute14' })
        }
      },
      {
        id: 'ad-membership',
        title: 'Sjekker direktemedlemskap',
        description: 'Brukers direkte gruppemedlemskap',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          if (!systemData.memberOf || !Array.isArray(systemData.memberOf)) return error({ message: `Er ikke medlem av noen ${systemNames.ad}-grupper 🤔` })
          const groups = systemData.memberOf.map(member => member.replace('CN=', '').split(',')[0]).sort()
          return success({ message: `Er direkte medlem av ${groups.length} ${systemNames.ad}-gruppe${groups.length === 0 || groups.length > 1 ? 'r' : ''}`, raw: groups })
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
