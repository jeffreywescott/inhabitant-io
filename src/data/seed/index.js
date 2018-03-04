const util = require('util')
const firebaseAdmin = require('firebase-admin')

const votingDistricts = {
  "06001": { // CA, Alameda
    "cities": {
      berkeley: require('../../../data/seed/voting-districts/06001-berkeley.json')
    }
  }
}
const parseCityVotingDistricts = () => {
  const geoId2VotingDistrict = Object.keys(votingDistricts).reduce((g2vd, stateCountyId) => {
    // console.log('--->', stateCountyId)
    const {cities} = votingDistricts[stateCountyId]
    const county2vd = Object.keys(cities).reduce((g2vd, cityId) => {
      const districts = cities[cityId]
      const city2vd = Object.keys(districts).reduce((g2vd, districtId) => {
        const {tracts} = districts[districtId]
        const tract2vd = Object.keys(tracts).reduce((g2vd, tractId) => {
          // console.log('-------->', tractId)
          const {blocks} = tracts[tractId]
          const block2vd = blocks.reduce((g2vd, blockId) => {
            // console.log('-------------->', blockId)
            const blockGeoId = `${stateCountyId}${tractId}${blockId}`
            return Object.assign({}, g2vd, {[blockGeoId]: districtId})
          }, {})
          return Object.assign({}, g2vd, block2vd)
        }, {})
        return Object.assign({}, g2vd, tract2vd)
      }, {})
      return Object.assign({}, g2vd, city2vd)
    }, {})
    return Object.assign({}, g2vd, county2vd)
  }, {})
  return geoId2VotingDistrict
}

const run = (serviceAccount, databaseURL) => {
  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
    databaseURL: 'https://inhabitant-io.firebaseio.com'
  })
  const db = firebaseAdmin.firestore()

  const geoId2VotingDistrict = parseCityVotingDistricts()
  // console.log(util.inspect(geoId2VotingDistrict, {depth: 6}))
  Object.keys(geoId2VotingDistrict).forEach(geoId => {
    const votingDistrict = geoId2VotingDistrict[geoId]
    const state = geoId.slice(0, 2)
    const county = geoId.slice(2, 5)
    const tract = geoId.slice(5, 11)
    const block = geoId.slice(11)

    // console.log(`s-${state}.c-${county}.t-${tract}.b-${block} => d-${votingDistrict}`)
    db.collection('states').doc(`s-${state}`)
      .collection('counties').doc(`c-${county}`)
      .collection('tracts').doc(`t-${tract}`)
      .collection('blocks').doc(`b-${block}`)
      .set({votingDistrict}, {merge: true})
  })
}

if (!module.parent) {
  const [serviceAccountFilename, databaseURL] = process.argv.slice(2)
  const serviceAccount = require(`../../../google-cloud-service-accounts/${serviceAccountFilename}`)
  run(serviceAccount, databaseURL)
}
