// js/bulk-delete.js
// أدوات الحذف الجماعي للإشعارات

class BulkDeleteManager {
    constructor() {
        this.db = null;
        this.init();
    }

    async init() {
        await this.initializeFirebase();
    }

    async initializeFirebase() {
        try {
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK غير محمل');
            }

            const firebaseConfig = {
                apiKey: "AIzaSyAkgEiYYlmpMe0NLewulheovlTQMz5C980",
                authDomain: "bein-42f9e.firebaseapp.com",
                projectId: "bein-42f9e",
                storageBucket: "bein-42f9e.firebasestorage.app",
                messagingSenderId: "143741167050",
                appId: "1:143741167050:web:922d3a0cddb40f67b21b33",
                measurementId: "G-JH198SKCFS"
            };

            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }

            this.db = firebase.firestore();
            return true;

        } catch (error) {
            console.error('❌ فشل تهيئة Firebase:', error);
            return false;
        }
    }

    // حذف جميع الإشعارات
    async deleteAllNotifications() {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.db) {
                    throw new Error('Firestore غير مهيأ');
                }

                // جلب جميع الإشعارات
                const snapshot = await this.db.collection('notifications').get();
                
                if (snapshot.empty) {
                    resolve({ success: true, count: 0, message: 'لا توجد إشعارات' });
                    return;
                }

                // استخدام batch لحذف الكل
                const batch = this.db.batch();
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });

                await batch.commit();

                resolve({
                    success: true,
                    count: snapshot.size,
                    message: `تم حذف ${snapshot.size} إشعار بنجاح`
                });

            } catch (error) {
                reject({
                    success: false,
                    error: error.message,
                    message: 'فشل حذف الإشعارات'
                });
            }
        });
    }

    // حذف الإشعارات حسب الشرط
    async deleteNotificationsByCondition(condition) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.db) {
                    throw new Error('Firestore غير مهيأ');
                }

                let query = this.db.collection('notifications');
                
                // بناء الاستعلام حسب الشرط
                if (condition.type === 'expired') {
                    query = query.where('expiryDate', '<', new Date());
                } else if (condition.type === 'inactive') {
                    query = query.where('isActive', '==', false);
                } else if (condition.type === 'old') {
                    const daysAgo = new Date();
                    daysAgo.setDate(daysAgo.getDate() - condition.days);
                    query = query.where('createdAt', '<', daysAgo);
                } else if (condition.type === 'read') {
                    query = query.where('isRead', '==', true);
                }

                const snapshot = await query.get();
                
                if (snapshot.empty) {
                    resolve({ success: true, count: 0, message: 'لا توجد إشعارات تطابق الشرط' });
                    return;
                }

                // الحذف
                const batch = this.db.batch();
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });

                await batch.commit();

                resolve({
                    success: true,
                    count: snapshot.size,
                    message: `تم حذف ${snapshot.size} إشعار`
                });

            } catch (error) {
                reject({
                    success: false,
                    error: error.message,
                    message: 'فشل حذف الإشعارات'
                });
            }
        });
    }

    // حذف إشعارات محددة
    async deleteSelectedNotifications(notificationIds) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.db || !notificationIds || notificationIds.length === 0) {
                    throw new Error('بيانات غير صالحة');
                }

                const batch = this.db.batch();
                
                notificationIds.forEach(id => {
                    const ref = this.db.collection('notifications').doc(id);
                    batch.delete(ref);
                });

                await batch.commit();

                resolve({
                    success: true,
                    count: notificationIds.length,
                    message: `تم حذف ${notificationIds.length} إشعار`
                });

            } catch (error) {
                reject({
                    success: false,
                    error: error.message,
                    message: 'فشل حذف الإشعارات المحددة'
                });
            }
        });
    }

    // الحصول على إحصائيات الإشعارات
    async getNotificationsStats() {
        try {
            if (!this.db) {
                throw new Error('Firestore غير مهيأ');
            }

            const snapshot = await this.db.collection('notifications').get();
            
            if (snapshot.empty) {
                return {
                    total: 0,
                    active: 0,
                    inactive: 0,
                    expired: 0,
                    read: 0,
                    unread: 0
                };
            }

            let stats = {
                total: snapshot.size,
                active: 0,
                inactive: 0,
                expired: 0,
                read: 0,
                unread: 0
            };

            const now = new Date();

            snapshot.forEach(doc => {
                const data = doc.data();
                
                // التحقق من حالة النشاط
                if (data.isActive === false) {
                    stats.inactive++;
                } else {
                    stats.active++;
                }

                // التحقق من انتهاء الصلاحية
                const expiryDate = data.expiryDate?.toDate ? 
                    data.expiryDate.toDate() : new Date(data.expiryDate);
                
                if (expiryDate && expiryDate < now) {
                    stats.expired++;
                }

                // التحقق من القراءة
                if (data.isRead) {
                    stats.read++;
                } else {
                    stats.unread++;
                }
            });

            return stats;

        } catch (error) {
            console.error('❌ فشل جلب إحصائيات الإشعارات:', error);
            return null;
        }
    }
}

// جعل المدير متاحاً عالمياً
window.bulkDeleteManager = new BulkDeleteManager();
