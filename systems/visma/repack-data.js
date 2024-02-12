const { VISMA } = require('../../config')
const { success, warn, error } = require('../../lib/test-result')
const isWithinDaterange = require('../../lib/helpers/is-within-daterange')
const { hasData, getArray, getArrayData } = require('../../lib/helpers/system-data')
const { prettifyDateToLocaleString } = require('../../lib/helpers/date-time-output')
const systemNames = require('../system-names')

const employeePositionActiveDaysAhead = 30

const getEmployment = hrm => {
  if (!hasData(hrm) || !hrm.employments || !hrm.employments.employment) return null
  const employment = getArray(hrm.employments.employment).find(employment => employment.company && employment.company.companyId === VISMA.COMPANY_ID)
  const dateDaysAhead = new Date(new Date().setDate(new Date().getDate() + employeePositionActiveDaysAhead))
  if (hasData(employment)) employment.active = isWithinDaterange(employment.startDate, employment.endDate) || isWithinDaterange(employment.startDate, employment.endDate, dateDaysAhead)

  return employment
}

const getPositions = employment => {
  if (!hasData(employment) || !employment.positions || !employment.positions.position) return null
  return getArray(employment.positions.position).map(position => ({
    ...position,
    active: isWithinDaterange(position.positionStartDate, position.positionEndDate)
  }))
}

const getPerson = (data) => {
  const hrm = getArrayData(data)
  const personIdHRM = hasData(hrm) && hrm['@personIdHRM']
  if (!personIdHRM) {
    return error({ message: `Personen ble ikke funnet i ${systemNames.visma}`, raw: { hrm }, solution: `Rettes i ${systemNames.visma}` })
  }

  return success({ message: `Personen ble funnet i ${systemNames.visma}`, raw: { personIdHRM } })
}

const getActivePosition = (data) => {
  const hrm = getArrayData(data)
  const employment = hasData(hrm) && getEmployment(hrm)
  if (!employment) {
    return error({ message: `Ingen ansettelsesforhold ble funnet i ${systemNames.visma}`, raw: { hrm }, solution: `Rettes i ${systemNames.visma}` })
  }

  const positions = getPositions(employment)
  if (!positions && !employment.active) {
    return error({ message: `Ingen stillinger ble funnet i ${systemNames.visma}`, raw: { employment, positions: (positions || null) } })
  } else if (!positions && employment.active) {
    if (new Date(employment.startDate) > new Date()) {
      return warn({ message: `Bruker begynner ikke før ${prettifyDateToLocaleString(new Date(employment.startDate))}`, raw: { employment, positions: (positions || null) }, solution: 'Vent til bruker har startet da vel' })
    } else {
      return error({ message: 'Bruker har ingen aktive stillinger', raw: { employment, positions: (positions || null) }, solution: `Rettes i ${systemNames.visma}` })
    }
  }

  const primaryPositions = positions.filter(position => position['@isPrimaryPosition'] === 'true')
  const activePrimaryPositions = primaryPositions.map(position => position.active)
  const activePrimaryPosition = activePrimaryPositions.includes(true)

  const activePositions = positions.map(position => position.active)
  const activePosition = activePositions.includes(true)

  // Sjekk at det finnes et aktivt ansettelsesforhold og minst én aktiv stilling
  if (employment.active && activePrimaryPosition) {
    // Sjekk at primærstilling ikke er Sluttet
    const primaryPosition = primaryPositions[0]
    if (primaryPosition.positionInfo && primaryPosition.positionInfo.positionType && primaryPosition.positionInfo.positionType['@name'] && primaryPosition.positionInfo.positionType['@name'].toLowerCase() === 'sluttet') {
      return error({ message: 'Primærstilling er avsluttet 😱', raw: primaryPosition.positionInfo.positionType, solution: `Rettes i ${systemNames.visma}` })
    } else return success({ message: `Fant aktivt ansettelsesforhold og stilling i ${systemNames.visma}`, raw: { employment, positions } })
  }

  // Fant kun et ansettelsesforhold
  if (employment.active) {
    // Krøss i taket om dette noen gang skjer, men..
    if (!activePrimaryPosition && activePosition) {
      return error({ message: `Fant et aktivt ansettelsesforhold i ${systemNames.visma}, men ingen av de aktive stillingene er en hovedstilling`, raw: { employment, positions }, solution: `Rettes i ${systemNames.visma}` })
    }

    return error({ message: `Fant et aktivt ansettelsesforhold i ${systemNames.visma}, men ingen aktiv hovedstilling`, raw: { employment, positions }, solution: `Rettes i ${systemNames.visma}` })
  }

  // Fant kun aktiv(e) stilling(er)
  if (activePrimaryPosition) {
    return error({ message: `Fant ${activePrimaryPositions.length > 1 ? 'flere aktive hovedstillinger' : 'én aktiv hovedstilling'}, men ikke noe ansettelsesforhold`, raw: { employment, positions }, solution: `Rettes i ${systemNames.visma}` })
  }

  // Verken aktive stillinger eller ansettelsesforhold ble funnet
  return error({ message: `Det ble ikke funnet noe aktivt ansettelsesforhold eller stillinger i ${systemNames.visma}`, raw: { employment, positions }, solution: `Rettes i ${systemNames.visma}` })
}

const getActivePositionCategory = (data) => {
  const hrm = getArrayData(data)
  const employment = hasData(hrm) && getEmployment(hrm)
  if (!employment) {
    return error({ message: `Ingen ansettelsesforhold ble funnet i ${systemNames.visma}`, raw: { hrm }, solution: `Rettes i ${systemNames.visma}` })
  }

  if (!employment.category || !employment.category['@id']) return error({ message: `Ingen kategori ble funnet i ${systemNames.visma}`, raw: { employment }, solution: `Rettes i ${systemNames.visma}` })
  const category = employment.category['@id'].toUpperCase()
  const description = employment.category.description || ''
  const excludedCategories = VISMA.CATEGORIES.split(',').filter(cat => !!cat).map(cat => cat.toUpperCase())

  if (excludedCategories.includes(category)) {
    return warn({ message: `Kategorien på ansettelsesforholdet (${category}) er ekskludert, som tilsier at det ikke skal opprettes noen brukerkonto`, raw: { category, description }, solution: `Rettes i ${systemNames.visma}` })
  }

  return success({ message: `Kategorien på ansettelsesforholdet (${category}) er ikke ekskludert, som tilsier at det skal opprettes brukerkonto`, raw: { category, description } })
}

const repackVismaData = (data) => {
  const personHrm = getPerson(data)
  const activePosition = getActivePosition(data)
  const activePositionCategory = getActivePositionCategory(data)
  return {
    person: {
      message: personHrm.message,
      raw: personHrm.raw
    },
    activePosition: {
      message: activePosition.message,
      raw: activePosition.raw
    },
    activePositionCategory: {
      message: activePositionCategory.message,
      raw: activePositionCategory.raw
    }
  }
}

module.exports = { repackVismaData, getPerson, getActivePosition, getActivePositionCategory, getEmployment, getPositions }
