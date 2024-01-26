(async () => {
  const { getMongoClient, closeMongoClient } = require('../lib/mongo-client')
  const { MONGODB } = require('../config')

  const client = await getMongoClient()

  const db = client.db(MONGODB.DB_NAME)
  const collection = db.collection(MONGODB.REQUEST_COLLECTION)
  await collection.drop()

  closeMongoClient()
})()