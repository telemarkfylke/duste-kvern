const { APPREG: { TENANT_NAME } } = require('../../config')
const { isValidFnr } = require('../../lib/helpers/is-valid-fnr')
const { pluralizeText } = require('../../lib/helpers/pluralize-text')
const { error, warn, success } = require('../../lib/test-result')
const systemNames = require('../system-names')

/**
 * Sjekker at ansatt-kontoen er aktivert i AD (bruker data fra HR)
 */
const adAktiveringAnsatt = {
  id: 'ad-aktivering-ansatt',
  title: 'Kontoen er aktivert',
  description: `Sjekker at ansatt-kontoen er aktivert i ${systemNames.ad}`,
  waitForAllData: true,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   * @param {*} allData
   */
  test: (user, systemData, allData) => {
    if (!allData['fint-ansatt']) return error({ message: `Mangler data i ${systemNames.fintAnsatt}`, raw: { user }, solution: `Rettes i ${systemNames.fintAnsatt}` })
    if (allData['fint-ansatt'].getDataFailed) return error({ message: `Feilet ved henting av data fra ${systemNames.fintAnsatt}`, raw: { user }, solution: `Sjekk feilmelding i ${systemNames.fintAnsatt}` })
    const data = {
      enabledInAD: systemData.enabled,
      enabledInSdWorx: allData['fint-ansatt'].arbeidsforhold.some(forhold => forhold.aktiv || new Date() < new Date(forhold.gyldighetsperiode.start))
    }
    if (data.enabledInAD && data.enabledInSdWorx) return success({ message: 'Kontoen er aktivert', raw: data })
    if (data.enabledInAD && !data.enabledInSdWorx) return error({ message: 'Kontoen er aktivert selv om ansatt ikke har aktivt ansettelsesforhold', raw: data, solution: `Rettes i ${systemNames.fintAnsatt}` })
    if (!data.enabledInAD && data.enabledInSdWorx) return warn({ message: 'Kontoen er deaktivert selv om ansatt har et aktivt ansettelsesforhold', raw: data, solution: 'Meld sak til arbeidsgruppe identitet' })
    if (!data.enabledInAD && !data.enabledInSdWorx) return warn({ message: `Kontoen er deaktivert i ${systemNames.ad} og ansatt har ikke et aktivt ansettelsesforhold`, raw: data, solution: `Rettes i ${systemNames.fintAnsatt}` })
  }
}

/**
 * Sjekker at elev-kontoen er aktivert i AD (bruker data fra VIS)
 */
const adAktiveringElev = {
  id: 'ad-aktivering-elev',
  title: 'Kontoen er aktivert',
  description: `Sjekker at elev-kontoen er aktivert i ${systemNames.ad}`,
  waitForAllData: true,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   * @param {*} allData
   */
  test: (user, systemData, allData) => {
    if (!allData['fint-elev']) return error({ message: `Mangler data i ${systemNames.vis}`, raw: { user }, solution: `Rettes i ${systemNames.vis}` })
    if (allData['fint-elev'].getDataFailed) return error({ message: `Feilet ved henting av data fra ${systemNames.vis}`, raw: { user }, solution: `Sjekk feilmelding i ${systemNames.vis}` })
    const data = {
      enabled: systemData.enabled,
      vis: {
        active: allData['fint-elev'].elevforhold.find(forhold => forhold.aktiv)
      }
    }
    if (data.enabled && data.vis.active) return success({ message: 'Kontoen er aktivert', raw: data })
    if (data.enabled && !data.vis.active) return error({ message: 'Kontoen er aktivert selv om elev ikke har noen aktive elevforhold' })
    if (!data.enabled && data.vis.active) return warn({ message: 'Kontoen er deaktivert. Elev må aktivere sin konto', raw: data, solution: `Elev må aktivere sin konto via minkonto.${TENANT_NAME}.no/elev eller servicedesk kan gjøre det direkte i ${systemNames.ad}` })
    if (!data.enabled && !data.vis.active) return warn({ message: 'Ingen aktive elevforhold', raw: data, solution: `Rettes i ${systemNames.vis}` })
  }
}

/**
 * Sjekker at bruker ligger i rett OU
 */
const adHvilkenOU = {
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
    if (!data.distinguishedName) return error({ message: `Bruker ikke funnet i ${systemNames.ad} 😬`, raw: data, solution: `Rettes i ${systemNames.ad}` })
    if (data.distinguishedName.toUpperCase().includes('OU=AUTO DISABLED USERS')) return warn({ message: 'Bruker ligger i OU\'en AUTO DISABLED USERS', raw: data, solution: `Rettes i ${systemNames.fintAnsatt}` })
    return success({ message: 'Bruker ligger ikke i OU\'en AUTO DISABLED USERS', raw: data })
  }
}

/**
 * Sjekker at kontoen ikke er sperret for pålogging i AD
 */
const adLocked = {
  id: 'ad-locked',
  title: 'Kontoen er ulåst',
  description: `Sjekker at kontoen ikke er sperret for pålogging i ${systemNames.ad}`,
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
}

/**
 * Sjekker at fødselsnummer er gyldig
 */
const adFnr = {
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
}

/**
 * Sjekker at state er satt på bruker
 */
const adStateLicense = {
  id: 'ad-state',
  title: 'Har state satt for bruker',
  description: 'Sjekker at state er satt på bruker',
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
}

/**
 * Sjekker om bruker har extensionAttribute4 (ekstra personalrom/mailinglister)
 */
const adExt4 = {
  id: 'ad-ext4',
  title: 'Har extensionAttribute4',
  description: 'Sjekker om bruker har extensionAttribute4 (ekstra personalrom/mailinglister)',
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
    return warn({ message: `Er medlem av ${data.extensionAttribute4.length} personalrom- og ${pluralizeText('mailingliste', data.extensionAttribute4.length, 'r')} ekstra`, solution: `extensionAttribute4 fører til medlemskap i personalrom- og mailinglister. Dersom dette ikke er ønskelig fjernes dette fra brukeren i ${systemNames.ad}`, raw: data })
  }
}

/**
 * Sjekker om bruker har extensionAttribute9 (ansattnummer)
 */
const adExt9 = {
  id: 'ad-ext9',
  title: 'Har extensionAttribute9',
  description: 'Sjekker om bruker har extensionAttribute9 (ansattnummer)',
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
}

/**
 * Sjekker brukers direkte gruppemedlemskap
 */
const adGroupMembership = {
  id: 'ad-group-membership',
  title: 'Sjekker direktemedlemskap',
  description: 'Sjekker brukers direkte gruppemedlemskap',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData.memberOf || !Array.isArray(systemData.memberOf)) return error({ message: `Er ikke medlem av noen ${systemNames.ad}-grupper 🤔` })
    const groups = systemData.memberOf.map(member => member.replace('CN=', '').split(',')[0]).sort()
    return success({ message: `Er direkte medlem av ${groups.length} ${systemNames.ad}-${pluralizeText('gruppe', groups.length, 'r')}`, raw: groups })
  }
}

module.exports = { adHvilkenOU, adLocked, adFnr, adStateLicense, adExt4, adExt9, adGroupMembership, adAktiveringAnsatt, adAktiveringElev }
