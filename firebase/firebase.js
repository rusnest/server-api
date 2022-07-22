const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://server-38776-default-rtdb.firebaseio.com',
});

const db = getFirestore();

exports.getProductByShopId = async (id_shop) => {
  try {
    let productIds = [];
    const snapshots = await db
      .collection('products')
      .where('id_shop', '==', id_shop)
      .get();

    if (snapshots.docs.length) {
      switch (id_shop) {
        case 1:
          productIds = snapshots.docs.map((item) => item.data().tiki_id);
          break;
        case 2:
          productIds = snapshots.docs.map((item) => item.data().sendo_id);
          break;
        case 3:
          productIds = snapshots.docs.map((item) => item.data().shopee_id);
          break;
        case 4:
          productIds = snapshots.docs.map((item) => item.data().tgddId);
          break;
      }
    }

    return productIds;
  } catch (error) {
    return false;
  }
};

exports.addProduct = async (data) => {
  const res = await db.collection('products').add(data);

  return res.id;
};

exports.updateProduct = async (data) => {
  try {
    await db.collection('products').doc(`${data.id}`).set(
      {
        evaluate: data.type,
        percent: data.percent,
      },
      { merge: true }
    );

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

exports.deleteProduct = async (id) => {
  try {
    await db.collection('products').doc(`${id}`).delete();
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};
