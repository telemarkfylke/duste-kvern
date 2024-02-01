(async () => {
  const { getMongoClient, closeMongoClient } = require('../lib/mongo-client')
  const { MONGODB } = require('../config')
  const testReports = require('./data/test-reports')
  const client = await getMongoClient()

  const db = client.db(MONGODB.DB_NAME)
  const collection = db.collection(MONGODB.REPORT_COLLECTION)
  try {
    await collection.insertMany(testReports)
  } catch (error) {
    closeMongoClient()
    throw error
  }

  closeMongoClient()
})()