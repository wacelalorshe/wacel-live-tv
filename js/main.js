// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAkgEiYYlmpMe0NLewulheovlTQMz5C980",
    authDomain: "bein-42f9e.firebaseapp.com",
    projectId: "bein-42f9e",
    storageBucket: "bein-42f9e.firebasestorage.app",
    messagingSenderId: "143741167050",
    appId: "1:143741167050:web:922d3a0cddb40f67b21b33",
    measurementId: "G-JH198SKCFS"
};

// تطبيق Bein Sport - الصفحة الرئيسية
class BeinSportApp {
    constructor() {
        this.sections = [];
        this.channels = [];
        this.notifications = [];
        this.unreadCount = 0;
        this.firebaseInitialized = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.init();
    }

    async init() {
        console.log('🚀 بدء تشغيل تطبيق Bein Sport...');
        
        // تعيين السنة الحالية
        document.getElementById('currentYear').textContent = new Date().getFullYear();
        
        // تحميل البيانات تلقائياً
        await this.loadData();
        
        // تحميل الإشعارات
        await this.loadNotifications();
        
        // التحقق من الإشعارات الجديدة كل 5 دقائق
        setInterval(() => this.checkForNewNotifications(), 300000);
        
        // التحقق الأولي بعد 10 ثوانٍ
        setTimeout(() => this.checkForNewNotifications(), 10000);
        
        console.log('✅ تم تهيئة التطبيق والإشعارات بنجاح');
    }

    async loadData() {
        console.log('📥 جاري تحميل البيانات...');
        
        // عرض حالة التحميل
        this.showLoading();
        
        try {
            // المحاولة الأولى: من Firebase
            try {
                await this.loadFromFirebase();
                console.log('✅ تم تحميل البيانات من Firebase');
                this.showSuccessMessage('تم تحميل البيانات بنجاح');
                return;
            } catch (firebaseError) {
                console.warn('⚠️ فشل تحميل Firebase:', firebaseError.message);
                
                // إذا فشل Firebase، حاول استخدام localStorage تلقائياً
                try {
                    await this.loadFromLocalStorage();
                    console.log('✅ تم تحميل البيانات من localStorage');
                    this.showInfoMessage('تم تحميل البيانات المحلية');
                    return;
                } catch (localStorageError) {
                    console.warn('⚠️ فشل تحميل localStorage:', localStorageError.message);
                    
                    // إذا فشل localStorage، استخدم البيانات الافتراضية تلقائياً
                    this.loadDefaultData();
                    console.log('✅ تم تحميل البيانات الافتراضية');
                    this.showWarningMessage('تم تحميل البيانات الافتراضية. تحقق من اتصال الإنترنت.');
                }
            }
            
        } catch (error) {
            console.error('❌ خطأ غير متوقع:', error);
            // في حالة حدوث خطأ غير متوقع، استخدم البيانات الافتراضية
            this.loadDefaultData();
        }
    }

