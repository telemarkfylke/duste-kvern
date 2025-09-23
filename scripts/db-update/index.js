(async () => {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.warn('lib', 'update-database', 'Tell me what update to do!\n- users\n- sds')
    process.exit(1)
  }
  const updateType = args[0].toLowerCase()
  const mongo = require('./lib/mongo')
  const { join } = require('path')
  const { writeFileSync } = require('fs')
  const { logger, logConfig } = require('@vtfk/logger')
  const { getDusteUsers } = require('./lib/get-duste-users')
  const { createLocalLogger } = require('../../lib/local-logger')
  const { MONGODB_USERS_NAME, MONGODB_USERS_COLLECTION } = require('./config')

  logConfig({
    localLogger: createLocalLogger('db-update')
  })

  const sleep = (ms) => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }

  let data
  if (updateType === 'users') {
    try {
      data = await getDusteUsers()
    } catch (error) {
      logger('error', ['Error when fetching duste-users from graph', error.response?.data || error.stack || error.toString()])
      await sleep(1000)
      process.exit(1)
    }
  } else {
    data = require(`./data/${updateType}.json`)
  }

  const mongoClient = mongo()
  const db = mongoClient.db(MONGODB_USERS_NAME).collection(MONGODB_USERS_COLLECTION)

  if (updateType === 'users') {
    const now = new Date().toISOString()
    data = data.map(user => {
      if (!user.displayName) return user
      if (!user.surname) return user
      return {
        ...user,
        displayNameLowerCase: user.displayName.toLowerCase(),
        surNameLowerCase: user.surname.toLowerCase(),
        updatedAt: now
      }
    })
    const usersPath = join(__dirname, './data/users.json')
    writeFileSync(usersPath, JSON.stringify(data, null, 2))
  }

  try {
    logger('info', ['lib', 'update-database', updateType, 'clear collection'])
    // await db.deleteMany({})
    await db.drop()
  } catch (error) {
    logger('error', ['lib', 'update-database', updateType, 'unable to clear collection', error])
    await sleep(1000)
    process.exit(1)
  }

  logger('info', ['lib', 'update-database', updateType, 'insert data', data.length, 'start'])
  try {
    const result = await db.insertMany(data)
    logger('info', ['lib', 'update-database', updateType, 'insert data', 'inserted', result.insertedCount])
  } catch (error) {
    logger('error', ['lib', 'update-database', updateType, 'update data', 'failed to insert data', error])
    await sleep(1000)
    process.exit(2)
  }

  // Create index on searchfields for fun
  if (updateType === 'users') {
    await db.createIndex({ displayNameLowerCase: 1 }, { background: true })
    await db.createIndex({ surNameLowerCase: 1 }, { background: true })
    await db.createIndex({ samAccountName: 1 }, { background: true })
    await db.createIndex({ feidenavn: 1 }, { background: true })
    await db.createIndex({ userPrincipalName: 1 }, { background: true })
  }

  await logger('info', ['lib', 'update-database', updateType, 'finished'])
  process.exit(0)
})()
