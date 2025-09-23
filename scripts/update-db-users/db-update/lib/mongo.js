const MongoClient = require('mongodb').MongoClient
const config = require('../config')
const { MONGODB_CONNECTION } = config

let client = null

/**
 *
 * @returns {MongoClient}
 */
module.exports = () => {
  if (!MONGODB_CONNECTION) {
    console.error('mongo', 'missing MONGODB_CONNECTION')
    throw new Error('Missing env MONGODB_CONNECTION')
  }

  if (client === null) {
    client = new MongoClient(MONGODB_CONNECTION)
    console.log('mongo', 'new client init')
    return client
  }

  console.log('mongo', 'client already exists. quick return')
  return client
}
