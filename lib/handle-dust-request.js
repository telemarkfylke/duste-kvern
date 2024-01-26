const { logger } = require("@vtfk/logger")
const Cache = require('file-system-cache').default

const fileCacheQueue = Cache({ basePath: './.queue-file-cache' })


const handleDustRequest = async (request) => {
  logger('info', ['handle-dust-request', `Id: ${request._id}`, 'Starting'])
  // Set up tests as promises and promiseAll - save to mongodb as we go
  // Set up data fetching as promises based on user type

  // Run tests

  // Run tests that need data from other systems than its own

  // Remove from file-cache-queue
  await fileCacheQueue.remove(request._id)
  logger('info', ['handle-dust-request', `Id: ${request._id}`, 'Finished'])
}

module.exports = { handleDustRequest }