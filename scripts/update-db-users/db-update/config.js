require('dotenv').config()

module.exports = {
  MONGODB_CONNECTION: process.env.MONGODB_CONNECTION || false,
  MONGODB_USERS_COLLECTION: process.env.MONGODB_USERS_COLLECTION || '',
  MONGODB_USERS_NAME: process.env.MONGODB_USERS_NAME || ''
}
