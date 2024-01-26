(async () => {
  const { MONGODB, GET_READY_REQUESTS_INTERVAL, RUN_READY_REQUESTS_INTERVAL } = require('./config')
  const { getMongoClient } = require('./lib/mongo-client')
  const { ObjectId } = require('mongodb')
  const { logger } = require('@vtfk/logger')
  const Cache = require('file-system-cache').default
  const { handleDustRequest } = require('./lib/handle-dust-request')

  const fileCacheQueue = Cache({ basePath: './.queue-file-cache', hash: 'sha1' })
  
  let readyForNewRequests = true
  
  const getReadyRequests = async () => {
    if (!readyForNewRequests) {
      console.log('not ready for run - skipping')
      return null
    }
    readyForNewRequests = false
    try {
      // Get ready requests from mongodb
      const client = await getMongoClient()
      const db = client.db(MONGODB.DB_NAME)
      const collection = db.collection(MONGODB.REQUEST_COLLECTION)
      const readyRequests = await collection.find({ ready: true }).toArray() // Consider sorting on oldest
      
      // Save requests to file-cache-queue - if it already exists, just overwrite - updateMany probably failed...
      const updateProps = { ready: false, queued: true, started: new Date().toISOString() } // To make sure we set the same values both in cache, and in mongodb when running updateMany
      await fileCacheQueue.save(readyRequests.map(request => {
        return { key: request._id.toString(), value: { ...request, ...updateProps } } // request._id.toString() because mongoDb returns ObjectId(_id) intead of _id directly
      }))

      // Set requests in mongodb to running
      await collection.updateMany( { _id: { $in: readyRequests.map(doc => doc._id) } }, { $set: updateProps } )
      readyForNewRequests = true
      
      if (readyRequests.length > 0) logger('info', ['getReadyRequests', `Got ${readyRequests.length} new requests`])
      return readyRequests.length
    } catch (error) {
      logger('warn', ['Failed when getting ready requests', error.stack || error.toString()])
      readyForNewRequests = true
      return null
    }
  }

  const runReadyRequests = async () => {
    try {
      // Get all ready requests create promise for each, then set to running and save to queue again - and promise all
      const queue = (await fileCacheQueue.load()).files
      const readyForRun = queue.filter(queueRequest => !queueRequest.value.running).map(queueRequest => queueRequest.value)
      // Set to running in filecache
      await fileCacheQueue.save(readyForRun.map(request => {
        return { key: request._id, value: { ...request, running: true } }
      }))
      if (readyForRun.length > 0) logger('info', ['runReadyRequests', `Got ${readyForRun.length} new requests`])
      
      // Set up promises
      const runPromises = readyForRun.map(async (request) => {
        return handleDustRequest(request)
      })
      const results = await Promise.all(runPromises)
      console.log(results)
    } catch (error) {
      logger('warn', ['Failed when getting ready for run from fileCacheQueue', error.stack || error.toString()])
    }
  }

  // Run getReadyRequest every GET_READY_REQUESTS_INTERVAL seconds
  setInterval(getReadyRequests, GET_READY_REQUESTS_INTERVAL)
  // Run runReadyRequest every RUN_READY_REQUESTS_INTERVAL seconds
  setInterval(runReadyRequests, RUN_READY_REQUESTS_INTERVAL)

})()