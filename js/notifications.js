// js/notifications.js
// نظام الإشعارات المنفصل

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.firebaseInitialized = false;
        this.init();
    }

    async init() {
        console.log('🔔 تهيئة نظام الإشعارات...');
        
        // تهيئة Firebase أولاً
        await this.initializeFirebase();
        
        // تحميل الإشعارات
        await this.loadNotifications();
        
        // تحديث العداد
        this.updateBadge();
        
        // التحقق من الإشعارات الجديدة كل دقيقة
        setInterval(() => this.checkForNewNotifications(), 60000);
        
        console.log('✅ نظام الإشعارات جاهز');
        
        // التحقق من الإشعارات الجديدة للنظام المنبثق
        setTimeout(() => {
            if (window.notificationPopup) {
                const unreadNotifications = this.notifications.filter(n => !n.isRead);
                if (unreadNotifications.length > 0) {
                    window.notificationPopup.showPopup(unreadNotifications[0]);
                }
            }
        }, 3500);
    }

    async initializeFirebase() {
        try {
            if (typeof firebase === 'undefined') {
                console.warn('⚠️ Firebase SDK غير محمل');
                return false;
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

            // تهيئة Firebase إذا لم يكن مهيأ
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
                console.log('✅ تم تهيئة Firebase للإشعارات');
            }

            this.firebaseInitialized = true;
            return true;

        } catch (error) {
            console.error('❌ فشل تهيئة Firebase للإشعارات:', error);
            return false;
        }
    }

    async loadNotifications() {
        try {
            console.log('📢 جاري تحميل الإشعارات...');
            
            // المحاولة الأولى: Firebase
            if (this.firebaseInitialized) {
                const db = firebase.firestore();
                
                // جلب الإشعارات النشطة غير المقروءة
                const snapshot = await db.collection('notifications')
                    .where('isActive', '==', true)
                    .orderBy('createdAt', 'desc')
                    .limit(20)
                    .get();
                
                if (!snapshot.empty) {
                    this.notifications = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    
                    console.log(`✅ تم تحميل ${this.notifications.length} إشعار من Firebase`);
                    
                    // عرض الإشعارات في القائمة
                    this.renderNotifications();
                    
                    // تحقق من وجود إشعارات جديدة للنافذة المنبثقة
                    this.checkPopupNotifications();
                    return;
                } else {
                    console.log('ℹ️ لا توجد إشعارات في Firebase');
                }
            }
            
            // المحاولة الثانية: localStorage
            const savedNotifications = localStorage.getItem('bein_notifications');
            if (savedNotifications) {
                this.notifications = JSON.parse(savedNotifications);
                console.log(`📱 تم تحميل ${this.notifications.length} إشعار من التخزين المحلي`);
                this.renderNotifications();
                this.checkPopupNotifications();
            }
            
        } catch (error) {
            console.warn('⚠️ فشل تحميل الإشعارات:', error);
            this.loadDefaultNotifications();
        }
    }

    checkPopupNotifications() {
        // تحقق من وجود إشعارات جديدة لعرضها في النافذة المنبثقة
        if (window.notificationPopup && this.notifications.length > 0) {
            const unreadNotifications = this.notifications.filter(n => !n.isRead);
            
            // تحقق من التفضيلات
            const preferences = window.notificationPopup.userPreferences;
            if (!preferences.showPopup) {
                console.log('ℹ️ عرض الإشعارات المنبثقة معطل حسب تفضيلات المستخدم');
                return;
            }
            
            // تحقق من التردد
            const lastPopupTime = localStorage.getItem('last_popup_time');
            if (lastPopupTime) {
                const now = Date.now();
                const diff = now - parseInt(lastPopupTime);
                
                switch (preferences.showFrequency) {
                    case 'once_per_day':
                        if (diff < 24 * 60 * 60 * 1000) return;
                        break;
                    case 'once_per_hour':
                        if (diff < 60 * 60 * 1000) return;
                        break;
                }
            }
            
            // عرض أول إشعار غير مقروء
            if (unreadNotifications.length > 0) {
                setTimeout(() => {
                    const notification = unreadNotifications[0];
                    if (!window.notificationPopup.hasNotificationBeenShown(notification.id)) {
                        window.notificationPopup.showPopup(notification);
                    }
                }, 2000);
            }
        }
    }

    loadDefaultNotifications() {
        console.log('📋 استخدام الإشعارات الافتراضية...');
        
        this.notifications = [
            {
                id: 'welcome-1',
                title: 'مرحباً بك!',
                message: 'أهلاً بك في تطبيق وسيل لايف برو. استمتع بمشاهدة أفضل القنوات.',
                createdAt: new Date(),
                isRead: false,
                isActive: true,
                type: 'welcome'
            },
            {
                id: 'update-1',
                title: 'تحديث جديد',
                message: 'تم إضافة قنوات رياضية جديدة. تابعنا للبقاء على اطلاع.',
                createdAt: new Date(Date.now() - 3600000),
                isRead: true,
                isActive: true,
                type: 'update'
            }
        ];
        
        this.renderNotifications();
        this.checkPopupNotifications();
    }

    renderNotifications() {
        const container = document.getElementById('notificationsList');
        if (!container) {
            console.warn('⚠️ حاوية الإشعارات غير موجودة');
            return;
        }

        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="notifications-empty">
                    <i class="uil uil-bell-slash"></i>
                    <p>لا توجد إشعارات حالياً</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.notifications.map(notification => `
            <div class="notification-item ${notification.isRead ? '' : 'unread'}" 
                 onclick="notificationSystem.markAsRead('${notification.id}')">
                <div class="notification-title">
                    <span>${notification.title || 'إشعار'}</span>
                    <span class="notification-time">
                        ${this.formatTime(notification.createdAt)}
                    </span>
                </div>
                <div class="notification-message">
                    ${notification.message}
                </div>
                ${notification.actionUrl ? `
                    <div class="notification-actions">
                        <button onclick="event.stopPropagation(); notificationSystem.openAction('${notification.actionUrl}')">
                            <i class="uil uil-external-link-alt"></i> زيارة الرابط
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        // تحديث العداد
        this.updateBadge();
    }

    formatTime(timestamp) {
        if (!timestamp) return '';
        
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (minutes < 1) return 'الآن';
        if (minutes < 60) return `قبل ${minutes} دقيقة`;
        if (hours < 24) return `قبل ${hours} ساعة`;
        if (days < 7) return `قبل ${days} يوم`;
        
        return date.toLocaleDateString('ar-SA');
    }

    updateBadge() {
        this.unreadCount = this.notifications.filter(n => !n.isRead).length;
        const badge = document.getElementById('unreadCount');
        if (badge) {
            badge.textContent = this.unreadCount;
            badge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
            
            // عرض مؤشر الإشعارات الجديدة
            if (window.notificationPopup && this.unreadCount > 0) {
                window.notificationPopup.showNewNotificationIndicator(this.unreadCount);
            }
        }
    }

    async markAsRead(notificationId) {
        try {
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification && !notification.isRead) {
                notification.isRead = true;
                
                // تحديث في Firebase إذا كان متصلاً
                if (this.firebaseInitialized) {
                    const db = firebase.firestore();
                    await db.collection('notifications').doc(notificationId).update({
                        isRead: true,
                        readAt: new Date()
                    });
                }
                
                // تحديث في localStorage
                this.saveToLocalStorage();
                
                // تحديث الواجهة
                this.updateBadge();
                this.renderNotifications();
                
                console.log(`✅ تم تحديد الإشعار ${notificationId} كمقروء`);
            }
        } catch (error) {
            console.error('❌ خطأ في تحديد الإشعار كمقروء:', error);
        }
    }

    async markAllAsRead() {
        try {
            const unreadNotifications = this.notifications.filter(n => !n.isRead);
            
            if (unreadNotifications.length === 0) {
                alert('لا توجد إشعارات غير مقروءة');
                return;
            }
            
            if (confirm(`هل تريد تحديد ${unreadNotifications.length} إشعار كمقروء؟`)) {
                // تحديث محلياً
                unreadNotifications.forEach(n => n.isRead = true);
                
                // تحديث في Firebase
                if (this.firebaseInitialized) {
                    const db = firebase.firestore();
                    const batch = db.batch();
                    
                    unreadNotifications.forEach(notification => {
                        const ref = db.collection('notifications').doc(notification.id);
                        batch.update(ref, {
                            isRead: true,
                            readAt: new Date()
                        });
                    });
                    
                    await batch.commit();
                }
                
                // حفظ وتحديث الواجهة
                this.saveToLocalStorage();
                this.updateBadge();
                this.renderNotifications();
                
                alert('تم تحديد جميع الإشعارات كمقروءة');
            }
        } catch (error) {
            console.error('❌ خطأ في تحديد جميع الإشعارات كمقروءة:', error);
            alert('حدث خطأ أثناء تحديث الإشعارات');
        }
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('bein_notifications', JSON.stringify(this.notifications));
        } catch (error) {
            console.error('❌ خطأ في حفظ الإشعارات محلياً:', error);
        }
    }

    openAction(url) {
        if (url) {
            window.open(url, '_blank');
        }
    }

    toggleDropdown() {
        const dropdown = document.getElementById('notificationsDropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
            
            // تحميل الإشعارات إذا كانت القائمة فارغة
            if (dropdown.classList.contains('show') && this.notifications.length === 0) {
                this.loadNotifications();
            }
        }
    }

    async checkForNewNotifications() {
        try {
            if (!this.firebaseInitialized) return;
            
            const db = firebase.firestore();
            const lastCheck = localStorage.getItem('lastNotificationCheck') || 0;
            
            const snapshot = await db.collection('notifications')
                .where('createdAt', '>', new Date(Number(lastCheck)))
                .where('isActive', '==', true)
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get();
            
            if (!snapshot.empty) {
                const newNotifications = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // إضافة الإشعارات الجديدة
                newNotifications.forEach(newNotif => {
                    if (!this.notifications.find(n => n.id === newNotif.id)) {
                        this.notifications.unshift(newNotif);
                    }
                });
                
                if (newNotifications.length > 0) {
                    // عرض إشعار عائم
                    this.showFloatingNotification(newNotifications[0]);
                    
                    // عرض نافذة منبثقة إذا كان النظام متاحاً
                    if (window.notificationPopup && newNotifications[0]) {
                        const preferences = window.notificationPopup.userPreferences;
                        if (preferences.showPopup) {
                            window.notificationPopup.showPopup(newNotifications[0]);
                        }
                    }
                    
                    // تحديث الواجهة
                    this.updateBadge();
                    this.renderNotifications();
                    
                    // حفظ وقت التحقق الأخير
                    localStorage.setItem('lastNotificationCheck', Date.now());
                    
                    console.log(`🔔 ${newNotifications.length} إشعار جديد`);
                }
            }
            
        } catch (error) {
            console.warn('⚠️ فشل التحقق من الإشعارات الجديدة:', error);
        }
    }

    showFloatingNotification(notification) {
        // إنشاء عنصر الإشعار العائم
        const floatingDiv = document.createElement('div');
        floatingDiv.className = 'floating-notification';
        floatingDiv.innerHTML = `
            <div class="floating-notification-header">
                <h6 class="floating-notification-title">
                    <i class="uil uil-bell"></i> ${notification.title || 'إشعار جديد'}
                </h6>
                <button class="floating-notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="uil uil-times"></i>
                </button>
            </div>
            <div class="floating-notification-body">
                ${notification.message}
            </div>
            <div class="floating-notification-time">
                ${this.formatTime(new Date())}
            </div>
        `;
        
        document.body.appendChild(floatingDiv);
        
        // إظهار الإشعار
        setTimeout(() => floatingDiv.classList.add('show'), 100);
        
        // إزالة الإشعار بعد 5 ثوانٍ
        setTimeout(() => {
            if (floatingDiv.parentNode) {
                floatingDiv.remove();
            }
        }, 5000);
    }
    
    // دالة جديدة لدعم النظام المنبثق
    showNotificationPopup(notification) {
        if (window.notificationPopup) {
            window.notificationPopup.showPopup(notification);
        } else {
            // استخدم النظام القديم كبديل
            this.showFloatingNotification(notification);
        }
    }
}

// تهيئة نظام الإشعارات
let notificationSystem;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🏠 تهيئة نظام الإشعارات...');
    notificationSystem = new NotificationSystem();
    
    // جعل الدوال متاحة عالمياً
    window.notificationSystem = notificationSystem;
    window.toggleNotifications = () => notificationSystem.toggleDropdown();
    window.markAllAsRead = () => notificationSystem.markAllAsRead();
});
