const { getMsalToken } = require('../../lib/get-msal-token')
const { APPREG, FINTFOLK } = require('../../config')
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

  try {
    const fintEmployee = await callFintFolk(`employee/ansattnummer/${user.onPremisesExtensionAttributes.extensionAttribute9}?skipCache=true`, accessToken) // Kan legge til skipCache=true for å alltid hente fra FINT dersom det trengs (gjelder også de andre fint-kallene)
    delete fintEmployee.bostedsadresse // Just in case
    return fintEmployee
  } catch (error) {
    if (error.response?.status === 404) {
      return null
    }
    throw error
  }
}

module.exports = { getData, callFintFolk }
