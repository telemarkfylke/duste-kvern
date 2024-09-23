const { APPREG } = require('../../config')
const { prettifyDateToLocaleString } = require('../../lib/helpers/date-time-output')
const { isValidFnr } = require('../../lib/helpers/is-valid-fnr')
const isWithinDaterange = require('../../lib/helpers/is-within-daterange')
const { getArrayData } = require('../../lib/helpers/system-data')
const { error, warn, success } = require('../../lib/test-result')
const systemNames = require('../system-names')
const repackVisma = require('./repack-data')

/**
 * Sjekker at det ble funnet en person i HRM
 */
const vismaPersonFinnes = {
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
}

/**
 * Kontrollerer at personen har en aktiv stilling
 */
const vismaAktivStilling = {
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
}

/**
 * Kontrollerer at ansettelsesforholdet ikke har en kategori som er unntatt fra å få brukerkonto
 */
const vismaKategori = {
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
}

/**
 * Sjekker at fødselsnummeret som er registrert er gyldig
 */
const vismaFnr = {
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
}

/**
 * Sjekker at bruker har en organisasjonstilknytning
 */
const vismaOrgTilknytning = {
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
}

/**
 * Sjekker at bruker har satt mobilePhone i HR
 */
const vismaMobile = {
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
    if (!systemData.contactInfo?.mobilePhone && !systemData.contactInfo?.privateMobilePhone) return warn({ message: 'Bruker har ikke registrert privat mobilnummer på ☎️ på MinSide og har ikke mottatt oppstartsmelding på SMS', solution: `Send brukeren til minkonto.${APPREG.TENANT_NAME}.no/ansatt, der kan sette opp kontoen sin.` })
    return success({ message: 'Bruker har fylt ut ☎️ på MinSide' })
  }
}

/**
 * Sjekker om navnet er skrevet med ropebokstaver
 */
const vismaRopebokstaver = {
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
}

/**
 * Sjekker brukers stillinger i HR
 */
const vismaStillinger = {
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
    if (!positions || positions.length === 0) return warn({ message: 'Ikke så mange stillinger å sjekke her gitt..', raw })

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
}

/**
 * Slutter bruker snart hos oss?
 */
const vismaSlutterBruker = {
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

/**
 * Er bruker i permisjon?
 */
const vismaPermisjon = {
  id: 'visma_permisjon',
  title: 'Har bruker permisjon',
  description: 'Har brukeren permisjon?',
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
    if (!positions || positions.length === 0) return warn({ message: 'Ikke så mange stillinger å sjekke her gitt..', raw })

    const leavePositions = positions.filter(position => position.leave).map(position => {
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

    if (leavePositions.length > 0) return warn({ message: `Bruker har permisjon fra ${leavePositions.length} stilling${leavePositions.length > 1 ? 'er' : ''}`, solution: 'Dette er ikke nødvendigvis en feil, men kan være nyttig info - se data for mer info', raw: leavePositions })
    return success({ message: 'Bruker har ikke permisjon, og jobber på uten pause 💪' })
  }
}

module.exports = { vismaPersonFinnes, vismaAktivStilling, vismaKategori, vismaFnr, vismaOrgTilknytning, vismaMobile, vismaRopebokstaver, vismaStillinger, vismaSlutterBruker, vismaPermisjon }
