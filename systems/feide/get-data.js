const invokePS = require('../../lib/invoke-ps-script')

const getData = async (user) => {
  const samAccountName = user.samAccountName || (user.feidenavn ? user.feidenavn.substring(0, user.feidenavn.indexOf('@')) : null)
  return await invokePS('Get-DUSTFeide.ps1', { samAccountName })
}

module.exports = { getData }
