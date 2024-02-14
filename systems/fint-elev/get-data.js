const { getMsalToken } = require('../../lib/get-msal-token')
const { APPREG, FINTFOLK, FEIDE } = require('../../config')
const { callFintFolk } = require('../fint-larer/get-data')

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

  const fintStudent = await callFintFolk(`student/feidenavn/${user.samAccountName}${FEIDE.PRINCIPAL_NAME}`, accessToken)

  return fintStudent
}

module.exports = { getData, callFintFolk }
