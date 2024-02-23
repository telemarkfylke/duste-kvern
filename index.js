(async () => {
  const { MONGODB, GET_NEW_REPORTS_INTERVAL, RUN_READY_REPORTS_INTERVAL } = require('./config')
  const { getMongoClient } = require('./lib/mongo-client')
  const { logger, logConfig } = require('@vtfk/logger')
  const Cache = require('file-system-cache').default
  const { handleDustReport } = require('./lib/handle-dust-report')
  const { createLocalLogger } = require('./lib/local-logger')

  const fileCacheQueue = Cache({ basePath: './.queue-file-cache', hash: 'sha1' })

  // Set up logging
  logConfig({
    teams: {
      onlyInProd: false
    },
    localLogger: createLocalLogger('duste-kvern')
  })

  let readyForNewReports = true

  const getAndRunNewReports = async () => {
    if (!readyForNewReports) {
      console.log('not ready for run - skipping')
      return null
    }
    readyForNewReports = false
    try {
      // Get ready reports from mongodb
      const client = await getMongoClient()
      const db = client.db(MONGODB.DB_NAME)
      const collection = db.collection(MONGODB.REPORT_COLLECTION)
      const newReports = await collection.find({ ready: true }).toArray() // Consider sorting on oldest - hmmm can we find and update at the same time check out findAndModify

      const updateProps = { ready: false, queued: true, running: true, startedTimestamp: new Date().toISOString() } // To make sure we set the same values both in memory, and in mongodb when running updateMany

      // Set requests in mongodb to running
      await collection.updateMany({ _id: { $in: newReports.map(doc => doc._id) } }, { $set: updateProps })
      readyForNewReports = true

      if (newReports.length > 0) logger('info', ['getAndRunNewReports', `Got ${newReports.length} new reports`])

      newReports.forEach(report => {
        report = { ...report, ...updateProps }
        handleDustReport(report)
      })

      return newReports.length
    } catch (error) {
      logger('warn', ['Failed when getting new reports', error.stack || error.toString()])
      readyForNewReports = true
      return null
    }
  }

  // Run getReadyRequest every GET_NEW_REPORTS_INTERVAL seconds
  setInterval(getAndRunNewReports, GET_NEW_REPORTS_INTERVAL)
  // Run runReadyRequest every RUN_READY_REPORTS_INTERVAL seconds
  // setInterval(runReadyReports, RUN_READY_REPORTS_INTERVAL)
})()
