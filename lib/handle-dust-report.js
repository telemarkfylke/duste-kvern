const { logger } = require('@vtfk/logger')
const { getMongoClient } = require('./mongo-client')
const { MONGODB } = require('../config')
const { ObjectId } = require('mongodb')
const { setupUserTests } = require('./setup-user-tests')
const { handleSystem, handleWaitingTests } = require('./handle-system')

const handleDustReport = async (report) => {
  logger('info', ['handle-dust-report', `Id: ${report._id}`, `User: ${report.user.userPrincipalName}`, 'Starting'])

  // De under må i en trycatch etterhvert
  const mongoClient = await getMongoClient()
  const collection = mongoClient.db(MONGODB.DB_NAME).collection(MONGODB.REPORT_COLLECTION)

  // Set up systems and tests for this user type - save to mongodb as we go
  logger('info', ['handle-dust-report', `Id: ${report._id}`, `User: ${report.user.userPrincipalName}`, 'Setting up systems and tests'])
  const { systemsOverview, systemsToHandle } = setupUserTests(report.user.userType) // Gets tests for user type and sets some metadata (like startedTimestamp osv)

  collection.updateOne({ _id: new ObjectId(report._id) }, { $set: { systems: systemsOverview } }) // Just fire update - only make sure the last one goes ok :)
  logger('info', ['handle-dust-report', `Id: ${report._id}`, `User: ${report.user.userPrincipalName}`, 'Succesfully set up systems and tests'])

  // Set up get data and testing as promises
  const systemAndTestsPromises = systemsToHandle.map(async (system) => {
    const correspondingSystemInOverview = systemsOverview.find(sys => sys.id === system.id)
    return handleSystem(system, correspondingSystemInOverview, report, collection)
  })

  // Get data for system and run tests that don't require data from other systems than its own
  const results = await Promise.all(systemAndTestsPromises)
  logger('info', ['handle-dust-report', `Id: ${report._id}`, `User: ${report.user.userPrincipalName}`, 'Finished fetching data and running immediate tests, running waiting tests'])

  // Collect all results and get all tests that need data from other systems - then run these tests as promiseAll (we have all data now)
  const allData = Object.assign({}, ...results)
  // Run tests that need data from other systems than its own
  for (const system of systemsToHandle) {
    const correspondingSystemInOverview = systemsOverview.find(sys => sys.id === system.id)
    handleWaitingTests(system, correspondingSystemInOverview, report, allData)
  }
  logger('info', ['handle-dust-report', `Id: ${report._id}`, `User: ${report.user.userPrincipalName}`, 'Finished running waiting tests data and running immediate tests, updating result in mongodb'])

  // Set to finished in db (along with new results)
  const finishedTimestamp = new Date()
  const serverRuntime = finishedTimestamp - new Date(report.startedTimestamp)
  const totalRuntime = finishedTimestamp - new Date(report.createdTimestamp)
  await collection.updateOne({ _id: new ObjectId(report._id) }, { $set: { finishedTimestamp: finishedTimestamp.toISOString(), serverRuntime, totalRuntime, systems: systemsOverview } })

  logger('info', ['handle-dust-report', `Id: ${report._id}`, `User: ${report.user.userPrincipalName}`, 'Finished report'])
  return 'Finished'
}

module.exports = { handleDustReport }
