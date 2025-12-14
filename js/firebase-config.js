// ============================================
// firebase-config.js
// ملف إعدادات وتكوين Firebase
// يحتوي على جميع الدوال للتعامل مع قاعدة البيانات
// ============================================

// ============================================
// الجزء 1: إعدادات Firebase
// ============================================

// 🔹 هذه هي بيانات الاتصال بمشروع Firebase الخاص بك
// 🔹 يمكنك الحصول على هذه البيانات من صفحة إعدادات المشروع في Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyAkgEiYYlmpMe0NLewulheovlTQMz5C980",              // 🔹 مفتاح API للاتصال
    authDomain: "bein-42f9e.firebaseapp.com",                      // 🔹 مجال المصادقة
    projectId: "bein-42f9e",                                        // 🔹 معرف المشروع
    storageBucket: "bein-42f9e.firebasestorage.app",               // 🔹 سلة التخزين
    messagingSenderId: "143741167050",                              // 🔹 معرف المرسل
    appId: "1:143741167050:web:922d3a0cddb40f67b21b33",            // 🔹 معرف التطبيق
    measurementId: "G-JH198SKCFS"                                   // 🔹 معرف القياس
};

// ============================================
// الجزء 2: متغيرات عامة للتطبيق
// ============================================

let firebaseApp = null;        // 🔹 متغير لتخزين تطبيق Firebase
let firestoreDB = null;        // 🔹 متغير لتخزين قاعدة البيانات Firestore
let firebaseAuth = null;       // 🔹 متغير لتخزين نظام المصادقة

// ============================================
// الجزء 3: دوال التهيئة والاتصال
// ============================================

/**
 * 🔹 الدالة: initializeFirebase()
 * 🔹 الوظيفة: تهيئة وتفعيل Firebase في التطبيق
 * 🔹 الاستخدام: يتم استدعاؤها عند بدء التطبيق
 * 🔹 الإرجاع: true إذا نجحت التهيئة، false إذا فشلت
 */
function initializeFirebase() {
    try {
        // 🔹 التحقق من وجود مكتبة Firebase في الصفحة
        if (typeof firebase === 'undefined') {
            throw new Error('مكتبة Firebase غير محملة. تأكد من إضافة سكريبت Firebase في HTML.');
        }

        // 🔹 التحقق مما إذا كان هناك تطبيق Firebase مهيأ مسبقاً
        if (firebase.apps.length === 0) {
            // 🔹 إنشاء تطبيق Firebase جديد
            firebaseApp = firebase.initializeApp(firebaseConfig, 'BeinSportApp');
            console.log('✅ تم تهيئة Firebase بنجاح');
        } else {
            // 🔹 استخدام التطبيق الموجود بالفعل
            firebaseApp = firebase.apps[0];
            console.log('✅ تم استخدام تطبيق Firebase موجود');
        }

        // 🔹 الحصول على كائن قاعدة البيانات Firestore
        firestoreDB = firebase.firestore(firebaseApp);
        
        // 🔹 الحصول على كائن المصادقة Firebase Auth
        firebaseAuth = firebase.auth(firebaseApp);

        // 🔹 إعدادات إضافية لتحسين أداء قاعدة البيانات
        if (firestoreDB.settings) {
            firestoreDB.settings({
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED // 🔹 السماح بتخزين غير محدود مؤقت
            });
        }

        return true; // 🔹 إرجاع نجاح العملية
    } catch (error) {
        console.error('❌ فشل تهيئة Firebase:', error);
        return false; // 🔹 إرجاع فشل العملية
    }
}

/**
 * 🔹 الدالة: getFirestoreDB()
 * 🔹 الوظيفة: الحصول على كائن قاعدة البيانات
 * 🔹 الاستخدام: عند الحاجة للتعامل مع قاعدة البيانات
 * 🔹 الإرجاع: كائن قاعدة البيانات Firestore
 */
function getFirestoreDB() {
    if (!firestoreDB) {
        console.warn('⚠️ Firestore غير مهيأ. جاري التهيئة...');
        initializeFirebase();
    }
    return firestoreDB;
}

/**
 * 🔹 الدالة: getFirebaseAuth()
 * 🔹 الوظيفة: الحصول على كائن المصادقة
 * 🔹 الاستخدام: عند الحاجة للمصادقة أو تسجيل الدخول
 * 🔹 الإرجاع: كائن المصادقة Firebase Auth
 */
function getFirebaseAuth() {
    if (!firebaseAuth) {
        console.warn('⚠️ Firebase Auth غير مهيأ. جاري التهيئة...');
        initializeFirebase();
    }
    return firebaseAuth;
}

