const { logger } = require("@vtfk/logger")
const Cache = require('file-system-cache').default
const { getMongoClient } = require('./mongo-client')
const { MONGODB } = require('../config')
const { ObjectId } = require('mongodb')

const fileCacheQueue = Cache({ basePath: './.queue-file-cache' })


const handleDustReport = async (report) => {
  logger('info', ['handle-dust-report', `Id: ${report._id}`, 'Starting'])

  // Set up tests as promises and promiseAll - save to mongodb as we go
  // Set up data fetching as promises based on user type

  // Run tests

  // Run tests that need data from other systems than its own

  // Set to finished in db
  const mongoClient = await getMongoClient()
  const collection = mongoClient.db(MONGODB.DB_NAME).collection(MONGODB.REPORT_COLLECTION)
  await collection.updateOne({ _id: new ObjectId(report._id) }, { $set: { finishedTimestamp: new Date().toISOString() } })

  // Remove from file-cache-queue
  await fileCacheQueue.remove(report._id)
  logger('info', ['handle-dust-report', `Id: ${report._id}`, 'Finished'])
}

module.exports = { handleDustReport }