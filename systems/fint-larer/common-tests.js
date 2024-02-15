const { error, warn, success } = require('../../lib/test-result')
const systemNames = require('../system-names')

const isTeacher = (user) => {
  return user.feide
}

/**
 * Sjekker om brukeren er kontaktlærer
 */
const fintKontaktlarer = {
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
}

/**
 * Sjekker om brukeren har duplikate kontaktlærergrupper
 */
const fintDuplicateKontaktlarergrupper = {
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
}

/**
 * Sjekker om ansatt har skoleforhold
 */
const fintSkoleforhold = {
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
}

/**
 * Sjekker om ansatt har undervisningsgrupper
 */
const fintUndervisningsgrupper = {
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
}

/**
 * Sjekker at fødselsnummeret er likt i AD og ViS (Bruker data fra AD)
 */
const fintFodselsnummer = {
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
    return success({ message: `Fødselsnummer er likt i ${systemNames.ad} og ${systemNames.vis}`, raw: data })
  }
}

/**
 * Sjekker at mobiltelefonnummer er registrert i ViS
 */
const fintMobilnummer = {
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
}

/**
 * Sjekker at feidenavn er skrevet tilbake i ViS (bruker data fra FEIDE)
 */
const fintFeideVis = {
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

module.exports = { fintKontaktlarer, fintDuplicateKontaktlarergrupper, fintSkoleforhold, fintUndervisningsgrupper, fintFodselsnummer, fintMobilnummer, fintFeideVis }
