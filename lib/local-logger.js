const { existsSync, mkdirSync, appendFile } = require('fs')
const { NODE_ENV } = require('../config')

const createLocalLogger = (scriptName) => {
  if (!existsSync('./logs')) mkdirSync('./logs')
  const logDir = `./logs/${scriptName}`
  if (!existsSync(logDir)) mkdirSync(logDir)
  const today = new Date()
  const month = today.getMonth() + 1 > 9 ? `${today.getMonth() + 1}` : `0${today.getMonth() + 1}`
  const logName = `${today.getFullYear()} - ${month}`

  const localLogger = (entry) => {
    if (NODE_ENV !== 'production') console.log(entry)
    appendFile(`${logDir}/${logName}.log`, `${entry}\n`, (err) => {
      if (err) console.log(err)
    })
  }

  return localLogger
}

module.exports = { createLocalLogger }
