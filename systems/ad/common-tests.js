const { isValidFnr } = require('../../lib/helpers/is-valid-fnr')
const { error, warn, success } = require('../../lib/test-result')
const systemNames = require('../system-names')
const { repackVismaData } = require('../visma/repack-data')

/**
 * Sjekker at ansatt-kontoen er aktivert i AD (bruker data fra HR)
 */
const adAktiveringAnsatt = {
  id: 'ad-aktivering-ansatt',
  title: 'Kontoen er aktivert',
  description: 'Sjekker at ansatt-kontoen er aktivert i AD',
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
}

/**
 * Sjekker at elev-kontoen er aktivert i AD (bruker data fra VIS)
 */
const adAktiveringElev = {
  id: 'ad-aktivering-elev',
  title: 'Kontoen er aktivert',
  description: 'Sjekker at elev-kontoen er aktivert i AD',
  waitForAllData: true,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData, allData) => {
    if (!allData['fint-elev'] || allData['fint-elev'].getDataFailed) return error({ message: `Mangler data i ${systemNames.vis}`, raw: { user }, solution: `Rettes i ${systemNames.vis}` })
    const data = {
      enabled: systemData.enabled,
      vis: {
        active: allData['fint-elev'].elevforhold.find(forhold => forhold.aktiv)
      }
    }
    if (data.enabled && data.vis.active) return success({ message: 'Kontoen er aktivert', raw: data })
    if (data.enabled && !data.vis.active) return error({ message: 'Kontoen er aktivert selvom elev ikke har noen aktive elevforhold' })
    if (!data.enabled && data.vis.active) return warn({ message: 'Kontoen er deaktivert. Elev må aktivere sin konto', raw: data, solution: `Elev må aktivere sin konto via minelevkonto.vtfk.no eller servicedesk kan gjøre det direkte i ${systemNames.ad}` })
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
    if (data.distinguishedName.toUpperCase().includes('OU=AUTO DISABLED USERS')) return warn({ message: 'Bruker ligger i OU\'en AUTO DISABLED USERS', raw: data, solution: `Rettes i ${systemNames.visma}` })
    return success({ message: 'Bruker ligger ikke i OU\'en AUTO DISABLED USERS', raw: data })
  }
}

/**
 * Sjekker at kontoen ikke er sperret for pålogging i AD
 */
const adLocked = {
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
    return warn({ message: `Er medlem av ${data.extensionAttribute4.length} personalrom- og ${data.extensionAttribute4.length === 0 || data.extensionAttribute4.length > 1 ? 'mailinglister' : 'mailingliste'} ekstra`, solution: `extensionAttribute4 fører til medlemskap i personalrom- og mailinglister. Dersom dette ikke er ønskelig fjernes dette fra brukeren i ${systemNames.ad}`, raw: data })
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
 * Sjekker om bruker har extensionAttribute14, og at den har verdien TFK
 */
const adExt14 = {
  id: 'ad-ext14',
  title: 'Har extensionAttribute14 lik TFK',
  description: 'Sjekker om bruker har extensionAttribute14, og at den har verdien TFK',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData.extensionAttribute14 || systemData.extensionAttribute14 !== 'TFK') return error({ message: 'TFK mangler i extensionAttribute14 😬', raw: systemData, solution: 'Meld sak til arbeidsgruppe identitet' })
    return success({ message: 'Har TFK i extensionAttribute14' })
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
    return success({ message: `Er direkte medlem av ${groups.length} ${systemNames.ad}-gruppe${groups.length === 0 || groups.length > 1 ? 'r' : ''}`, raw: groups })
  }
}

module.exports = { adHvilkenOU, adLocked, adFnr, adStateLicense, adExt4, adExt9, adExt14, adGroupMembership, adAktiveringAnsatt, adAktiveringElev }
