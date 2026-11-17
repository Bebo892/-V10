Halaweyat Masr Café — V10 Full Menu Manager
-----------------------------------------
index.html        public menu
admin.html        single-admin login + five independent categories + CRUD
menu-products.json  120 items from the supplied café price sheet
firestore.rules   required V10 rules (publish in Firebase before testing)
catalog-sync.js   live Firestore menu/catalog sync
firebase-config.js public Firebase web configuration (no password)
assets/           original logo and existing product images
SETUP-AR.md       detailed Arabic deployment steps and safety notes

IMPORTANT: V10 must be uploaded to your existing GitHub Pages repository,
and firestore.rules must be published in Firebase Console. Files are not live
until you upload them. Admin must seed the catalogue once after deployment.
