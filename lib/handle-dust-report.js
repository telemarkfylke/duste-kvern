const { logger } = require('@vtfk/logger')
const Cache = require('file-system-cache').default
const { getMongoClient } = require('./mongo-client')
const { MONGODB } = require('../config')
const { ObjectId } = require('mongodb')
const { setupUserTests } = require('./setup-user-tests')

const handleSystem = async (system, correspondingSystemInOverview, report, mongoCollection) => {
  // Hent data for systemet
  let systemData
  let getDataFunction
  try {
    getDataFunction = (require(`../systems/${system.id}/get-data.js`)).getData // ALL Get-data functions must be called getData!!!
  } catch (error) {
    logger('error', ['handle-dust-report', `Could not find get-data-function (../systems/${system.id}/get-data.js) for system ${system.id}`])
    getDataFunction = async () => { return null }
  }
  try {
    systemData = await getDataFunction(report.user)
  } catch (error) {
    logger('error', ['handle-dust-report', `Failed when running get-data-function for ${system.id}`, error.response?.data || error.stack || error.toString()])
    systemData = { getDataFailed: true, message: `Failed when running get-data-function for ${system.id}`, error: error.response?.data || error.stack || error.toString() }
  }

  // Set systemData in overviewObject
  correspondingSystemInOverview.data = systemData

  // Kjør alle testene som er definert for denne userTypen og som kan fyres med en gang
  const testsToRun = system.tests.filter(test => !test.waitForAllData)
  for (const test of testsToRun) {
    logger('info', ['handle-dust-report', `Running test ${test.id} - ${system.id}`])
    test.mappedTestFunction(report.user, systemData) // The test itself will update the result in the systemsOverview object, and also handle internal errors in the test (if they occur)
  }

  // Sett system til ferdig hentet (selv om muligens noen tester gjenstår da..)
  correspondingSystemInOverview.finishedTimestamp = new Date().toISOString()
  correspondingSystemInOverview.runtime = (new Date(correspondingSystemInOverview.finishedTimestamp) - new Date(correspondingSystemInOverview.startedTimestamp))

  // Oppdater i mongo når data er hentet og instant coffee-tests have run
  logger('info', ['handle-dust-report', `Finished running get-data-function and instant tests for ${system.id}, saving to db`])
  try {
    const insertResult = await mongoCollection.updateOne({ _id: new ObjectId(report._id), 'systems.id': system.id }, { $set: { 'systems.$': correspondingSystemInOverview } })
  } catch (error) {
    logger('error', ['handle-dust-report', `Failed when updating cofdkjdf for ${system.id}`, error.response?.data || error.stack || error.toString()])
  }

  return { [system.id]: systemData }
}

// Kjører resten av testene som venter (trenger bare cpu stort sett nå, så det tar den tiden det tar (hvis ikke vi multithreader))
const handleWaitingTests = async (system, correspondingSystemInOverview, report, allData) => {
  const testsToRun = system.tests.filter(test => test.waitForAllData)
  for (const test of testsToRun) {
    logger('info', ['handle-dust-report', `Running test ${test.id} - ${system.id}`])
    test.mappedTestFunction(report.user, correspondingSystemInOverview.data, allData) // The test itself will update the result in the systemsOverview object, and also handle internal errors in the test (if they occur)
  }
  logger('info', ['handle-dust-report', `Finished running waiting tests for ${system.id}`])
}

const fileCacheQueue = Cache({ basePath: './.queue-file-cache' })

const handleDustReport = async (report) => {
  logger('info', ['handle-dust-report', `Id: ${report._id}`, 'Starting'])

  // De under må i en trycatch etterhvert
  const mongoClient = await getMongoClient()
  const collection = mongoClient.db(MONGODB.DB_NAME).collection(MONGODB.REPORT_COLLECTION)

  // Set up systems and tests for this user type - save to mongodb as we go
  const { systemsOverview, systemsToHandle } = setupUserTests(report.user.userType) // Gets tests for user type and sets some metadata (like startedTimestamp osv)
  await collection.updateOne({ _id: new ObjectId(report._id) }, { $set: { systems: systemsOverview } })

  // Set up get data and testing as promises
  const systemAndTestsPromises = systemsToHandle.map(async (system) => {
    const correspondingSystemInOverview = systemsOverview.find(sys => sys.id === system.id)
    return handleSystem(system, correspondingSystemInOverview, report, collection)
  })

  // Get data for system and run tests that don't require data from other systems than it's own
  const results = await Promise.all(systemAndTestsPromises)

  // Collect all results and get all tests that need data from other systems - then run these tests as promiseAll (we have all data now)
  const allData = Object.assign({}, ...results)
  // Run tests that need data from other systems than its own
  for (const system of systemsToHandle) {
    const correspondingSystemInOverview = systemsOverview.find(sys => sys.id === system.id)
    handleWaitingTests(system, correspondingSystemInOverview, report, allData)
  }

  // Set to finished in db (along with new results)
  const finishedTimestamp = new Date()
  const runTime = finishedTimestamp - new Date(report.startedTimestamp)
  await collection.updateOne({ _id: new ObjectId(report._id) }, { $set: { finishedTimestamp: finishedTimestamp.toISOString(), runTime, systems: systemsOverview } })

  // Remove from file-cache-queue
  await fileCacheQueue.remove(report._id)
  logger('info', ['handle-dust-report', `Id: ${report._id}`, 'Finished'])
}

module.exports = { handleDustReport }
