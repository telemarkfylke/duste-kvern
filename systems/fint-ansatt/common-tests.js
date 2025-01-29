const { error, warn, success, ignore } = require('../../lib/test-result')
const systemNames = require('../system-names')
const { APPREG: { TENANT_NAME }, SDWORX } = require('../../config')
const { isValidFnr } = require('../../lib/helpers/is-valid-fnr')
const isWithinDaterange = require('../../lib/helpers/is-within-daterange')
const { prettifyDateToLocaleString } = require('../../lib/helpers/date-time-output')

/**
 * Sjekker om brukeren har VIS-data
 */
const fintAnsattData = {
  id: 'fint_ansatt_bruker_finnes',
  title: `Brukeren finnes i ${systemNames.fintAnsatt}`,
  description: `Sjekker at det ble funnet en bruker i ${systemNames.fintAnsatt}`,
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return error({ message: `Har ikke bruker i ${systemNames.fintAnsatt}`, solution: 'Meld sak til arbeidsgruppe identitet' })
    return success({ message: `Har bruker i ${systemNames.fintAnsatt}` })
  }
}

/**
 * Sjekker om brukeren har VIS-data
 */
const fintAnsattAktivStilling = {
  id: 'fint_ansatt_aktiv_stilling',
  title: 'Aktivt arbeidsforhold',
  description: `Sjekker bruker har et aktivt arbeidsforhold i ${systemNames.fintAnsatt}`,
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return ignore() // Første test tar seg av dette
    if (!systemData.aktiv) return error({ message: `Bruker har ikke et aktivt arbeidsforhold i ${systemNames.fintAnsatt}`, solution: 'Meld sak til arbeidsgruppe identitet', raw: systemData.arbeidsforhold })
    return success({ message: `Bruker har minst et aktivt arbeidsforhold i ${systemNames.fintAnsatt}`, raw: systemData.arbeidsforhold })
  }
}

/**
 * Kontrollerer at personalressursen ikke har en kategori som er unntatt fra å få brukerkonto
 */
const fintAnsattKategori = {
  id: 'fint_ansatt_kategori',
  title: 'Personalressurs har korrekt kategori',
  description: 'Kontrollerer at personalressurs ikke har en kategori som er unntatt fra å få brukerkonto',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return ignore() // Første test tar seg av dette
    const category = systemData.personalressurskategori
    if (!category.kode) return error({ message: 'Mangler personalressurskategori', raw: category })
    if (SDWORX.EXCLUDED_CATEGORIES.includes(category.kode.toUpperCase())) return warn({ message: `Kategorien på personalressursen (${category.kode}) er ekskludert, som tilsier at det ikke skal opprettes noen brukerkonto`, raw: category })
    return success({ message: `Kategorien på ansettelsesforholdet (${category.kode}) er ikke ekskludert, som tilsier at det skal opprettes brukerkonto`, raw: category })
  }
}

/**
 * Kontrollerer at ansettelsesforholdet ikke har en kategori som er unntatt fra å få brukerkonto
 */
const fintAnsattFnr = {
  id: 'fint_ansatt_fnr',
  title: 'Personalressurs har gyldig fødselsnummer',
  description: 'Kontrollerer at personalressurs har et gyldig fødselsnummer',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return ignore() // Første test tar seg av dette
    const fnr = systemData.fodselsnummer
    if (!fnr) return error({ message: 'Mangler fødselsnummer...', solution: 'Be HR legge inn fødselsnummer', raw: fnr })
    const validationResult = isValidFnr(fnr)
    if (!validationResult.valid) return error({ message: validationResult.error, raw: { fnr, validationResult } })
    if (validationResult.type !== 'Fødselsnummer') return warn({ message: `Fødselsnummeret som er registrert er et ${validationResult.type}. Dette kan skape problemer i enkelte systemer`, raw: { fnr, validationResult } })
    return success({ message: `Fødselsnummeret registrert i ${systemNames.fintAnsatt} er gyldig`, raw: { fnr, validationResult } })
  }
}

/**
 * Sjekker at bruker har en organisasjonstilknytning
 */
const fintAnsattOrgTilknytning = {
  id: 'fint_ansatt_orgtilknytning',
  title: 'Har organisasjonstilknytning',
  description: 'Sjekker at bruker har en organisasjonstilknytning',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return ignore() // Første test tar seg av dette
    if (!systemData.arbeidsforhold || systemData.arbeidsforhold.length === 0) return error({ message: 'Mangler data for organisasjonstilknytning', raw: systemData.arbeidsforhold })
    const missingOrg = systemData.arbeidsforhold.filter(forhold => !forhold.arbeidssted.organisasjonsId)
    if (missingOrg.length > 0) return error({ message: `Mangler organisasjonstilknytning (arbeidssted) i ${missingOrg.length} stilling${missingOrg.length > 1 ? 'er' : ''}. Må rettes i ${systemNames.fintAnsatt}`, raw: missingOrg, solution: `Rettes i ${systemNames.fintAnsatt}` })
    return success({ message: 'Har organisasjonstilknytning', raw: systemData.arbeidsforhold.map(forhold => forhold.arbeidssted) })
  }
}

/**
 * Sjekker at bruker har fått telefonnr i HR
 */
const fintAnsattMobile = {
  id: 'fint_ansatt_mobile',
  title: 'Personalressurs har mobiltelefonnummer',
  description: `Sjekker at bruker har mobiltelefonnummer på personalressurs i ${systemNames.fintAnsatt}`,
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return ignore() // Første test tar seg av dette
    if (!systemData.kontaktMobiltelefonnummer && !systemData.privatMobiltelefonnummer) return warn({ message: `Bruker har ikke mobiltelefonnummer registrert på personalressurs eller person i ${systemNames.fintAnsatt} og har ikke mottatt oppstartsmelding på SMS`, solution: `Dersom brukeren trenger å sette opp konto, send brukeren til minkonto.${TENANT_NAME}.no/ansatt. Dersom brukeren har satt opp kontoen sin, rettes dette i ${systemNames.fintAnsatt}.` })
    return success({ message: `Bruker har ☎️ korrekt satt i ${systemNames.fintAnsatt}` })
  }
}

