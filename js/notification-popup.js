// js/notification-popup.js
// نظام الإشعارات المنبثقة التلقائي الكامل

class NotificationPopupSystem {
    constructor() {
        this.popupShown = false;
        this.userPreferences = {
            showPopup: true,
            showFrequency: 'always', // 'always', 'once_per_day', 'once_per_hour'
            showToasts: true
        };
        this.currentNotification = null;
        this.notificationQueue = [];
        this.init();
    }

    async init() {
        console.log('🎪 تهيئة نظام النوافذ المنبثقة...');
        
        // تحميل تفضيلات المستخدم
        this.loadUserPreferences();
        
        // إنشاء عناصر الـ DOM
        this.createPopupElements();
        
        // فحص الإشعارات الجديدة بعد تحميل الصفحة
        setTimeout(() => this.checkForNewNotificationsOnLoad(), 2000);
        
        console.log('✅ نظام النوافذ المنبثقة جاهز');
        
        // جعل النظام متاحاً عالمياً
        window.notificationPopup = this;
    }

    loadUserPreferences() {
        try {
            const saved = localStorage.getItem('notification_popup_preferences');
            if (saved) {
                this.userPreferences = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('⚠️ فشل تحميل تفضيلات المستخدم:', error);
        }
    }

    saveUserPreferences() {
        try {
            localStorage.setItem('notification_popup_preferences', JSON.stringify(this.userPreferences));
        } catch (error) {
            console.error('❌ فشل حفظ تفضيلات المستخدم:', error);
        }
    }

    createPopupElements() {
        // إنشاء عنصر النافذة المنبثقة الرئيسية
        const popupHTML = `
            <div id="notificationPopupOverlay" class="notification-popup-overlay" onclick="event.stopPropagation();">
                <div class="notification-popup-container" onclick="event.stopPropagation();">
                    <div class="notification-popup-header">
                        <h3><i class="uil uil-bell"></i> إشعار جديد</h3>
                        <button class="notification-popup-close" onclick="window.notificationPopup.closePopup()">
                            <i class="uil uil-times"></i>
                        </button>
                    </div>
                    <div class="notification-popup-body">
                        <div id="notificationPopupTitle" class="notification-popup-title">جاري تحميل الإشعار...</div>
                        <div id="notificationPopupMessage" class="notification-popup-message">
                            <div class="notification-popup-loading">
                                <div class="spinner"></div>
                                <p>جاري تحميل محتوى الإشعار...</p>
                            </div>
                        </div>
                        <div id="notificationPopupTime" class="notification-popup-time">
                            <i class="uil uil-clock"></i> <span>قبل لحظات</span>
                        </div>
                        <div class="notification-popup-actions">
                            <button id="notificationPopupActionBtn" class="notification-popup-btn notification-popup-btn-primary" onclick="window.notificationPopup.performAction()">
                                <i class="uil uil-external-link-alt"></i> عرض التفاصيل
                            </button>
                            <button class="notification-popup-btn notification-popup-btn-secondary" onclick="window.notificationPopup.markAsReadAndClose()">
                                <i class="uil uil-check-circle"></i> تمت القراءة
                            </button>
                        </div>
                    </div>
                    <div class="notification-popup-footer">
                        <label>
                            <input type="checkbox" id="dontShowAgain" onchange="window.notificationPopup.toggleDontShowAgain()">
                            <span>لا تظهر الإشعارات تلقائياً</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
        
        // إنشاء عنصر لمؤشر الإشعارات
        const indicatorHTML = `<div id="notificationPopupMultiple" class="notification-popup-multiple"></div>`;
        
        // إضافة العناصر إلى body
        document.body.insertAdjacentHTML('beforeend', popupHTML);
        document.body.insertAdjacentHTML('beforeend', indicatorHTML);
    }

    async checkForNewNotificationsOnLoad() {
        console.log('🔍 فحص الإشعارات الجديدة عند تحميل الصفحة...');
        
        // انتظار 2 ثوانٍ إضافية لضمان تحميل الصفحة بالكامل
        setTimeout(async () => {
            try {
                // محاولة جلب الإشعارات من Firebase أولاً
                const notifications = await this.getNotificationsFromFirebase();
                
                if (notifications && notifications.length > 0) {
                    this.showPopup(notifications[0]);
                } else {
                    // إذا لم توجد إشعارات في Firebase، جرب localStorage
                    this.checkLocalNotifications();
                }
            } catch (error) {
                console.warn('⚠️ فشل فحص إشعارات Firebase:', error);
                this.checkLocalNotifications();
            }
        }, 2000);
    }

    async getNotificationsFromFirebase() {
        return new Promise(async (resolve, reject) => {
            try {
                if (typeof firebase === 'undefined') {
                    reject(new Error('Firebase غير محمل'));
                    return;
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
                let app;
                if (!firebase.apps.length) {
                    app = firebase.initializeApp(firebaseConfig, 'PopupNotificationApp');
                } else {
                    app = firebase.apps[0];
                }

                const db = firebase.firestore(app);
                
                // جلب الإشعارات من آخر 48 ساعة
                const twoDaysAgo = new Date();
                twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
                
                const snapshot = await db.collection('notifications')
                    .where('isActive', '==', true)
                    .where('createdAt', '>', twoDaysAgo)
                    .orderBy('createdAt', 'desc')
                    .limit(10)
                    .get();
                
                if (!snapshot.empty) {
                    const notifications = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    
                    // تصفية الإشعارات التي لم يتم عرضها من قبل
                    const unshownNotifications = notifications.filter(notification => 
                        !this.hasNotificationBeenShown(notification.id)
                    );
                    
                    resolve(unshownNotifications);
                } else {
                    resolve([]);
                }
                
            } catch (error) {
                reject(error);
            }
        });
    }

    checkLocalNotifications() {
        try {
            // جلب الإشعارات المحفوظة محلياً
            const savedNotifications = localStorage.getItem('bein_notifications_fixed') || 
                                     localStorage.getItem('bein_notifications');
            
            if (savedNotifications) {
                const notifications = JSON.parse(savedNotifications);
                const unreadNotifications = notifications.filter(notification => 
                    !notification.isRead && !this.hasNotificationBeenShown(notification.id)
                );
                
                if (unreadNotifications.length > 0) {
                    this.showPopup(unreadNotifications[0]);
                }
            }
        } catch (error) {
            console.warn('⚠️ فشل فحص الإشعارات المحلية:', error);
        }
    }

    shouldShowPopup(notification) {
        // التحقق من تفضيلات المستخدم
        if (!this.userPreferences.showPopup) {
            return false;
        }

        // التحقق مما إذا تم عرض هذا الإشعار من قبل
        if (this.hasNotificationBeenShown(notification.id)) {
            return false;
        }

        // التحقق من وقت آخر ظهور للنافذة
        const lastPopupTime = localStorage.getItem('last_popup_time');
        if (lastPopupTime) {
            const now = Date.now();
            const diff = now - parseInt(lastPopupTime);
            
            switch (this.userPreferences.showFrequency) {
                case 'once_per_day':
                    if (diff < 24 * 60 * 60 * 1000) return false;
                    break;
                case 'once_per_hour':
                    if (diff < 60 * 60 * 1000) return false;
                    break;
                // 'always' يستمر في العرض
            }
        }

        return true;
    }

    hasNotificationBeenShown(notificationId) {
        const shownNotifications = JSON.parse(localStorage.getItem('shown_popup_notifications') || '[]');
        return shownNotifications.includes(notificationId);
    }

    markNotificationAsShown(notificationId) {
        const shownNotifications = JSON.parse(localStorage.getItem('shown_popup_notifications') || '[]');
        if (!shownNotifications.includes(notificationId)) {
            shownNotifications.push(notificationId);
            // حفظ فقط آخر 100 إشعار
            if (shownNotifications.length > 100) {
                shownNotifications.shift();
            }
            localStorage.setItem('shown_popup_notifications', JSON.stringify(shownNotifications));
        }
    }

    showPopup(notification) {
        // التحقق مما إذا كان يجب عرض النافذة
        if (!this.shouldShowPopup(notification)) {
            console.log('ℹ️ تم تخطي الإشعار بناءً على التفضيلات:', notification.id);
            return;
        }

        console.log('🎪 عرض نافذة الإشعار المنبثقة:', notification.title);
        
        this.currentNotification = notification;

        // تعبئة البيانات
        document.getElementById('notificationPopupTitle').textContent = notification.title || 'إشعار جديد';
        document.getElementById('notificationPopupMessage').innerHTML = this.formatMessage(notification.message);
        
        // تنسيق الوقت
        const timeStr = this.formatPopupTime(notification.createdAt);
        document.getElementById('notificationPopupTime').innerHTML = `
            <i class="uil uil-clock"></i> <span>${timeStr}</span>
        `;

        // إعداد زر الإجراء
        const actionBtn = document.getElementById('notificationPopupActionBtn');
        if (notification.actionUrl || notification.url) {
            const url = notification.actionUrl || notification.url;
            actionBtn.style.display = 'flex';
            actionBtn.dataset.url = url;
            actionBtn.innerHTML = `<i class="uil uil-external-link-alt"></i> ${notification.linkText || 'عرض التفاصيل'}`;
        } else {
            actionBtn.style.display = 'none';
        }

        // تطبيق النمط المناسب حسب النوع
        this.applyNotificationStyle(notification.type || 'info');

        // إظهار النافذة
        const overlay = document.getElementById('notificationPopupOverlay');
        overlay.classList.add('show');
        
        // تعطيل التمرير في الخلفية
        document.body.style.overflow = 'hidden';

        // تسجيل عرض الإشعار
        this.markNotificationAsShown(notification.id);
        localStorage.setItem('last_popup_time', Date.now().toString());
        
        this.popupShown = true;
        
        // تشغيل صوت الإشعار (اختياري)
        this.playNotificationSound();
        
        // إضافة إلى قائمة الانتظار إذا كان هناك إشعارات أخرى
        this.addToQueueIfNeeded(notification);
    }

    formatMessage(message) {
        if (!message) return 'لا يوجد محتوى';
        
        // تحويل الروابط إلى روابط فعلية
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        let formattedMessage = message.replace(urlRegex, url => 
            `<a href="${url}" target="_blank" style="color: #654FD4; text-decoration: underline;">${url}</a>`
        );
        
        // إضافة فواصل سطور
        formattedMessage = formattedMessage.replace(/\n/g, '<br>');
        
        return formattedMessage;
    }

    formatPopupTime(timestamp) {
        if (!timestamp) return 'قبل قليل';
        
        try {
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
            
            return date.toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'قبل فترة';
        }
    }

    applyNotificationStyle(type) {
        const container = document.querySelector('.notification-popup-container');
        container.className = 'notification-popup-container';
        
        switch(type) {
            case 'important':
            case 'danger':
            case 'error':
                container.classList.add('notification-popup-important');
                break;
            case 'update':
            case 'success':
                container.classList.add('notification-popup-update');
                break;
            case 'warning':
                container.classList.add('notification-popup-warning');
                break;
            default:
                // النمط الافتراضي
                break;
        }
    }

    playNotificationSound() {
        try {
            // إنشاء صوت إشعار بسيط باستخدام Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            
        } catch (error) {
            console.log('ℹ️ لا يمكن تشغيل صوت الإشعار:', error);
        }
    }

    closePopup() {
        const overlay = document.getElementById('notificationPopupOverlay');
        overlay.classList.remove('show');
        
        // إعادة تمكين التمرير
        document.body.style.overflow = '';
        
        console.log('✅ تم إغلاق نافذة الإشعار');
        
        // عرض الإشعار التالي في قائمة الانتظار
        setTimeout(() => this.showNextInQueue(), 500);
    }

    markAsReadAndClose() {
        if (this.currentNotification) {
            // تحديث حالة الإشعار كمقروء
            this.markNotificationAsRead(this.currentNotification.id);
        }
        this.closePopup();
    }

    async markNotificationAsRead(notificationId) {
        try {
            // تحديث في localStorage
            const savedNotifications = localStorage.getItem('bein_notifications_fixed') || 
                                     localStorage.getItem('bein_notifications');
            
            if (savedNotifications) {
                const notifications = JSON.parse(savedNotifications);
                const updatedNotifications = notifications.map(notification => {
                    if (notification.id === notificationId) {
                        return { ...notification, isRead: true };
                    }
                    return notification;
                });
                
                localStorage.setItem('bein_notifications_fixed', JSON.stringify(updatedNotifications));
            }
            
            // تحديث في Firebase إذا كان متصلاً
            if (typeof firebase !== 'undefined') {
                try {
                    const db = firebase.firestore();
                    await db.collection('notifications').doc(notificationId).update({
                        isRead: true,
                        readAt: new Date()
                    });
                } catch (firebaseError) {
                    console.log('ℹ️ لا يمكن تحديث Firebase، قد يكون غير متصل');
                }
            }
            
            console.log(`✅ تم تحديد الإشعار ${notificationId} كمقروء`);
            
        } catch (error) {
            console.error('❌ خطأ في تحديث حالة الإشعار:', error);
        }
    }

    performAction() {
        const actionBtn = document.getElementById('notificationPopupActionBtn');
        const url = actionBtn.dataset.url;
        
        if (url) {
            window.open(url, '_blank');
        }
        
        this.markAsReadAndClose();
    }

    toggleDontShowAgain() {
        const checkbox = document.getElementById('dontShowAgain');
        this.userPreferences.showPopup = !checkbox.checked;
        this.saveUserPreferences();
        
        if (checkbox.checked) {
            console.log('🔕 تم تعطيل الإشعارات المنبثقة بناءً على طلب المستخدم');
        } else {
            console.log('🔔 تم تمكين الإشعارات المنبثقة');
        }
    }

    addToQueueIfNeeded(currentNotification) {
        // هذه الوظيفة يمكن توسيعها لإدارة قائمة انتظار للإشعارات المتعددة
        if (this.notificationQueue.length > 0) {
            console.log(`📋 ${this.notificationQueue.length} إشعار في قائمة الانتظار`);
        }
    }

    showNextInQueue() {
        if (this.notificationQueue.length > 0) {
            const nextNotification = this.notificationQueue.shift();
            this.showPopup(nextNotification);
        }
    }

    showNewNotificationIndicator(count) {
        // إزالة المؤشر السابق إذا كان موجوداً
        const oldIndicator = document.getElementById('newNotificationIndicator');
        if (oldIndicator) oldIndicator.remove();
        
        if (count > 0) {
            const indicator = document.createElement('div');
            indicator.id = 'newNotificationIndicator';
            indicator.className = 'new-notification-indicator';
            indicator.innerHTML = `
                <i class="uil uil-bell"></i>
                <span>${count} إشعار جديد</span>
            `;
            indicator.onclick = () => {
                this.showNotificationsList();
                indicator.remove();
            };
            
            document.body.appendChild(indicator);
            
            // إزالة المؤشر بعد 10 ثوانٍ
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.remove();
                }
            }, 10000);
        }
    }

    showNotificationsList() {
        // فتح قائمة الإشعارات العادية
        if (window.notificationSystem) {
            window.notificationSystem.toggleDropdown();
        } else if (window.firebaseNotifications) {
            window.firebaseNotifications.toggleDropdown();
        } else if (window.app) {
            window.app.toggleNotifications();
        }
    }

    showToastNotification(notification) {
        if (!this.userPreferences.showToasts) return;
        
        const toastContainer = document.getElementById('notificationPopupMultiple');
        const toastId = 'toast-' + Date.now();
        
        const toastHTML = `
            <div id="${toastId}" class="notification-toast" onclick="window.notificationPopup.showToastDetails('${notification.id}')">
                <div class="notification-toast-title">
                    <i class="uil uil-bell"></i> ${notification.title || 'إشعار'}
                </div>
                <div class="notification-toast-message">
                    ${notification.message.substring(0, 100)}${notification.message.length > 100 ? '...' : ''}
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('afterbegin', toastHTML);
        
        // إزالة الإشعار بعد 5 ثوانٍ
        setTimeout(() => {
            const toast = document.getElementById(toastId);
            if (toast) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100px)';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    showToastDetails(notificationId) {
        // البحث عن الإشعار وعرضه في النافذة الرئيسية
        console.log('عرض تفاصيل الإشعار:', notificationId);
    }

    // وظائف مساعدة للاستخدام من أنظمة أخرى
    showNotificationFromSystem(notification) {
        this.showPopup(notification);
    }

    getUnreadNotificationsCount() {
        try {
            const savedNotifications = localStorage.getItem('bein_notifications_fixed') || 
                                     localStorage.getItem('bein_notifications');
            if (savedNotifications) {
                const notifications = JSON.parse(savedNotifications);
                return notifications.filter(n => !n.isRead).length;
            }
            return 0;
        } catch (error) {
            return 0;
        }
    }

    clearShownNotifications() {
        localStorage.removeItem('shown_popup_notifications');
        localStorage.removeItem('last_popup_time');
        console.log('🧹 تم مسح سجل الإشعارات المعروضة');
    }

    resetPreferences() {
        this.userPreferences = {
            showPopup: true,
            showFrequency: 'always',
            showToasts: true
        };
        this.saveUserPreferences();
        console.log('🔄 تم إعادة تعيين التفضيلات إلى الإعدادات الافتراضية');
    }
}

// التهيئة التلقائية عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 جاري تحميل نظام النوافذ المنبثقة...');
    new NotificationPopupSystem();
});

// جعل الدوال متاحة عالمياً
window.closeNotificationPopup = () => {
    if (window.notificationPopup) {
        window.notificationPopup.closePopup();
    }
};

window.showNotificationPopup = (notification) => {
    if (window.notificationPopup) {
        window.notificationPopup.showPopup(notification);
    }
};

window.markNotificationAsRead = (notificationId) => {
    if (window.notificationPopup) {
        window.notificationPopup.markNotificationAsRead(notificationId);
    }
};

// اختصارات لوحة المفاتيح
document.addEventListener('keydown', function(e) {
    // Ctrl+Shift+N لفتح/إغلاق النافذة
    if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        if (window.notificationPopup) {
            if (window.notificationPopup.popupShown) {
                window.notificationPopup.closePopup();
            } else if (window.notificationPopup.currentNotification) {
                window.notificationPopup.showPopup(window.notificationPopup.currentNotification);
            }
        }
    }
    
    // Escape لإغلاق النافذة
    if (e.key === 'Escape') {
        if (window.notificationPopup && window.notificationPopup.popupShown) {
            window.notificationPopup.closePopup();
        }
    }
});