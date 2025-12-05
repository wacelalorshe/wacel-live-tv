// js/notifications.js - النسخة المحسنة والمصقولة
class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.firestoreAvailable = false;
        this.userId = this.getUserId();
        this.init();
    }

    async init() {
    console.log('🔔 بدء تشغيل نظام الإشعارات...');
    console.log('📍 عنوان الصفحة:', window.location.href);
    console.log('📍 الوقت:', new Date().toLocaleString());
    
    // التحقق من أننا في الصفحة الرئيسية
    const isHomePage = window.location.pathname === '/' || 
                      window.location.pathname === '/index.html' || 
                      window.location.pathname.endsWith('/index.html');
    
    if (!isHomePage) {
        console.log('⚠️ نحن لسنا في الصفحة الرئيسية، تخطي تهيئة الإشعارات');
        return;
    }
    
    // ... باقي الكود
}
        try {
            // 1. إعداد واجهة المستخدم
            this.setupUI();
            
            // 2. التحقق من Firebase
            await this.checkFirebase();
            
            // 3. تحميل الإشعارات
            await this.loadNotifications();
            
            // 4. تحديث العداد
            this.updateBadge();
            
            console.log('✅ تم تهيئة نظام الإشعارات بنجاح');
        } catch (error) {
            console.error('❌ خطأ في تهيئة نظام الإشعارات:', error);
        }
    }

    getUserId() {
        let userId = localStorage.getItem('notification_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('notification_user_id', userId);
        }
        return userId;
    }

    setupUI() {
        console.log('🎨 إعداد واجهة الإشعارات...');
        
        // البحث عن الهيدر
        const header = document.querySelector('header');
        if (!header) {
            console.warn('⚠️ لم يتم العثور على الهيدر');
            setTimeout(() => this.setupUI(), 500); // إعادة المحاولة
            return;
        }

        // إضافة زر الإشعارات
        const notificationBtn = document.createElement('div');
        notificationBtn.className = 'notification-btn';
        notificationBtn.innerHTML = `
            <a href="#" onclick="event.preventDefault(); window.notificationSystem.openNotificationsModal();">
                <i class="uil uil-bell"></i>
                <span id="notificationBadge" class="notification-badge" style="display: none;">0</span>
            </a>
        `;
        
        // وضع الزر في الهيدر
        const headerTitle = document.querySelector('.header-title');
        if (headerTitle) {
            headerTitle.style.position = 'relative';
            notificationBtn.style.position = 'absolute';
            notificationBtn.style.left = '20px';
            notificationBtn.style.top = '50%';
            notificationBtn.style.transform = 'translateY(-50%)';
            notificationBtn.style.zIndex = '1000';
            headerTitle.appendChild(notificationBtn);
            console.log('✅ تم إضافة زر الإشعارات');
        }

        // إضافة مودال الإشعارات
        if (!document.getElementById('notificationsModal')) {
            const modalHTML = `
                <div class="modal fade" id="notificationsModal" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header bg-dark text-white">
                                <h5 class="modal-title">
                                    <i class="uil uil-bell"></i> الإشعارات
                                    <span id="modalNotificationBadge" class="badge bg-danger ms-2">0</span>
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body bg-dark" style="max-height: 400px; overflow-y: auto;">
                                <div id="notificationsList">
                                    <div class="text-center py-5">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">جاري التحميل...</span>
                                        </div>
                                        <p class="mt-3 text-white">جاري تحميل الإشعارات...</p>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer bg-dark">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                                <button type="button" class="btn btn-danger" onclick="window.notificationSystem.markAllAsRead()">
                                    <i class="uil uil-check-circle"></i> تعليم الكل كمقروء
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            console.log('✅ تم إضافة مودال الإشعارات');
        }
    }

    async checkFirebase() {
        try {
            // التحقق من وجود Firebase SDK
            if (typeof firebase === 'undefined') {
                console.warn('⚠️ Firebase SDK غير محمل');
                return false;
            }

            // التحقق من وجود firebaseUtils
            if (typeof firebaseUtils === 'undefined') {
                console.warn('⚠️ firebaseUtils غير محمل');
                return false;
            }

            // محاولة تهيئة Firebase
            try {
                await firebaseUtils.initializeFirebase();
                this.firestoreAvailable = true;
                console.log('✅ Firebase جاهز للإشعارات');
                return true;
            } catch (error) {
                console.warn('⚠️ فشل تهيئة Firebase:', error.message);
                return false;
            }
            
        } catch (error) {
            console.error('❌ خطأ في التحقق من Firebase:', error);
            return false;
        }
    }

    async loadNotifications() {
        console.log('📥 جاري تحميل الإشعارات...');
        
        try {
            if (this.firestoreAvailable) {
                await this.loadFromFirestore();
            } else {
                await this.loadFromLocalStorage();
            }
            
            // التحقق من الإشعارات الجديدة
            this.checkForNewNotifications();
            
        } catch (error) {
            console.error('❌ فشل تحميل الإشعارات:', error);
            await this.loadFromLocalStorage();
        }
    }

    async loadFromFirestore() {
        try {
            const db = firebaseUtils.getDB();
            if (!db) {
                throw new Error('قاعدة البيانات غير متاحة');
            }
            
            // حساب تاريخ 3 أيام مضت
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            
            console.log('📡 جلب الإشعارات من Firebase...');
            
            const snapshot = await db.collection('notifications')
                .where('createdAt', '>=', threeDaysAgo)
                .where('isActive', '==', true)
                .orderBy('createdAt', 'desc')
                .get();
            
            this.notifications = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title || 'إشعار',
                    message: data.message || '',
                    link: data.link || null,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                    isActive: data.isActive !== false,
                    sentBy: data.sentBy || 'الإدارة',
                    duration: data.duration || 3
                };
            });
            
            console.log(`✅ تم تحميل ${this.notifications.length} إشعار من Firebase`);
            
            // حفظ نسخة محلية
            this.saveToLocalStorage();
            
            // إعداد الاستماع للتحديثات في الوقت الحقيقي
            this.setupRealtimeListener();
            
        } catch (error) {
            console.error('❌ فشل تحميل الإشعارات من Firebase:', error);
            throw error;
        }
    }

    setupRealtimeListener() {
        if (!this.firestoreAvailable) return;
        
        try {
            const db = firebaseUtils.getDB();
            
            // الاستماع للإشعارات الجديدة
            db.collection('notifications')
                .where('isActive', '==', true)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .onSnapshot((snapshot) => {
                    const newNotifications = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            title: data.title || 'إشعار',
                            message: data.message || '',
                            link: data.link || null,
                            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                            isActive: data.isActive !== false,
                            sentBy: data.sentBy || 'الإدارة',
                            duration: data.duration || 3
                        };
                    });
                    
                    // تحديث القائمة فقط إذا كانت هناك تغييرات
                    if (JSON.stringify(this.notifications) !== JSON.stringify(newNotifications)) {
                        this.notifications = newNotifications;
                        this.saveToLocalStorage();
                        this.checkForNewNotifications();
                        this.updateBadge();
                        
                        // تحديث القائمة إذا كانت مفتوحة
                        if (document.getElementById('notificationsModal').classList.contains('show')) {
                            this.renderNotificationsList();
                        }
                    }
                });
                
            console.log('👂 جاري الاستماع للإشعارات الجديدة...');
            
        } catch (error) {
            console.error('❌ فشل إعداد مستمع الوقت الحقيقي:', error);
        }
    }

    async loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem('bein_notifications');
            if (!stored) {
                console.log('ℹ️ لا توجد إشعارات محفوظة محلياً');
                this.notifications = [];
                return;
            }
            
            const allNotifications = JSON.parse(stored);
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            
            // تصفية الإشعارات القديمة والنشطة فقط
            this.notifications = allNotifications.filter(notif => {
                const notifDate = new Date(notif.createdAt);
                return notifDate >= threeDaysAgo && notif.isActive !== false;
            });
            
            console.log(`✅ تم تحميل ${this.notifications.length} إشعار من التخزين المحلي`);
            
        } catch (error) {
            console.error('❌ فشل تحميل الإشعارات من التخزين المحلي:', error);
            this.notifications = [];
        }
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('bein_notifications', JSON.stringify(this.notifications));
            console.log(`💾 تم حفظ ${this.notifications.length} إشعار محلياً`);
        } catch (error) {
            console.error('❌ فشل حفظ الإشعارات محلياً:', error);
        }
    }

    checkForNewNotifications() {
        // الحصول على الإشعارات المقروءة
        const readNotifications = JSON.parse(localStorage.getItem('read_notifications') || '[]');
        
        // الحصول على وقت آخر تحقق
        const lastCheckTime = localStorage.getItem('last_notification_check');
        const lastCheck = lastCheckTime ? new Date(lastCheckTime) : null;
        
        // حساب عدد الإشعارات غير المقروءة
        this.unreadCount = this.notifications.filter(notif => {
            const isUnread = !readNotifications.includes(notif.id);
            const isNew = !lastCheck || new Date(notif.createdAt) > lastCheck;
            return isUnread && isNew;
        }).length;
        
        console.log(`🔔 عدد الإشعارات الجديدة: ${this.unreadCount}`);
        
        // عرض منبثق إذا كان هناك إشعارات جديدة ولم يتم عرض منبثق خلال الساعة الماضية
        if (this.unreadCount > 0 && this.shouldShowPopup()) {
            setTimeout(() => {
                this.showNotificationPopup();
            }, 2000); // تأخير 2 ثانية لضمان تحميل الصفحة
        }
        
        // تحديث وقت آخر تحقق
        localStorage.setItem('last_notification_check', new Date().toISOString());
    }

    shouldShowPopup() {
        const lastPopupTime = localStorage.getItem('last_popup_time');
        if (!lastPopupTime) return true;
        
        const lastPopup = new Date(lastPopupTime);
        const now = new Date();
        const hoursDiff = (now - lastPopup) / (1000 * 60 * 60);
        
        return hoursDiff >= 1; // عرض منبثق كل ساعة على الأكثر
    }

    showNotificationPopup() {
        // الحصول على الإشعارات غير المقروءة
        const readNotifications = JSON.parse(localStorage.getItem('read_notifications') || '[]');
        const unreadNotifications = this.notifications.filter(notif => 
            !readNotifications.includes(notif.id)
        );
        
        if (unreadNotifications.length === 0) return;
        
        // عرض أحدث إشعار غير مقروء
        const latestNotification = unreadNotifications[0];
        
        console.log('🔄 عرض منبثق الإشعار:', latestNotification.title);
        
        // إزالة أي منبثقات سابقة
        const existingPopup = document.getElementById('notificationPopup');
        if (existingPopup) {
            existingPopup.remove();
        }
        
        const popupHTML = `
            <div class="notification-popup" id="notificationPopup">
                <div class="notification-popup-content">
                    <button class="close-popup-btn" onclick="this.parentElement.parentElement.remove(); localStorage.setItem('last_popup_time', new Date().toISOString());">
                        <i class="uil uil-times"></i>
                    </button>
                    <div class="popup-header">
                        <i class="uil uil-bell text-warning"></i>
                        <h5>إشعار جديد!</h5>
                    </div>
                    <div class="popup-body">
                        <h6>${this.escapeHtml(latestNotification.title)}</h6>
                        <p>${this.escapeHtml(latestNotification.message)}</p>
                        ${latestNotification.link ? `
                            <a href="${this.escapeHtml(latestNotification.link)}" target="_blank" class="btn btn-sm btn-primary mt-2">
                                <i class="uil uil-external-link-alt"></i> عرض التفاصيل
                            </a>
                        ` : ''}
                    </div>
                    <div class="popup-footer">
                        <small>${this.formatDate(latestNotification.createdAt)}</small>
                        <div>
                            <button class="btn btn-sm btn-success" onclick="window.notificationSystem.markAsRead('${latestNotification.id}'); document.getElementById('notificationPopup').remove(); localStorage.setItem('last_popup_time', new Date().toISOString());">
                                <i class="uil uil-check-circle"></i> تمت القراءة
                            </button>
                            <button class="btn btn-sm btn-info ms-2" onclick="window.notificationSystem.openNotificationsModal(); document.getElementById('notificationPopup').remove(); localStorage.setItem('last_popup_time', new Date().toISOString());">
                                <i class="uil uil-list-ui-alt"></i> عرض الكل
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', popupHTML);
        localStorage.setItem('last_popup_time', new Date().toISOString());
        
        // إزالة المنبثق تلقائياً بعد 15 ثانية
        setTimeout(() => {
            const popup = document.getElementById('notificationPopup');
            if (popup) popup.remove();
        }, 15000);
    }

    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    updateBadge() {
        // حساب الإشعارات غير المقروءة
        const readNotifications = JSON.parse(localStorage.getItem('read_notifications') || '[]');
        const unreadCount = this.notifications.filter(notif => 
            !readNotifications.includes(notif.id)
        ).length;
        
        console.log(`🔄 تحديث العداد: ${unreadCount} إشعار غير مقروء`);
        
        // تحديث شارة الإشعارات
        const badge = document.getElementById('notificationBadge');
        const modalBadge = document.getElementById('modalNotificationBadge');
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display = 'inline-block';
                badge.classList.add('pulse');
            } else {
                badge.style.display = 'none';
                badge.classList.remove('pulse');
            }
        }
        
        if (modalBadge) {
            modalBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        }
    }

    openNotificationsModal() {
        console.log('📋 فتح قائمة الإشعارات...');
        this.renderNotificationsList();
        const modal = new bootstrap.Modal(document.getElementById('notificationsModal'));
        modal.show();
    }

    renderNotificationsList() {
        const container = document.getElementById('notificationsList');
        if (!container) return;
        
        // الحصول على الإشعارات المقروءة
        const readNotifications = JSON.parse(localStorage.getItem('read_notifications') || '[]');
        
        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="uil uil-bell-slash" style="font-size: 60px; color: #6c757d;"></i>
                    <h5 class="mt-3 text-white">لا توجد إشعارات</h5>
                    <p class="text-muted">لم يتم إرسال أي إشعارات خلال آخر 3 أيام</p>
                </div>
            `;
            return;
        }
        
        // ترتيب الإشعارات من الأحدث إلى الأقدم
        const sortedNotifications = [...this.notifications].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        container.innerHTML = sortedNotifications.map(notif => {
            const isRead = readNotifications.includes(notif.id);
            
            return `
                <div class="notification-item ${isRead ? 'read' : 'unread'}" 
                     onclick="window.notificationSystem.markAsRead('${notif.id}')">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center mb-2">
                                ${isRead ? 
                                    '<i class="uil uil-bell text-muted me-2"></i>' : 
                                    '<i class="uil uil-bell text-warning me-2"></i>'
                                }
                                <h6 class="mb-0 ${isRead ? 'text-muted' : 'text-white'}">
                                    ${this.escapeHtml(notif.title)}
                                </h6>
                                ${!isRead ? '<span class="badge bg-danger ms-2">جديد</span>' : ''}
                            </div>
                            <p class="mb-2 ${isRead ? 'text-muted' : 'text-light'}">
                                ${this.escapeHtml(notif.message)}
                            </p>
                            ${notif.link ? `
                                <a href="${this.escapeHtml(notif.link)}" target="_blank" class="btn btn-sm btn-primary mb-2">
                                    <i class="uil uil-external-link-alt"></i> عرض التفاصيل
                                </a>
                            ` : ''}
                            <div class="mt-2">
                                <small class="text-muted">
                                    <i class="uil uil-user"></i> ${this.escapeHtml(notif.sentBy)}
                                </small>
                                <small class="text-muted mx-2">•</small>
                                <small class="text-muted">
                                    <i class="uil uil-calendar-alt"></i> ${this.formatDate(notif.createdAt)}
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
                ${sortedNotifications.indexOf(notif) < sortedNotifications.length - 1 ? '<hr class="my-3 border-secondary">' : ''}
            `;
        }).join('');
    }

    markAsRead(notificationId) {
        let readNotifications = JSON.parse(localStorage.getItem('read_notifications') || '[]');
        if (!readNotifications.includes(notificationId)) {
            readNotifications.push(notificationId);
            localStorage.setItem('read_notifications', JSON.stringify(readNotifications));
            this.updateBadge();
            
            // تحديث واجهة المستخدم
            const item = document.querySelector(`[onclick*="${notificationId}"]`);
            if (item) {
                item.classList.remove('unread');
                item.classList.add('read');
                
                // تحديث الألوان
                const title = item.querySelector('h6');
                const text = item.querySelector('p');
                const icon = item.querySelector('i.uil-bell');
                const badge = item.querySelector('.badge.bg-danger');
                
                if (title) {
                    title.classList.remove('text-white');
                    title.classList.add('text-muted');
                }
                
                if (text) {
                    text.classList.remove('text-light');
                    text.classList.add('text-muted');
                }
                
                if (icon) {
                    icon.classList.remove('text-warning');
                    icon.classList.add('text-muted');
                }
                
                if (badge) {
                    badge.remove();
                }
            }
        }
    }

    markAllAsRead() {
        const readNotifications = this.notifications.map(notif => notif.id);
        localStorage.setItem('read_notifications', JSON.stringify(readNotifications));
        this.updateBadge();
        this.renderNotificationsList();
        this.showToast('تم تعليم جميع الإشعارات كمقروءة', 'success');
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            
            if (diffHours < 1) {
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                return `قبل ${diffMinutes} دقيقة`;
            } else if (diffHours < 24) {
                return `قبل ${diffHours} ساعة`;
            } else {
                const diffDays = Math.floor(diffHours / 24);
                return `قبل ${diffDays} يوم`;
            }
        } catch (error) {
            return 'تاريخ غير معروف';
        }
    }

    showToast(message, type = 'info') {
        const toastId = 'toast-' + Date.now();
        const toastHTML = `
            <div id="${toastId}" class="toast align-items-center text-bg-${type} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', toastHTML);
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
        toast.show();
        
        // إزالة العنصر بعد الاختفاء
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }
}

// تهيئة النظام مع تأخير لضمان تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 الصفحة الرئيسية محملة، جاري تهيئة الإشعارات...');
    
    // تأخير 1 ثانية لضمان تحميل جميع العناصر
    setTimeout(() => {
        if (!window.notificationSystem) {
            window.notificationSystem = new NotificationSystem();
            console.log('✅ تم إنشاء نظام الإشعارات');
        }
    }, 1000);
});

// السماح بإعادة التحميل من وحدة التحكم
window.reloadNotifications = function() {
    if (window.notificationSystem) {
        window.notificationSystem.loadNotifications();
        console.log('🔄 إعادة تحميل الإشعارات...');
    }
};