/**
 * Sjekker om navnet er skrevet med ropebokstaver
 */
const fintAnsattRopebokstaver = {
  id: 'fint_ansatt_ropebokstaver',
  title: 'Navn har ropebokstaver',
  description: 'Sjekker om navnet er skrevet med ropebokstaver',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return ignore() // Første test tar seg av dette
    const data = {
      fornavn: systemData.fornavn,
      etternavn: systemData.etternavn
    }
    if (!data.fornavn) return error({ message: 'Mangler fornavn...', solution: `Be HR legge inn fornavn i ${systemNames.fintAnsatt}`, raw: data })
    if (!data.etternavn) return error({ message: 'Mangler etternavn...', solution: `Be HR legge inn etternavn i ${systemNames.fintAnsatt}`, raw: data })
    if (data.fornavn === data.fornavn.toUpperCase() || data.etternavn === data.etternavn.toUpperCase()) return warn({ message: 'NAVN ER SKREVET MED ROPEBOKSTAVER 📣', raw: data, solution: `Rettes i ${systemNames.fintAnsatt}` })
    return success({ message: 'Navn er på korrekt format', raw: data })
  }
}

/**
 * Sjekker brukers stillinger i HR
 */
const fintAnsattArbeidsforhold = {
  id: 'fint_ansatt_arbeidsforhold',
  title: 'Brukers arbeidsforhold',
  description: `Sjekker brukers arbeidsforhold i ${systemNames.fintAnsatt}`,
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return ignore() // Første test tar seg av dette
    if (!systemData.arbeidsforhold || systemData.arbeidsforhold.length === 0) return error({ message: 'Mangler arbeidsforhold', solution: `Dersom brukeren jobber hos oss, rettes i ${systemNames.fintAnsatt}.` })

    const positions = systemData.arbeidsforhold.filter(forhold => forhold.aktiv)
    if (positions.length === 0) return error({ message: 'Bruker har ingen aktive arbeidsforhold', raw: systemData.arbeidsforhold, solution: `Dersom brukeren jobber hos oss, rettes i ${systemNames.fintAnsatt}.` })

    const primaryPositions = positions.filter(position => position.hovedstilling)
    const secondaryPositions = positions.filter(position => !position.hovedstilling)

    if (primaryPositions.length === 0) return warn({ message: `Bruker har ingen hovedstillinger men ${secondaryPositions.length} ${secondaryPositions.length > 1 ? 'sekundærstillinger' : 'sekundærstilling'}`, raw: positions, solution: `Rettes i ${systemNames.fintAnsatt}` })
    if (primaryPositions.length > 0 && secondaryPositions.length > 0) return success({ message: `Har ${primaryPositions.length} ${primaryPositions.length > 1 ? 'hovedstillinger' : 'hovedstilling'} og ${secondaryPositions.length} ${secondaryPositions.length > 1 ? 'sekundærstillinger' : 'sekundærstilling'}`, raw: positions })
    if (primaryPositions.length > 0 && secondaryPositions.length === 0) return success({ message: `Har ${primaryPositions.length} ${primaryPositions.length > 1 ? 'hovedstillinger' : 'hovedstilling'}`, raw: positions })
    return error({ message: 'Dette burde ikke ha skjedd men det skjedde allikevel', raw: positions, solution: 'Vi legger oss flate og lover å se på rutiner 😝' })
  }
}

/**
 * Slutter bruker snart hos oss?
 */
const fintAnsattSlutterBruker = {
  id: 'fint_ansatt_slutter_bruker',
  title: 'Slutter bruker snart',
  description: 'Slutter bruker snart hos oss?',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return ignore() // Første test tar seg av dette
    const employmentPeriod = systemData.ansettelsesperiode
    if (user.displayName === 'Bjørn Kaarstein') return warn({ message: 'Denne brukeren har ikke lov til å slutte, og alle forsøk på oppsigelse vil bli anmeldt 🐻', raw: employmentPeriod, solution: 'Dersom du opplever at brukeren ønsker å si opp, gi han et par pils og si at alle andre arbeidsplasser spiller Erlend Ropstad på høy lyd' })
    if (!employmentPeriod.aktiv) return error({ message: 'Brukeren har ikke et aktivt ansettelsesforhold...', raw: employmentPeriod })
    if (!employmentPeriod.slutt) return success({ message: 'Brukeren skal være med oss i all overskuelig fremtid 🎺', raw: employmentPeriod })
    const isWithin = isWithinDaterange(null, employmentPeriod.slutt)
    const prettyDate = prettifyDateToLocaleString(new Date(employmentPeriod.slutt), true)
    return isWithin ? warn({ message: `Bruker slutter dessverre hos oss den ${prettyDate} 👋` }) : success({ message: `Bruker sluttet dessverre hos oss den ${prettyDate} 🫡`, raw: employmentPeriod })
  }
}

/**
 * Er bruker i permisjon? IKKE AKTIV ENDA, FINN EKSEMPEL PÅ NOEN SOM ER I PERMISJON! Husk å skrive om og
 */
/*
const vismaPermisjon = {}
*/

module.exports = { fintAnsattData, fintAnsattAktivStilling, fintAnsattKategori, fintAnsattFnr, fintAnsattOrgTilknytning, fintAnsattMobile, fintAnsattRopebokstaver, fintAnsattArbeidsforhold, fintAnsattSlutterBruker }
