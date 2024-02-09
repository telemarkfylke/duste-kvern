(async () => {
  const { getMongoClient, closeMongoClient } = require('../lib/mongo-client')
  const { MONGODB } = require('../config')
  const generateTestReports = require('./data/test-reports')
  const client = await getMongoClient()

  const db = client.db(MONGODB.DB_NAME)
  const collection = db.collection(MONGODB.REPORT_COLLECTION)
  const testReports = generateTestReports(5)
  try {
    await collection.insertMany(testReports)
  } catch (error) {
    closeMongoClient()
    throw error
  }

  closeMongoClient()
})()