// ============================================
// الجزء 4: دوال التعامل مع الأقسام (Sections)
// ============================================

/**
 * 🔹 الدالة: getAllSections()
 * 🔹 الوظيفة: جلب جميع الأقسام من قاعدة البيانات
 * 🔹 الاستخدام: عرض الأقسام في الصفحة الرئيسية
 * 🔹 الإرجاع: مصفوفة تحتوي على جميع الأقسام
 */
async function getAllSections() {
    try {
        const db = getFirestoreDB();
        const snapshot = await db.collection('sections')
            .where('isActive', '==', true)     // 🔹 جلب الأقسام النشطة فقط
            .orderBy('order')                   // 🔹 ترتيب حسب الحقل order
            .get();
        
        const sections = [];
        snapshot.forEach(doc => {
            sections.push({
                id: doc.id,                     // 🔹 معرف المستند في قاعدة البيانات
                ...doc.data()                   // 🔹 جميع بيانات القسم
            });
        });
        
        console.log(`✅ تم جلب ${sections.length} قسم من قاعدة البيانات`);
        return sections;
    } catch (error) {
        console.error('❌ فشل جلب الأقسام:', error);
        throw error; // 🔹 إعادة الخطأ للتعامل معه في مكان آخر
    }
}

/**
 * 🔹 الدالة: addNewSection()
 * 🔹 الوظيفة: إضافة قسم جديد إلى قاعدة البيانات
 * 🔹 الاستخدام: من لوحة التحكم عند إضافة قسم جديد
 * 🔹 الإرجاع: معرف القسم الجديد في قاعدة البيانات
 */
async function addNewSection(sectionData) {
    try {
        const db = getFirestoreDB();
        const docRef = await db.collection('sections').add({
            ...sectionData,                     // 🔹 بيانات القسم المرسلة
            createdAt: new Date(),              // 🔹 تاريخ الإنشاء
            updatedAt: new Date()               // 🔹 تاريخ التحديث
        });
        console.log(`✅ تم إضافة قسم جديد بمعرف: ${docRef.id}`);
        return docRef.id;
    } catch (error) {
        console.error('❌ فشل إضافة قسم:', error);
        throw error;
    }
}

/**
 * 🔹 الدالة: updateSection()
 * 🔹 الوظيفة: تحديث بيانات قسم موجود
 * 🔹 الاستخدام: من لوحة التحكم عند تعديل قسم
 * 🔹 الإرجاع: true عند النجاح
 */
async function updateSection(sectionId, sectionData) {
    try {
        const db = getFirestoreDB();
        await db.collection('sections').doc(sectionId).update({
            ...sectionData,
            updatedAt: new Date()
        });
        console.log(`✅ تم تحديث القسم بمعرف: ${sectionId}`);
        return true;
    } catch (error) {
        console.error('❌ فشل تحديث القسم:', error);
        throw error;
    }
}

/**
 * 🔹 الدالة: deleteSection()
 * 🔹 الوظيفة: حذف قسم من قاعدة البيانات
 * 🔹 الاستخدام: من لوحة التحكم عند حذف قسم
 * 🔹 الإرجاع: true عند النجاح
 */
async function deleteSection(sectionId) {
    try {
        const db = getFirestoreDB();
        await db.collection('sections').doc(sectionId).delete();
        console.log(`✅ تم حذف القسم بمعرف: ${sectionId}`);
        return true;
    } catch (error) {
        console.error('❌ فشل حذف القسم:', error);
        throw error;
    }
}

// ============================================
// الجزء 5: دوال التعامل مع القنوات (Channels)
// ============================================

/**
 * 🔹 الدالة: getAllChannels()
 * 🔹 الوظيفة: جلب جميع القنوات من قاعدة البيانات
 * 🔹 الاستخدام: عرض القنوات في صفحة القسم
 * 🔹 الإرجاع: مصفوفة تحتوي على جميع القنوات
 */
