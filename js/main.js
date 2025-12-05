// js/main.js - النسخة المحسنة
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏠 بدء تشغيل تطبيق Bein Sport...');
    new BeinSportApp();
});

class BeinSportApp {
    constructor() {
        this.sections = [];
        this.channels = [];
        this.init();
    }

    async init() {
        console.log('🚀 تهيئة التطبيق...');
        
        // تعيين السنة الحالية
        document.getElementById('currentYear').textContent = new Date().getFullYear();
        
        // عرض حالة التحميل
        this.showLoading();
        
        // تحميل البيانات
        await this.loadData();
    }

    async loadData() {
        console.log('📥 جاري تحميل البيانات...');
        
        try {
            // المحاولة 1: Firebase
            const firebaseLoaded = await this.tryLoadFromFirebase();
            if (firebaseLoaded) return;
            
            // المحاولة 2: localStorage
            const localLoaded = await this.tryLoadFromLocalStorage();
            if (localLoaded) return;
            
            // المحاولة 3: البيانات الافتراضية
            this.loadDefaultData();
            
        } catch (error) {
            console.error('❌ خطأ غير متوقع:', error);
            this.loadDefaultData();
        }
    }

    async tryLoadFromFirebase() {
        try {
            console.log('📡 محاولة التحميل من Firebase...');
            
            // التحقق من وجود Firebase SDK
            if (typeof firebase === 'undefined') {
                console.warn('⚠️ Firebase SDK غير محمل');
                return false;
            }
            
            // تهيئة Firebase باستخدام firebaseUtils
            await firebaseUtils.initializeFirebase();
            console.log('✅ Firebase مهيأ بنجاح');
            
            const db = firebaseUtils.getDB();
            if (!db) {
                console.warn('⚠️ قاعدة البيانات غير متاحة');
                return false;
            }
            
            // جلب الأقسام
            const sectionsSnapshot = await db.collection('sections').get();
            if (sectionsSnapshot.empty) {
                console.warn('⚠️ لا توجد أقسام في Firebase');
                return false;
            }
            
            this.sections = sectionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(`✅ تم تحميل ${this.sections.length} قسم من Firebase`);
            
            // جلب القنوات
            const channelsSnapshot = await db.collection('channels').get();
            if (!channelsSnapshot.empty) {
                this.channels = channelsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log(`✅ تم تحميل ${this.channels.length} قناة من Firebase`);
            }
            
            // حفظ نسخة احتياطية
            this.saveToLocalStorage();
            
            // عرض البيانات
            this.renderSections();
            this.showSuccessMessage('تم تحميل البيانات بنجاح');
            
            return true;
            
        } catch (error) {
            console.warn('⚠️ فشل تحميل Firebase:', error.message);
            return false;
        }
    }

    async tryLoadFromLocalStorage() {
        try {
            console.log('💾 محاولة التحميل من التخزين المحلي...');
            
            const savedSections = localStorage.getItem('bein_sections');
            const savedChannels = localStorage.getItem('bein_channels');
            
            if (!savedSections) {
                console.warn('⚠️ لا توجد بيانات محلية');
                return false;
            }
            
            this.sections = JSON.parse(savedSections);
            console.log(`✅ تم تحميل ${this.sections.length} قسم من localStorage`);
            
            if (savedChannels) {
                this.channels = JSON.parse(savedChannels);
                console.log(`✅ تم تحميل ${this.channels.length} قناة من localStorage`);
            }
            
            this.renderSections();
            this.showInfoMessage('تم تحميل البيانات المحلية');
            
            return true;
            
        } catch (error) {
            console.warn('⚠️ فشل تحميل localStorage:', error.message);
            return false;
        }
    }

