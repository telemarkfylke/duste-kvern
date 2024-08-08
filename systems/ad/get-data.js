const { COUNTY_OU } = require('../../config')
const invokePS = require('../../lib/invoke-ps-script')

const getData = async (user) => {
  const adUser = await invokePS('Get-DUSTUser.ps1', { userPrincipalName: user.userPrincipalName, domain: 'login', countyOU: COUNTY_OU })

  return adUser
}

module.exports = { getData }
