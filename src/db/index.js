exports.getBlockRef = (db, geoId) => {
  const state = geoId.slice(0, 2)
  const county = geoId.slice(2, 5)
  const tract = geoId.slice(5, 11)
  const block = geoId.slice(11)
  // console.log(`s-${state}.c-${county}.t-${tract}.b-${block}`)
  return db.collection('states').doc(`s-${state}`)
    .collection('counties').doc(`c-${county}`)
    .collection('tracts').doc(`t-${tract}`)
    .collection('blocks').doc(`b-${block}`)  
}
