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

  logger('info', ['azure-get-data', 'fetching signIns for user'])
  const signIns = await callGraph(`v1.0/`, accessToken)

  logger('info', ['azure-get-data', 'fetching groups for user'])
  const graphUserGroups = await callGraph(`v1.0/users/${user.userPrincipalName}/transitiveMemberOf?$top=999`, accessToken)
  const graphUserGroupsDisplayName = (graphUserGroups?.value && graphUserGroups.value.map(group => group.displayName).sort()) || []
  const graphSDSGroups = (graphUserGroups && graphUserGroups.value && Array.isArray(graphUserGroups.value) && graphUserGroups.value.filter(group => group.mailNickname && group.mailNickname.startsWith('Section_'))) || []

  logger('info', ['azure-get-data', 'fetching authentication methods for user'])
  const graphUserAuth = await callGraph(`v1.0/users/${user.userPrincipalName}/authentication/methods`, accessToken)
  const graphUserAuthMethods = graphUserAuth?.value && graphUserAuth.value.length && graphUserAuth.value.filter(method => !method['@odata.type'].includes('passwordAuthenticationMethod'))

  logger('info', ['azure-get-data', 'fetching signins for user'])
  const today = new Date()
  const thirtyDaysBack = new Date(new Date().setDate(today.getDate() - 30))
  const graphUserSignIns = await callGraph(`v1.0/auditLogs/signIns?$filter=userPrincipalName eq '${user.userPrincipalName}' and createdDateTime gt ${entraIdDate(thirtyDaysBack)}&$top=100`, accessToken)

  const userSignInErrors = graphUserSignIns.value.filter(signIn => { return (entraIdDate(new Date(signIn.createdDateTime) === entraIdDate(today)) && signIn.status.errorCode === 50126) }) // Only signinErrors from today
  const userSignInSuccess = graphUserSignIns.value.filter(signIn => signIn.status.errorCode === 0) // Legg til sort om den en eller annen gang ikke kommer sortert på dato

  logger('info', ['azure-get-data', 'fetching riskyuser data for user'])
  const graphRiskyUser = await callGraph(`v1.0/identityProtection/riskyUsers?$filter=userPrincipalName eq '${user.userPrincipalName}' and riskState ne 'dismissed'`, accessToken)

  return {
    ...userData,
    sdsGroups: graphSDSGroups,
    memberOf: graphUserGroupsDisplayName,
    authenticationMethods: graphUserAuthMethods,
    userSignInErrors,
    userSignInSuccess,
    graphRiskyUser: graphRiskyUser.value
  }
}

module.exports = { getData, callGraph }
