require('dotenv').config()

module.exports = {
  GET_READY_REQUESTS_INTERVAL: process.env.GET_READY_REQUESTS_INTERVAL || 1000,
  RUN_READY_REQUESTS_INTERVAL: process.env.RUN_READY_REQUESTS_INTERVAL || 1000,
  MONGODB: {
    CONNECTION_STRING: process.env.MONGODB_CONNECTION_STRING,
    DB_NAME: process.env.MONGODB_DB_NAME,
    REQUEST_COLLECTION: process.env.MONGODB_REQUEST_COLLECTION,
    USERS_COLLECTION: process.env.MONGODB_USERS_COLLECTION
  },
  APPREG: {
    CLIENT_ID: process.env.APPREG_CLIENT_ID,
    CLIENT_SECRET: process.env.APPREG_CLIENT_SECRET,
    TENANT_ID: process.env.APPREG_TENANT_ID
  }
}