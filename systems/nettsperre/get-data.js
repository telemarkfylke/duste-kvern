// const axios = require('axios')
// const { logger } = require('@vtfk/logger')

const { NETTSPERRE } = require('../../config')
const { getMongoClient } = require('../../lib/mongo-client')

const repackNettsperre = (sperre, user) => {
  return {
    id: sperre._id,
    status: sperre.status,
    currentStudent: sperre.students.find(stud => stud.id === user.id),
    blockedGroup: sperre.blockedGroup.displayName,
    typeBlock: sperre.typeBlock.type,
    teacher: sperre.teacher.userPrincipalName,
    createdBy: sperre.createdBy.userPrincipalName,
    startBlock: sperre.startBlock,
    endBlock: sperre.endBlock,
    createdTimeStamp: sperre.createdTimeStamp
  }
}

const getData = async (user, system) => {
  // Connect to nettsperre db, collection for sperringer
  const client = await getMongoClient()
  const sperringerCollection = client.db(NETTSPERRE.DB_NAME).collection(NETTSPERRE.COLLECTION_NAME)

  // Get all sperringer where user is in students array, and status is pending or active - de som ligger i students arrayet ER FAKTISK de som skal være i sperre (ligge i EntraID gruppen). HVis en lærer fjerner noen fra en aktiv sperring, så blir de også fjernet fra students arrayet, OG entra id gruppen
  // Hvis de legges til (kan KUN gjøres i pending-status) så blir de lagt til i students arrayet.
  const studentSperringer = await sperringerCollection.find({ 'students.id': user.id, status: { $in: ['active', 'pending'] } }).toArray()

  const activeNettsperrer = studentSperringer.filter(sperring => sperring.status === 'active')
  const futureNettsperrer = studentSperringer.filter(sperring => sperring.status === 'pending')

  // Get all sperringer where sperring is active - and user have been removed from the sperring as well (in the updated array)
  // const removedFromActiveSperringer = await sperringerCollection.find({ "updated.studentsToRemove.id": user.id, "status": "active" }).toArray()

  return {
    activeNettsperrer: activeNettsperrer.map(sperring => repackNettsperre(sperring, user)),
    futureNettsperrer: futureNettsperrer.map(sperring => repackNettsperre(sperring, user))
  }
}

module.exports = { getData }
