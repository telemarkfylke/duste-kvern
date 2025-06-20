const invokePS = require('../../lib/invoke-ps-script')

const getData = async (user) => {
  return await invokePS('Get-DUSTEquitrac.ps1', { samAccountName: user.samAccountName })
}

module.exports = { getData }
