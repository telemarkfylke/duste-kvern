const { logger } = require('@vtfk/logger')
const { error } = require('./test-result')

const setupSystemOverview = (system) => {
  const tests = system.tests.map(test => {
    const { id, title, description, waitForAllData } = test
    return {
      id,
      title,
      description,
      waitForAllData,
      result: null
    }
  })
  return {
    id: system.id,
    name: system.name,
    description: system.description,
    failed: false,
    startedTimestamp: new Date().toISOString(),
    finishedTimestamp: null,
    runtime: null,
    tests, // Map to not include the actual test function, and add result maybe?
    data: null
  }
}

const setupSystemTests = (system, systemOverview) => {
  const systemTests = system.tests.map(testObj => {
    // Create a new function that sets the result from the userType test directly on the systemOverview-object
    const correspondingTestInSystemOverview = systemOverview.find(sys => sys.id === system.id).tests.find(test => test.id === testObj.id)
    const mappedTestFunction = (user, systemData, allData) => {
      if (!systemData) {
        correspondingTestInSystemOverview.result = error({ message: 'Fant ingen funksjon for å hente data fra systemet', solution: 'Be dust-utviklerne fikse koden sin...' })
        return null
      }
      if (systemData.getDataFailed) {
        correspondingTestInSystemOverview.result = error({ message: systemData.message, raw: systemData.error })
        return null
      }
      try {
        const result = testObj.test(user, systemData, allData)
        correspondingTestInSystemOverview.result = result
      } catch (err) {
        logger('error', [`Internal error in test ${testObj.id}`, err.stack || err.toString()])
        correspondingTestInSystemOverview.result = error({ message: 'Internal error in test', solution: 'Be dust-utviklerne fikse koden sin...', raw: err.stack || err.toString() })
      }
    }
    return {
      ...testObj,
      mappedTestFunction
    }
  })
  return {
    id: system.id,
    tests: systemTests
  }
}

/**
 *
 * @param {('ansattVTFK'|'ansattVFYLKE'|'ansattTFYLKE'|'elevVTFK'|'larlingVTFK'|'otVTFK')} userType userType fra update-db-users mongodb collection
 */
const setupUserTests = (userType) => {
  logger('info', ['setup-user-tests', `UserType: ${userType}`, 'Starting'])
  let userFlow
  try {
    userFlow = require(`../user-types/${userType}.js`)
  } catch (error) {
    logger('error', ['setup-user-tests', `Could not find user-type file (../user-types/${userType}.js) for userType ${userType}`])
    return []
  }
  const systemsOverview = userFlow.systemsAndTests.map(system => setupSystemOverview(system)) // For uploading to db
  const systemsToHandle = userFlow.systemsAndTests.map(system => setupSystemTests(system, systemsOverview)) // For handling running of tests
  logger('info', ['setup-user-tests', `UserType: ${userType}`, 'Finished'])
  return { systemsOverview, systemsToHandle }
}

module.exports = { setupUserTests }
