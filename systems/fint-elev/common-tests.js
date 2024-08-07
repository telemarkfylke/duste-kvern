const { isValidFnr } = require('../../lib/helpers/is-valid-fnr')
const { error, warn, success } = require('../../lib/test-result')
const systemNames = require('../system-names')

const fintStudentKontaktlarer = {
  id: 'fint_student_kontaktlarer',
  title: 'Har kontaktlærer',
  description: 'Sjekker at elev har kontaktlærer',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return error({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis}` })
    const kontaktlarere = systemData.kontaktlarere
    if (kontaktlarere.length === 0) return error({ message: 'Har ikke kontaktlærer(e) 😬', solution: `Rettes i ${systemNames.vis}` })
    else return success({ message: `Har ${kontaktlarere.length} ${kontaktlarere.length > 1 ? 'kontaktlærere' : 'kontaktlærer'}`, raw: kontaktlarere })
  }
}

const fintStudentSkoleforhold = {
  id: 'fint_student_skoleforhold',
  title: 'Har kontaktlærer',
  description: 'Sjekker at elev har kontaktlærer',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return error({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis}` })
    const skoleforhold = systemData.elevforhold.filter(forhold => forhold.aktiv).map(forhold => forhold.skole)
    if (skoleforhold.length === 0) return error({ message: 'Har ingen skoleforhold 😬', solution: `Rettes i ${systemNames.vis}` })
    const primarySchool = skoleforhold.find(school => school.hovedskole)
    if (skoleforhold.length > 1) {
      return primarySchool ? warn({ message: `Har ${skoleforhold.length} skoleforhold. ${primarySchool.navn} er hovedskole`, raw: skoleforhold, solution: `Dette er i mange tilfeller korrekt. Dersom det allikevel skulle være feil, må det rettes i ${systemNames.vis}` }) : error({ message: `Har ${skoleforhold.length} skoleforhold men ingen hovedskole`, raw: skoleforhold, solution: `Rettes i ${systemNames.vis}` })
    }
    if (!primarySchool) return warn({ message: 'Har ett skoleforhold, men dette er ikke satt som hovedskole', raw: skoleforhold, solution: `Rettes i ${systemNames.vis}` })
    return success({ message: 'Har ett skoleforhold', raw: skoleforhold })
  }
}

const fintStudentBasisgrupper = {
  id: 'fint_student_basisgrupper',
  title: 'Har basisgruppe(r)',
  description: 'Sjekker at elev har basisgruppe(r)',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return error({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis}` })
    let basisgrupper = []
    systemData.elevforhold.forEach(forhold => {
      const bGrupper = forhold.basisgruppemedlemskap.filter(bGruppe => bGruppe.aktiv).map(bGruppe => { return { systemId: bGruppe.systemId, navn: bGruppe.navn, skole: bGruppe.skole.navn } })
      basisgrupper = [...basisgrupper, ...bGrupper]
    })

    if (basisgrupper.length > 0) return success({ message: `Har ${basisgrupper.length} ${basisgrupper.length > 1 ? 'basisgrupper' : 'basisgruppe'}`, raw: basisgrupper })
    return error({ message: 'Mangler medlemskap i basisgruppe(r) 😬', solution: `Rettes i ${systemNames.vis}` })
  }
}

const fintStudentUndervisningsgrupper = {
  id: 'fint_student_undervisningsgrupper',
  title: 'Har undervisningsgruppe(r)',
  description: 'Sjekker at elev har undervisningsgruppe(r)',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return error({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis}` })
    let undervisningsgrupper = []
    systemData.elevforhold.forEach(forhold => {
      const uGrupper = forhold.undervisningsgruppemedlemskap.filter(uGruppe => uGruppe.aktiv).map(uGruppe => { return { systemId: uGruppe.systemId, navn: uGruppe.navn, skole: uGruppe.skole.navn } })
      undervisningsgrupper = [...undervisningsgrupper, ...uGrupper]
    })

    if (undervisningsgrupper.length > 0) return success({ message: `Har ${undervisningsgrupper.length} ${undervisningsgrupper.length > 1 ? 'undervisningsgrupper' : 'undervisningsgruppe'}`, raw: undervisningsgrupper })
    return error({ message: 'Mangler medlemskap i undervisningsgruppe(r) 😬', solution: `Rettes i ${systemNames.vis}` })
  }
}

