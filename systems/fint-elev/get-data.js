const { getMsalToken } = require('../../lib/get-msal-token')
const { APPREG, FINTFOLK } = require('../../config')
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
  try {
    const fintStudent = await callFintFolk(`student/feidenavn/${user.feidenavn}`, accessToken)
    delete fintStudent.bostedsadresse // Just in case
    delete fintStudent.hybeladresse // Just in case
    return fintStudent
  } catch (error) {
    if (error.response?.status === 404) {
      return null
    }
    throw error
  }
}

module.exports = { getData, callFintFolk }
