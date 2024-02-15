const { error, warn, success } = require('../../lib/test-result')
const systemNames = require('../system-names')

/**
 * Sjekker at kontoen er ulåst
 */
const equitracLocked = {
  id: 'equitrac_locked',
  title: 'Kontoen er ulåst',
  description: 'Sjekker at kontoen er ulåst',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    const data = {
      accountStatus: systemData.AccountStatus,
      previousAccountStatus: systemData.PreviousAccountStatus || undefined
    }
    if (data.previousAccountStatus) return warn({ message: `Bruker var låst i ${systemNames.equitrac} men er nå låst opp! 👌`, raw: data })
    return success({ message: `Bruker er ikke låst i ${systemNames.equitrac}`, raw: data })
  }
}

/**
 * Sjekker at UserEmail er lik UserPrincipalName
 */
const equitracEmailEqualUpn = {
  id: 'equitrac_email_upn',
  title: 'UserEmail er lik UPN',
  description: 'Sjekker at UserEmail er lik UserPrincipalName',
  waitForAllData: false,
  /**
   *
   * @param {*} user kan slenge inn jsDocs for en user fra mongodb
   * @param {*} systemData Kan slenge inn jsDocs for at dette er graph-data f. eks
   */
  test: (user, systemData) => {
    const data = {
      equitrac: {
        userEmail: systemData.UserEmail
      },
      ad: {
        userPrincipalName: user.userPrincipalName
      }
    }
    if (systemData.UserEmail !== data.ad.userPrincipalName) return error({ message: 'UserEmail er ikke korrekt', raw: data, solution: 'Sak meldes til arbeidsgruppe blekkulf' })
    return success({ message: 'UserEmail er korrekt', raw: data })
  }
}

module.exports = { equitracLocked, equitracEmailEqualUpn }
