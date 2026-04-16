const { adminDb } = require('./lib/firebase/admin');

async function checkObservations() {
  const care = await adminDb.collection('careObservations').get();
  const midwife = await adminDb.collection('midwifeObservations').get();
  const mothers = await adminDb.collection('mothers').get();

  console.log('Care Observations:', care.size);
  console.log('Midwife Observations:', midwife.size);
  console.log('Mothers:', mothers.size);

  if (care.size > 0) {
    console.log('Sample Care Obs:', care.docs[0].data());
  }
  if (midwife.size > 0) {
    console.log('Sample Midwife Obs:', midwife.docs[0].data());
  }
}

checkObservations().catch(console.error);
