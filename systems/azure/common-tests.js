const { isWithinTimeRange } = require('../../lib/helpers/is-within-timerange')
const { error, warn, success } = require('../../lib/test-result')
const systemNames = require('../system-names')
const licenses = require('./licenses')

const aadSyncInMinutes = 30
const aadSyncInSeconds = aadSyncInMinutes * 60

const azureUpnEqualsMail = {
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
}

const azurePwdSync = {
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
}

const azureLicense = {
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
}

const azureMfa = {
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
}

module.exports = { azureUpnEqualsMail, azurePwdSync, azureLicense, azureMfa }
