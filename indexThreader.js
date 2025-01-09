(async () => {
  const { MONGODB, GET_NEW_REPORTS_INTERVAL } = require('./config')
  const { getMongoClient } = require('./lib/mongo-client')
  const { logger, logConfig } = require('@vtfk/logger')
  const { createLocalLogger } = require('./lib/local-logger')
  const { Worker } = require('worker_threads')

  const workerFile = './lib/dust-report-worker.js'

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
        report._id = report._id.toString() // workers don't handle mongodb type in workerData-transfer
        report = { ...report, ...updateProps }
        const worker = new Worker(workerFile, { workerData: report })
        logger('info', [`starting worker ${worker.threadId}`])
        worker.on('message', (msg) => {
          logger('info', ['Beskjed fra worker', worker.threadId, msg])
        })
        worker.on('error', (err) => {
          logger('warn', ['Error på worker', worker.threadId, err.stack || err.message])
        })
        worker.on('exit', (code) => {
          logger('info', ['Worker er ferdig', worker.threadId, 'exit code', code])
        })
        logger('info', ['worker started'])
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
})()
