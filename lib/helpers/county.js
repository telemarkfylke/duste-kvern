const { COUNTY_OU } = require('../../config')

const isTelemark = () => COUNTY_OU === 'TFYLKE'
const isVestfold = () => COUNTY_OU === 'VFYLKE'

module.exports = {
  isTelemark,
  isVestfold
}