const invokePS = require('../../lib/invoke-ps-script')

const getData = async (user) => {
  const vismaUser = await invokePS('Get-DUSTVisma.ps1', { EmployeeNumber: user.employeeNumber })

  return vismaUser
}

module.exports = { getData }
