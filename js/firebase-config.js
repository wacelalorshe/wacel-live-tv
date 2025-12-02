// ===========================================
// تهيئة Firebase مع البيانات المشفرة - محسّنة
// ===========================================

let firebaseInitialized = false;

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

                // Initialize Firebase Apps
                let app, matchesApp;
                
                try {
                    app = firebase.initializeApp(firebaseConfig);
                } catch (error) {
                    // إذا كان التطبيق مهيأ بالفعل، استخدمه
                    app = firebase.app();
                }
                
                try {
                    matchesApp = firebase.initializeApp(matchesFirebaseConfig, 'matchesApp');
                } catch (error) {
                    matchesApp = firebase.app('matchesApp');
                }

                const db = firebase.firestore(app);
                const matchesDb = firebase.database(matchesApp);
                
                // تعيين المتغيرات العامة للاستخدام
                window.firebaseApp = app;
                window.db = db;
                window.matchesDb = matchesDb;
                
                firebaseInitialized = true;
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

// دالة للحصول على قاعدة البيانات (بدون تهيئة متعددة)
function getFirebaseDb() {
    if (!firebaseInitialized) {
        console.warn('⚠️ Firebase لم يتم تهيئته بعد');
        return null;
    }
    return db;
}

// دالة للتحقق من حالة Firebase
function isFirebaseAvailable() {
    return firebaseInitialized && typeof db !== 'undefined' && db !== null;
}
