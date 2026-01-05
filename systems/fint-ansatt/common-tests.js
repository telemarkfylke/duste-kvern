const { error, warn, success, ignore } = require('../../lib/test-result')
const systemNames = require('../system-names')
const { APPREG: { TENANT_NAME }, SDWORX } = require('../../config')
const { isValidFnr } = require('../../lib/helpers/is-valid-fnr')
const { pluralizeText } = require('../../lib/helpers/pluralize-text')
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
   * @param {*} systemData Kan slenge inn jsDocs for at dette er fint-ansatt-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return error({ message: `Har ikke bruker i ${systemNames.fintAnsatt}`, solution: 'Meld sak til arbeidsgruppe identitet' })
    return success({ message: `Har bruker i ${systemNames.fintAnsatt}` })
  }
}

/**
 * Sjekker om brukeren har VIS-data
 */
const fintAnsattAktivAnsettelsesperiode = {
  id: 'fint_ansatt_aktiv_ansettelsesperiode',
  title: 'Aktiv ansettelsesperiode',
  description: `Sjekker at bruker har et aktivt ansettelsesperiode i ${systemNames.fintAnsatt}`,
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er fint-ansatt-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return ignore() // Første test tar seg av dette
    if (!systemData.ansettelsesperiode) return error({ message: `Mangler ansettelsesperiode i ${systemNames.fintAnsatt}`, solution: 'Meld sak til arbeidsgruppe identitet', raw: systemData.ansettelsesperiode })
    if (!systemData.ansettelsesperiode.aktiv) return warn({ message: `Bruker har ikke en aktiv ansettelsesperiode i ${systemNames.fintAnsatt}`, solution: 'Dersom ansettelsesperioden skal være aktiv, meld sak HR', raw: systemData.ansettelsesperiode })
    return success({ message: `Bruker har aktiv ansettelsesperiode i ${systemNames.fintAnsatt}`, raw: systemData.ansettelsesperiode })
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
   * @param {*} systemData Kan slenge inn jsDocs for at dette er fint-ansatt-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return ignore() // Første test tar seg av dette
    const category = systemData.personalressurskategori
    if (!category.kode) return error({ message: 'Mangler personalressurskategori', raw: category })
    if (SDWORX.EXCLUDED_CATEGORIES.includes(category.kode.toUpperCase())) return error({ message: `Kategorien på personalressursen (${category.kode}) er ekskludert, som tilsier at det ikke skal opprettes noen brukerkonto`, raw: category })
    return success({ message: `Kategorien på ansettelsesforholdet (${category.kode}) er ikke ekskludert, som tilsier at det skal opprettes brukerkonto`, raw: category })
  }
}

/**
 * Har arbeidsforholdstype på aktive arbeidsforhold
 */
