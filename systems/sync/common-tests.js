const { prettifyDateToLocaleString } = require('../../lib/helpers/date-time-output')
const { isWithinTimeRange } = require('../../lib/helpers/is-within-timerange')
const { warn, success } = require('../../lib/test-result')
const systemNames = require('../system-names')

/**
 * Sjekker siste kjøringstidspunkt for Brukersynkronisering OBS OBS BRUKES ikke lenger, fiks den om du trenger den
 */
const syncIdm = {
  id: 'sync_idm',
  title: 'Har IDM lastRunTime',
  description: 'Sjekker siste kjøringstidspunkt for Brukersynkronisering',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData.lastIdmRun?.lastRunTime) return warn({ message: 'Mangler kjøretidspunkt for brukersynkronisering 😬' })

    const lastRunTimeCheck = isWithinTimeRange(new Date(systemData.lastIdmRun.lastRunTime), new Date(), (24 * 60 * 60)) // is last run performed less than 24 hours ago?
    const data = {
      lastRunTime: systemData.lastIdmRun.lastRunTime,
      check: lastRunTimeCheck
    }
    if (!lastRunTimeCheck.result) return warn({ message: 'Det er mer enn 24 timer siden siste brukersynkronisering', raw: data, solution: 'Meld sak til arbeidsgruppe identitet' })
    return success({ message: `Brukersynkronisering : ${prettifyDateToLocaleString(new Date(systemData.lastIdmRun.lastRunTime))}`, raw: data })
  }
}

/**
 * Sjekker siste synkroniseringstidspunkt for Entra ID
 */
const syncAzure = {
  id: 'sync_azure',
  title: 'Har azure lastEntraIDSyncTime',
  description: `Sjekker siste synkroniseringstidspunkt for ${systemNames.azure}`,
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    if (!systemData.azureSync || !systemData.azureSync.lastEntraIDSyncTime) return warn({ message: `Mangler synkroniseringstidspunkt for ${systemNames.azure} 😬` })

    const lastRunTimeCheck = isWithinTimeRange(new Date(systemData.azureSync.lastEntraIDSyncTime), new Date(), (40 * 60)) // is last run performed less than 40 minutes ago?
    const data = {
      lastEntraIDSyncTime: systemData.azureSync.lastEntraIDSyncTime,
      check: lastRunTimeCheck
    }
    if (!lastRunTimeCheck.result) return warn({ message: `Det er mer enn 40 minutter siden siste synkronisering av ${systemNames.azure}`, raw: data, solution: 'Meld sak til arbeidsgruppe identitet' })
    return success({ message: `${systemNames.azure} : ${prettifyDateToLocaleString(new Date(systemData.azureSync.lastEntraIDSyncTime))}`, raw: data })
  }
}

module.exports = { syncIdm, syncAzure }
