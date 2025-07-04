const { error, warn, success, ignore } = require('../../lib/test-result')
const systemNames = require('../system-names')

/**
 * Sjekker om bruker har nettsperre - og om den faktisk skal ha nettsperre
 */
const nettsperreHarNettsperre = {
  id: 'nettsperre_har_nettsperre',
  title: 'Brukeren har aktiv nettsperre',
  description: 'Sjekker om brukeren har aktiv nettsperre',
  waitForAllData: true,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   * @param {*} allData
   */
  test: (user, systemData, allData) => {
    if (!allData.azure) return error({ message: `Mangler data i ${systemNames.azure}`, raw: { user }, solution: `Rettes i ${systemNames.azure}` })
    if (allData.azure.getDataFailed) return error({ message: `Feilet ved henting av data fra ${systemNames.azure}`, raw: { user }, solution: `Sjekk feilmelding i ${systemNames.azure}` })
    const nettsperreGroups = ['NETTSPERRE-EKSAMEN-MAN']
    const memberOfNettsperreGroups = allData.azure.memberOf.filter(group => nettsperreGroups.includes(group))

    const isInNettsperreGroup = memberOfNettsperreGroups.length > 0 // Om brukeren faktisk ligger i EntraID-nettsperre-gruppe (da får den nettsperre fra ISE)
    // Sjekk om brukerne har en aktiv nettsperre - og om den faktisk er i gruppa i entra id
    // Sjekk om brukeren har FLERE aktive nettsperrer - gi en warning om at det kan skape kluss!
    // Sjekk om brukeren har aktiv nettsperre i db - men IKKE ligger i nettsperre-gruppe i entra id - gi en ERROR fort som fy!

    // Sjekk om brukeren har aktiv nettsperre i db
    // Sjekker også om det er en eller flere aktive nettsperrer som eleven har blitt fjernet fra
    const data = {
      isInNettsperreGroup,
      hasActiveNettsperre: systemData.activeNettsperrer.length > 0,
      activeNettsperrer: systemData.activeNettsperrer
    }

    if (data.hasActiveNettsperre && !data.isInNettsperreGroup) return error({ message: `Brukeren skal ha nettsperre, men ligger ikke i nettsperre-gruppe i ${systemNames.azure} 💀`, raw: data, solution: 'Her har det skjedd noe galt - ta kontakt med nettsperre-ansvarlig' })
    if (!data.hasActiveNettsperre && data.isInNettsperreGroup) return error({ message: `Brukeren har ingen aktive nettsperrer, men ligger i nettsperre-gruppe i ${systemNames.azure}`, raw: data, solution: `Mulig brukeren har blitt lagt inn manuelt - brukeren må fjernes manuelt fra grupper: ${memberOfNettsperreGroups.join(', ')}` })
    if (!data.hasActiveNettsperre && !data.isInNettsperreGroup) return success({ message: 'Brukeren har ingen aktive nettsperrer' })
    if (data.hasActiveNettsperre && data.isInNettsperreGroup) {
      if (data.activeNettsperrer.length === 1) {
        const blockedGroup = data.activeNettsperrer[0].blockedGroup
        const blockedByTeacher = data.activeNettsperrer[0].teacher
        return warn({
          message: `Brukeren er i nettsperre via gruppen ${blockedGroup} satt av lærer ${blockedByTeacher}`,
          raw: data,
          solution: 'Dette er vanligvis korrekt - dersom eleven mener at det ikke skal være nettsperre på kontoen, må læreren kontaktes for å sjekke om dette stemmer.'
        })
      }

      return warn({
        message: `Brukeren har ${data.activeNettsperrer.length} aktive nettsperrer. Klikk Vis data for informasjon om hvilke grupper og lærere som har satt sperringene`,
        raw: data,
        solution: 'Dette er vanligvis korrekt - dersom eleven mener at det ikke skal være nettsperre på kontoen, må læreren kontaktes for å sjekke om dette stemmer.'
      })
    }
  }
}

/**
 * Sjekker om bruker har nettsperre - og om den faktisk skal ha nettsperre
 */
const nettsperrePending = {
  id: 'nettsperre_pending',
  title: 'Brukeren har planlagte nettsperrer',
  description: 'Sjekker om brukeren har planlagte nettsperrer',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (systemData.futureNettsperrer.length === 0) return success({ message: 'Brukeren har ingen planlagte nettsperrer' })
    if (systemData.futureNettsperrer.length > 0) return success({ message: `Brukeren har ${systemData.futureNettsperrer.length} planlagt${systemData.futureNettsperrer.length > 1 ? 'e' : ''} nettsperre${systemData.futureNettsperrer.length > 1 ? 'r' : ''}`, raw: systemData.futureNettsperrer })
  }
}

/**
 * Sjekker om bruker har nettsperre - og om den faktisk skal ha nettsperre
 */
const nettsperreOverlappende = {
  id: 'nettsperre_overlappende',
  title: 'Brukeren har overlappende nettsperrer',
  description: 'Sjekker om brukeren har overlappende nettsperrer',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    const allNettsperrer = [...systemData.activeNettsperrer, ...systemData.futureNettsperrer]

    // Let etter sperringer som har overlapp i tid, altså at en sperrings start er før en annens slutt
    const overlappendeSperringer = []
    for (const sperring of allNettsperrer) {
      const startTime = new Date(sperring.startBlock)
      const endTime = new Date(sperring.endBlock)
      const overlapping = allNettsperrer.filter(sperre => sperre.id !== sperring.id).filter(sperre => {
        const currentSperreStartTime = new Date(sperre.endBlock)
        return (currentSperreStartTime >= startTime && currentSperreStartTime <= endTime) // da er den i samme tidshorisonten
      })
      if (overlapping.length > 0) overlappendeSperringer.push({ sperring, overlapping })
    }

    const repackOverlappendeSperring = (sperre) => {
      return {
        id: sperre.id,
        status: sperre.status,
        klasse: sperre.blockedGroup,
        teacher: sperre.teacher,
        createdBy: sperre.createdBy,
        startTime: sperre.startBlock,
        endTime: sperre.endBlock
      }
    }

    // Offh, forferdelig kode
    const repackedOverlappendeSperringer = overlappendeSperringer.map(sperring => {
      const currentSperring = repackOverlappendeSperring(sperring.sperring)
      const overlappende = sperring.overlapping.map(sperre => {
        return repackOverlappendeSperring(sperre)
      })
      return {
        sperring: currentSperring,
        overlappende
      }
    })

    if (overlappendeSperringer.length === 0) return ignore()
    if (overlappendeSperringer.length > 0) return warn({ message: `Brukeren har ${repackedOverlappendeSperringer.length} overlappende nettsperringer - dette kan by på problemer...`, raw: repackedOverlappendeSperringer, solution: 'Sjekk rawdata og be aktuelle lærere sjekke at de har satt sperringen sin på korrekt tidspunkt' })
  }
}

module.exports = { nettsperreHarNettsperre, nettsperrePending, nettsperreOverlappende }
