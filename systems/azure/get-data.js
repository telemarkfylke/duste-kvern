const { getMsalToken } = require('../../lib/get-msal-token')
const { APPREG, GRAPH } = require('../../config')
const axios = require('axios')
const { entraIdDate } = require('../../lib/helpers/date-time-output')
const { logger } = require('@vtfk/logger')

const excludeSignInErrors = [
  70043
]

const callGraph = async (resource, accessToken) => {
  const { data } = await axios.get(`${GRAPH.URL}/v1.0/${resource}`, { headers: { Authorization: `Bearer ${accessToken}` } })
  return data
}

const batchGraph = async (batchRequest, accessToken) => {
  const { data } = await axios.post(`${GRAPH.URL}/v1.0/$batch`, batchRequest, { headers: { Authorization: `Bearer ${accessToken}` } })
  return data
}

const getSchoolYear = (yearsBack = 0) => {
  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentYear = Number.parseInt(today.getFullYear().toString().slice(-2)) - yearsBack

  if (currentMonth >= 8 && currentMonth <= 12) {
    return `${currentYear}${currentYear + 1}`
  }

  return `${currentYear - 1}${currentYear}`
}

const getData = async (user) => {
  const clientConfig = {
    clientId: APPREG.CLIENT_ID,
    tenantId: APPREG.TENANT_ID,
    tenantName: APPREG.TENANT_NAME,
    clientSecret: APPREG.CLIENT_SECRET,
    scope: GRAPH.SCOPE
  }
  /*
  // Hvis OU er VFYLKE/TFYLKE - hent fra ny tenant, hvis ikke hent fra vtfk. Inte nu lengre - alle fra VFYLKE/TFYLKE

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

  const userProperties = [
    'id',
    'accountEnabled',
    'assignedLicenses',
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

  const today = new Date()
  const threeDaysBack = new Date(new Date().setDate(today.getDate() - 3))

  const batchRequest = {
    requests: [
      {
        id: '1',
        method: 'GET',
        url: `/users/${user.userPrincipalName}?$select=${userProperties}` // Brukerens data
      },
      {
        id: '2',
        method: 'GET',
        url: `/users/${user.userPrincipalName}/transitiveMemberOf?$top=999` // Brukerens grupper
      },
      {
        id: '3',
        method: 'GET',
        url: `/users/${user.userPrincipalName}/authentication/methods` // Auth metoder
      },
      {
        id: '4',
        method: 'GET',
        url: `/auditLogs/signIns?$filter=userPrincipalName eq '${user.userPrincipalName}' and status/errorCode eq 0 and createdDateTime gt ${entraIdDate(threeDaysBack)}&$top=1` // last successful sign ins
      },
      {
        id: '5',
        method: 'GET',
        url: `/auditLogs/signIns?$filter=userPrincipalName eq '${user.userPrincipalName}' and status/errorCode ne 0 and createdDateTime gt ${entraIdDate()}&$top=30` // error sign ins
      },
      {
        id: '6',
        method: 'GET',
        url: `/identityProtection/riskyUsers?$filter=userPrincipalName eq '${user.userPrincipalName}' and riskState ne 'dismissed' and riskState ne 'remediated' and riskState ne 'confirmedSafe'` // risky user check
      },
      {
        id: '7',
        method: 'GET',
        url: `/users/${user.userPrincipalName}/ownedDevices` // Brukerens enheter
      }
    ]
  }

  logger('info', ['azure-get-data', 'fetching data from ms graph'])
  const { responses } = await batchGraph(batchRequest, accessToken)
  const failedRequest = responses.find(response => response.status !== 200 && response.status !== 429)
  if (failedRequest) {
    throw new Error(`Batch request feilet.. id: ${failedRequest.id}, Message: ${failedRequest.body?.error?.message}, Code: ${failedRequest.body?.error?.code}, status: ${failedRequest.status}`)
  }
  const retryRequests = responses.filter(response => response.status === 429)
  if (retryRequests.length > 0) {
    /*
    retryAfters = retryRequests.map(req => req.headers['Retry-after'])
    ids = retryRequests.map(req => req.id)
    */
    // throw new Error(`Batch request fikk retry-after.. ider: ${ids.join(', ')}, retryAfters: ${retryAfters.join(', ')} json: ${JSON.stringify(retryRequests)}`)
    throw new Error('Aiaiai, for mange spørringer mot MS Graph på en gang - her må vi bare vente altså, ta en kaffe...')
  }

  const currentSchoolYear = getSchoolYear()
  const previousSchoolYear = getSchoolYear(1)

  const userData = responses.find(res => res.id === '1').body

  const graphUserGroups = responses.find(res => res.id === '2').body
  const graphUserGroupsDisplayName = (graphUserGroups?.value && graphUserGroups.value.map(group => group.displayName).sort()) || []
  const graphSDSGroups = (graphUserGroups && graphUserGroups.value && Array.isArray(graphUserGroups.value) && graphUserGroups.value.filter(group => group.mailNickname && group.mailNickname.startsWith('Section_'))) || []
  const graphSDSGroupsCurrentYearDisplayName = graphSDSGroups.filter(group => group.mailNickname.includes(currentSchoolYear)).map(group => group.displayName).sort()
  const graphSDSGroupsPreviousYearDisplayName = graphSDSGroups.filter(group => group.mailNickname.includes(previousSchoolYear)).map(group => group.displayName).sort()

  const graphUserAuth = responses.find(res => res.id === '3').body
  const graphUserAuthMethods = graphUserAuth?.value && graphUserAuth.value.length && graphUserAuth.value.filter(method => !method['@odata.type'].includes('passwordAuthenticationMethod'))

  const userSignInSuccess = responses.find(res => res.id === '4').body

  const userSignInErrors = responses.find(res => res.id === '5').body
  const filteredSignInErrors = userSignInErrors.value && userSignInErrors.value.filter(signIn => !excludeSignInErrors.includes(signIn.status.errorCode))

  const graphRiskyUser = responses.find(res => res.id === '6').body

  const userDevices = responses.find(res => res.id === '7').body
  const mappedUserDevices = userDevices.value && userDevices.value.map(device => {
    delete device.alternativeSecurityIds
    return device
  })

  return {
    ...userData,
    sdsGroups: {
      currentYear: graphSDSGroupsCurrentYearDisplayName,
      previousYear: graphSDSGroupsPreviousYearDisplayName
    },
    memberOf: graphUserGroupsDisplayName,
    authenticationMethods: graphUserAuthMethods,
    userSignInErrors: filteredSignInErrors,
    userSignInSuccess: userSignInSuccess.value,
    graphRiskyUser: graphRiskyUser.value,
    userDevices: mappedUserDevices
  }
}

module.exports = { getData, callGraph }
