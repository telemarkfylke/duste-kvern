const { logger } = require('@vtfk/logger')
const { APPREG, GRAPH } = require('../../config')
const { getMsalToken } = require('../../lib/get-msal-token')
// const invokePS = require('../../lib/invoke-ps-script')
const { callGraph } = require('../azure/get-data')

const getData = async (user) => {
  // const lastIdmRun = await invokePS('Get-DUSTIDMRun.ps1') // Nej, bas01 er skrudd av

  const clientConfig = {
    clientId: APPREG.CLIENT_ID,
    tenantId: APPREG.TENANT_ID,
    tenantName: APPREG.TENANT_NAME,
    clientSecret: APPREG.CLIENT_SECRET,
    scope: GRAPH.SCOPE
  }
  /* INTE nu lengre
  // Hvis OU er VFYLKE/TFYLKE - hent fra ny tenant, hvis ikke hent fra vtfk
  let clientConfig
  if (user.countyOU === COUNTY_OU) {
    clientConfig = {
      clientId: APPREG.CLIENT_ID,
      tenantId: APPREG.TENANT_ID,
      tenantName: APPREG.TENANT_NAME,
      clientSecret: APPREG.CLIENT_SECRET,
      scope: GRAPH.SCOPE
    }
  } else {
    clientConfig = {
      clientId: APPREG_VTFK.CLIENT_ID,
      tenantId: APPREG_VTFK.TENANT_ID,
      tenantName: APPREG_VTFK.TENANT_NAME,
      clientSecret: APPREG_VTFK.CLIENT_SECRET,
      scope: GRAPH.SCOPE
    }
  }
  */

  const accessToken = await getMsalToken(clientConfig)

  logger('info', ['sync-get-data', `fetching lastSyncTime for tenant ${clientConfig.tenantName}`])
  const onPremisesLastSyncDateTime = await callGraph('v1.0/organization?$select=onPremisesLastSyncDateTime', accessToken)

  return {
    // lastIdmRun,
    // lastSDSSync: lastIdmRun,
    azureSync: {
      lastEntraIDSyncTime: (onPremisesLastSyncDateTime?.value && onPremisesLastSyncDateTime.value.length > 0 && onPremisesLastSyncDateTime.value[0].onPremisesLastSyncDateTime) || null
    }
  }
}

module.exports = { getData }