    loadDefaultData() {
        console.log('📋 استخدام البيانات الافتراضية...');
        
        this.sections = [
            {
                id: '1',
                name: 'قنوات بي إن سبورت',
                order: 1,
                isActive: true,
                description: 'جميع قنوات بي إن سبورت الرياضية',
                image: 'https://via.placeholder.com/300x200/2F2562/FFFFFF?text=BEIN+SPORT'
            },
            {
                id: '2',
                name: 'القنوات الرياضية',
                order: 2,
                isActive: true,
                description: 'أفضل القنوات الرياضية العالمية',
                image: 'https://via.placeholder.com/300x200/2F2562/FFFFFF?text=SPORTS'
            },
            {
                id: '3',
                name: 'القنوات العربية',
                order: 3,
                isActive: true,
                description: 'القنوات العربية المشهورة',
                image: 'https://via.placeholder.com/300x200/2F2562/FFFFFF?text=ARABIC'
            },
            {
                id: '4',
                name: 'قنوات الترفيه',
                order: 4,
                isActive: true,
                description: 'قنوات الأفلام والمسلسلات',
                image: 'https://via.placeholder.com/300x200/2F2562/FFFFFF?text=ENTERTAIN'
            }
        ];
        
        this.channels = [
            {
                id: '1',
                name: 'بي إن سبورت 1',
                image: 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=BEIN+1',
                url: '#',
                order: 1,
                sectionId: '1',
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player'
            },
            {
                id: '2',
                name: 'بي إن سبورت 2',
                image: 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=BEIN+2',
                url: '#',
                order: 2,
                sectionId: '1',
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player'
            },
            {
                id: '3',
                name: 'بي إن سبورت 3',
                image: 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=BEIN+3',
                url: '#',
                order: 3,
                sectionId: '1',
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player'
            }
        ];
        
        this.saveToLocalStorage();
        this.renderSections();
        this.showWarningMessage('تم تحميل البيانات الافتراضية. تحقق من اتصال الإنترنت.');
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
        
        container.innerHTML = activeSections.map(section => {
            const channelCount = this.channels.filter(channel => channel.sectionId === section.id).length;
            const sectionLink = `section.html?id=${section.id}`;
            
            return `
                <a href="${sectionLink}" class="section-card" data-section-id="${section.id}">
                    <div class="section-card-link">
                        ${section.image ? `
                            <div class="section-image">
                                <img src="${section.image}" alt="${section.name}" 
                                     onerror="this.src='https://via.placeholder.com/300x200/2F2562/FFFFFF?text=IMG'">
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
        }).join('');

        console.log('✅ تم عرض الأقسام بنجاح');
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

    showSuccessMessage(message) {
        this.showMessage(message, 'success', 'uil-check-circle');
    }

    showInfoMessage(message) {
        this.showMessage(message, 'info', 'uil-info-circle');
    }

    showWarningMessage(message) {
        this.showMessage(message, 'warning', 'uil-exclamation-triangle');
    }

    showMessage(message, type, icon) {
        // إزالة أي تنبيهات سابقة
        const oldAlerts = document.querySelectorAll('.custom-alert');
        oldAlerts.forEach(alert => alert.remove());
        
        // إنشاء التنبيه الجديد
        const alertDiv = document.createElement('div');
        alertDiv.className = `custom-alert alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            <i class="uil ${icon} me-2"></i> ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        `;
        
        const content = document.querySelector('.content');
        if (content) {
            content.insertBefore(alertDiv, content.firstChild);
        }
        
        // إزالة التنبيه بعد 3 ثواني
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }

    // جعل الدالة متاحة عالمياً لإعادة التحميل
    retryLoadData() {
        console.log('🔄 إعادة محاولة تحميل البيانات...');
        this.showLoading();
        setTimeout(() => this.loadData(), 500);
    }
}

// جعل الدوال متاحة عالمياً
window.reloadAppData = function() {
    if (window.app) {
        window.app.retryLoadData();
    }
};

// إذا لم يتم تعريف app عالمياً، ننشئه
if (!window.app) {
    window.app = new BeinSportApp();
}
