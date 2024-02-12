const { getMsalToken } = require('../../lib/get-msal-token')
const { APPREG, GRAPH } = require('../../config')
const axios = require('axios').default
const { entraIdDate } = require('../../lib/helpers/date-time-output')
const { logger } = require('@vtfk/logger')

const callGraph = async (resource, accessToken) => {
  const { data } = await axios.get(`${GRAPH.URL}/${resource}`, { headers: { Authorization: `Bearer ${accessToken}` } })
  return data
}

const getData = async (user) => {
  // Hent et token
  const clientConfig = {
    clientId: APPREG.CLIENT_ID,
    tenantId: APPREG.TENANT_ID,
    tenantName: APPREG.TENANT_NAME,
    clientSecret: APPREG.CLIENT_SECRET,
    scope: GRAPH.SCOPE
  }
  const accessToken = await getMsalToken(clientConfig)

  const userProperties = [
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
    'userPrincipalName',
    'signInActivity'
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

  logger('info', ['azure-get-data', 'fetching failed signins for user'])
  const graphUserSignIns = await callGraph(`v1.0/auditLogs/signIns?$filter=userPrincipalName eq '${user.userPrincipalName}' and createdDateTime gt ${entraIdDate()} and status/errorCode eq 50126`, accessToken) // HMMMM fungerer denne da mon tro??

  logger('info', ['azure-get-data', 'fetching riskyuser data for user'])
  const graphRiskyUser = await callGraph(`v1.0//identityProtection/riskyUsers?$filter=userPrincipalName eq '${user.userPrincipalName}' and riskState ne 'dismissed'`, accessToken)
  /*
{
        "id": "33a0333e-6f4b-4181-8f2a-6c3466205431",
        "isDeleted": false,
        "isProcessing": false,
        "riskLevel": "none",
        "riskState": "dismissed",
        "riskDetail": "none",
        "riskLastUpdatedDateTime": "2023-12-30T19:12:23.0867621Z",
        "userDisplayName": "MIMIMI hfhf",
        "userPrincipalName": "husss@nuss.no"
      },
  */
  return {
    ...userData,
    //graphUserGroups,
    sdsGroups: graphSDSGroups,
    memberOf: graphUserGroupsDisplayName,
    authenticationMethods: graphUserAuthMethods,
    userSignInErrors: graphUserSignIns.value,
    graphRiskyUser: graphRiskyUser.value
  }
}

module.exports = { getData, callGraph }
