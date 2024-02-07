const invokePS = require('../../lib/invoke-ps-script')

const getData = async (user) => {
  const feideUser = await invokePS('Get-DUSTFeide.ps1', { samAccountName: user.samAccountName })

  return feideUser
}

module.exports = { getData }
