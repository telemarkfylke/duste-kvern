const { logger } = require('@vtfk/logger')
const { exec } = require('child_process')
const { dirname } = require('path')
const { existsSync } = require('fs')

const { MAX_BUFFER, PS1_SCRIPTS_PATH } = require('../config')

const replace = str => {
  return str.replace(/"|&|;|\|/g, '')
}

const sanitizeError = (filePath, error) => {
  if (error.includes(`${filePath} : `)) {
    error = error.replace(`${filePath} : `, '')
    return error.substring(0, error.indexOf('At line:')).trim()
  }
  const errorLines = error.split('\n')
  if (errorLines.length > 1 && errorLines[1].includes(`${filePath}:`)) return errorLines[0]

  return error
}

const parseArgs = args => {
  let argumemts = ''
  for (const key of Object.keys(args)) {
    argumemts += replace(`-${key} ${typeof args[key] === 'string' ? `'${args[key]}'` : args[key]} `)
  }
  return argumemts
}

const getError = (filePath, error) => ({ message: sanitizeError(filePath, error), stack: error })

const invoke = (scriptName, args) => {
  // Setup full path to script
  const scriptPath = `${PS1_SCRIPTS_PATH}/${scriptName}`

  // Validate scriptPath
  if (!existsSync(scriptPath)) {
    throw new Error(`'${scriptPath}' does not exist`)
  }

  if (!scriptPath.toLowerCase().endsWith('.ps1')) {
    throw new Error(`'${scriptPath}' is not a PowerShell script`)
  }

  if (args && typeof args !== 'object') {
    throw new Error("'args' must be object")
  }
  return new Promise((resolve, reject) => {
    // set encoding directly in the console: "cmd.exe /c chcp 65001>nul &&"
    const cmdPwsh = `powershell.exe -NoLogo -ExecutionPolicy ByPass -Command "${scriptPath}"${args ? ` ${parseArgs(args)}` : ''}`
    const cmd = `cmd.exe /c chcp 65001>nul && ${cmdPwsh}`
    logger('info', ['invoke-ps-script', 'executing command', cmdPwsh])

    const proc = exec(cmd, { cwd: dirname(scriptPath), maxBuffer: Number.parseInt(MAX_BUFFER) }, (error, stdout, stderr) => {
      if (stderr !== '') {
        const { message, stack } = getError(scriptPath, stderr)
        logger('error', ['invoke-ps-script', 'exec stderr', proc.pid, message])
        // eslint-disable-next-line
        return reject({ message, stack })
      }
      if (error !== null) {
        const { message, stack } = getError(scriptPath, stderr)
        logger('error', ['invoke-ps-script', 'exec error', proc.pid, message])
        // eslint-disable-next-line
        return reject({ message, stack })
      }

      logger('info', ['invoke-ps-script', 'exec finished', proc.pid])
      try {
        const result = JSON.parse(stdout)
        return resolve(result)
      } catch (error) {
        return resolve({ stdout })
      }
    })
  })
}

module.exports = invoke
