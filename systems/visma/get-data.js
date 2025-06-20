const invokePS = require('../../lib/invoke-ps-script')

const getData = async (user) => {
  return await invokePS('Get-DUSTVisma.ps1', { EmployeeNumber: user.employeeNumber })
}

module.exports = { getData }
