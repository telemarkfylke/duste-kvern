const invokePS = require('../../lib/invoke-ps-script')
const { callGraph } = require('../azure/get-data')

const getData = async (user) => {
  const lastIdmRun = await invokePS('Get-DUSTIDMRun.ps1')

  /*
  const callGraph HENT BASERT PÅ BRUKERS TENANT - gjør det ryddig
  */
  return {
    lastIdmRun,
    lastSDSSync: lastIdmRun
  }
}

module.exports = { getData }
