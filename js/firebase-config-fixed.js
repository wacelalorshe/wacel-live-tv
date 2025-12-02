// ===========================================
// تهيئة Firebase - إصدار مصحح
// ===========================================

// إعدادات Firebase مباشرة (للاختبار)
const firebaseConfig = {
    apiKey: "AIzaSyAKgEiYYlmpMe0NLewulheovlTQMzVC7980",
    authDomain: "bein-42f9e.firebaseapp.com",
    projectId: "bein-42f9e",
    storageBucket: "bein-42f9e.firebasestorage.app",
    messagingSenderId: "143741167050",
    appId: "1:143741167050:web:922d3a0cddb40f67b21b33",
    measurementId: "G-JH198SKCFS"
};

const matchesFirebaseConfig = {
    apiKey: "AIzaSyCqE7ZwveHg1dIhYf1Hlo7OpHyCZudeZvM",
    authDomain: "wacel-live.firebaseapp.com",
    databaseURL: "https://wacel-live-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "wacel-live",
    storageBucket: "wacel-live.firebasestorage.app",
    messagingSenderId: "185108554006",
    appId: "1:185108554006:web:93171895b1d4bb07c6f037"
};

// تهيئة Firebase بشكل مباشر
function initializeFirebaseDirect() {
    return new Promise((resolve, reject) => {
        try {
            console.log('🚀 تهيئة Firebase مباشرة...');
            
            // التحقق من وجود Firebase
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK غير محمل');
            }
            
            // Initialize Apps
            let app, matchesApp;
            
            try {
                app = firebase.initializeApp(firebaseConfig);
                console.log('✅ تم تهيئة Firebase الرئيسي');
            } catch (error) {
                if (error.code === 'app/duplicate-app') {
                    console.log('⚠️ تطبيق Firebase مهيأ بالفعل');
                    app = firebase.app();
                } else {
                    throw error;
                }
            }
            
            try {
                matchesApp = firebase.initializeApp(matchesFirebaseConfig, 'matchesApp');
                console.log('✅ تم تهيئة تطبيق المباريات');
            } catch (error) {
                if (error.code === 'app/duplicate-app') {
                    console.log('⚠️ تطبيق المباريات مهيأ بالفعل');
                    matchesApp = firebase.app('matchesApp');
                } else {
                    throw error;
                }
            }
            
            // الحصول على خدمات Firebase
            const db = firebase.firestore(app);
            const matchesDb = firebase.database(matchesApp);
            
            // اختبار الاتصال
            testFirestoreConnection(db).then(success => {
                if (success) {
                    console.log('✅ اتصال Firestore ناجح');
                    
                    // حفظ المتغيرات العامة
                    window.firebaseApp = app;
                    window.db = db;
                    window.matchesDb = matchesDb;
                    
                    resolve({ app, db, matchesApp, matchesDb });
                } else {
                    reject(new Error('فشل اختبار اتصال Firestore'));
                }
            }).catch(err => {
                reject(err);
            });
            
        } catch (error) {
            console.error('❌ خطأ في تهيئة Firebase:', error);
            reject(error);
        }
    });
}

// اختبار اتصال Firestore
async function testFirestoreConnection(db) {
    try {
        console.log('🧪 اختبار اتصال Firestore...');
        
        // محاولة قراءة مجموعة test
        const testCollection = db.collection('test');
        const snapshot = await testCollection.limit(1).get();
        
        console.log('✅ اتصال Firestore يعمل');
        return true;
    } catch (error) {
        console.warn('⚠️ تحذير اتصال Firestore:', error.code, error.message);
        
        // قد يكون السبب عدم وجود مجموعة test، لكن هذا لا يعني أن الاتصال فاشل
        if (error.code === 'permission-denied') {
            console.log('🔓 تحتاج إلى تعديل قواعد Firestore');
            return false;
        } else if (error.code === 'failed-precondition') {
            console.log('🔧 Firestore غير مفعل لهذا المشروع');
            return false;
        } else {
            // محاولة أخرى - جلب الأقسام مباشرة
            try {
                const sectionsSnapshot = await db.collection('sections').limit(1).get();
                console.log('✅ يمكن الوصول إلى بيانات الأقسام');
                return true;
            } catch (secondError) {
                console.error('❌ فشل الوصول إلى البيانات:', secondError);
                return false;
            }
        }
    }
}

// تهيئة Firebase مع إعادة المحاولة
function initializeFirebaseWithRetry() {
    return new Promise((resolve, reject) => {
        const maxRetries = 3;
        let retries = 0;
        
        function attempt() {
            console.log(`🔄 محاولة الاتصال بـ Firebase (${retries + 1}/${maxRetries})`);
            
            initializeFirebaseDirect()
                .then(result => resolve(result))
                .catch(error => {
                    retries++;
                    
                    if (retries < maxRetries) {
                        console.log(`⏳ إعادة المحاولة بعد 2 ثواني...`);
                        setTimeout(attempt, 2000);
                    } else {
                        reject(new Error(`فشل جميع محاولات الاتصال بـ Firebase: ${error.message}`));
                    }
                });
        }
        
        attempt();
    });
}

// دالة مبسطة للاستخدام
async function initializeFirebase() {
    return initializeFirebaseWithRetry();
}

// دالة للحصول على قاعدة البيانات
function getFirebaseDb() {
    return window.db || null;
}

// دالة للتحقق من حالة Firebase
function isFirebaseAvailable() {
    return window.db !== undefined && window.db !== null;
}

// تهيئة تلقائية عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 الصفحة محملة، جاهز لتهيئة Firebase عند الحاجة');
});
