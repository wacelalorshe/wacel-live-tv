// ===========================================
// تهيئة Firebase مع البيانات المشفرة - محسّنة
// ===========================================

function initializeFirebase() {
    return new Promise((resolve, reject) => {
        const maxRetries = 3;
        let retries = 0;
        
        function attemptInitialization() {
            try {
                console.log(`🚀 جاري تهيئة Firebase... المحاولة ${retries + 1}`);
                
                // فك تشفير إعدادات Firebase
                const firebaseConfig = decryptConfig(encryptedFirebaseConfig);
                const matchesFirebaseConfig = decryptConfig(encryptedMatchesConfig);
                
                if (!firebaseConfig || !matchesFirebaseConfig) {
                    throw new Error('فشل في فك تشفير إعدادات Firebase');
                }

                // Initialize Firebase
                const app = firebase.initializeApp(firebaseConfig);
                const db = firebase.firestore();
                
                // Initialize Matches Firebase
                const matchesApp = firebase.initializeApp(matchesFirebaseConfig, 'matchesApp');
                const matchesDb = firebase.database(matchesApp);
                
                console.log('✅ تم تهيئة Firebase بنجاح');
                resolve({ app, db, matchesApp, matchesDb });
                
            } catch (error) {
                retries++;
                console.error(`❌ فشل تهيئة Firebase (المحاولة ${retries}):`, error);
                
                if (retries < maxRetries) {
                    console.log(`🔄 إعادة المحاولة بعد 2 ثانية...`);
                    setTimeout(attemptInitialization, 2000);
                } else {
                    reject(error);
                }
            }
        }
        
        attemptInitialization();
    });
}
