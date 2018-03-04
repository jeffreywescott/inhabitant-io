const fetch = require('node-fetch')
const qs = require('query-string')
const addressParser = require('parse-address')
const cors = require('cors')({origin: true})

const firebaseFunctions = require('firebase-functions')
const firebaseAdmin = require('firebase-admin')

const {getBlockRef} = require('../db')

firebaseAdmin.initializeApp(firebaseFunctions.config().firebase)
const db = firebaseAdmin.firestore()

const CENSUS_GEOCODER_BASE_URL = 'https://geocoding.geo.census.gov/geocoder/geographies'
const CENSUS_GEOCODER_BENCHMARK = '8'
const CENSUS_GEOCODER_VINTAGE = '8'
const CENSUS_GEOCODER_FORMAT = 'json'

const districtInfoFromGeographies = geographies => {
  const censusBlocks = geographies['2010 Census Blocks']
  const [censusBlock] = censusBlocks
  return getBlockRef(db, censusBlock.GEOID)
    .get()
    .then(blockInfo => {
      return Object.assign({}, blockInfo.data(), {
        geoId: censusBlock.GEOID,
      })
    })
}

const districtInfoFromCensusCoordinatesApiResult = (geoInfo, x, y) => {
  const {result} = geoInfo
  const {geographies} = result
  return districtInfoFromGeographies(geographies)
    .then(districtInfo => {
      return Object.assign({}, districtInfo, {
        coordinates: {
          x,
          y
        }
      })
    })
}

const districtInfoFromCensusAddressApiResult = geoInfo => {
  const {result} = geoInfo
  const {addressMatches} = result
  const [addressMatch] = addressMatches
  const {matchedAddress, coordinates} = addressMatch
  return districtInfoFromGeographies(addressMatch.geographies)
    .then(districtInfo => {
      return Object.assign({}, districtInfo, {
        matchedAddress,
        coordinates
      })
    })
}

const fetchJson = url => {
  return fetch(url).then(resp => resp.json())
}

const censusBlockForCoordinates = (lng, lat) => {
  const qsData = {
    format: CENSUS_GEOCODER_FORMAT,
    benchmark: CENSUS_GEOCODER_BENCHMARK,
    vintage: CENSUS_GEOCODER_VINTAGE,
    x: lng,
    y: lat,
  }

  const coordinatesUrl = `${CENSUS_GEOCODER_BASE_URL}/coordinates?${qs.stringify(qsData)}`
  return fetchJson(coordinatesUrl)
    .then(geoInfo => districtInfoFromCensusCoordinatesApiResult(geoInfo, lng, lat))
}

const censusBlockForAddress = address => {
  const addressParts = addressParser.parseLocation(address)
  const qsData = {
    format: CENSUS_GEOCODER_FORMAT,
    benchmark: CENSUS_GEOCODER_BENCHMARK,
    vintage: CENSUS_GEOCODER_VINTAGE,
    street: `${addressParts.number} ${addressParts.prefix || ''} ${addressParts.street} ${addressParts.type}`,
    city: addressParts.city,
    state: addressParts.state,
    zip: addressParts.zip
  }

  const addressUrl = `${CENSUS_GEOCODER_BASE_URL}/address?${qs.stringify(qsData)}`
  return fetchJson(addressUrl)
    .then(geoInfo => districtInfoFromCensusAddressApiResult(geoInfo))
}

exports.district = firebaseFunctions.https.onRequest((req, res) => {
  cors(req, res, () => {
    try {
      const {lng, lat, address} = req.query
      if (!(lng && lat) && !address) {
        throw new Error('missing required parameters: lng and lat OR address')
      }
      if (lng && lat) {
        return censusBlockForCoordinates(lng, lat)
          .then(json => res.status(200).json(json))
      }
      return censusBlockForAddress(address)
        .then(json => res.status(200).json(json))
    } catch (err) {
      console.error(err)
    }
  })
})
