// js/notifications-fix.js - حل نهائي
class NotificationFix {
    constructor() {
        this.init();
    }

    async init() {
        console.log('🔧 بدء إصلاح نظام الإشعارات...');
        
        // 1. إعادة تعيين كامل
        this.resetAll();
        
        // 2. إعادة تحميل Firebase
        await this.reloadFirebase();
        
        // 3. إعادة إنشاء الواجهة
        this.rebuildUI();
        
        // 4. إعادة تحميل البيانات
        await this.reloadData();
        
        console.log('✅ تم الانتهاء من الإصلاح');
    }

    resetAll() {
        console.log('🔄 إعادة تعيين البيانات المحلية...');
        
        // حفظ أي بيانات مهمة أولاً
        const importantData = {
            userId: localStorage.getItem('notification_user_id')
        };
        
        // مسح جميع البيانات المتعلقة بالإشعارات
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.includes('notification') || key.includes('notif')) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // استعادة البيانات المهمة
        if (importantData.userId) {
            localStorage.setItem('notification_user_id', importantData.userId);
        }
        
        console.log(`🗑️ تم مسح ${keysToRemove.length} مفتاح`);
    }

    async reloadFirebase() {
        console.log('🔥 إعادة تحميل Firebase...');
        
        try {
            // إعادة تحميل SDK
            await this.loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
            await this.loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js');
            
            // إعادة تهيئة Firebase
            if (typeof firebaseUtils !== 'undefined') {
                await firebaseUtils.initializeFirebase();
                console.log('✅ Firebase مهيأ من جديد');
            }
        } catch (error) {
            console.error('❌ خطأ في إعادة تحميل Firebase:', error);
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                console.log(`✅ تم تحميل: ${src}`);
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    rebuildUI() {
        console.log('🎨 إعادة بناء الواجهة...');
        
        // إزالة زر الإشعارات القديم
        const oldBtn = document.querySelector('.notification-btn');
        if (oldBtn) oldBtn.remove();
        
        // إزالة النافذة القديمة
        const oldModal = document.getElementById('notificationsModal');
        if (oldModal) oldModal.remove();
        
        // إعادة إنشاء زر الإشعارات
        const headerTitle = document.querySelector('.header-title');
        if (headerTitle) {
            const newBtn = document.createElement('div');
            newBtn.className = 'notification-btn';
            newBtn.innerHTML = `
                <a href="#" onclick="event.preventDefault(); location.reload();">
                    <i class="uil uil-bell"></i>
                    <span id="notificationBadge" class="notification-badge" style="display: none;">0</span>
                </a>
            `;
            
            newBtn.style.cssText = `
                position: absolute;
                left: 20px;
                top: 50%;
                transform: translateY(-50%);
                z-index: 1000;
            `;
            
            headerTitle.style.position = 'relative';
            headerTitle.appendChild(newBtn);
            
            console.log('✅ تم إعادة إنشاء زر الإشعارات');
        }
    }

    async reloadData() {
        console.log('📥 إعادة تحميل البيانات...');
        
        try {
            const db = firebaseUtils.getDB();
            const snapshot = await db.collection('notifications')
                .where('isActive', '==', true)
                .orderBy('createdAt', 'desc')
                .get();
            
            const notifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // حفظ محلياً
            localStorage.setItem('bein_notifications', JSON.stringify(notifications));
            
            console.log(`✅ تم تحميل ${notifications.length} إشعار`);
            
            // تحديث الشارة
            this.updateBadge(notifications);
            
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات:', error);
        }
    }

    updateBadge(notifications) {
        const read = JSON.parse(localStorage.getItem('read_notifications') || '[]');
        const unread = notifications.filter(n => !read.includes(n.id)).length;
        
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (unread > 0) {
                badge.textContent = unread;
                badge.style.display = 'inline-block';
            }
        }
        
        console.log(`🔔 ${unread} إشعار غير مقروء`);
    }
}

// تشغيل الإصلاح عند النقر على زر
document.addEventListener('DOMContentLoaded', () => {
    // إضافة زر الإصلاح
    const fixBtn = document.createElement('button');
    fixBtn.textContent = '🔧 إصلاح الإشعارات';
    fixBtn.style.cssText = `
        position: fixed;
        bottom: 150px;
        right: 20px;
        z-index: 99999;
        padding: 10px 15px;
        background: #9C27B0;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
    `;
    fixBtn.onclick = () => new NotificationFix();
    document.body.appendChild(fixBtn);
});
