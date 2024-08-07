const { join } = require('path')
require('dotenv').config({ path: join(__dirname, '../../../../.env') }) // User the same env as duste-kvern testene (appreg there has what we need)

const { getMsalToken } = require('../../../../lib/get-msal-token')
const { default: axios } = require('axios')
const { logger } = require('@vtfk/logger')

/**
 * @typedef EntraUser
 * @property {string} id
 * @property {string} accountEnabled
 * @property {string} userPrincipalName
 * @property {string} displayName
 * @property {string} givenName
 * @property {string} surname
 * @property {string} jobTitle
 * @property {string} state
 * @property {string} department
 * @property {string} companyName
 * @property {string} onPremisesSamAccountName
 * @property {Object[]} onPremisesExtensionAttributes
 */

const userSelect = 'id,accountEnabled,displayName,givenName,surname,userPrincipalName,jobTitle,state,department,companyName'

const GRAPH = {
  SCOPE: process.env.GRAPH_SCOPE || 'https://graph.microsoft.com/.default',
  URL: process.env.GRAPH_URL || 'https://graph.microsoft.com',
  TENANT_NAME: process.env.APPREG_TENANT_NAME,
  TEACHER_GROUP_ID: process.env.GRAPH_TEACHER_GROUP_ID,
  EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE: process.env.GRAPH_EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE
}

if (!GRAPH.TEACHER_GROUP_ID) throw new Error('Har du glemt å legge inn GRAPH_TEACHER_GROUP_ID i .env på rot mon tro?')
if (!GRAPH.EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE) throw new Error('Har du glemt å legge inn GRAPH_EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE i .env på rot mon tro?')

const tokenConfig = {
  clientId: process.env.APPREG_CLIENT_ID,
  clientSecret: process.env.APPREG_CLIENT_SECRET,
  tenantId: process.env.APPREG_TENANT_ID,
  tenantName: process.env.APPREG_TENANT_NAME,
  scope: GRAPH.SCOPE
}

/**
 * @typedef EntraUsers
 * @property {number} count
 * @property {EntraUser[]} value
 */

/**
 *
 * @returns {EntraUsers} employees
 */
const getAllEmployees = async () => {
  const accessToken = await getMsalToken(tokenConfig)
  let url = `${GRAPH.URL}/v1.0/users/?$select=${userSelect},onPremisesSamAccountName,onPremisesExtensionAttributes,${GRAPH.EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE}&$filter=onPremisesExtensionAttributes/extensionAttribute9 ne null and endsWith(userPrincipalName, '@${GRAPH.TENANT_NAME}.no')&$count=true&$top=999` // må ha med et filter som sier at du er vanlig ansatt, kan bruke onPremisesDistinguishedName contains VFYLKE, om endswith suffix ikke fungerer bra nok
  let finished = false
  const result = {
    count: 0,
    value: []
  }
  let page = 0
  while (!finished) {
    const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}`, ConsistencyLevel: 'eventual' } })
    logger('info', ['getAllEmployees', `Got ${data.value.length} elements from page ${page}, will check for more`])
    finished = data['@odata.nextLink'] === undefined
    url = data['@odata.nextLink']
    result.value = result.value.concat(data.value)
    page++
  }
  result.count = result.value.length
  return result
}

/**
 *
 * @returns {EntraUsers} employees
 */
const getAllStudents = async () => {
  const accessToken = await getMsalToken(tokenConfig)
  let url = `${GRAPH.URL}/v1.0/users/?$select=${userSelect}&$filter=endsWith(userPrincipalName, '@skole.${GRAPH.TENANT_NAME}.no')&$count=true&$top=999` // må ha med et filter som sier at du er vanlig ansatt, kan bruke onPremisesDistinguishedName contains VFYLKE, om endswith suffix ikke fungerer bra nok
  let finished = false
  const result = {
    count: 0,
    value: []
  }
  let page = 0
  while (!finished) {
    const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}`, ConsistencyLevel: 'eventual' } })
    logger('info', ['getAllStudents', `Got ${data.value.length} elements from page ${page}, will check for more`])
    finished = data['@odata.nextLink'] === undefined
    url = data['@odata.nextLink']
    result.value = result.value.concat(data.value)
    page++
  }
  result.count = result.value.length
  return result
}

/**
 *
 * @returns {EntraUsers} employees
 */
const getTeacherGroupMembers = async () => {
  const accessToken = await getMsalToken(tokenConfig)
  let url = `${GRAPH.URL}/v1.0/groups/${GRAPH.TEACHER_GROUP_ID}/members?$select=id,userPrincipalName&$count=true&$top=999`
  let finished = false
  const result = {
    count: 0,
    value: []
  }
  let page = 0
  while (!finished) {
    const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}`, ConsistencyLevel: 'eventual' } })
    logger('info', ['getTeacherGroupMembers', `Got ${data.value.length} elements from page ${page}, will check for more`])
    finished = data['@odata.nextLink'] === undefined
    url = data['@odata.nextLink']
    result.value = result.value.concat(data.value)
    page++
  }
  result.count = result.value.length
  return result
}

module.exports = { getAllEmployees, getAllStudents, getTeacherGroupMembers }