    async loadFromFirebase() {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('📡 جاري جلب البيانات من Firebase...');
                
                // 1. التحقق من وجود Firebase
                if (typeof firebase === 'undefined') {
                    console.error('❌ Firebase SDK غير محمل');
                    reject(new Error('Firebase SDK غير محمل'));
                    return;
                }
                
                // 2. تهيئة Firebase
                let db;
                try {
                    // تهيئة Firebase إذا لم يكن مهيأ
                    if (!firebase.apps.length) {
                        firebase.initializeApp(firebaseConfig);
                        console.log('✅ تم تهيئة Firebase بنجاح');
                    } else {
                        console.log('✅ Firebase مهيأ مسبقاً');
                    }
                    
                    db = firebase.firestore();
                    this.firebaseInitialized = true;
                    
                } catch (initError) {
                    console.error('❌ فشل تهيئة Firebase:', initError);
                    reject(initError);
                    return;
                }
                
                if (!db) {
                    reject(new Error('قاعدة البيانات غير متاحة'));
                    return;
                }
                
                console.log('✅ Firestore جاهز للاستخدام');
                
                // إضافة timeout لتجنب الانتظار الطويل
                const timeoutPromise = new Promise((_, rejectTimeout) => {
                    setTimeout(() => rejectTimeout(new Error('انتهت مهلة الاتصال بقاعدة البيانات')), 10000);
                });
                
                // 3. جلب الأقسام مع timeout
                let sectionsSnapshot;
                try {
                    sectionsSnapshot = await Promise.race([
                        db.collection('sections').orderBy('order').get(),
                        timeoutPromise
                    ]);
                } catch (orderError) {
                    // إذا فشل الترتيب أو انتهت المهلة
                    console.warn('⚠️ فشل ترتيب الأقسام، جاري جلب بدون ترتيب:', orderError);
                    sectionsSnapshot = await Promise.race([
                        db.collection('sections').get(),
                        timeoutPromise
                    ]);
                }
                
                if (sectionsSnapshot.empty) {
                    console.log('ℹ️ لا توجد أقسام في Firebase');
                    reject(new Error('لا توجد أقسام في قاعدة البيانات'));
                    return;
                }
                
                this.sections = sectionsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                console.log(`✅ تم تحميل ${this.sections.length} قسم من Firebase`);
                
                // 4. جلب القنوات مع timeout
                try {
                    const channelsSnapshot = await Promise.race([
                        db.collection('channels').get(),
                        timeoutPromise
                    ]);
                    
                    if (!channelsSnapshot.empty) {
                        this.channels = channelsSnapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        console.log(`✅ تم تحميل ${this.channels.length} قناة من Firebase`);
                    }
                } catch (channelsError) {
                    console.warn('⚠️ فشل تحميل القنوات:', channelsError);
                    this.channels = [];
                }
                
                // 5. حفظ في localStorage كنسخة احتياطية
                this.saveToLocalStorage();
                
                // 6. عرض البيانات
                this.renderSections();
                
                resolve(true);
                
            } catch (error) {
                console.error('❌ فشل تحميل Firebase:', error);
                reject(error);
            }
        });
    }

    async loadFromLocalStorage() {
        return new Promise((resolve, reject) => {
            try {
                console.log('💾 جاري تحميل البيانات من التخزين المحلي...');
                
                // 1. جلب الأقسام من localStorage
                const savedSections = localStorage.getItem('bein_sections');
                if (!savedSections) {
                    reject(new Error('لا توجد بيانات محلية للأقسام'));
                    return;
                }
                
                this.sections = JSON.parse(savedSections);
                console.log(`✅ تم تحميل ${this.sections.length} قسم من localStorage`);
                
                // 2. جلب القنوات من localStorage
                const savedChannels = localStorage.getItem('bein_channels');
                if (savedChannels) {
                    this.channels = JSON.parse(savedChannels);
                    console.log(`✅ تم تحميل ${this.channels.length} قناة من localStorage`);
                }
                
                // 3. عرض البيانات
                this.renderSections();
                
                resolve(true);
                
            } catch (error) {
                console.error('❌ فشل تحميل البيانات المحلية:', error);
                reject(error);
            }
        });
    }

    loadDefaultData() {
        console.log('📋 استخدام البيانات الافتراضية...');
        
        this.sections = [
            {
                id: 'bein-sports',
                name: 'قنوات بي إن سبورت',
                order: 1,
                isActive: true,
                description: 'جميع قنوات بي إن سبورت الرياضية',
                image: 'https://via.placeholder.com/200x150/2F2562/FFFFFF?text=BEIN+SPORT'
            },
            {
                id: 'sports-channels',
                name: 'القنوات الرياضية',
                order: 2,
                isActive: true,
                description: 'أفضل القنوات الرياضية العالمية',
                image: 'https://via.placeholder.com/200x150/2F2562/FFFFFF?text=SPORTS'
            },
            {
                id: 'arabic-channels',
                name: 'القنوات العربية',
                order: 3,
                isActive: true,
                description: 'القنوات العربية المشهورة',
                image: 'https://via.placeholder.com/200x150/2F2562/FFFFFF?text=ARABIC'
            },
            {
                id: 'entertainment',
                name: 'قنوات الترفيه',
                order: 4,
                isActive: true,
                description: 'قنوات الأفلام والمسلسلات',
                image: 'https://via.placeholder.com/200x150/2F2562/FFFFFF?text=ENTERTAIN'
            }
        ];
        
        this.channels = [
            {
                id: 'bein-1',
                name: 'بي إن سبورت 1',
                image: 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=BEIN+1',
                url: '#',
                order: 1,
                sectionId: 'bein-sports',
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player'
            },
            {
                id: 'bein-2',
                name: 'بي إن سبورت 2',
                image: 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=BEIN+2',
                url: '#',
                order: 2,
                sectionId: 'bein-sports',
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player'
            },
            {
                id: 'bein-3',
                name: 'بي إن سبورت 3',
                image: 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=BEIN+3',
                url: '#',
                order: 3,
                sectionId: 'bein-sports',
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player'
            }
        ];
        
        this.saveToLocalStorage();
        this.renderSections();
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('bein_sections', JSON.stringify(this.sections));
            localStorage.setItem('bein_channels', JSON.stringify(this.channels));
            console.log('💾 تم حفظ البيانات في التخزين المحلي');
        } catch (error) {
            console.error('❌ خطأ في حفظ البيانات محلياً:', error);
        }
    }

    showLoading() {
        const container = document.getElementById('sectionsContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">جاري التحميل...</span>
                    </div>
                    <p>جاري تحميل الأقسام...</p>
                    <small>يرجى الانتظار</small>
                </div>
            `;
        }
    }

    renderSections() {
        const container = document.getElementById('sectionsContainer');
        if (!container) {
            console.error('❌ حاوية الأقسام غير موجودة');
            return;
        }

        // تصفية الأقسام النشطة وترتيبها
        const activeSections = this.sections
            .filter(section => section.isActive !== false)
            .sort((a, b) => (a.order || 1) - (b.order || 1));
        
        if (activeSections.length === 0) {
            container.innerHTML = `
                <div class="loading">
                    <i class="uil uil-folder" style="font-size: 3rem; color: #6c757d;"></i>
                    <p class="mt-3">لا توجد أقسام متاحة حالياً</p>
                    <small>سيتم إضافة أقسام قريباً</small>
                </div>
            `;
            return;
        }

        console.log(`🎯 عرض ${activeSections.length} قسم في الواجهة`);
        
        // إنشاء HTML للأقسام
        container.innerHTML = `
            <div class="sections-grid">
                ${activeSections.map(section => {
                    const channelCount = this.channels.filter(channel => channel.sectionId === section.id).length;
                    const sectionLink = `section.html?id=${section.id}`;
                    
                    return `
                        <a href="${sectionLink}" class="section-card" data-section-id="${section.id}">
                            <div class="section-card-link">
                                ${section.image ? `
                                    <div class="section-image">
                                        <img src="${section.image}" alt="${section.name}" 
                                             onerror="this.src='https://via.placeholder.com/100x100/2F2562/FFFFFF?text=IMG'">
                                    </div>
                                ` : `
                                    <div class="section-icon">
                                        <i class="uil uil-folder"></i>
                                    </div>
                                `}
                                <div class="section-name">${section.name}</div>
                                ${section.description ? `<div class="section-description-card">${section.description}</div>` : ''}
                                <div class="section-badge">${channelCount} قناة</div>
                            </div>
                        </a>
                    `;
                }).join('')}
            </div>
        `;

        console.log('✅ تم عرض الأقسام بنجاح');
    }

    showSuccessMessage(message) {
        // إزالة أي تنبيهات سابقة
        const oldAlerts = document.querySelectorAll('.custom-alert');
        oldAlerts.forEach(alert => alert.remove());
        
        // عرض رسالة النجاح مؤقتة
        const alertDiv = document.createElement('div');
        alertDiv.className = `custom-alert alert alert-success alert-dismissible fade show`;
        alertDiv.innerHTML = `
            <i class="uil uil-check-circle me-2"></i> ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        `;
        
        const content = document.querySelector('.content');
        if (content) {
            content.insertBefore(alertDiv, content.firstChild);
        }
        
        // إزالة الرسالة بعد 3 ثواني
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }

    showInfoMessage(message) {
        // إزالة أي تنبيهات سابقة
        const oldAlerts = document.querySelectorAll('.custom-alert');
        oldAlerts.forEach(alert => alert.remove());
        
        // عرض رسالة معلومات مؤقتة
        const alertDiv = document.createElement('div');
        alertDiv.className = `custom-alert alert alert-info alert-dismissible fade show`;
        alertDiv.innerHTML = `
            <i class="uil uil-info-circle me-2"></i> ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        `;
        
        const content = document.querySelector('.content');
        if (content) {
            content.insertBefore(alertDiv, content.firstChild);
        }
        
        // إزالة الرسالة بعد 3 ثواني
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }

    showWarningMessage(message) {
        // إزالة أي تنبيهات سابقة
        const oldAlerts = document.querySelectorAll('.custom-alert');
        oldAlerts.forEach(alert => alert.remove());
        
        // عرض رسالة تحذير مؤقتة
        const alertDiv = document.createElement('div');
        alertDiv.className = `custom-alert alert alert-warning alert-dismissible fade show`;
        alertDiv.innerHTML = `
            <i class="uil uil-exclamation-triangle me-2"></i> ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        `;
        
        const content = document.querySelector('.content');
        if (content) {
            content.insertBefore(alertDiv, content.firstChild);
        }
        
        // إزالة الرسالة بعد 5 ثواني
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    showErrorMessage(message) {
        // إزالة أي تنبيهات سابقة
        const oldAlerts = document.querySelectorAll('.custom-alert');
        oldAlerts.forEach(alert => alert.remove());
        
        // عرض رسالة خطأ مؤقتة
        const alertDiv = document.createElement('div');
        alertDiv.className = `custom-alert alert alert-danger alert-dismissible fade show`;
        alertDiv.innerHTML = `
            <i class="uil uil-exclamation-circle me-2"></i> ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        `;
        
        const content = document.querySelector('.content');
        if (content) {
            content.insertBefore(alertDiv, content.firstChild);
        }
        
        // إزالة الرسالة بعد 5 ثواني
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    async retryLoadData() {
        console.log('🔄 إعادة محاولة تحميل البيانات...');
        await this.loadData();
    }

    // نظام الإشعارات
    async loadNotifications() {
        try {
            console.log('📢 جاري تحميل الإشعارات...');
            
            // المحاولة الأولى: Firebase
            if (this.firebaseInitialized) {
                const db = firebase.firestore();
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
                    
                    // حساب الإشعارات غير المقروءة
                    this.updateUnreadCount();
                    this.renderNotifications();
                    console.log(`✅ تم تحميل ${this.notifications.length} إشعار`);
                    return;
                }
            }
            
            // المحاولة الثانية: localStorage
            const savedNotifications = localStorage.getItem('bein_notifications');
            if (savedNotifications) {
                this.notifications = JSON.parse(savedNotifications);
                this.updateUnreadCount();
                this.renderNotifications();
                console.log(`📱 تم تحميل ${this.notifications.length} إشعار من التخزين المحلي`);
            }
            
        } catch (error) {
            console.warn('⚠️ فشل تحميل الإشعارات:', error);
        }
    }

    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.isRead).length;
        const badge = document.getElementById('unreadCount');
        if (badge) {
            badge.textContent = this.unreadCount;
            badge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
        }
    }

    renderNotifications() {
        const container = document.getElementById('notificationsList');
        if (!container) return;

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
                 onclick="app.markAsRead('${notification.id}')">
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
                        <button onclick="app.openNotificationAction('${notification.actionUrl}', event)">
                            <i class="uil uil-external-link-alt"></i> زيارة الرابط
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');
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

    toggleNotifications() {
        const dropdown = document.getElementById('notificationsDropdown');
        dropdown.classList.toggle('show');
        
        // تحميل الإشعارات عند الفتح للمرة الأولى
        if (dropdown.classList.contains('show') && this.notifications.length === 0) {
            this.loadNotifications();
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
                this.saveNotificationsToLocalStorage();
                
                // تحديث العداد
                this.updateUnreadCount();
                
                // إعادة عرض الإشعارات
                this.renderNotifications();
            }
        } catch (error) {
            console.error('❌ خطأ في تحديد الإشعار كمقروء:', error);
        }
    }

    async markAllAsRead() {
        try {
            const unreadNotifications = this.notifications.filter(n => !n.isRead);
            
            if (unreadNotifications.length === 0) {
                this.showInfoMessage('لا توجد إشعارات غير مقروءة');
                return;
            }
            
            if (confirm(`هل تريد تحديد ${unreadNotifications.length} إشعار كمقروء؟`)) {
                // تحديث محلياً
                this.notifications.forEach(n => n.isRead = true);
                
                // تحديث في Firebase إذا كان متصلاً
                if (this.firebaseInitialized && this.firebaseInitialized) {
                    const db = firebase.firestore();
                    const batch = db.batch();
                    
                    unreadNotifications.forEach(notification => {
                        const notificationRef = db.collection('notifications').doc(notification.id);
                        batch.update(notificationRef, {
                            isRead: true,
                            readAt: new Date()
                        });
                    });
                    
                    await batch.commit();
                }
                
                // حفظ في localStorage
                this.saveNotificationsToLocalStorage();
                
                // تحديث العداد
                this.updateUnreadCount();
                
                // إعادة العرض
                this.renderNotifications();
                
                this.showSuccessMessage('تم تحديد جميع الإشعارات كمقروءة');
            }
        } catch (error) {
            console.error('❌ خطأ في تحديد جميع الإشعارات كمقروءة:', error);
            this.showErrorMessage('فشل تحديث الإشعارات');
        }
    }

    saveNotificationsToLocalStorage() {
        try {
            localStorage.setItem('bein_notifications', JSON.stringify(this.notifications));
        } catch (error) {
            console.error('❌ خطأ في حفظ الإشعارات محلياً:', error);
        }
    }

    openNotificationAction(url, event) {
        if (event) event.stopPropagation();
        if (url) {
            window.open(url, '_blank');
        }
    }

    showFloatingNotification(notification) {
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

    async checkForNewNotifications() {
        try {
            if (!this.firebaseInitialized) return;
            
            const db = firebase.firestore();
            const lastCheck = localStorage.getItem('lastNotificationCheck') || 0;
            
            const snapshot = await db.collection('notifications')
                .where('createdAt', '>', new Date(lastCheck))
                .where('isActive', '==', true)
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get();
            
            if (!snapshot.empty) {
                const newNotifications = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // عرض إشعارات جديدة فقط (التي تم إنشاؤها بعد آخر تحقق)
                const unreadNew = newNotifications.filter(n => 
                    !this.notifications.find(existing => existing.id === n.id)
                );
                
                if (unreadNew.length > 0) {
                    // إضافة الإشعارات الجديدة إلى القائمة
                    this.notifications = [...unreadNew, ...this.notifications];
                    
                    // عرض إشعار عائم للإشعار الأول
                    this.showFloatingNotification(unreadNew[0]);
                    
                    // تحديث العداد
                    this.updateUnreadCount();
                    
                    // حفظ وقت آخر تحقق
                    localStorage.setItem('lastNotificationCheck', Date.now());
                    
                    console.log(`🔔 ${unreadNew.length} إشعار جديد`);
                }
            }
            
        } catch (error) {
            console.warn('⚠️ فشل التحقق من الإشعارات الجديدة:', error);
        }
    }
}

// بدء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏠 تهيئة التطبيق...');
    window.app = new BeinSportApp();
});

// جعل الدوال متاحة عالمياً
window.reloadAppData = function() {
    if (window.app) {
        window.app.retryLoadData();
    }
};
