/**
 * Pluralizes a given text based on a count
 * @param {string} text The text to pluralize
 * @param {string} pluralText The plural form of the text
 * @param {number} count The count to determine pluralization
 * @param {string} [nonPluralText] The non-plural form of the text (optional)
 * 
 * @returns {string} The pluralized text based on the count
 */
const pluralizeText = (text, count, pluralText, nonPluralText = '') => {
  if (count === 0 || count > 1) {
    return `${text}${pluralText}`
  }

  return `${text}${nonPluralText}`
}

module.exports = { pluralizeText }