const fintAnsattHarArbeidsforholdstype = {
  id: 'fint_ansatt_arbeidsforholdstype',
  title: 'Har arbeidsforholdstype',
  description: 'Har arbeidsforholdstype på aktive arbeidsforhold',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er fint-ansatt-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return ignore() // Første test tar seg av dette
    if (!systemData.arbeidsforhold || systemData.arbeidsforhold.length === 0) return ignore() // fint_ansatt_arbeidsforhold tar seg av dette

    const activePositions = systemData.arbeidsforhold.filter(arbeidsforhold => arbeidsforhold.aktiv)
    if (activePositions.length === 0) return ignore() // fint_ansatt_arbeidsforhold tar seg av dette

    const activePositionsWithType = activePositions.filter(arbeidsforhold => arbeidsforhold.arbeidsforholdstype !== null)
    if (activePositions.length === activePositionsWithType.length) {
      return success({
        message: 'Alle aktive arbeidsforhold har arbeidsforholdstype',
        raw: activePositionsWithType.map(arbeidsforhold => ({ id: arbeidsforhold.systemId, arbeidsforholdstype: arbeidsforhold.arbeidsforholdstype }))
      })
    }

    const activePositionsWithoutType = activePositions.filter(arbeidsforhold => arbeidsforhold.arbeidsforholdstype === null).map(arbeidsforhold => ({ id: arbeidsforhold.systemId }))
    return error({ message: `${activePositionsWithoutType.length} ${pluralizeText('aktiv', activePositionsWithoutType.length, 'e', '')} arbeidsforhold mangler arbeidsforholdstype`, raw: activePositionsWithoutType, solution: `Rettes i ${systemNames.fintAnsatt}` })
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
   * @param {*} systemData Kan slenge inn jsDocs for at dette er fint-ansatt-data f. eks
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
   * @param {*} systemData Kan slenge inn jsDocs for at dette er fint-ansatt-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return ignore() // Første test tar seg av dette
    if (!systemData.arbeidsforhold || systemData.arbeidsforhold.length === 0) return error({ message: 'Mangler data for organisasjonstilknytning', raw: systemData.arbeidsforhold })
    const missingOrg = systemData.arbeidsforhold.filter(forhold => !forhold.arbeidssted.organisasjonsId)
    if (missingOrg.length > 0) return error({ message: `Mangler organisasjonstilknytning (arbeidssted) i ${missingOrg.length} ${pluralizeText('stilling', missingOrg.length, 'er')}. Må rettes i ${systemNames.fintAnsatt}`, raw: missingOrg, solution: `Rettes i ${systemNames.fintAnsatt}` })
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
   * @param {*} systemData Kan slenge inn jsDocs for at dette er fint-ansatt-data f. eks
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
   * @param {*} systemData Kan slenge inn jsDocs for at dette er fint-ansatt-data f. eks
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
   * @param {*} systemData Kan slenge inn jsDocs for at dette er fint-ansatt-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData) return ignore() // Første test tar seg av dette
    if (!systemData.arbeidsforhold || systemData.arbeidsforhold.length === 0) return error({ message: 'Mangler arbeidsforhold', solution: `Dersom brukeren jobber hos oss, rettes i ${systemNames.fintAnsatt}.` })

    const positions = systemData.arbeidsforhold.filter(forhold => forhold.aktiv)
    if (positions.length === 0) return error({ message: 'Bruker har ingen aktive arbeidsforhold', raw: systemData.arbeidsforhold, solution: `Dersom brukeren jobber hos oss, rettes i ${systemNames.fintAnsatt}.` })

    const primaryPositions = positions.filter(position => position.hovedstilling)
    const secondaryPositions = positions.filter(position => !position.hovedstilling)

    if (primaryPositions.length === 0) return warn({ message: `Bruker har ingen hovedstillinger men ${secondaryPositions.length} ${pluralizeText('sekundærstilling', secondaryPositions.length, 'er')}`, raw: positions, solution: `Rettes i ${systemNames.fintAnsatt}` })
    if (primaryPositions.length > 0 && secondaryPositions.length > 0) return success({ message: `Har ${primaryPositions.length} ${pluralizeText('hovedstilling', primaryPositions.length, 'er')} og ${secondaryPositions.length} ${pluralizeText('sekundærstilling', secondaryPositions.length, 'er')}`, raw: positions })
    if (primaryPositions.length > 0 && secondaryPositions.length === 0) return success({ message: `Har ${primaryPositions.length} ${pluralizeText('hovedstilling', primaryPositions.length, 'er')}`, raw: positions })
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
   * @param {*} systemData Kan slenge inn jsDocs for at dette er fint-ansatt-data f. eks
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

module.exports = { fintAnsattData, fintAnsattAktivAnsettelsesperiode, fintAnsattKategori, fintAnsattHarArbeidsforholdstype, fintAnsattFnr, fintAnsattOrgTilknytning, fintAnsattMobile, fintAnsattRopebokstaver, fintAnsattArbeidsforhold, fintAnsattSlutterBruker }
