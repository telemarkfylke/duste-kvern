const { getMsalToken } = require('../../lib/get-msal-token')
const { APPREG, APPREG_VTFK, GRAPH, COUNTY_OU } = require('../../config')
const axios = require('axios').default
const { entraIdDate } = require('../../lib/helpers/date-time-output')
const { logger } = require('@vtfk/logger')

// Skriv om til en batch request!

const callGraph = async (resource, accessToken) => {
  const { data } = await axios.get(`${GRAPH.URL}/${resource}`, { headers: { Authorization: `Bearer ${accessToken}` } })
  return data
}

const getData = async (user) => {
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
  const accessToken = await getMsalToken(clientConfig)

  const userProperties = [
    'id',
    'accountEnabled',
    'assignedLicenses',
    'birthday',
    'businessPhones',
    'companyName',
    'createdDateTime',
    'deletedDateTime',
    'department',
    'displayName',
    'givenName',
    'jobTitle',
    'lastPasswordChangeDateTime',
    'mail',
    'mobilePhone',
    'onPremisesDistinguishedName',
    'onPremisesExtensionAttributes',
    'onPremisesLastSyncDateTime',
    'onPremisesProvisioningErrors',
    'onPremisesSamAccountName',
    'onPremisesSyncEnabled',
    'proxyAddresses',
    'signInSessionsValidFromDateTime',
    'surname',
    'userPrincipalName'
  ].join(',')

  logger('info', ['azure-get-data', 'fetching user data from graph'])
  const userData = await callGraph(`v1.0/users/${user.userPrincipalName}?$select=${userProperties}`, accessToken)

  logger('info', ['azure-get-data', 'fetching groups for user'])
  const graphUserGroups = await callGraph(`v1.0/users/${user.userPrincipalName}/transitiveMemberOf?$top=999`, accessToken)
  const graphUserGroupsDisplayName = (graphUserGroups?.value && graphUserGroups.value.map(group => group.displayName).sort()) || []
  const graphSDSGroups = (graphUserGroups && graphUserGroups.value && Array.isArray(graphUserGroups.value) && graphUserGroups.value.filter(group => group.mailNickname && group.mailNickname.startsWith('Section_'))) || []

  logger('info', ['azure-get-data', 'fetching authentication methods for user'])
  const graphUserAuth = await callGraph(`v1.0/users/${user.userPrincipalName}/authentication/methods`, accessToken)
  const graphUserAuthMethods = graphUserAuth?.value && graphUserAuth.value.length && graphUserAuth.value.filter(method => !method['@odata.type'].includes('passwordAuthenticationMethod'))

  const today = new Date()
  const threeDaysBack = new Date(new Date().setDate(today.getDate() - 3))
  logger('info', ['azure-get-data', 'fetching succesful signins for user'])
  const userSignInSuccess = await callGraph(`v1.0/auditLogs/signIns?$filter=userPrincipalName eq '${user.userPrincipalName}' and status/errorCode eq 0 and createdDateTime gt ${entraIdDate(threeDaysBack)}&$top=1`, accessToken)

  logger('info', ['azure-get-data', 'fetching error signins for user'])
  const userSignInErrors = await callGraph(`v1.0/auditLogs/signIns?$filter=userPrincipalName eq '${user.userPrincipalName}' and status/errorCode eq 50126 and createdDateTime gt ${entraIdDate()}&$top=30`, accessToken)

  logger('info', ['azure-get-data', 'fetching riskyuser data for user'])
  const graphRiskyUser = await callGraph(`v1.0/identityProtection/riskyUsers?$filter=userPrincipalName eq '${user.userPrincipalName}' and riskState ne 'dismissed'`, accessToken)

  return {
    ...userData,
    sdsGroups: graphSDSGroups,
    memberOf: graphUserGroupsDisplayName,
    authenticationMethods: graphUserAuthMethods,
    userSignInErrors: userSignInErrors.value,
    userSignInSuccess: userSignInSuccess.value,
    graphRiskyUser: graphRiskyUser.value
  }
}

module.exports = { getData, callGraph }
