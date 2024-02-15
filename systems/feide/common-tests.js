const { FEIDE } = require('../../config')
const { isValidFnr } = require('../../lib/helpers/is-valid-fnr')
const { success, error } = require('../../lib/test-result')

/**
 * Sjekker om vanlig ansatt har FEIDE-bruker
 */
const feideAnsatt = {
  id: 'feide_ansatt',
  title: 'Har ansatt FEIDE-bruker',
  description: 'Sjekker om ansatt har FEIDE-bruker',
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

/**
 * Sjekker om elev har FEIDE-bruker
 */
const feideElev = {
  id: 'feide_elev',
  title: 'Har elev FEIDE-bruker',
  description: 'Sjekker om elev har FEIDE-bruker',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData || (Array.isArray(systemData) && systemData.length === 0)) return error({ message: 'Ingen FEIDE-bruker her', raw: systemData, solution: '??? Hva gjør vi nå egt?' })
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
      if (validFnr.valid) return success({ message: 'Elev har FEIDE-konto og gyldig FNR', raw: { feideFnr, validFnr } })
      return error({ message: 'Elev har FEIDE-konto, men ikke gyldig fnr i FEIDE' })
    }
    return error({ message: 'Elev har FEIDE-konto, men itj no displayName??', raw: systemData, solution: 'Rettes vel i FEIDE ellerno da' })
  }
}

module.exports = { feideAnsatt, feideElev }