async function getAllChannels() {
    try {
        const db = getFirestoreDB();
        const snapshot = await db.collection('channels').get();
        
        const channels = [];
        snapshot.forEach(doc => {
            channels.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`✅ تم جلب ${channels.length} قناة من قاعدة البيانات`);
        return channels;
    } catch (error) {
        console.error('❌ فشل جلب القنوات:', error);
        throw error;
    }
}

/**
 * 🔹 الدالة: getChannelsBySection()
 * 🔹 الوظيفة: جلب القنوات الخاصة بقسم معين
 * 🔹 الاستخدام: عرض قنوات قسم محدد
 * 🔹 الإرجاع: مصفوفة بالقنوات التابعة للقسم
 */
async function getChannelsBySection(sectionId) {
    try {
        const db = getFirestoreDB();
        const snapshot = await db.collection('channels')
            .where('sectionId', '==', sectionId) // 🔹 فلترة حسب معرف القسم
            .orderBy('order')                    // 🔹 ترتيب حسب الحقل order
            .get();
        
        const channels = [];
        snapshot.forEach(doc => {
            channels.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`✅ تم جلب ${channels.length} قناة للقسم ${sectionId}`);
        return channels;
    } catch (error) {
        console.error('❌ فشل جلب قنوات القسم:', error);
        throw error;
    }
}

/**
 * 🔹 الدالة: addNewChannel()
 * 🔹 الوظيفة: إضافة قناة جديدة إلى قاعدة البيانات
 * 🔹 الاستخدام: من لوحة التحكم عند إضافة قناة
 * 🔹 الإرجاع: معرف القناة الجديدة
 */
async function addNewChannel(channelData) {
    try {
        const db = getFirestoreDB();
        const docRef = await db.collection('channels').add({
            ...channelData,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log(`✅ تم إضافة قناة جديدة بمعرف: ${docRef.id}`);
        return docRef.id;
    } catch (error) {
        console.error('❌ فشل إضافة قناة:', error);
        throw error;
    }
}

/**
 * 🔹 الدالة: updateChannel()
 * 🔹 الوظيفة: تحديث بيانات قناة موجودة
 * 🔹 الاستخدام: من لوحة التحكم عند تعديل قناة
 * 🔹 الإرجاع: true عند النجاح
 */
async function updateChannel(channelId, channelData) {
    try {
        const db = getFirestoreDB();
        await db.collection('channels').doc(channelId).update({
            ...channelData,
            updatedAt: new Date()
        });
        console.log(`✅ تم تحديث القناة بمعرف: ${channelId}`);
        return true;
    } catch (error) {
        console.error('❌ فشل تحديث القناة:', error);
        throw error;
    }
}

/**
 * 🔹 الدالة: deleteChannel()
 * 🔹 الوظيفة: حذف قناة من قاعدة البيانات
 * 🔹 الاستخدام: من لوحة التحكم عند حذف قناة
 * 🔹 الإرجاع: true عند النجاح
 */
async function deleteChannel(channelId) {
    try {
        const db = getFirestoreDB();
        await db.collection('channels').doc(channelId).delete();
        console.log(`✅ تم حذف القناة بمعرف: ${channelId}`);
        return true;
    } catch (error) {
        console.error('❌ فشل حذف القناة:', error);
        throw error;
    }
}

// ============================================
// الجزء 6: دوال التعامل مع المباريات (Matches) - الجزء الجديد
// ============================================

/**
 * 🔹 الدالة: getAllMatches()
 * 🔹 الوظيفة: جلب جميع المباريات من قاعدة البيانات
 * 🔹 الاستخدام: عرض المباريات في صفحة الجدول
 * 🔹 الإرجاع: مصفوفة تحتوي على جميع المباريات
 */
async function getAllMatches() {
    try {
        const db = getFirestoreDB();
        const snapshot = await db.collection('matches')
            .orderBy('matchDate')                // 🔹 ترتيب حسب تاريخ المباراة
            .orderBy('matchTime')                // 🔹 ترتيب حسب وقت المباراة
            .get();
        
        const matches = [];
        snapshot.forEach(doc => {
            matches.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`✅ تم جلب ${matches.length} مباراة من قاعدة البيانات`);
        return matches;
    } catch (error) {
        console.error('❌ فشل جلب المباريات:', error);
        throw error;
    }
}

/**
 * 🔹 الدالة: getMatchesByDate()
 * 🔹 الوظيفة: جلب المباريات حسب تاريخ معين
 * 🔹 الاستخدام: فلترة المباريات حسب اليوم أو الأسبوع
 * 🔹 الإرجاع: مصفوفة بالمباريات في التاريخ المحدد
 */
async function getMatchesByDate(date) {
    try {
        const db = getFirestoreDB();
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        
        const snapshot = await db.collection('matches')
            .where('matchDate', '>=', startDate)
            .where('matchDate', '<=', endDate)
            .orderBy('matchDate')
            .orderBy('matchTime')
            .get();
        
        const matches = [];
        snapshot.forEach(doc => {
            matches.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`✅ تم جلب ${matches.length} مباراة للتاريخ ${date}`);
        return matches;
    } catch (error) {
        console.error('❌ فشل جلب المباريات حسب التاريخ:', error);
        throw error;
    }
}

/**
 * 🔹 الدالة: addNewMatch()
 * 🔹 الوظيفة: إضافة مباراة جديدة إلى قاعدة البيانات
 * 🔹 الاستخدام: من لوحة التحكم عند إضافة مباراة
 * 🔹 الإرجاع: معرف المباراة الجديدة
 */
async function addNewMatch(matchData) {
    try {
        const db = getFirestoreDB();
        const docRef = await db.collection('matches').add({
            ...matchData,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log(`✅ تم إضافة مباراة جديدة بمعرف: ${docRef.id}`);
        return docRef.id;
    } catch (error) {
        console.error('❌ فشل إضافة مباراة:', error);
        throw error;
    }
}

/**
 * 🔹 الدالة: updateMatch()
 * 🔹 الوظيفة: تحديث بيانات مباراة موجودة
 * 🔹 الاستخدام: من لوحة التحكم عند تعديل مباراة
 * 🔹 الإرجاع: true عند النجاح
 */
async function updateMatch(matchId, matchData) {
    try {
        const db = getFirestoreDB();
        await db.collection('matches').doc(matchId).update({
            ...matchData,
            updatedAt: new Date()
        });
        console.log(`✅ تم تحديث المباراة بمعرف: ${matchId}`);
        return true;
    } catch (error) {
        console.error('❌ فشل تحديث المباراة:', error);
        throw error;
    }
}

/**
 * 🔹 الدالة: deleteMatch()
 * 🔹 الوظيفة: حذف مباراة من قاعدة البيانات
 * 🔹 الاستخدام: من لوحة التحكم عند حذف مباراة
 * 🔹 الإرجاع: true عند النجاح
 */
async function deleteMatch(matchId) {
    try {
        const db = getFirestoreDB();
        await db.collection('matches').doc(matchId).delete();
        console.log(`✅ تم حذف المباراة بمعرف: ${matchId}`);
        return true;
    } catch (error) {
        console.error('❌ فشل حذف المباراة:', error);
        throw error;
    }
}

/**
 * 🔹 الدالة: getMatchById()
 * 🔹 الوظيفة: جلب بيانات مباراة محددة بواسطة المعرف
 * 🔹 الاستخدام: عند النقر على مباراة لعرض تفاصيلها
 * 🔹 الإرجاع: بيانات المباراة
 */
async function getMatchById(matchId) {
    try {
        const db = getFirestoreDB();
        const doc = await db.collection('matches').doc(matchId).get();
        
        if (!doc.exists) {
            throw new Error('المباراة غير موجودة');
        }
        
        return {
            id: doc.id,
            ...doc.data()
        };
    } catch (error) {
        console.error('❌ فشل جلب بيانات المباراة:', error);
        throw error;
    }
}

/**
 * 🔹 الدالة: getLiveMatches()
 * 🔹 الوظيفة: جلب المباريات المباشرة (الحية) فقط
 * 🔹 الاستخدام: عرض المباريات التي تبث حالياً
 * 🔹 الإرجاع: مصفوفة بالمباريات المباشرة
 */
async function getLiveMatches() {
    try {
        const db = getFirestoreDB();
        const snapshot = await db.collection('matches')
            .where('status', '==', 'live')      // 🔹 جلب المباريات ذات الحالة "live"
            .get();
        
        const matches = [];
        snapshot.forEach(doc => {
            matches.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`✅ تم جلب ${matches.length} مباراة مباشرة`);
        return matches;
    } catch (error) {
        console.error('❌ فشل جلب المباريات المباشرة:', error);
        throw error;
    }
}

// ============================================
// الجزء 7: دوال التعامل مع الإشعارات (Notifications)
// ============================================

/**
 * 🔹 الدالة: getAllNotifications()
 * 🔹 الوظيفة: جلب جميع الإشعارات من قاعدة البيانات
 * 🔹 الاستخدام: عرض الإشعارات في الصفحة
 * 🔹 الإرجاع: مصفوفة تحتوي على جميع الإشعارات
 */
async function getAllNotifications() {
    try {
        const db = getFirestoreDB();
        const snapshot = await db.collection('notifications')
            .where('isActive', '==', true)     // 🔹 جلب الإشعارات النشطة فقط
            .orderBy('createdAt', 'desc')      // 🔹 ترتيب تنازلي حسب تاريخ الإنشاء
            .limit(20)                         // 🔹 الحد الأقصى 20 إشعار
            .get();
        
        const notifications = [];
        snapshot.forEach(doc => {
            notifications.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`✅ تم جلب ${notifications.length} إشعار من قاعدة البيانات`);
        return notifications;
    } catch (error) {
        console.error('❌ فشل جلب الإشعارات:', error);
        throw error;
    }
}

/**
 * 🔹 الدالة: addNewNotification()
 * 🔹 الوظيفة: إضافة إشعار جديد إلى قاعدة البيانات
 * 🔹 الاستخدام: من لوحة التحكم عند إرسال إشعار
 * 🔹 الإرجاع: معرف الإشعار الجديد
 */
async function addNewNotification(notificationData) {
    try {
        const db = getFirestoreDB();
        const docRef = await db.collection('notifications').add({
            ...notificationData,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log(`✅ تم إضافة إشعار جديد بمعرف: ${docRef.id}`);
        return docRef.id;
    } catch (error) {
        console.error('❌ فشل إضافة إشعار:', error);
        throw error;
    }
}

// ============================================
// الجزء 8: دوال التخزين المحلي (Local Storage)
// ============================================

/**
 * 🔹 الدالة: saveToLocalStorage()
 * 🔹 الوظيفة: حفظ البيانات في التخزين المحلي للمتصفح
 * 🔹 الاستخدام: عندما يكون الإنترنت غير متاح (نسخ احتياطية)
 * 🔹 الإرجاع: true عند النجاح، false عند الفشل
 */
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`💾 تم حفظ البيانات في التخزين المحلي تحت المفتاح: ${key}`);
        return true;
    } catch (error) {
        console.error('❌ فشل حفظ البيانات في التخزين المحلي:', error);
        return false;
    }
}

/**
 * 🔹 الدالة: loadFromLocalStorage()
 * 🔹 الوظيفة: جلب البيانات من التخزين المحلي للمتصفح
 * 🔹 الاستخدام: عندما يكون الإنترنت غير متاح (استخدام النسخ الاحتياطية)
 * 🔹 الإرجاع: البيانات المحفوظة أو null إذا لم توجد
 */
function loadFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        if (data) {
            console.log(`📱 تم تحميل البيانات من التخزين المحلي من المفتاح: ${key}`);
            return JSON.parse(data);
        }
        return null;
    } catch (error) {
        console.error('❌ فشل تحميل البيانات من التخزين المحلي:', error);
        return null;
    }
}

/**
 * 🔹 الدالة: removeFromLocalStorage()
 * 🔹 الوظيفة: حذف البيانات من التخزين المحلي للمتصفح
 * 🔹 الاستخدام: عند تسجيل الخروج أو تحديث البيانات
 * 🔹 الإرجاع: true عند النجاح، false عند الفشل
 */
function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        console.log(`🗑️ تم حذف البيانات من التخزين المحلي للمفتاح: ${key}`);
        return true;
    } catch (error) {
        console.error('❌ فشل حذف البيانات من التخزين المحلي:', error);
        return false;
    }
}

// ============================================
// الجزء 9: تهيئة التطبيق عند تحميل الصفحة
// ============================================

/**
 * 🔹 الحدث: DOMContentLoaded
 * 🔹 الوظيفة: تشغيل عند تحميل الصفحة بالكامل
 * 🔹 الاستخدام: تهيئة Firebase عند بدء التطبيق
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 تم تحميل الصفحة، جاري تهيئة Firebase...');
    initializeFirebase();
});

// ============================================
// الجزء 10: تصدير الدوال للاستخدام في ملفات أخرى
// ============================================

// 🔹 جعل جميع الدوال متاحة للنوافذ (Window) لتكون قابلة للاستدعاء من HTML
window.firebaseUtils = {
    // 🔹 إعدادات Firebase
    firebaseConfig,
    
    // 🔹 دوال التهيئة والاتصال
    initializeFirebase,
    getFirestoreDB,
    getFirebaseAuth,
    
    // 🔹 دوال الأقسام
    getAllSections,
    addNewSection,
    updateSection,
    deleteSection,
    
    // 🔹 دوال القنوات
    getAllChannels,
    getChannelsBySection,
    addNewChannel,
    updateChannel,
    deleteChannel,
    
    // 🔹 دوال المباريات (الجديدة)
    getAllMatches,
    getMatchesByDate,
    addNewMatch,
    updateMatch,
    deleteMatch,
    getMatchById,
    getLiveMatches,
    
    // 🔹 دوال الإشعارات
    getAllNotifications,
    addNewNotification,
    
    // 🔹 دوال التخزين المحلي
    saveToLocalStorage,
    loadFromLocalStorage,
    removeFromLocalStorage
};

// 🔹 إرجاع رسالة تأكيد في وحدة التحكم
console.log('✅ تم تحميل ملف firebase-config.js بنجاح');
console.log('📝 يمكنك استخدام الدوال من خلال: window.firebaseUtils.اسم_الدالة()');