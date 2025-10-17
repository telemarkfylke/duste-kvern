const { logger } = require('@vtfk/logger')
const { ObjectId } = require('mongodb')

const handleSystem = async (system, correspondingSystemInOverview, report, mongoCollection) => {
  // Hent data for systemet
  let systemData
  let getDataFunction
  try {
    getDataFunction = (require(`../systems/${system.id}/get-data.js`)).getData // ALL Get-data functions must be called getData!!!
  } catch (error) {
    logger('error', ['handle-dust-report', `Id: ${report._id}`, `User: ${report.user.userPrincipalName}`, `Could not find get-data-function (../systems/${system.id}/get-data.js) for system ${system.id}`])
    getDataFunction = async () => { return null }
  }
  try {
    systemData = await getDataFunction(report.user)
  } catch (error) {
    logger('error', ['handle-dust-report', `Id: ${report._id}`, `User: ${report.user.userPrincipalName}`, `Failed when running get-data-function for ${system.id}`, error.response?.data || error.stack || error.toString()])
    systemData = { getDataFailed: true, message: `Failed when running get-data-function for ${system.id}`, error: error.response?.data || error.stack || error.toString(), customMessage: error.customMessage || null }
  }

  // Set systemData in overviewObject
  correspondingSystemInOverview.data = systemData

  // Kjør alle testene som er definert for denne userTypen og som kan fyres med en gang
  const testsToRun = system.tests.filter(test => !test.waitForAllData)
  for (const test of testsToRun) {
    logger('info', ['handle-dust-report', `Id: ${report._id}`, `User: ${report.user.userPrincipalName}`, `Running test ${test.id} - ${system.id}`])
    test.mappedTestFunction(report.user, systemData) // The test itself will update the result in the systemsOverview object, and also handle internal errors in the test (if they occur)
  }

  // Sett system til ferdig hentet (selv om muligens noen tester gjenstår da..)
  correspondingSystemInOverview.finishedTimestamp = new Date().toISOString()
  correspondingSystemInOverview.runtime = (new Date(correspondingSystemInOverview.finishedTimestamp) - new Date(correspondingSystemInOverview.startedTimestamp))

  // Oppdater i mongo når data er hentet og instant coffee-tests have run
  logger('info', ['handle-dust-report', `Id: ${report._id}`, `User: ${report.user.userPrincipalName}`, `Finished running get-data-function and instant tests for ${system.id}, saving to db`])
  try { // Kanskje ta vekk trycatchen her
    mongoCollection.updateOne({ _id: new ObjectId(report._id), 'systems.id': system.id }, { $set: { 'systems.$': correspondingSystemInOverview } })
  } catch (error) {
    logger('error', ['handle-dust-report', `Id: ${report._id}`, `User: ${report.user.userPrincipalName}`, `Failed when updating cofdkjdf for ${system.id}`, error.response?.data || error.stack || error.toString()])
  }

  return { [system.id]: systemData }
}

// Kjører resten av testene som venter (trenger bare cpu stort sett nå, så det tar den tiden det tar (hvis ikke vi multithreader))
const handleWaitingTests = async (system, correspondingSystemInOverview, report, allData) => {
  const testsToRun = system.tests.filter(test => test.waitForAllData)
  for (const test of testsToRun) {
    logger('info', ['handle-dust-report', `Id: ${report._id}`, `User: ${report.user.userPrincipalName}`, `Running test ${test.id} - ${system.id}`])
    test.mappedTestFunction(report.user, correspondingSystemInOverview.data, allData) // The test itself will update the result in the systemsOverview object, and also handle internal errors in the test (if they occur)
  }
  logger('info', ['handle-dust-report', `Id: ${report._id}`, `User: ${report.user.userPrincipalName}`, `Finished running waiting tests for ${system.id}`])
}

module.exports = { handleSystem, handleWaitingTests }
