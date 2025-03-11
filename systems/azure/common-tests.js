const { APPREG: { TENANT_NAME } } = require('../../config')
const { isWithinTimeRange } = require('../../lib/helpers/is-within-timerange')
const { error, warn, success } = require('../../lib/test-result')
const systemNames = require('../system-names')
const licenses = require('./licenses')

const aadSyncInMinutes = 30
const aadSyncInSeconds = aadSyncInMinutes * 60

/**
 * Sjekker at ansatt-kontoen er aktivert i azure (bruker data fra HR)
 */
const azureAktiveringAnsatt = {
  id: 'azure_aktivering_ansatt',
  title: 'Kontoen er aktivert',
  description: `Sjekker at kontoen er aktivert i ${systemNames.aad}`,
  waitForAllData: true,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData, allData) => {
    if (!allData['fint-ansatt']) return error({ message: `Mangler data i ${systemNames.fintAnsatt}`, raw: { user }, solution: `Rettes i ${systemNames.fintAnsatt}` })
    if (allData['fint-ansatt'].getDataFailed) return error({ message: `Feilet ved henting av data fra ${systemNames.fintAnsatt}`, raw: { user }, solution: `Sjekk feilmelding i ${systemNames.fintAnsatt}` })
    const data = {
      enabledInAd: systemData.accountEnabled,
      enabledInSdWorx: allData['fint-ansatt'].arbeidsforhold.some(forhold => forhold.aktiv || new Date() < new Date(forhold.gyldighetsperiode.start))
    }
    if (data.enabledInAd && data.enabledInSdWorx) return success({ message: 'Kontoen er aktivert', raw: data })
    if (data.enabledInAd && !data.enabledInSdWorx) return error({ message: 'Kontoen er aktivert selvom ansatt ikke har aktivt ansettelsesforhold', raw: data, solution: `Rettes i ${systemNames.fintAnsatt}` })
    if (!data.enabledInAd && data.enabledInSdWorx) return warn({ message: 'Kontoen er deaktivert selvom ansatt har et aktivt ansettelsesforhold. Ansatt må aktivere sin konto', raw: data, solution: `Ansatt må aktivere sin konto via minkonto.${TENANT_NAME}.no eller servicedesk kan gjøre det direkte i ${systemNames.ad}` })
    if (!data.enabledInAd && !data.enabledInSdWorx) return warn({ message: 'Kontoen er deaktivert i AD og ansatt har ikke et aktivt ansettelsesforhold', raw: data, solution: `Rettes i ${systemNames.fintAnsatt}` })
  }
}

/**
 * Sjekker at elev-kontoen er aktivert i azure (bruker data fra VIS)
 */
const azureAktiveringElev = {
  id: 'azure_aktivering_elev',
  title: 'Kontoen er aktivert',
  description: `Sjekker at kontoen er aktivert i ${systemNames.aad}`,
  waitForAllData: true,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData, allData) => {
    if (!allData['fint-elev']) return error({ message: `Mangler data i ${systemNames.vis}`, raw: { user }, solution: `Rettes i ${systemNames.vis}` })
    if (allData['fint-elev'].getDataFailed) return error({ message: `Feilet ved henting av data fra ${systemNames.vis}`, raw: { user }, solution: `Sjekk feilmelding i ${systemNames.vis}` })
    const data = {
      enabled: systemData.accountEnabled,
      vis: {
        active: allData['fint-elev'].elevforhold.find(forhold => forhold.aktiv || new Date() < new Date(forhold.gyldighetsperiode.start))
      }
    }
    if (data.enabled && data.vis.active) return success({ message: 'Kontoen er aktivert', raw: data })
    if (data.enabled && !data.vis.active) return error({ message: 'Kontoen er aktivert selvom elev ikke har noen aktive elevforhold' })
    if (!data.enabled && data.vis.active) return warn({ message: 'Kontoen er deaktivert. Elev må aktivere sin konto', raw: data, solution: `Elev må aktivere sin konto via minelevkonto.vtfk.no eller servicedesk kan gjøre det direkte i ${systemNames.ad}` })
    if (!data.enabled && !data.vis.active) return warn({ message: 'Ingen aktive elevforhold', raw: data, solution: `Rettes i ${systemNames.vis}` })
  }
}

