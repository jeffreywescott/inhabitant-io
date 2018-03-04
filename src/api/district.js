const fetch = require('node-fetch')
const qs = require('query-string')
const addressParser = require('parse-address')

const CENSUS_GEOCODER_BASE_URL = 'https://geocoding.geo.census.gov/geocoder/geographies'
const CENSUS_GEOCODER_BENCHMARK = '8'
const CENSUS_GEOCODER_VINTAGE = '8'
const CENSUS_GEOCODER_FORMAT = 'json'

const districts = require('../../data/ca/berkeley/districts-census-tracts-blocks.json')
const districtMap = districts.reduce((map, districtInfo) => {
  const {district, tractBlockMap} = districtInfo
  const tractBlocks = Object.keys(tractBlockMap).reduce((tbs, tract) => {
    const blocks = tractBlockMap[tract]
    return tbs.concat(blocks.map(block => `${tract}${block}`))
  }, [])
  const blocksMap = tractBlocks.reduce((bm, tractBlock) => {
    const geoId = `06001${tractBlock}` // FIXME: hardcoded 06001 (state and county)
    return Object.assign({}, bm, {[geoId]: district})
  }, {})
  return Object.assign({}, map, blocksMap)
}, {})

const districtInfoFromGeographies = geographies => {
  const censusBlocks = geographies['2010 Census Blocks']
  const [censusBlock] = censusBlocks
  return {
    geoId: censusBlock.GEOID,
    district: districtMap[censusBlock.GEOID]
  }
}

const districtInfoFromCensusCoordinatesApiResult = (geoInfo, x, y) => {
  const {result} = geoInfo
  const {geographies} = result
  return Object.assign({}, districtInfoFromGeographies(geographies), {
    coordinates: {
      x,
      y
    }
  })
}

const districtInfoFromCensusAddressApiResult = geoInfo => {
  const {result} = geoInfo
  const {addressMatches} = result
  const [addressMatch] = addressMatches
  const {matchedAddress, coordinates} = addressMatch
  return Object.assign({}, districtInfoFromGeographies(addressMatch.geographies), {
    matchedAddress,
    coordinates
  })
}

const fetchCensusApi = url => {
  console.log({url})
  return fetch(url)
    .then(resp => resp.json())
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
  return fetchCensusApi(coordinatesUrl)
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
  return fetchCensusApi(addressUrl)
    .then(geoInfo => districtInfoFromCensusAddressApiResult(geoInfo))
}

exports.district = (req, res) => {
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
      .then(censusBlockInfo => res.status(200).json(Object.assign({}, censusBlockInfo, {
        district: districtMap[censusBlockInfo.geoId]
      })))
  } catch (err) {
    console.error(err)
  }
}

exports.helloWorld = (req, res) => {
  res.json({Hello: 'world!'})
}
