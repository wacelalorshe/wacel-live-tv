// js/notification-fixer.js
// إصلاح نهائي لمشكلة الإشعارات المنبثقة

class NotificationFixer {
    constructor() {
        this.init();
    }

    init() {
        console.log('🔧 بدء إصلاح نظام الإشعارات...');
        
        // 1. إعادة تعيين كامل
        this.resetAll();
        
        // 2. إضافة نظام مباشر للاختبار
        this.addDirectTest();
        
        // 3. فحص فوري
        this.immediateCheck();
        
        console.log('✅ تم الانتهاء من الإصلاح');
    }

    resetAll() {
        // مسح جميع القيود
        localStorage.removeItem('last_popup_time');
        localStorage.removeItem('shown_popup_notifications');
        
        // تمكين الإشعارات بالقوة
        localStorage.setItem('notification_popup_preferences', JSON.stringify({
            showPopup: true,
            showFrequency: 'always',
            showToasts: true,
            enableSounds: true
        }));
        
        console.log('🔄 تم إعادة تعيين جميع القيود');
    }

    addDirectTest() {
        // إضافة زر اختبار مباشر
        const testBtn = document.createElement('button');
        testBtn.innerHTML = '🔔 اختبار الإشعارات';
        testBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 99999;
            padding: 12px 20px;
            background: linear-gradient(135deg, #FF5200, #FF8E53);
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(255, 82, 0, 0.3);
        `;
        
        testBtn.onclick = () => {
            this.showTestNotification();
        };
        
        document.body.appendChild(testBtn);
    }

    showTestNotification() {
        const notification = {
            id: 'direct-test-' + Date.now(),
            title: 'اختبار مباشر',
            message: 'إذا رأيت هذا الإشعار، فالنظام يعمل بشكل صحيح!',
            createdAt: new Date(),
            isRead: false,
            type: 'info'
        };
        
        // محاولة مع أنظمة مختلفة
        if (window.notificationPopup) {
            window.notificationPopup.showPopup(notification);
        } else if (window.firebaseNotifications) {
            window.firebaseNotifications.showNotificationPopup(notification);
        } else if (window.notificationSystem) {
            window.notificationSystem.showNotificationPopup(notification);
        } else if (window.app) {
            window.app.showNotificationPopup(notification);
        } else {
            alert('⚠️ لا توجد أنظمة إشعارات متاحة\n\nالرجاء التحقق من تحميل الملفات بشكل صحيح.');
        }
    }

    immediateCheck() {
        // فحص فوري بعد 2 ثانية
        setTimeout(() => {
            console.log('🔍 فحص فوري للإشعارات...');
            
            // محاولة جلب أي إشعارات
            const sources = [
                () => window.firebaseNotifications?.notifications,
                () => window.notificationSystem?.notifications,
                () => window.app?.notifications
            ];
            
            for (const source of sources) {
                const notifications = source();
                if (notifications && notifications.length > 0) {
                    const unread = notifications.filter(n => !n.isRead);
                    if (unread.length > 0) {
                        this.showTestNotification();
                        return;
                    }
                }
            }
            
            // إذا لم توجد إشعارات، عرض إشعار افتراضي
            this.showTestNotification();
            
        }, 2000);
    }
}

// تشغيل الإصلاح تلقائياً
setTimeout(() => {
    new NotificationFixer();
}, 3000);