/**
 * Sjekker at UPN-et er lik e-postadressen i AD
 */
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
        return warn({ message: 'E-postadresse blir satt når konto er blitt aktivert', raw: data, solution: `Bruker må aktivere sin konto via minkonto.${TENANT_NAME}.no eller servicedesk kan gjøre det direkte i ${systemNames.ad}. Deretter vent til Entra ID Syncen har kjørt, dette kan ta inntil ${aadSyncInMinutes} minutter` })
      }
    }
    return systemData.userPrincipalName.toLowerCase() === systemData.mail.toLowerCase() ? success({ message: 'UPN (brukernavn til Microsoft 365) er lik e-postadressen', raw: data }) : error({ message: 'UPN (brukernavn til Microsoft 365) er ikke lik e-postadressen', raw: data, solution: 'Meld sak til arbeidsgruppe identitet' })
  }
}

/**
 * Sjekker at passordet er synkronisert til Azure AD innenfor 40 minutter
 */
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
    if (!allData.ad) return error({ message: `Mangler ${systemNames.ad}-data`, raw: allData.ad })
    if (allData.ad.getDataFailed) return error({ message: `Feilet ved henting av data fra ${systemNames.ad}`, raw: { user }, solution: `Sjekk feilmelding i ${systemNames.ad}` })
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

/**
 * Sjekker at passordet er synkronisert til Azure AD innenfor 40 minutter
 */
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
    if (!systemData.accountEnabled && systemData.assignedLicenses.length === 0) return warn({ message: 'Microsoft 365-lisenser blir satt når konto er blitt aktivert', solution: `Bruker må aktivere sin konto via minkonto.${TENANT_NAME}.no eller servicedesk kan gjøre det direkte i ${systemNames.ad}. Deretter vent til Azure AD Syncen har kjørt, dette kan ta inntil ${aadSyncInMinutes} minutter` })
    const data = {
      licenses: [],
      hasNecessaryLicenses: false
    }
    // ??? Bare legge inn riktig skuId for ansatt her??? Og test det i stedet  -ref at vi kanskje Bumper ned lisens på noen
    data.licenses = systemData.assignedLicenses.map(license => {
      const lic = licenses.find(lic => lic.skuId === license.skuId)
      if (lic) {
        data.hasNecessaryLicenses = data.hasNecessaryLicenses ? true : Boolean(lic.skuPartNumber !== 'FLOW_FREE')
        return lic
      } else return license
    })
    if (data.hasNecessaryLicenses) return success({ message: 'Har Microsoft 365-lisenser', solution: data.licenses.map(lic => lic.name || lic.skuId), raw: data })
    if (systemData.accountEnabled) return warn({ message: `Har ${data.licenses.length} ${data.licenses.length > 1 ? 'lisenser' : 'lisens'} men mangler nødvendige lisenser`, raw: data, solution: 'Sjekk at bruker har aktive lisenser på brukerobjektet i Azure AD under Licenses. Hvis noen av lisensene tildelt til bruker ikke er aktive, sjekk at det er lisenser tilgjengelig og deretter kjør en Reprocess i License vinduet. Hvis bruker ikke har noen lisenser tildelt, meld sak til arbeidsgruppe identitet' })
    return warn({ message: 'Microsoft 365-lisenser blir satt når konto er blitt aktivert', solution: `Ansatt må aktivere sin konto via minkonto.${TENANT_NAME}.no eller servicedesk kan gjøre det direkte i ${systemNames.ad}. Deretter vent til Azure AD Syncen har kjørt, dette kan ta inntil ${aadSyncInMinutes} minutter` })
  }
}

/**
 * Sjekker at MFA er satt opp
 */
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

/**
 * Sjekker om bruker har skrevet feil passord idag
 */
const azurePwdKluss = {
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
      userSignInErrors: systemData.userSignInErrors.filter(err => err.status.errorCode === 50126) // pwd kluss
    }
    if (data.userSignInErrors.length > 0) return error({ message: `Har skrevet feil passord ${data.userSignInErrors.length} gang${data.userSignInErrors.length > 1 ? 'er' : ''} idag 🤦‍♂️`, raw: data, solution: 'Bruker må ta av boksehanskene 🥊' })
    return success({ message: 'Ingen klumsing med passord idag', raw: data })
  }
}

/**
 * Sjekker at AD-bruker og Entra ID-bruker er i sync (krever ad data)
 */
const azureAdInSync = {
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
    if (!allData.ad) return error({ message: `Mangler data i ${systemNames.ad}`, raw: { user } })
    if (allData.ad.getDataFailed) return error({ message: `Feilet ved henting av data fra ${systemNames.ad}`, raw: { user }, solution: `Sjekk feilmelding i ${systemNames.ad}` })
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
}

/**
 * Sjekker brukers direkte gruppemedlemskap
 */
