const { success, warn, error } = require('../lib/test-result')
const systemNames = require('../systems/system-names')
const { repackVismaData } = require('../systems/visma/repack-data')
const { isValidFnr } = require('../lib/helpers/is-valid-fnr')
const { isWithinTimeRange } = require('../lib/helpers/is-within-timerange')
const licenses = require('../systems/azure/licenses')

const aadSyncInMinutes = 30
const aadSyncInSeconds = aadSyncInMinutes * 60

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
          if (!allData.visma || allData.visma.getDataFailed) return error({ message: `Mangler data i ${systemNames.visma}`, raw: { user }, solution: `Rettes i ${systemNames.visma}` })
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
          if (systemData.state && systemData.state.length > 0) return success({ message: 'Felt for kortkode som styrer lisens er fylt ut', raw: { state: systemData.state } })
          return error({ message: 'Felt for kortkode som styrer lisens mangler 😬', raw: systemData, solution: 'Meld sak til arbeidsgruppe identitet' })
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
    name: systemNames.azure,
    // Tester
    tests: [
      {
        id: 'azure_aktivering',
        title: 'Kontoen er aktivert',
        description: `Sjekker at kontoen er aktivert i ${systemNames.aad}`,
        waitForAllData: true,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData, allData) => {
          if (!allData.visma || allData.visma.getDataFailed) return error({ message: `Mangler data i ${systemNames.visma}`, raw: { user }, solution: `Rettes i ${systemNames.visma}` })
          const vismaData = repackVismaData(allData.visma)
          const data = {
            enabled: systemData.accountEnabled,
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
          if (data.enabled && data.visma.active) return success({ message: 'Kontoen er aktivert', raw: data })
          if (data.enabled && !data.visma.active) return error({ message: 'Kontoen er aktivert selvom ansatt har sluttet', raw: data, solution: `Rettes i ${systemNames.visma}` })
          if (!data.enabled && data.visma.active) return warn({ message: 'Kontoen er deaktivert. Ansatt må aktivere sin konto', raw: data, solution: `Ansatt må aktivere sin konto via minkonto.vtfk.no eller servicedesk kan gjøre det direkte i ${systemNames.ad}` })
          if (!data.enabled && !data.visma.active) return warn({ message: 'Kontoen er deaktivert', raw: data, solution: `Rettes i ${systemNames.visma}` })
        }
      },
      {
        id: 'azure_equal_mail',
        title: 'UPN er lik e-postadressen',
        description: `Sjekker at UPN-et er lik e-postadressen i AD`,
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          const data = {
            accountEnabled: systemData.accountEnabled,
            mail: systemData.mail || null,
            userPrincipalName: systemData.userPrincipalName || null
          }
          if (!systemData.userPrincipalName) return error({ message: 'UPN (brukernavn til Microsoft 365) mangler 😬', raw: data, solution: 'Meld sak til arbeidsgruppe identitet' })
          if (!systemData.mail) {
            if (systemData.accountEnabled) return error({ message: 'E-postadresse mangler 😬', raw: data })
            else {
              return warn({ message: 'E-postadresse blir satt når konto er blitt aktivert', raw: data, solution: `Ansatt må aktivere sin konto via minkonto.vtfk.no eller servicedesk kan gjøre det direkte i ${systemNames.ad}. Deretter vent til Entra ID Syncen har kjørt, dette kan ta inntil ${aadSyncInMinutes} minutter` })
            }
          }
          return systemData.userPrincipalName.toLowerCase() === systemData.mail.toLowerCase() ? success({ message: 'UPN (brukernavn til Microsoft 365) er lik e-postadressen', raw: data }) : error({ message: 'UPN (brukernavn til Microsoft 365) er ikke lik e-postadressen', raw: data, solution: 'Meld sak til arbeidsgruppe identitet' })
        }
      },
      {
        id: 'azure_upn',
        title: 'UPN er korrekt',
        description: `Sjekker at UPN er korrekt for ansatt`,
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
          if (!data.userPrincipalName.endsWith('@vestfoldfylke.no')) return error({ message: 'UPN (brukernavn til Microsoft 365) er ikke korrekt', raw: data, solution: 'Sak meldes til arbeidsgruppe identitet' })
          return success({ message: 'UPN (brukernavn til Microsoft 365) er korrekt for ansatt', raw: data })
        }
      },
      {
        id: 'azure_pwd_sync',
        title: 'Passord synkronisert til Azure AD',
        description: `Sjekker at passordet er synkronisert til Azure AD innenfor 40 minutter`,
        waitForAllData: true,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData, allData) => {
          if (!allData.ad || allData.ad.getDataFailed) return error({ message: `Mangler ${systemNames.ad}-data`, raw: allData.ad })
          const pwdCheck = isWithinTimeRange(new Date(allData.ad.pwdLastSet), new Date(systemData.lastPasswordChangeDateTime), aadSyncInSeconds)
          const data = {
            azure: {
              lastPasswordChangeDateTime: systemData.lastPasswordChangeDateTime
            },
            ad: {
              pwdLastSet: allData.ad.pwdLastSet
            },
            seconds: pwdCheck.seconds
          }
          if (allData.ad.pwdLastSet === 0) return warn({ message: 'Passord vil synkroniseres når konto er blitt aktivert', raw: data })
          if (pwdCheck.result) return success({ message: `Passord synkronisert til ${systemNames.azure}`, raw: data })
          return error({ message: 'Passord ikke synkronisert', raw: data })
        }
      },
      {
        id: 'azure_license',
        title: 'Passord synkronisert til Azure AD',
        description: `Sjekker at passordet er synkronisert til Azure AD innenfor 40 minutter`,
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          if (systemData.accountEnabled && systemData.assignedLicenses.length === 0) return error({ message: 'Har ingen Microsoft 365-lisenser 😬', solution: 'Meld sak til arbeidsgruppe identitet' })
          if (!systemData.accountEnabled && systemData.assignedLicenses.length === 0) return warn({ message: 'Microsoft 365-lisenser blir satt når konto er blitt aktivert', solution: `Ansatt må aktivere sin konto via minkonto.vtfk.no eller servicedesk kan gjøre det direkte i ${systemNames.ad}. Deretter vent til Azure AD Syncen har kjørt, dette kan ta inntil ${aadSyncInMinutes} minutter` })
          const data = {
            licenses: [],
            hasNecessaryLicenses: false
          }
          // ??? Bare legge inn riktig skuId for ansatt her??? Og test det i stedet  -ref at vi kanskje Bumper ned lisens på noen
          data.licenses = systemData.assignedLicenses.map(license => {
            const lic = licenses.find(lic => lic.skuId === license.skuId)
            if (lic) {
              data.hasNecessaryLicenses = true
              return lic
            } else return license
          })
          if (data.hasNecessaryLicenses) return success({ message: 'Har Microsoft 365-lisenser', raw: data })
          if (systemData.accountEnabled) return warn({ message: `Har ${data.licenses.length} ${data.licenses.length > 1 ? 'lisenser' : 'lisens'} men mangler nødvendige lisenser`, raw: data, solution: 'Sjekk at bruker har aktive lisenser på brukerobjektet i Azure AD under Licenses. Hvis noen av lisensene tildelt til bruker ikke er aktive, sjekk at det er lisenser tilgjengelig og deretter kjør en Reprocess i License vinduet. Hvis bruker ikke har noen lisenser tildelt, meld sak til arbeidsgruppe identitet' })
          return warn({ message: 'Microsoft 365-lisenser blir satt når konto er blitt aktivert', solution: `Ansatt må aktivere sin konto via minkonto.vtfk.no eller servicedesk kan gjøre det direkte i ${systemNames.ad}. Deretter vent til Azure AD Syncen har kjørt, dette kan ta inntil ${aadSyncInMinutes} minutter` })
        }
      },
      {
        id: 'azure_mfa',
        title: 'Har satt opp MFA',
        description: `Sjekker at MFA er satt opp`,
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          const data = {
            authenticationMethods: systemData.authenticationMethods
          }
          if (systemData.authenticationMethods.length === 0) return error({ message: 'MFA (tofaktor) er ikke satt opp 😬', raw: data, solution: 'Bruker må selv sette opp MFA (tofaktor) via aka.ms/mfasetup' })
          return success({ message: `${systemData.authenticationMethods.length} MFA-metode${systemData.authenticationMethods.length > 1 ? 'r' : ''} (tofaktor) er satt opp`, raw: data })
        }
      },
      {
        id: 'azure_pwd_kluss',
        title: 'Har skrevet feil passord',
        description: `Sjekker om bruker har skrevet feil passord idag`,
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          const data = {
            userSignInErrors: systemData.userSignInErrors
          }
          if (systemData.userSignInErrors.length > 0) return error({ message: `Har skrevet feil passord ${systemData.userSignInErrors.length} gang${systemData.userSignInErrors.length > 1 ? 'er' : ''} idag 🤦‍♂️`, raw: data, solution: 'Bruker må ta av boksehanskene 🥊' })
          return success({ message: 'Ingen klumsing med passord idag', raw: data })
        }
      },
      {
        id: 'azure_ad_in_sync',
        title: 'AD-bruker og Entra ID-bruker er i sync',
        description: `Sjekker at AD-bruker og Entra ID-bruker er i sync`,
        waitForAllData: true,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData, allData) => {
          if (!allData.ad || allData.ad.getDataFailed) return error({ message: `Mangler data i ${systemNames.ad}`, raw: { user } })
          const data = {
            azure: {
              accountEnabled: systemData.accountEnabled,
              onPremisesLastSyncDateTime: systemData.onPremisesLastSyncDateTime
            },
            ad: {
              enabled: allData.ad.enabled,
              whenChanged: allData.ad.whenChanged
            }
          }
      
          if (systemData.accountEnabled !== allData.ad.enabled) {
            data.isInsideSyncWindow = isWithinTimeRange(new Date(), new Date(data.ad.whenChanged), aadSyncInSeconds)
            if (!data.isInsideSyncWindow.result) return error({ message: `Entra ID-kontoen er fremdeles ${systemData.accountEnabled ? '' : 'in'}aktiv`, raw: data, solution: 'Synkronisering utføres snart' })
            return warn({ message: `Entra ID-kontoen vil bli ${allData.ad.enabled ? '' : 'de'}aktivert ved neste synkronisering (innenfor ${aadSyncInMinutes} minutter)`, raw: data, solution: 'Synkronisering utføres snart' })
          }
          return success({ message: "AD-bruker og Entra ID-bruker er i sync", raw: data })
        }
      },
      {
        id: 'azure_groups',
        title: 'Sjekker direktemedlemskap',
        description: `Brukers direkte gruppemedlemskap`,
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          const groupWarningLimit = 200
          if (systemData.memberOf.length === 0) return error({ message: `Er ikke medlem av noen ${systemNames.azure} grupper 🤔` })
          if (systemData.memberOf.length > groupWarningLimit) return warn({ message: `Er direkte medlem av ${systemData.memberOf.length} ${systemNames.azure} grupper 😵`, solution: 'Det kan hende brukeren trenger å være medlem av alle disse gruppene, men om du tror det er et problem, meld en sak til arbeidsgruppe identitet', raw: systemData.memberOf })
          return success({ message: `Er direkte medlem av ${systemData.memberOf.length} ${systemNames.azure} gruppe${systemData.memberOf.length === 0 || systemData.memberOf.length > 1 ? 'r' : ''}`, raw: systemData.memberOf })
        }
      },
      {
        id: 'azure_risky_user',
        title: 'Er bruker risky',
        description: `Sjekker om bruker finnes i risky users`,
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          const data = {
            riskyUser: systemData.graphRiskyUser
          }
          if (data.riskyUser.length > 0) return error({ message: `Brukeren har havna i risky users, på nivå ${riskLevel} 😱`, solution: 'Send sak til sikkerhetsfolket', raw: data })
          if (user.displayName === 'Bjørn Kaarstein') return warn({ message: `Brukeren er ikke i risky users, men ansees likevel som en risiko 🐻`, solution: 'Send sak til viltnemnda' })
          return success({ message: 'Brukeren er ikke i risky users' })
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
        waitForAllData: false,
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
        waitForAllData: false,
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
        waitForAllData: false,
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
        waitForAllData: false,
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
        waitForAllData: false,
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
        waitForAllData: false,
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
        waitForAllData: false,
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
        waitForAllData: false,
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
        waitForAllData: false,
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
        waitForAllData: false,
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
