const invokePS = require('../../lib/invoke-ps-script')

const getData = async (user) => {
  const equitracUser = await invokePS('Get-DUSTEquitrac.ps1', { samAccountName: user.samAccountName })

  return equitracUser
}

module.exports = { getData }
