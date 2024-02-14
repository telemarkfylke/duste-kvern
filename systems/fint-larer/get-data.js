const { getMsalToken } = require('../../lib/get-msal-token')
const { APPREG, FINTFOLK, FEIDE } = require('../../config')
const axios = require('axios').default

const callFintFolk = async (resource, accessToken) => {
  const { data } = await axios.get(`${FINTFOLK.URL}/${resource}`, { headers: { Authorization: `Bearer ${accessToken}` } })
  return data
}

const getData = async (user) => {
  // Hent et token
  const clientConfig = {
    clientId: APPREG.CLIENT_ID,
    tenantId: APPREG.TENANT_ID,
    tenantName: APPREG.TENANT_NAME,
    clientSecret: APPREG.CLIENT_SECRET,
    scope: FINTFOLK.SCOPE
  }
  const accessToken = await getMsalToken(clientConfig)

  const fintTeacher = await callFintFolk(`teacher/feidenavn/${user.samAccountName}${FEIDE.PRINCIPAL_NAME}`, accessToken)

  return fintTeacher
}

module.exports = { getData, callFintFolk }
