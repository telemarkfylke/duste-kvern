class CustomError extends Error {
  constructor (originalError, customMessage) {
    super(originalError)

    this.name = 'CustomError'
    this.customMessage = customMessage
  }
}

module.exports = { CustomError }
