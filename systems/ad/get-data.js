const invokePS = require('../../lib/invoke-ps-script')

const getData = async (user) => {
  // Hent et token
  const adUser = await invokePS('Get-DUSTUser.ps1', "meg", { userPrincipalName: user.userPrincipalName, domain: user.domain, countyOU: user.countyOU })

  return adUser
}

module.exports = { getData }