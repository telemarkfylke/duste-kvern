const { getMsalToken } = require('../../lib/get-msal-token')
const { APPREG, FINTFOLK, FEIDE } = require('../../config')
const { callFintFolk } = require('../fint-ansatt/get-data')

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
  try {
    const feidenavn = user.feidenavn || `${user.samAccountName}${FEIDE.PRINCIPAL_NAME}`
    const fintTeacher = await callFintFolk(`teacher/feidenavn/${feidenavn}`, accessToken)
    return fintTeacher
  } catch (error) {
    if (error.response?.status === 404) {
      return null
    }
    throw error
  }
}

module.exports = { getData, callFintFolk }
