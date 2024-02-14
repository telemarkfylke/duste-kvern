const { success, warn, error } = require('../lib/test-result')
const systemNames = require('../systems/system-names')
const { repackVismaData } = require('../systems/visma/repack-data')
const { isValidFnr } = require('../lib/helpers/is-valid-fnr')
const { isWithinTimeRange } = require('../lib/helpers/is-within-timerange')
const licenses = require('../systems/azure/licenses')
const repackVisma = require('../systems/visma/repack-data')
const { getArrayData } = require('../lib/helpers/system-data')
const { FEIDE } = require('../config')
const { prettifyDateToLocaleString } = require('../lib/helpers/date-time-output')
const isWithinDaterange = require('../lib/helpers/is-within-daterange')

const aadSyncInMinutes = 30
const aadSyncInSeconds = aadSyncInMinutes * 60

const isTeacher = (user) => {
  return user.feide
}

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
          if (!data.userPrincipalName.endsWith('@vtfk.no')) return error({ message: 'UPN (brukernavn til Microsoft 365) er ikke korrekt', raw: data, solution: 'Sak meldes til arbeidsgruppe identitet' })
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
        description: 'Sjekker at UPN-et er lik e-postadressen i AD',
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
          if (!data.userPrincipalName.endsWith('@vtfk.no')) return error({ message: 'UPN (brukernavn til Microsoft 365) er ikke korrekt', raw: data, solution: 'Sak meldes til arbeidsgruppe identitet' })
          return success({ message: 'UPN (brukernavn til Microsoft 365) er korrekt for ansatt', raw: data })
        }
      },
      {
        id: 'azure_pwd_sync',
        title: 'Passord synkronisert til Azure AD',
        description: 'Sjekker at passordet er synkronisert til Azure AD innenfor 40 minutter',
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
        description: 'Sjekker at passordet er synkronisert til Azure AD innenfor 40 minutter',
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
          if (data.hasNecessaryLicenses) return success({ message: 'Har Microsoft 365-lisenser', solution: data.licenses.map(lic => lic.name || lic.skuId), raw: data })
          if (systemData.accountEnabled) return warn({ message: `Har ${data.licenses.length} ${data.licenses.length > 1 ? 'lisenser' : 'lisens'} men mangler nødvendige lisenser`, raw: data, solution: 'Sjekk at bruker har aktive lisenser på brukerobjektet i Azure AD under Licenses. Hvis noen av lisensene tildelt til bruker ikke er aktive, sjekk at det er lisenser tilgjengelig og deretter kjør en Reprocess i License vinduet. Hvis bruker ikke har noen lisenser tildelt, meld sak til arbeidsgruppe identitet' })
          return warn({ message: 'Microsoft 365-lisenser blir satt når konto er blitt aktivert', solution: `Ansatt må aktivere sin konto via minkonto.vtfk.no eller servicedesk kan gjøre det direkte i ${systemNames.ad}. Deretter vent til Azure AD Syncen har kjørt, dette kan ta inntil ${aadSyncInMinutes} minutter` })
        }
      },
      {
        id: 'azure_mfa',
        title: 'Har satt opp MFA',
        description: 'Sjekker at MFA er satt opp',
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
        description: 'Sjekker om bruker har skrevet feil passord idag',
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
        description: 'Sjekker at AD-bruker og Entra ID-bruker er i sync',
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
          return success({ message: 'AD-bruker og Entra ID-bruker er i sync', raw: data })
        }
      },
      {
        id: 'azure_groups',
        title: 'Sjekker direktemedlemskap',
        description: 'Brukers direkte gruppemedlemskap',
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
        description: 'Sjekker om bruker finnes i risky users',
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
          if (data.riskyUser.length > 0) return error({ message: `Brukeren har havna i risky users, på nivå ${data.riskyUser.riskLevel} 😱`, solution: 'Send sak til sikkerhetsfolket', raw: data })
          if (user.displayName === 'Bjørn Kaarstein') return warn({ message: 'Brukeren er ikke i risky users, men ansees likevel som en risiko 🐻', solution: 'Send sak til viltnemnda' })
          return success({ message: 'Brukeren er ikke i risky users' })
        }
      },
      {
        id: 'azure_last_signin',
        title: 'Har bruker klart å logge inn i det siste',
        description: 'Sjekker når brukeren klarte å logge på sist',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          if (systemData.userSignInSuccess.length === 0) return warn({ message: 'Bruker har ikke logget på de siste 3 dagene...', solution: 'Be bruker om å logge på' })
          const data = {
            lastSuccessfulSignin: systemData.userSignInSuccess[0]
          }
          const fourteenDaysAsSeconds = 1209600
          const timeSinceLastSignin = isWithinTimeRange(new Date(data.lastSuccessfulSignin.createdDateTime), new Date(), fourteenDaysAsSeconds)
          if (!timeSinceLastSignin.result) return warn({ message: 'Det er over 14 dager siden brukeren logget på... Er det ferie mon tro?', raw: { ...data, timeSinceLastSignin } })
          const minutesSinceLogin = timeSinceLastSignin.seconds / 60
          if (minutesSinceLogin < 61) return success({ message: `Brukeren logget på for ${Math.floor(minutesSinceLogin)} minutte${Math.floor(minutesSinceLogin) > 1 ? 'r' : ''} siden`, raw: { ...data, timeSinceLastSignin } })
          const hoursSinceLogin = minutesSinceLogin / 60
          if (hoursSinceLogin < 25) return success({ message: `Brukeren logget på for ${Math.floor(hoursSinceLogin)} time${Math.floor(hoursSinceLogin) > 1 ? 'r' : ''} siden`, raw: { ...data, timeSinceLastSignin } })
          const daysSinceLogin = hoursSinceLogin / 24
          return success({ message: `Brukeren logget på for ${Math.floor(daysSinceLogin)} dage${Math.floor(daysSinceLogin) > 1 ? 'r' : ''} siden`, raw: { ...data, timeSinceLastSignin } })
        }
      }
    ]
  },
  {
    id: 'fint-larer',
    name: systemNames.fintLarer,
    // Tester
    tests: [
      {
        id: 'fint_kontaktlarer',
        title: 'Er kontaktlærer',
        description: 'Sjekker om brukeren er kontaktlærer',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          let kontaktlarergrupper = []
          systemData.undervisningsforhold.forEach(forhold => {
            const kGrupper = forhold.kontaktlarergrupper.filter(kGruppe => kGruppe.aktiv).map(kGruppe => { return { systemId: kGruppe.systemId, navn: kGruppe.navn, skole: kGruppe.skole.navn } })
            kontaktlarergrupper = [...kontaktlarergrupper, ...kGrupper]
          })
          if (kontaktlarergrupper.length === 0) return success({ message: 'Er ikke kontaktlærer for noen klasser' })
          return success({ message: `Er kontaktlærer for ${kontaktlarergrupper.length} ${kontaktlarergrupper.length > 1 ? 'klasser' : 'klasse'}`, raw: kontaktlarergrupper })
        }
      },
      {
        id: 'fint_duplikate_kontaktlarergrupper',
        title: 'Har duplikate kontaktlærergrupper',
        description: 'Sjekker om brukeren har duplikate kontaktlærergrupper',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          let kontaktlarergrupper = []
          systemData.undervisningsforhold.forEach(forhold => {
            const kGrupper = forhold.kontaktlarergrupper.filter(kGruppe => kGruppe.aktiv).map(kGruppe => { return { systemId: kGruppe.systemId, navn: kGruppe.navn, skole: kGruppe.skole.navn } })
            kontaktlarergrupper = [...kontaktlarergrupper, ...kGrupper]
          })
          const duplicates = []
          for (const kGruppe of kontaktlarergrupper) {
            kGruppe.checked = true
            const duplicate = kontaktlarergrupper.find(k => !k.checked && k.systemId === kGruppe.systemId)
            if (duplicate) {
              duplicates.push(duplicate)
              duplicates.push(kGruppe)
            }
          }

          if (duplicates.length === 0) return success({ message: 'Har ikke duplikate kontaktlærergrupper' })
          return warn({ message: `Har ${duplicates.length} ${duplicates.length === 1 ? 'duplikat undervisningsgruppe' : 'duplikate undervisningsgrupper'}`, raw: { duplicates }, solution: `Rettes i ${systemNames.fintLarer}. Hvis det allerede er korrekt i ${systemNames.fintLarer}, meld sak til arbeidsgruppe identitet` })
        }
      },
      {
        id: 'fint_skoleforhold',
        title: 'Har skoleforhold',
        description: 'Sjekker om ansatt har skoleforhold',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          const skoleforhold = systemData.undervisningsforhold.filter(forhold => forhold.aktiv).map(forhold => forhold.skole)
          if (!isTeacher(user) && skoleforhold.length === 0) warn({ message: 'Har ingen skoleforhold, men lever i VTFK', solution: `Dette kan være korrekt, men om ansatt skal ha skoleforhold rettes det i ${systemNames.fintLarer}` })
          if (skoleforhold.length === 0) return error({ message: 'Har ingen skoleforhold 😬', solution: `Rettes i ${systemNames.fintLarer}` })
          return success({ message: `Har ${skoleforhold.length} skoleforhold`, raw: skoleforhold })
        }
      },
      {
        id: 'fint_undervisningsgrupper',
        title: 'Har undervisningsgruppe(r)',
        description: 'Sjekker om ansatt har undervisningsgrupper',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          let undervisningsgrupper = []
          systemData.undervisningsforhold.forEach(forhold => {
            const uGrupper = forhold.undervisningsgrupper.filter(uGruppe => uGruppe.aktiv).map(uGruppe => { return { systemId: uGruppe.systemId, navn: uGruppe.navn, skole: uGruppe.skole.navn } })
            undervisningsgrupper = [...undervisningsgrupper, ...uGrupper]
          })
          if (!isTeacher(user) && undervisningsgrupper.length > 0) return error({ message: 'Bruker har ikke medlemskap i *VT-ALLE-LÆRERE*, men har undervisningsgrupper', solution: 'Meld sak til arbeidsgruppe identitet', raw: undervisningsgrupper })
          if (!isTeacher(user) && undervisningsgrupper.length === 0) return success({ message: 'Er ikke lærer og har ingen undervisningsgrupper' })
          if (undervisningsgrupper.length === 0) return warn({ message: 'Mangler medlemskap i undervisningsgruppe(r)', raw: undervisningsgrupper, solution: `Rettes i ${systemNames.fintLarer}, dersom det savnes noe medlemskap. Hvis det allerede er korrekt i ${systemNames.fintLarer}, meld sak til arbeidsgruppe identitet` })
          return success({ message: `Underviser i ${undervisningsgrupper.length} ${undervisningsgrupper.length > 1 ? 'undervisningsgrupper' : 'undervisningsgruppe'}`, raw: undervisningsgrupper })
        }
      },
      {
        id: 'fint_fodselsnummer',
        title: 'Fødselsnummer er likt i AD',
        description: 'Sjekker at fødselsnummeret er likt i AD og ViS',
        waitForAllData: true,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData, allData) => {
          if (!allData.ad || allData.ad.getDataFailed) return error({ message: 'Mangler data fra AD' })
          const data = {
            adFnr: allData.ad.employeeNumber,
            visFnr: systemData.fodselsnummer
          }
          if (!data.adFnr) return error({ message: `Mangler fødselsnummer i ${systemNames.ad}`, solution: 'Meld sak til arbeidsgruppe identitet', raw: data })
          if (!data.visFnr) return error({ message: `Mangler fødselsnummer i ${systemNames.fintLarer}`, solution: `Rettes i ${systemNames.fintLarer}`, raw: data })
          if (data.adFnr.toString() !== data.visFnr.toString()) return error({ message: `Fødselsnummer er forskjellig i ${systemNames.ad} og ${systemNames.fintLarer}`, raw: data })
          return success({ message: `Fødselsnummer er likt i ${systemNames.ad} og ${systemNames.vis}` })
        }
      },
      {
        id: 'fint_mobilnummer',
        title: 'Har mobiltelefonnummer',
        description: 'Sjekker at mobiltelefonnummer er registrert i ViS',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          const data = {
            larerMobiltelefonnummer: systemData.larerMobiltelefonnummer,
            kontaktMobiltelefonnummer: systemData.kontaktMobiltelefonnummer
          }
          if (!data.larerMobiltelefonnummer && !data.kontaktMobiltelefonnummer) return warn({ message: `Mobiltelefonnummer ikke registrert i ${systemNames.fintLarer}`, raw: data, solution: `Rettes i ${systemNames.fintLarer}` })
          return success({ message: 'Har registrert mobiltelefonnummer', raw: data })
        }
      },
      {
        id: 'fint_feide_vis',
        title: 'Har samme feidenavn i VIS og Feide',
        description: 'Sjekker at feidenavn er skrevet tilbake i ViS',
        waitForAllData: true,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData, allData) => {
          if (!allData.feide || allData.feide.getDataFailed) return error({ message: 'Mangler data fra FEIDE' })
          if (!isTeacher(user) && Array.isArray(allData.feide) && allData.feide.length === 0) return success({ message: 'Er ikke lærer, og har ikke Feide-bruker' })
          const data = {
            feide: allData.feide.eduPersonPrincipalName,
            vis: systemData.feidenavn
          }
          if ((data.feide && data.vis) && data.feide === data.vis) return success({ message: `${systemNames.feide}-navn er skrevet tilbake til ${systemNames.fintLarer}`, raw: data })
          if ((data.feide && data.vis) && data.feide !== data.vis) return error({ message: `${systemNames.feide}-id skrevet tilbake er ikke riktig 😱`, raw: data, solution: 'Meld sak til arbeidsgruppe identitet' })
          return error({ message: `${systemNames.feide}-id er ikke skrevet tilbake 😬`, raw: data, solution: `${systemNames.vis} systemansvarlig må kontakte leverandør da dette må fikses i bakkant!` })
        }
      }
    ]
  },
  {
    id: 'visma',
    name: systemNames.visma,
    // Tester
    tests: [
      {
        id: 'visma_person_finnes',
        title: 'Personen finnes',
        description: 'Sjekker at det ble funnet en person i HRM',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          return repackVisma.getPerson(systemData)
        }
      },
      {
        id: 'visma_aktiv_stilling',
        title: 'Aktiv stilling',
        description: 'Kontrollerer at personen har en aktiv stilling',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          return repackVisma.getActivePosition(systemData)
        }
      },
      {
        id: 'visma_kategori',
        title: 'Ansettelsesforholdet har korrekt kategori',
        description: 'Kontrollerer at ansettelsesforholdet ikke har en kategori som er unntatt fra å få brukerkonto',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          return repackVisma.getActivePositionCategory(systemData)
        }
      },
      {
        id: 'visma_fnr',
        title: 'Fødselsnummeret er gyldig',
        description: 'Sjekker at fødselsnummeret som er registrert er gyldig',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          if (!systemData.ssn) return ({ message: `Bruker har ikke fnr i ${systemNames.visma}`, solution: `HR må legge inn fnr på bruker i ${systemNames.visma}` })
          const validationResult = isValidFnr(systemData.ssn)
          if (!validationResult.valid) return error({ message: validationResult.error, raw: { hrm: { ssn: systemData.ssn }, validationResult } })
          if (validationResult.type !== 'Fødselsnummer') return warn({ message: `Fødselsnummeret som er registrert er et ${validationResult.type}. Dette kan skape problemer i enkelte systemer`, raw: { hrm: { ssn: systemData.ssn }, validationResult } })
          return success({ message: `Fødselsnummeret registrert i ${systemNames.visma} er gyldig`, raw: { hrm: { ssn: systemData.ssn }, validationResult } })
        }
      },
      {
        id: 'visma_org',
        title: 'Har organisasjonstilknytning',
        description: 'Sjekker at bruker har en organisasjonstilknytning',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          const { raw: { positions } } = repackVisma.getActivePosition(systemData)
          if (positions === null || positions === undefined) return error({ message: 'Her var det ikke data for organisasjonstilknytning i det hele tatt... sjekk rawdata' })

          const missingOrg = positions.filter(position => !position.chart)
          if (missingOrg.length > 0) return error({ message: `Mangler organisasjonstilknytning. Må rettes i ${systemNames.visma}`, raw: missingOrg, solution: `Rettes i ${systemNames.visma}` })
          return success({ message: 'Har organisasjonstilknytning', raw: positions })
        }
      },
      {
        id: 'visma_mobile',
        title: 'Har mobilePhone satt',
        description: `Sjekker at bruker har satt mobilePhone i ${systemNames.visma}`,
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          if (!systemData.contactInfo?.mobilePhone) return warn({ message: 'Bruker har ikke fylt ut ☎️ på MinSide og vil ikke kunne motta informasjon på SMS', solution: `Bruker må selv sette telefonnummer på MinSide i ${systemNames.visma}` })
          return success({ message: 'Bruker har fylt ut ☎️ på MinSide' })
        }
      },
      {
        id: 'visma_ropebokstaver',
        title: 'Navn har ropebokstaver',
        description: 'Sjekker om navnet er skrevet med ropebokstaver',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          const data = {
            givenName: systemData.givenName,
            familyName: systemData.familyName
          }
          if (systemData.givenName === systemData.givenName.toUpperCase()) return warn({ message: 'NAVN ER SKREVET MED ROPEBOKSTAVER 📣', raw: data, solution: `Rettes i ${systemNames.visma}` })
          return success({ message: 'Navn er på korrekt format' })
        }
      },
      {
        id: 'visma_stillinger',
        title: 'Brukers stillinger',
        description: `Sjekker brukers stillinger i ${systemNames.visma}`,
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          const { status, raw } = repackVisma.getActivePosition(systemData)
          if (!['ok', 'warning'].includes(status)) return warn({ message: 'Ikke så mange stillinger å sjekke her gitt..', raw })
          const { positions } = raw
          if (positions.length === 0) return warn({ message: 'Ikke så mange stillinger å sjekke her gitt..', raw })

          const primaryPositions = positions.filter(position => position['@isPrimaryPosition'] && position['@isPrimaryPosition'].toLowerCase() === 'true')
          const secondaryPositions = positions.filter(position => !position['@isPrimaryPosition'] || position['@isPrimaryPosition'].toLowerCase() === 'false')
          const repackedPositions = [...primaryPositions, ...secondaryPositions].map(position => {
            return {
              primaryPosition: position['@isPrimaryPosition'] && position['@isPrimaryPosition'].toLowerCase() === 'true',
              leave: position.leave,
              name: position.chart.unit['@name'],
              title: position.positionInfo.positionCode['@name'],
              positionPercentage: position.positionPercentage,
              startDate: position.positionStartDate,
              endDate: position.positionEndDate
            }
          })
          if (primaryPositions.length === 0) return warn({ message: `Bruker har ingen hovedstillinger men ${secondaryPositions.length} ${secondaryPositions.length > 1 ? 'sekundærstillinger' : 'sekundærstilling'}`, raw: repackedPositions, solution: `Rettes i ${systemNames.visma}` })
          if (primaryPositions.length > 0 && secondaryPositions.length > 0) return success({ message: `Har ${primaryPositions.length} ${primaryPositions.length > 1 ? 'hovedstillinger' : 'hovedstilling'} og ${secondaryPositions.length} ${secondaryPositions.length > 1 ? 'sekundærstillinger' : 'sekundærstilling'}`, raw: repackedPositions })
          if (primaryPositions.length > 0 && secondaryPositions.length === 0) return success({ message: `Har ${primaryPositions.length} ${primaryPositions.length > 1 ? 'hovedstillinger' : 'hovedstilling'}`, raw: repackedPositions })
          return error({ message: 'Dette burde ikke ha skjedd men det skjedde allikevel', raw: repackedPositions, solution: 'Vi legger oss flate og lover å se på rutiner 😝' })
        }
      },
      {
        id: 'visma_slutter_bruker',
        title: 'Slutter bruker snart',
        description: 'Slutter bruker snart hos oss?',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          repackVisma.getEmployment(getArrayData(systemData))
          const employment = repackVisma.getEmployment(getArrayData(systemData))
          if (!employment) return warn({ message: 'Her var det ikke noe data å sjekke!', raw: getArrayData(systemData) })

          const endDate = employment.endDate
          if (!endDate) return success({ message: 'Brukeren skal være med oss i all overskuelig fremtid 🎺' })
          const isWithin = isWithinDaterange(null, endDate)
          const prettyDate = prettifyDateToLocaleString(new Date(endDate), true)
          return isWithin ? warn({ message: `Bruker slutter dessverre hos oss den ${prettyDate} 👋` }) : success({ message: `Bruker sluttet dessverre hos oss den ${prettyDate} 🫡`, raw: { start: prettifyDateToLocaleString(new Date(employment.startDate), true), slutt: prettifyDateToLocaleString(new Date(endDate), true) } })
        }
      }
    ]
  },
  {
    id: 'equitrac',
    name: systemNames.equitrac,
    description: 'Eeieie bøbaaja',
    // Tester
    tests: [
      {
        id: 'equitrac_locked',
        title: 'Kontoen er ulåst',
        description: 'Sjekker at kontoen er ulåst',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          const data = {
            accountStatus: systemData.AccountStatus,
            previousAccountStatus: systemData.PreviousAccountStatus || undefined
          }
          if (data.previousAccountStatus) return warn({ message: `Bruker var låst i ${systemNames.equitrac} men er nå låst opp! 👌`, raw: data })
          return success({ message: `Bruker er ikke låst i ${systemNames.equitrac}`, raw: data })
        }
      },
      {
        id: 'equitrac_email_upn',
        title: 'UserEmail er lik UPN',
        description: 'Sjekker at UserEmail er lik UserPrincipalName',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          const data = {
            equitrac: {
              userEmail: systemData.UserEmail
            },
            ad: {
              userPrincipalName: user.userPrincipalName
            }
          }
          if (systemData.UserEmail !== data.ad.userPrincipalName) return error({ message: 'UserEmail er ikke korrekt', raw: data, solution: 'Sak meldes til arbeidsgruppe blekkulf' })
          return success({ message: 'UserEmail er korrekt', raw: data })
        }
      }
    ]
  },
  {
    id: 'sync',
    name: systemNames.sync,
    // Tester
    tests: [
      {
        id: 'sync_idm',
        title: 'Har IDM lastRunTime',
        description: 'Sjekker siste kjøringstidspunkt for Brukersynkronisering',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          if (!systemData.lastIdmRun?.lastRunTime) return warn('Mangler kjøretidspunkt for brukersynkronisering 😬')

          const lastRunTimeCheck = isWithinTimeRange(new Date(systemData.lastIdmRun.lastRunTime), new Date(), (24 * 60 * 60)) // is last run performed less than 24 hours ago?
          const data = {
            lastRunTime: systemData.lastIdmRun.lastRunTime,
            check: lastRunTimeCheck
          }
          if (!lastRunTimeCheck.result) return warn({ message: 'Det er mer enn 24 timer siden siste brukersynkronisering', raw: data, solution: 'Meld sak til arbeidsgruppe identitet' })
          return success({ message: `Brukersynkronisering : ${prettifyDateToLocaleString(new Date(systemData.lastIdmRun.lastRunTime))}`, raw: data })
        }
      },
      {
        id: 'sync_azure',
        title: 'Har azure lastEntraIDSyncTime',
        description: 'Sjekker siste synkroniseringstidspunkt for Entra ID',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          if (!systemData.azureSync || !systemData.azureSync.lastEntraIDSyncTime) return warn(`Mangler synkroniseringstidspunkt for ${systemNames.azure} 😬`)

          const lastRunTimeCheck = isWithinTimeRange(new Date(systemData.azureSync.lastEntraIDSyncTime), new Date(), (40 * 60)) // is last run performed less than 40 minutes ago?
          const data = {
            lastEntraIDSyncTime: systemData.azureSync.lastEntraIDSyncTime,
            check: lastRunTimeCheck
          }
          if (!lastRunTimeCheck.result) return warn({ message: 'Det er mer enn 40 minutter siden siste synkronisering av Entra ID', raw: data, solution: 'Meld sak til arbeidsgruppe identitet' })
          return success({ message: `Entra ID : ${prettifyDateToLocaleString(new Date(systemData.azureSync.lastEntraIDSyncTime))}`, raw: data })
        }
      }
    ]
  },
  {
    id: 'feide',
    name: systemNames.feide,
    // Tester
    tests: [
      {
        id: 'feide_ansatt',
        title: 'Har ansatt FEIDE-bruker',
        description: 'Sjekker om vanlig ansatt har FEIDE-bruker',
        waitForAllData: false,
        /**
         *
         * @param {*} user kan slenge inn jsDocs for en user fra mongodb
         * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
         */
        test: (user, systemData) => {
          if (!systemData || (Array.isArray(systemData) && systemData.length === 0)) return success({ message: 'Ingen FEIDE-bruker her', raw: systemData })
          if (systemData?.displayName) {
            let feideFnr = typeof systemData.norEduPersonNIN === 'string' ? systemData.norEduPersonNIN : null
            if (!feideFnr) {
              /*
                https://docs.feide.no/reference/schema/info_go/go_attributter_ch05.html#noredupersonlin
                ID-number issued by the county municipalities described in fellesrutinene can be expressed as:
                  norEduPersonLIN: <organization's feide-realm>:fin:<eleven-digit number>
              */
              if (Array.isArray(systemData.norEduPersonLIN) && systemData.norEduPersonLIN.length === 1) {
                const feidePrincipalName = FEIDE.PRINCIPAL_NAME.replace('@', '')
                feideFnr = systemData.norEduPersonLIN[0].replace(`${feidePrincipalName}:fin:`, '')
              }
            }
            if (!feideFnr) return error({ message: 'Fødselsnummer mangler 😬' })
            const validFnr = isValidFnr(feideFnr)
            if (validFnr.valid) return success({ message: 'Ansatt har FEIDE-konto og gyldig FNR', raw: { feideFnr, validFnr } })
            return error({ message: 'Ansatt har FEIDE-konto, men ikke gyldig fnr i FEIDE' })
          }
          return error({ message: 'Ansatt har FEIDE-konto, men itj no displayName??', raw: systemData, solution: 'Rettes vel i FEIDE ellerno da' })
        }
      }
    ]
  }
]

module.exports = { systemsAndTests }
