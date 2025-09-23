const { FEIDE } = require('../../config')
const { isValidFnr } = require('../../lib/helpers/is-valid-fnr')
const { success, error } = require('../../lib/test-result')
const systemNames = require('../system-names')

/**
 * Sjekker om vanlig ansatt har FEIDE-bruker
 */
const feideAnsatt = {
  id: 'feide_ansatt',
  title: `Har ansatt ${systemNames.feide}-bruker`,
  description: `Sjekker om ansatt har ${systemNames.feide}-bruker`,
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData || (Array.isArray(systemData) && systemData.length === 0)) return success({ message: `Ingen ${systemNames.feide}-bruker her`, raw: systemData })
    if (!systemData?.displayName) {
      return error({
        message: `Ansatt har ${systemNames.feide}-konto, men itj no displayName??`,
        raw: systemData,
        solution: `Rettes vel i ${systemNames.feide} ellerno da`
      })
    }

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
    if (validFnr.valid) return success({ message: `Ansatt har ${systemNames.feide}-konto og gyldig FNR`, raw: { feideFnr, validFnr } })
    return error({ message: `Ansatt har ${systemNames.feide}-konto, men ikke gyldig fnr i ${systemNames.feide}` })
  }
}

/**
 * Sjekker om elev har FEIDE-bruker
 */
const feideElev = {
  id: 'feide_elev',
  title: `Har elev ${systemNames.feide}-bruker`,
  description: `Sjekker om elev har ${systemNames.feide}-bruker`,
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData || (Array.isArray(systemData) && systemData.length === 0)) return error({ message: `Ingen ${systemNames.feide}-bruker her`, raw: systemData, solution: '??? Hva gjør vi nå egt?' })
    if (!systemData?.displayName) {
      return error({
        message: `Elev har ${systemNames.feide}-konto, men itj no displayName??`,
        raw: systemData,
        solution: `Rettes vel i ${systemNames.feide} ellerno da`
      })
    }

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
    if (validFnr.valid) return success({ message: `Elev har ${systemNames.feide}-konto og gyldig FNR`, raw: { feideFnr, validFnr } })
    return error({ message: `Elev har ${systemNames.feide}-konto, men ikke gyldig fnr i ${systemNames.feide}` })
  }
}

module.exports = { feideAnsatt, feideElev }