const fintStudentFaggrupper = {
  id: 'fint_student_faggrupper',
  title: 'Har faggruppe(r)',
  description: 'Sjekker at elev har faggruppe(r)',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return error({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis}` })
    let faggrupper = []
    systemData.elevforhold.forEach(forhold => {
      const fGrupper = forhold.faggruppemedlemskap.filter(fGruppe => fGruppe.aktiv).map(fGruppe => { return { systemId: fGruppe.systemId, navn: fGruppe.navn, fag: fGruppe.fag } })
      faggrupper = [...faggrupper, ...fGrupper]
    })

    if (faggrupper.length > 0) return success({ message: `Har ${faggrupper.length} ${faggrupper.length > 1 ? 'faggrupper' : 'faggruppe'}`, raw: faggrupper })
    return error({ message: 'Mangler medlemskap i faggruppe(r) 😬', solution: `Rettes i ${systemNames.vis}` })
  }
}

const fintStudentProgramomrader = {
  id: 'fint_student_programomrader',
  title: 'Har programområde(r)',
  description: 'Sjekker at elev har programområde(r)',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return error({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis}` })
    let programomrader = []
    systemData.elevforhold.forEach(forhold => {
      const pOmrader = forhold.programomrademedlemskap.filter(pOmrade => pOmrade.aktiv).map(pOmrade => { return { systemId: pOmrade.systemId, navn: pOmrade.navn, utdanningsprogram: pOmrade.utdanningsprogram } })
      programomrader = [...programomrader, ...pOmrader]
    })

    if (programomrader.length > 0) return success({ message: `Har ${programomrader.length} ${programomrader.length > 1 ? 'programomrader' : 'programomrade'}`, raw: programomrader })
    return error({ message: 'Mangler medlemskap i programomrade(r) 😬', solution: `Rettes i ${systemNames.vis}` })
  }
}

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
    if (!systemData) return error({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis}` })
    const data = {
      adFnr: allData.ad.employeeNumber,
      visFnr: systemData.fodselsnummer
    }
    if (!data.adFnr) return error({ message: `Mangler fødselsnummer i ${systemNames.ad}`, solution: 'Meld sak til arbeidsgruppe identitet', raw: data })
    if (!data.visFnr) return error({ message: `Mangler fødselsnummer i ${systemNames.fintLarer}`, solution: `Rettes i ${systemNames.fintLarer}`, raw: data })
    if (data.adFnr.toString() !== data.visFnr.toString()) return error({ message: `Fødselsnummer er forskjellig i ${systemNames.ad} og ${systemNames.vis}`, raw: data })
    return success({ message: `Fødselsnummer er likt i ${systemNames.ad} og ${systemNames.vis}`, raw: data })
  }
}

const fintGyldigFodselsnummer = {
  id: 'fint_gyldig_fodselsnummer',
  title: 'Har gyldig fødselsnummer',
  description: 'Sjekker at fødselsnummer er gyldig',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return error({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis}` })
    const data = {
      id: systemData.fodselsnummer,
      fnr: isValidFnr(systemData.fodselsnummer)
    }
    return data.fnr.valid ? success({ message: `Har gyldig ${data.fnr.type}`, raw: data }) : error({ message: data.fnr.error, raw: data })
  }
}

const fintStudentFeidenavn = {
  id: 'fint_student_feidenavn',
  title: 'Har samme feidenavn i VIS og Feide',
  description: 'Sjekker at feidenavn er skrevet tilbake i ViS',
  waitForAllData: true,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData, allData) => {
    if (!systemData) return error({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis}` })
    if (!allData.feide || allData.feide.getDataFailed) return error({ message: 'Mangler data fra FEIDE' })

    const data = {
      feide: allData.feide.eduPersonPrincipalName,
      vis: systemData.feidenavn
    }
    if ((data.feide && data.vis) && data.feide === data.vis) return success({ message: `${systemNames.feide}-navn er skrevet tilbake til ${systemNames.vis}`, raw: data })
    if ((data.feide && data.vis) && data.feide !== data.vis) return error({ message: `${systemNames.feide}-id skrevet tilbake er ikke riktig 😱`, raw: data, solution: 'Meld sak til arbeidsgruppe identitet' })
    return error({ message: `${systemNames.feide}-id er ikke skrevet tilbake 😬`, raw: data, solution: `${systemNames.vis} systemansvarlig må kontakte leverandør da dette må fikses i bakkant!` })
  }
}

const fintStudentUtgattElevforhold = {
  id: 'fint_student_utgatt_elevforhold',
  title: 'Har utgått elevforhold',
  description: 'Sjekker om bruker har utgåtte elevforhold',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return error({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis}` })
    const utgatteElevforhold = systemData.elevforhold.filter(forhold => !forhold.aktiv)
    if (utgatteElevforhold.length > 0) return warn({ message: `Har utgått skoleforhold ved skole${utgatteElevforhold.length > 1 ? 'r' : ''}: ${utgatteElevforhold.map(forhold => forhold.skole.navn).join(', ')}.`, raw: utgatteElevforhold, solution: `Dette er i de fleste tilfeller korrekt. Dersom det allikevel skulle være feil, må det rettes i ${systemNames.vis}` })
    return success({ message: 'Har ingen utgåtte elevfohold' })
  }
}

module.exports = { fintStudentKontaktlarer, fintStudentSkoleforhold, fintStudentBasisgrupper, fintStudentUndervisningsgrupper, fintStudentFaggrupper, fintStudentProgramomrader, fintFodselsnummer, fintGyldigFodselsnummer, fintStudentUtgattElevforhold, fintStudentFeidenavn }
