const admin = require("firebase-admin");

const { firebaseServiceAccount } = require("./env");

let app;

function getFirebaseAdminApp() {
  if (!app) {
    app = admin.initializeApp({
      credential: admin.credential.cert(firebaseServiceAccount()),
    });
  }
  return app;
}

module.exports = {
  getFirebaseAdminApp,
};