const azureGroups = {
  id: 'azure_groups',
  title: 'Sjekker direktemedlemskap',
  description: 'Sjekker brukers direkte gruppemedlemskap',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    const groupWarningLimit = 200
    if (systemData.memberOf.length === 0) return error({ message: `Er ikke medlem av noen ${systemNames.azure} grupper 🤔` })
    const groups = {
      regular: systemData.memberOf.filter(group => !group.trim().startsWith('MEM-User-')),
      mem: systemData.memberOf.filter(group => group.trim().startsWith('MEM-User-'))
    }
    if (groups.regular.length > groupWarningLimit) return warn({ message: `Er direkte medlem av ${groups.regular.length} ${systemNames.azure} grupper, og ${groups.mem.length} MEM-grupper 😵`, solution: 'Det kan hende brukeren trenger å være medlem av alle disse gruppene, men om du tror det er et problem, meld en sak til arbeidsgruppe identitet', raw: groups })
    return success({ message: `Er direkte medlem av ${groups.regular.length} ${systemNames.azure} gruppe${systemData.memberOf.length === 0 || systemData.memberOf.length > 1 ? 'r' : ''}, og ${groups.mem.length} MEM-grupper`, raw: groups })
  }
}

/**
 * Sjekker om bruker er medlem av en conditional access persona group
 */
const azureConditionalAccessPersonaGroup = {
  id: 'azure_conditional_access_persona_group',
  title: 'Sjekker medlemskap i conditional access persona group',
  description: 'Sjekker om bruker er medlem av en conditional access persona group',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    const conditionalAccessPersonaGroups = systemData.memberOf.filter(group => group.trim().toLowerCase().startsWith('conditional access persona'))

    if (conditionalAccessPersonaGroups.length === 0) return error({ message: `Er ikke medlem av noen Conditional Acccess Persona-grupper i ${systemNames.azure}, og vil ikke kunne logge på 😧`, solution: 'Ta kontakt med sikkerhet' })
    return success({ message: `Er medlem av ${conditionalAccessPersonaGroups.length} Conditional Acccess Persona-gruppe${conditionalAccessPersonaGroups.length > 1 ? 'r' : ''}`, raw: conditionalAccessPersonaGroups })
  }
}

/**
 * Sjekker om bruker finnes i risky users
 */
const azureRiskyUser = {
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
    if (data.riskyUser.length > 0) return error({ message: `Brukeren har havna i risky users, på nivå ${data.riskyUser.map(risk => risk.riskLevel).join('og ')} 😱`, solution: 'Send sak til sikkerhetsfolket', raw: data })
    if (user.displayName === 'Bjørn Kaarstein') return warn({ message: 'Brukeren er ikke i risky users, men ansees likevel som en risiko 🐻', solution: 'Send sak til viltnemnda' })
    return success({ message: 'Brukeren er ikke i risky users' })
  }
}

/**
 * Sjekker når brukeren klarte å logge på sist
 */
const azureLastSignin = {
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

/**
 * Sjekker hvilke feilsituasjoner eller hendelser bruker har møtt idag
 */
const azureSignInInfo = {
  id: 'azure_signin_info',
  title: 'Bemerkelsesverdige påloggingshendelser',
  description: 'Sjekker bemerkelsesverdige påloggingshendelser',
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
    if (systemData.userSignInErrors.length > 0) return warn({ message: `Har møtt på ${systemData.userSignInErrors.length} bemerkelsesverdig${systemData.userSignInErrors.length > 1 ? 'e' : ''} påloggingshendelse${systemData.userSignInErrors.length > 1 ? 'r' : ''} i dag`, raw: data })
    return success({ message: 'Har ikke møtt på noen bemerkelsesverdige påloggingshendelser i dag', raw: data })
  }
}

/**
 * Sjekker om bruker er medlem av en conditional access persona group
 */
const azureUserDevices = {
    id: 'azure_user_devices',
    title: 'Brukers enheter',
    description: 'Brukers enheter i AzureAD',
    waitForAllData: false,
    /**
     *
     * @param {*} user kan slenge inn jsDocs for en user fra mongodb
     * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
     */
    test: (user, systemData) => {
        if (systemData.userDevices.length === 0) return warn({ message: 'Har ingen registrete enheter. Kan dette stemme da?', solution: 'Dersom brukeren egentlig har en enhet må denne registreres i InTune' })
        return success({ message: `Har ${systemData.userDevices.length} registrert${systemData.userDevices.length > 1 ? 'e' : ''} enhet${systemData.userDevices.length > 1 ? 'er' : ''}`, raw: systemData.userDevices })
    }
}

module.exports = { azureUpnEqualsMail, azurePwdSync, azureLicense, azureMfa, azurePwdKluss, azureAdInSync, azureGroups, azureRiskyUser, azureLastSignin, azureAktiveringAnsatt, azureAktiveringElev, azureConditionalAccessPersonaGroup, azureSignInInfo, azureUserDevices }
