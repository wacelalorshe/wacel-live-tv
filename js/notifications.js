// js/notifications.js
class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.firestoreAvailable = false;
        this.userId = this.getUserId();
        this.init();
    }

    init() {
        console.log('🔔 تهيئة نظام الإشعارات...');
        this.setupUI();
        this.checkFirebase();
        this.loadNotifications();
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
        // إضافة زر الإشعارات في الهيدر
        const header = document.querySelector('header');
        if (header) {
            const notificationBtn = document.createElement('div');
            notificationBtn.className = 'notification-btn';
            notificationBtn.innerHTML = `
                <a href="#" onclick="window.notificationSystem.openNotificationsModal(); return false;">
                    <i class="uil uil-bell"></i>
                    <span id="notificationBadge" class="notification-badge" style="display: none;">0</span>
                </a>
            `;
            
            // إضافة زر الإشعارات بجانب العنوان
            const headerTitle = document.querySelector('.header-title');
            if (headerTitle) {
                headerTitle.style.position = 'relative';
                notificationBtn.style.position = 'absolute';
                notificationBtn.style.left = '20px';
                notificationBtn.style.top = '50%';
                notificationBtn.style.transform = 'translateY(-50%)';
                headerTitle.appendChild(notificationBtn);
            }
        }

        // إضافة مودال الإشعارات
        const modalHTML = `
            <div class="modal fade" id="notificationsModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="uil uil-bell"></i> الإشعارات
                                <span id="modalNotificationBadge" class="badge bg-danger ms-2">0</span>
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div id="notificationsList">
                                <div class="text-center py-3">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">جاري التحميل...</span>
                                    </div>
                                    <p class="mt-2">جاري تحميل الإشعارات...</p>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
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
    }

    async checkFirebase() {
        try {
            if (typeof firebase !== 'undefined' && typeof firebaseUtils !== 'undefined') {
                await firebaseUtils.initializeFirebase();
                this.firestoreAvailable = true;
            }
        } catch (error) {
            console.warn('⚠️ Firebase غير متاح للإشعارات:', error);
        }
    }

    async loadNotifications() {
        try {
            if (this.firestoreAvailable) {
                await this.loadFromFirestore();
            } else {
                this.loadFromLocalStorage();
            }
            
            this.checkForNewNotifications();
            this.updateBadge();
        } catch (error) {
            console.error('❌ خطأ في تحميل الإشعارات:', error);
        }
    }

    async loadFromFirestore() {
        try {
            const db = firebaseUtils.getDB();
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            
            const snapshot = await db.collection('notifications')
                .where('createdAt', '>=', threeDaysAgo)
                .orderBy('createdAt', 'desc')
                .get();
            
            this.notifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            this.saveToLocalStorage();
            
        } catch (error) {
            console.warn('⚠️ فشل تحميل الإشعارات من Firebase:', error);
            this.loadFromLocalStorage();
        }
    }

    loadFromLocalStorage() {
        const stored = localStorage.getItem('bein_notifications');
        if (stored) {
            const allNotifications = JSON.parse(stored);
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            
            this.notifications = allNotifications.filter(notif => 
                new Date(notif.createdAt) >= threeDaysAgo
            );
        }
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('bein_notifications', JSON.stringify(this.notifications));
        } catch (error) {
            console.error('❌ خطأ في حفظ الإشعارات محلياً:', error);
        }
    }

    checkForNewNotifications() {
        const readNotifications = JSON.parse(localStorage.getItem('read_notifications') || '[]');
        const lastCheck = localStorage.getItem('last_notification_check');
        
        this.unreadCount = this.notifications.filter(notif => {
            // التحقق إذا كانت الإشعار جديدة (أحدث من آخر تحقق) أو غير مقروءة
            return !readNotifications.includes(notif.id) && 
                   (!lastCheck || new Date(notif.createdAt) > new Date(lastCheck));
        }).length;
        
        // إذا كان هناك إشعارات جديدة، اعرض منبثق واحد فقط
        if (this.unreadCount > 0 && !this.hasShownPopup()) {
            this.showNotificationPopup();
        }
        
        // تحديث وقت آخر تحقق
        localStorage.setItem('last_notification_check', new Date().toISOString());
    }

    hasShownPopup() {
        const lastPopupTime = localStorage.getItem('last_popup_time');
        if (!lastPopupTime) return false;
        
        const hoursSinceLastPopup = (new Date() - new Date(lastPopupTime)) / (1000 * 60 * 60);
        return hoursSinceLastPopup < 1; // لا تعرض منبثق جديد قبل ساعة
    }

    showNotificationPopup() {
        const unreadNotifications = this.getUnreadNotifications();
        if (unreadNotifications.length === 0) return;
        
        // عرض إشعار واحد فقط (الأحدث)
        const latestNotification = unreadNotifications[0];
        
        const popupHTML = `
            <div class="notification-popup" id="notificationPopup">
                <div class="notification-popup-content">
                    <button class="close-btn" onclick="this.parentElement.parentElement.remove(); localStorage.setItem('last_popup_time', new Date().toISOString());">
                        <i class="uil uil-times"></i>
                    </button>
                    <div class="notification-popup-header">
                        <i class="uil uil-bell text-warning"></i>
                        <strong>إشعار جديد!</strong>
                    </div>
                    <div class="notification-popup-body">
                        <h6>${latestNotification.title || 'إشعار جديد'}</h6>
                        <p>${latestNotification.message || ''}</p>
                        ${latestNotification.link ? `
                            <a href="${latestNotification.link}" target="_blank" class="btn btn-sm btn-primary mt-2">
                                عرض المزيد
                            </a>
                        ` : ''}
                    </div>
                    <div class="notification-popup-footer">
                        <small>${this.formatDate(latestNotification.createdAt)}</small>
                        <button class="btn btn-sm btn-success" onclick="window.notificationSystem.markAsRead('${latestNotification.id}'); document.getElementById('notificationPopup').remove(); localStorage.setItem('last_popup_time', new Date().toISOString());">
                            تمت القراءة
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', popupHTML);
        localStorage.setItem('last_popup_time', new Date().toISOString());
        
        // إزالة البوب أب تلقائياً بعد 10 ثوانٍ
        setTimeout(() => {
            const popup = document.getElementById('notificationPopup');
            if (popup) popup.remove();
        }, 10000);
    }

    getUnreadNotifications() {
        const readNotifications = JSON.parse(localStorage.getItem('read_notifications') || '[]');
        return this.notifications.filter(notif => !readNotifications.includes(notif.id));
    }

    updateBadge() {
        const badge = document.getElementById('notificationBadge');
        const modalBadge = document.getElementById('modalNotificationBadge');
        const unreadCount = this.getUnreadNotifications().length;
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
        
        if (modalBadge) {
            modalBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        }
    }

    openNotificationsModal() {
        this.renderNotificationsList();
        const modal = new bootstrap.Modal(document.getElementById('notificationsModal'));
        modal.show();
    }

    renderNotificationsList() {
        const container = document.getElementById('notificationsList');
        if (!container) return;
        
        const readNotifications = JSON.parse(localStorage.getItem('read_notifications') || '[]');
        
        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="uil uil-bell-slash" style="font-size: 60px; color: #6c757d;"></i>
                    <h5 class="mt-3 text-muted">لا توجد إشعارات</h5>
                    <p>لم يتم إرسال أي إشعارات خلال آخر 3 أيام</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.notifications.map(notif => {
            const isRead = readNotifications.includes(notif.id);
            
            return `
                <div class="notification-item ${isRead ? 'read' : 'unread'}" 
                     onclick="window.notificationSystem.markAsRead('${notif.id}')">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center mb-1">
                                ${isRead ? 
                                    '<i class="uil uil-bell text-muted me-2"></i>' : 
                                    '<i class="uil uil-bell text-warning me-2"></i>'
                                }
                                <h6 class="mb-0 ${isRead ? 'text-muted' : 'text-white'}">
                                    ${notif.title || 'إشعار'}
                                </h6>
                                ${!isRead ? '<span class="badge bg-danger ms-2">جديد</span>' : ''}
                            </div>
                            <p class="mb-1 ${isRead ? 'text-muted' : 'text-light'}">
                                ${notif.message || ''}
                            </p>
                            ${notif.link ? `
                                <a href="${notif.link}" target="_blank" class="btn btn-sm btn-primary">
                                    <i class="uil uil-external-link-alt"></i> عرض التفاصيل
                                </a>
                            ` : ''}
                        </div>
                        <div class="text-muted" style="font-size: 12px;">
                            ${this.formatDate(notif.createdAt)}
                        </div>
                    </div>
                </div>
                ${this.notifications.indexOf(notif) < this.notifications.length - 1 ? '<hr class="my-2">' : ''}
            `;
        }).join('');
    }

    markAsRead(notificationId) {
        let readNotifications = JSON.parse(localStorage.getItem('read_notifications') || '[]');
        if (!readNotifications.includes(notificationId)) {
            readNotifications.push(notificationId);
            localStorage.setItem('read_notifications', JSON.stringify(readNotifications));
            this.updateBadge();
            
            // تحديث العنصر في القائمة
            const item = document.querySelector(`.notification-item[onclick*="${notificationId}"]`);
            if (item) {
                item.classList.remove('unread');
                item.classList.add('read');
                item.querySelector('h6').classList.remove('text-white');
                item.querySelector('h6').classList.add('text-muted');
                item.querySelector('p').classList.remove('text-light');
                item.querySelector('p').classList.add('text-muted');
                
                // إزالة شارة "جديد"
                const newBadge = item.querySelector('.badge.bg-danger');
                if (newBadge) newBadge.remove();
                
                // تغيير الأيقونة
                const icon = item.querySelector('i.uil-bell');
                if (icon) {
                    icon.classList.remove('text-warning');
                    icon.classList.add('text-muted');
                }
            }
        }
    }

    markAllAsRead() {
        const readNotifications = this.notifications.map(notif => notif.id);
        localStorage.setItem('read_notifications', JSON.stringify(readNotifications));
        this.updateBadge();
        this.renderNotificationsList();
        this.showAlert('تم تعليم جميع الإشعارات كمقروءة', 'success');
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        
        if (diffHours < 1) {
            return 'قبل قليل';
        } else if (diffHours < 24) {
            return `قبل ${diffHours} ساعة`;
        } else {
            return date.toLocaleDateString('ar-AR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const modalBody = document.querySelector('#notificationsModal .modal-body');
        if (modalBody) {
            modalBody.insertBefore(alertDiv, modalBody.firstChild);
        }
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }
}

// تهيئة النظام
document.addEventListener('DOMContentLoaded', () => {
    window.notificationSystem = new NotificationSystem();
});