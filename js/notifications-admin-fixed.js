// js/notifications-admin-fixed.js
// نظام إدارة الإشعارات المصلح

class NotificationsAdminFixed {
    constructor() {
        this.notifications = [];
        this.filteredNotifications = [];
        this.selectedNotifications = new Set();
        this.db = null;
        this.init();
    }

    async init() {
        console.log('🛠️ تهيئة نظام إدارة الإشعارات...');
        
        // تهيئة Firebase
        await this.initializeFirebase();
        
        // تحميل الإشعارات
        await this.loadNotifications();
        
        // إضافة معالجات الأحداث
        this.setupEventListeners();
        
        console.log('✅ نظام إدارة الإشعارات جاهز');
    }

    async initializeFirebase() {
        try {
            console.log('🔥 محاولة تهيئة Firebase...');
            
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK غير محمل');
            }
            
            // تكوين Firebase - نفس التكوين في كل مكان
            const firebaseConfig = {
                apiKey: "AIzaSyAkgEiYYlmpMe0NLewulheovlTQMz5C980",
                authDomain: "bein-42f9e.firebaseapp.com",
                projectId: "bein-42f9e",
                storageBucket: "bein-42f9e.firebasestorage.app",
                messagingSenderId: "143741167050",
                appId: "1:143741167050:web:922d3a0cddb40f67b21b33",
                measurementId: "G-JH198SKCFS"
            };
            
            // استخدام اسم فريد للتطبيق لتجنب التعارض
            let app;
            try {
                app = firebase.initializeApp(firebaseConfig, 'NotificationsAdminApp');
                console.log('✅ تم تهيئة Firebase بنجاح مع اسم فريد');
            } catch (initError) {
                // إذا كان التطبيق مهيأ بالفعل
                app = firebase.app('NotificationsAdminApp') || firebase.apps[0];
                console.log('✅ Firebase مهيأ بالفعل');
            }
            
            // تهيئة Firestore
            this.db = firebase.firestore(app);
            
            // إعدادات إضافية
            this.db.settings({
                ignoreUndefinedProperties: true
            });
            
            console.log('✅ Firestore جاهز للاستخدام');
            return true;
            
        } catch (error) {
            console.error('❌ فشل تهيئة Firebase:', error.message);
            this.showAlert('فشل الاتصال بقاعدة البيانات: ' + error.message, 'error');
            return false;
        }
    }

    async loadNotifications() {
        try {
            console.log('📡 جاري جلب الإشعارات...');
            
            if (!this.db) {
                throw new Error('Firestore غير مهيأ');
            }
            
            // إظهار حالة التحميل
            this.showLoading();
            
            // جلب جميع الإشعارات
            const snapshot = await this.db.collection('notifications')
                .orderBy('createdAt', 'desc')
                .limit(100)
                .get();
            
            console.log(`📊 عدد الإشعارات المستردة: ${snapshot.size}`);
            
            if (snapshot.empty) {
                this.notifications = [];
                this.filteredNotifications = [];
                this.renderNotifications();
                this.showAlert('لا توجد إشعارات في قاعدة البيانات', 'info');
                return;
            }
            
            // تحويل البيانات
            this.notifications = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title || 'بدون عنوان',
                    message: data.message || '',
                    type: data.type || 'info',
                    isActive: data.isActive !== false,
                    isRead: data.isRead || false,
                    isImportant: data.isImportant || false,
                    actionUrl: data.actionUrl || null,
                    createdAt: data.createdAt || new Date(),
                    expiryDate: data.expiryDate || null,
                    createdBy: data.createdBy || 'admin'
                };
            });
            
            this.filteredNotifications = [...this.notifications];
            
            console.log(`✅ تم تحميل ${this.notifications.length} إشعار`);
            this.renderNotifications();
            
        } catch (error) {
            console.error('❌ فشل تحميل الإشعارات:', error.message);
            this.showAlert('فشل تحميل الإشعارات: ' + error.message, 'error');
        }
    }

    showLoading() {
        const container = document.getElementById('notificationsList');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">جاري التحميل...</span>
                    </div>
                    <p class="mt-3 text-muted">جاري تحميل الإشعارات...</p>
                </div>
            `;
        }
    }

    renderNotifications() {
        const container = document.getElementById('notificationsList');
        const countElement = document.getElementById('notificationsCount');
        
        if (!container) return;
        
        if (this.filteredNotifications.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="uil uil-bell-slash" style="font-size: 80px; color: #6c757d;"></i>
                    <h5 class="mt-3 text-muted">لا توجد إشعارات</h5>
                    <button class="btn btn-sm btn-primary mt-2" onclick="window.notificationsAdmin.loadNotifications()">
                        <i class="uil uil-refresh"></i> إعادة تحميل
                    </button>
                </div>
            `;
            
            if (countElement) {
                countElement.textContent = '0';
            }
            return;
        }
        
        container.innerHTML = this.filteredNotifications.map(notification => {
            const createdAt = notification.createdAt?.toDate ? 
                notification.createdAt.toDate() : new Date(notification.createdAt);
            const expiryDate = notification.expiryDate?.toDate ? 
                notification.expiryDate.toDate() : new Date(notification.expiryDate);
            
            const isExpired = expiryDate && expiryDate < new Date();
            const isActive = notification.isActive && !isExpired;
            const isSelected = this.selectedNotifications.has(notification.id);
            const isUnread = !notification.isRead;
            
            return `
            <div class="notification-item-admin ${isActive ? 'active' : 'inactive'} ${isSelected ? 'selected' : ''}">
                <div class="d-flex">
                    <div class="me-3">
                        <input class="form-check-input notification-checkbox" 
                               type="checkbox" 
                               value="${notification.id}"
                               ${isSelected ? 'checked' : ''}
                               onchange="window.notificationsAdmin.toggleSelection('${notification.id}')">
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <h5 class="text-white mb-1">
                                    ${notification.title}
                                    ${notification.isImportant ? '<span class="badge bg-danger ms-2">مهم</span>' : ''}
                                    <span class="badge ${isActive ? 'bg-success' : 'bg-secondary'} ms-2">
                                        ${isActive ? 'نشط' : 'غير نشط'}
                                    </span>
                                    ${isExpired ? '<span class="badge bg-warning ms-2">منتهي</span>' : ''}
                                    ${isUnread ? '<span class="badge bg-info ms-2">غير مقروء</span>' : ''}
                                </h5>
                                <p class="text-muted mb-2">${notification.message}</p>
                                <div class="notification-meta">
                                    <small class="text-info">
                                        <i class="uil uil-calendar-alt"></i> 
                                        ${createdAt.toLocaleString('ar-SA')}
                                    </small>
                                    ${notification.type ? `
                                        <span class="mx-2">•</span>
                                        <small class="badge bg-info">${notification.type}</small>
                                    ` : ''}
                                    ${notification.actionUrl ? `
                                        <span class="mx-2">•</span>
                                        <small class="text-primary">
                                            <i class="uil uil-link"></i> رابط
                                        </small>
                                    ` : ''}
                                </div>
                                ${expiryDate ? `
                                    <small class="text-warning d-block mt-1">
                                        <i class="uil uil-clock"></i> 
                                        ينتهي في: ${expiryDate.toLocaleString('ar-SA')}
                                    </small>
                                ` : ''}
                            </div>
                            <div class="action-buttons">
                                <button class="btn btn-sm ${isActive ? 'btn-warning' : 'btn-success'}" 
                                        onclick="window.notificationsAdmin.toggleStatus('${notification.id}', ${!isActive})">
                                    <i class="uil uil-power"></i> ${isActive ? 'تعطيل' : 'تفعيل'}
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="window.notificationsAdmin.deleteSingle('${notification.id}')">
                                    <i class="uil uil-trash-alt"></i> حذف
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');
        
        if (countElement) {
            countElement.textContent = this.filteredNotifications.length;
        }
        
        this.updateSelectionUI();
    }

    async sendNotification() {
        try {
            console.log('📨 محاولة إرسال إشعار جديد...');
            
            const title = document.getElementById('notificationTitle').value.trim();
            const message = document.getElementById('notificationMessage').value.trim();
            
            if (!title || !message) {
                this.showAlert('يرجى ملء العنوان والرسالة', 'warning');
                return;
            }
            
            if (!this.db) {
                throw new Error('Firestore غير مهيأ');
            }
            
            // جمع بيانات الإشعار
            const notificationData = {
                title: title,
                message: message,
                type: document.getElementById('notificationType').value,
                actionUrl: document.getElementById('notificationActionUrl').value.trim() || null,
                isActive: document.getElementById('sendImmediately').checked,
                isRead: false,
                isImportant: document.getElementById('isImportant').checked,
                createdAt: new Date(),
                createdBy: localStorage.getItem('adminEmail') || 'admin'
            };
            
            // إضافة تاريخ انتهاء إذا كان موجوداً
            const expiryDate = document.getElementById('notificationExpiry').value;
            if (expiryDate) {
                notificationData.expiryDate = new Date(expiryDate);
            }
            
            console.log('بيانات الإشعار:', notificationData);
            
            // إرسال إلى Firebase
            const docRef = await this.db.collection('notifications').add(notificationData);
            console.log('✅ تم إنشاء الإشعار مع ID:', docRef.id);
            
            // إعادة تعيين النموذج
            document.getElementById('notificationForm').reset();
            
            // إعادة تحميل القائمة
            await this.loadNotifications();
            
            this.showAlert('تم إرسال الإشعار بنجاح', 'success');
            
        } catch (error) {
            console.error('❌ فشل إرسال الإشعار:', error.message);
            console.error('تفاصيل الخطأ:', error);
            this.showAlert('فشل إرسال الإشعار: ' + error.message, 'error');
        }
    }

    async deleteAllNotifications() {
        try {
            if (!confirm('⚠️ تحذير: هل أنت متأكد من حذف جميع الإشعارات؟\n\nهذا الإجراء لا يمكن التراجع عنه.')) {
                return;
            }
            
            const password = prompt('للتأكيد، أدخل كلمة "نعم أحذف":');
            if (password !== 'نعم أحذف') {
                this.showAlert('تم إلغاء عملية الحذف', 'warning');
                return;
            }
            
            this.showAlert('جاري حذف جميع الإشعارات...', 'info');
            
            if (!this.db) {
                throw new Error('Firestore غير مهيأ');
            }
            
            // جلب جميع الإشعارات
            const snapshot = await this.db.collection('notifications').get();
            
            if (snapshot.empty) {
                this.showAlert('لا توجد إشعارات لحذفها', 'info');
                return;
            }
            
            console.log(`🗑️ جاري حذف ${snapshot.size} إشعار...`);
            
            // استخدام batch للحذف
            const batch = this.db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            
            // تحديث القائمة
            this.notifications = [];
            this.filteredNotifications = [];
            this.selectedNotifications.clear();
            this.renderNotifications();
            
            this.showAlert(`✅ تم حذف ${snapshot.size} إشعار بنجاح`, 'success');
            
        } catch (error) {
            console.error('❌ فشل حذف جميع الإشعارات:', error.message);
            this.showAlert('فشل حذف الإشعارات: ' + error.message, 'error');
        }
    }

    async deleteSingle(notificationId) {
        try {
            if (!confirm('هل أنت متأكد من حذف هذا الإشعار؟')) {
                return;
            }
            
            if (!this.db) {
                throw new Error('Firestore غير مهيأ');
            }
            
            await this.db.collection('notifications').doc(notificationId).delete();
            
            // إعادة تحميل القائمة
            await this.loadNotifications();
            
            this.showAlert('تم حذف الإشعار بنجاح', 'success');
            
        } catch (error) {
            console.error('❌ فشل حذف الإشعار:', error.message);
            this.showAlert('فشل حذف الإشعار: ' + error.message, 'error');
        }
    }

    async toggleStatus(notificationId, newStatus) {
        try {
            if (!this.db) {
                throw new Error('Firestore غير مهيأ');
            }
            
            await this.db.collection('notifications').doc(notificationId).update({
                isActive: newStatus,
                updatedAt: new Date()
            });
            
            // إعادة تحميل القائمة
            await this.loadNotifications();
            
            this.showAlert(`تم ${newStatus ? 'تفعيل' : 'تعطيل'} الإشعار`, 'success');
            
        } catch (error) {
            console.error('❌ فشل تغيير حالة الإشعار:', error.message);
            this.showAlert('فشل تغيير حالة الإشعار: ' + error.message, 'error');
        }
    }

    // وظائف إدارة التحديد
    toggleSelection(notificationId) {
        if (this.selectedNotifications.has(notificationId)) {
            this.selectedNotifications.delete(notificationId);
        } else {
            this.selectedNotifications.add(notificationId);
        }
        this.updateSelectionUI();
    }

    toggleSelectAll() {
        const selectAllCheckbox = document.getElementById('selectAllNotifications');
        const checkboxes = document.querySelectorAll('.notification-checkbox');
        
        if (selectAllCheckbox.checked) {
            this.filteredNotifications.forEach(notif => {
                this.selectedNotifications.add(notif.id);
            });
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
        } else {
            this.selectedNotifications.clear();
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        }
        
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        const selectAllCheckbox = document.getElementById('selectAllNotifications');
        
        if (deleteSelectedBtn) {
            if (this.selectedNotifications.size > 0) {
                deleteSelectedBtn.disabled = false;
                deleteSelectedBtn.textContent = `حذف المحدد (${this.selectedNotifications.size})`;
            } else {
                deleteSelectedBtn.disabled = true;
                deleteSelectedBtn.textContent = 'حذف المحدد';
            }
        }
        
        if (selectAllCheckbox && this.filteredNotifications.length > 0) {
            if (this.selectedNotifications.size === this.filteredNotifications.length) {
                selectAllCheckbox.checked = true;
                selectAllCheckbox.indeterminate = false;
            } else if (this.selectedNotifications.size > 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = true;
            } else {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            }
        }
    }

    async deleteSelectedNotifications() {
        try {
            const selectedCount = this.selectedNotifications.size;
            
            if (selectedCount === 0) {
                this.showAlert('لم يتم تحديد أي إشعارات', 'warning');
                return;
            }
            
            if (!confirm(`هل تريد حذف ${selectedCount} إشعار محدد؟`)) {
                return;
            }
            
            this.showAlert(`جاري حذف ${selectedCount} إشعار...`, 'info');
            
            if (!this.db) {
                throw new Error('Firestore غير مهيأ');
            }
            
            const batch = this.db.batch();
            this.selectedNotifications.forEach(id => {
                const ref = this.db.collection('notifications').doc(id);
                batch.delete(ref);
            });
            
            await batch.commit();
            
            // إعادة تحميل
            this.selectedNotifications.clear();
            await this.loadNotifications();
            
            this.showAlert(`✅ تم حذف ${selectedCount} إشعار بنجاح`, 'success');
            
        } catch (error) {
            console.error('❌ فشل حذف الإشعارات المحددة:', error.message);
            this.showAlert('فشل حذف الإشعارات المحددة: ' + error.message, 'error');
        }
    }

    filterNotifications() {
        const searchTerm = document.getElementById('notificationsSearch').value.toLowerCase();
        const filterType = document.getElementById('notificationsFilter').value;
        const now = new Date();
        
        this.filteredNotifications = this.notifications.filter(notification => {
            // البحث النصي
            const matchesSearch = searchTerm === '' || 
                notification.title.toLowerCase().includes(searchTerm) ||
                notification.message.toLowerCase().includes(searchTerm);
            
            if (!matchesSearch) return false;
            
            // التصفية حسب النوع
            const expiryDate = notification.expiryDate?.toDate ? 
                notification.expiryDate.toDate() : new Date(notification.expiryDate);
            const isExpired = expiryDate && expiryDate < now;
            
            switch (filterType) {
                case 'active':
                    return notification.isActive && !isExpired;
                case 'expired':
                    return isExpired;
                case 'important':
                    return notification.isImportant;
                case 'unread':
                    return !notification.isRead;
                default:
                    return true;
            }
        });
        
        this.renderNotifications();
    }

    setupEventListeners() {
        // معالج لإرسال النموذج
        const form = document.getElementById('notificationForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendNotification();
            });
        }
        
        // معالجات البحث والتصفية
        const searchInput = document.getElementById('notificationsSearch');
        const filterSelect = document.getElementById('notificationsFilter');
        
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterNotifications());
        }
        
        if (filterSelect) {
            filterSelect.addEventListener('change', () => this.filterNotifications());
        }
    }

    showAlert(message, type) {
        // إزالة أي تنبيهات قديمة
        const oldAlerts = document.querySelectorAll('.alert-dismissible');
        oldAlerts.forEach(alert => alert.remove());
        
        // إنشاء تنبيه جديد
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-3`;
        alertDiv.innerHTML = `
            <i class="uil uil-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.admin-container');
        if (container) {
            container.insertBefore(alertDiv, container.firstChild);
        }
        
        // إزالة التنبيه بعد 5 ثوانٍ
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 صفحة إدارة الإشعارات محملة');
    window.notificationsAdmin = new NotificationsAdminFixed();
});