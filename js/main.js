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

// تطبيق Bein Sport - الصفحة الرئيسية مع نظام الإشعارات
class BeinSportApp {
    constructor() {
        this.sections = [];
        this.channels = [];
        this.notifications = [];
        this.activeNotifications = [];
        this.firebaseInitialized = false;
        this.notificationsLoaded = false;
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
        
        console.log('✅ تم تهيئة التطبيق بنجاح');
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
                
                // 5. جلب الإشعارات النشطة
                try {
                    const now = new Date();
                    const notificationsSnapshot = await db.collection('notifications')
                        .where('status', '==', 'active')
                        .orderBy('createdAt', 'desc')
                        .get();
                    
                    if (!notificationsSnapshot.empty) {
                        this.notifications = notificationsSnapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        
                        // تصفية الإشعارات غير المنتهية
                        this.activeNotifications = this.notifications.filter(notification => 
                            !notification.expiryDate || new Date(notification.expiryDate) > now
                        );
                        
                        console.log(`📢 تم تحميل ${this.activeNotifications.length} إشعار نشط`);
                        this.notificationsLoaded = true;
                        
                        // عرض الإشعارات بعد تحميل الصفحة
                        setTimeout(() => this.displayNotifications(), 1000);
                    }
                } catch (notificationsError) {
                    console.warn('⚠️ فشل تحميل الإشعارات:', notificationsError);
                }
                
                // 6. حفظ في localStorage كنسخة احتياطية
                this.saveToLocalStorage();
                
                // 7. عرض البيانات
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
                
                // 3. جلب الإشعارات من localStorage
                const savedNotifications = localStorage.getItem('bein_notifications');
                if (savedNotifications) {
                    this.notifications = JSON.parse(savedNotifications);
                    
                    // تصفية الإشعارات النشطة غير المنتهية
                    const now = new Date();
                    this.activeNotifications = this.notifications.filter(notification => 
                        notification.status === 'active' && 
                        (!notification.expiryDate || new Date(notification.expiryDate) > now)
                    );
                    
                    console.log(`📢 تم تحميل ${this.activeNotifications.length} إشعار نشط من localStorage`);
                    this.notificationsLoaded = true;
                    
                    // عرض الإشعارات
                    setTimeout(() => this.displayNotifications(), 1000);
                }
                
                // 4. عرض البيانات
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
        
        // إضافة إشعارات افتراضية
        this.notifications = [
            {
                id: 'welcome-notification',
                title: 'مرحباً بك في وسيل لايف برو',
                message: 'استمتع بأفضل قنوات بي إن سبورت والرياضة العالمية بشكل مجاني وحصري',
                type: 'info',
                status: 'active',
                createdAt: new Date(),
                link: 'https://t.me/wacelalorshepro',
                linkText: 'انضم لقناتنا'
            },
            {
                id: 'update-notification',
                title: 'تحديث جديد متوفر!',
                message: 'تحديث التطبيق متوفر الآن مع ميزات جديدة وتحسينات في الأداء',
                type: 'update',
                status: 'active',
                createdAt: new Date(Date.now() - 86400000), // قبل يوم
                link: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                linkText: 'تحديث الآن'
            }
        ];
        
        this.activeNotifications = this.notifications.filter(n => n.status === 'active');
        this.notificationsLoaded = true;
        
        this.saveToLocalStorage();
        this.renderSections();
        this.displayNotifications();
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('bein_sections', JSON.stringify(this.sections));
            localStorage.setItem('bein_channels', JSON.stringify(this.channels));
            localStorage.setItem('bein_notifications', JSON.stringify(this.notifications));
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

    displayNotifications() {
        if (this.activeNotifications.length === 0 || !this.notificationsLoaded) {
            console.log('📭 لا توجد إشعارات نشطة للعرض');
            return;
        }
        
        console.log(`📢 عرض ${this.activeNotifications.length} إشعار`);
        
        // إزالة الإشعارات القديمة
        const oldNotifications = document.querySelectorAll('.notification-container');
        oldNotifications.forEach(notification => notification.remove());
        
        // إنشاء حاوية الإشعارات
        const notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 9999;
            max-width: 400px;
            width: 90%;
        `;
        
        // عرض الإشعارات (أحدث 3 فقط)
        const notificationsToShow = this.activeNotifications.slice(0, 3);
        
        notificationContainer.innerHTML = notificationsToShow.map(notification => {
            const typeClass = this.getNotificationTypeClass(notification.type);
            const iconClass = this.getNotificationIcon(notification.type);
            
            return `
            <div class="notification alert alert-${typeClass} alert-dismissible fade show shadow-lg" 
                 role="alert" style="border-left: 5px solid var(--bs-${typeClass}); margin-bottom: 10px;">
                <div class="d-flex align-items-center">
                    <i class="${iconClass} me-2 fs-4"></i>
                    <div class="flex-grow-1">
                        <h6 class="alert-heading mb-1">${notification.title}</h6>
                        <p class="mb-2">${notification.message}</p>
                        ${notification.link ? `
                            <a href="${notification.link}" target="_blank" 
                               class="btn btn-sm btn-outline-${typeClass}">
                                ${notification.linkText || 'عرض المزيد'}
                            </a>
                        ` : ''}
                    </div>
                    <button type="button" class="btn-close" onclick="this.parentElement.parentElement.remove()"></button>
                </div>
                <div class="notification-time mt-2 text-muted small">
                    <i class="uil uil-clock me-1"></i> ${this.getRelativeTime(notification.createdAt)}
                </div>
            </div>
            `;
        }).join('');
        
        // إضافة الحاوية إلى الصفحة
        const content = document.querySelector('.content');
        if (content) {
            content.insertBefore(notificationContainer, content.firstChild);
        }
        
        // إغلاق الإشعارات تلقائياً بعد 10 ثواني
        setTimeout(() => {
            const notifications = document.querySelectorAll('.notification');
            notifications.forEach((notification, index) => {
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.classList.remove('show');
                        setTimeout(() => {
                            if (notification.parentNode) {
                                notification.remove();
                            }
                        }, 300);
                    }
                }, index * 1000 + 10000);
            });
        }, 3000);
    }

    getNotificationTypeClass(type) {
        switch(type) {
            case 'info': return 'info';
            case 'success': return 'success';
            case 'warning': return 'warning';
            case 'error': return 'danger';
            case 'update': return 'primary';
            default: return 'info';
        }
    }

    getNotificationIcon(type) {
        switch(type) {
            case 'info': return 'uil uil-info-circle';
            case 'success': return 'uil uil-check-circle';
            case 'warning': return 'uil uil-exclamation-triangle';
            case 'error': return 'uil uil-times-circle';
            case 'update': return 'uil uil-arrow-growth';
            default: return 'uil uil-bell';
        }
    }

    getRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffSec < 60) return 'الآن';
        if (diffMin < 60) return `قبل ${diffMin} دقيقة`;
        if (diffHour < 24) return `قبل ${diffHour} ساعة`;
        if (diffDay < 7) return `قبل ${diffDay} يوم`;
        
        return date.toLocaleDateString('ar-SA');
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

    async retryLoadData() {
        console.log('🔄 إعادة محاولة تحميل البيانات...');
        await this.loadData();
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

// تحديث الإشعارات عند التركيز على الصفحة
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && window.app && window.app.notificationsLoaded) {
        window.app.displayNotifications();
    }
});
