const getResultObject = (options, status) => {
  if (!options.message) throw new Error('Property "message" is required in all result types')
  const result = {
    status,
    message: options.message
  }
  if (options.message) result.message = options.message
  if (options.solution) result.solution = options.solution
  if (options.raw) result.raw = options.raw

  return result
}

/**
 * Description of options for success, warn and error
 * @typedef {Object} result
 * @property {string} message Result message to present in UI
 * @property {string} [solution] Optional property to set a probable solution
 * @property {Object} [raw] Optional property to set a data object which will be presented in UI under 'Se data'
 */

/**
 * Generate a success object
 * @param {result} result - Options for success object
 */
const success = result => getResultObject(result, 'ok')

/**
 * Generate a warning object
 * @param {result} result - Options for warning object
 */
const warn = result => getResultObject(result, 'warning')

/**
 * Generate an error object
 * @param {result} result - Options for error object
 */
const error = result => getResultObject(result, 'error')

/**
 * Generate ignore object (test will not be displayed)
 * @param {result} result - Options for ignore object
 */
const ignore = result => getResultObject((result || { message: 'urelevant' }), 'ignore')

const noData = message => getResultObject({ status: 'no-data', message: message || 'Mangler data...' })

module.exports.success = success
module.exports.warn = warn
module.exports.error = error
module.exports.ignore = ignore
module.exports.noData = noData
