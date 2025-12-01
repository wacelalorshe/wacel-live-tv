// ===========================================
// تطبيق Bein Sport مع الحماية المحسّنة - النسخة الكاملة
// ===========================================

class ProtectedBeinSportApp {
    constructor() {
        this.sections = [];
        this.channels = [];
        this.currentSection = null;
        this.isInitialized = false;
        this.init();
    }

    async init() {
        console.log('🚀 بدء تشغيل تطبيق Bein Sport مع الحماية...');
        
        try {
            // إعداد السنة الحالية
            document.getElementById('currentYear').textContent = new Date().getFullYear();
            
            // تهيئة Firebase
            await this.initializeFirebase();
            
            // إعداد مستمعي الأحداث
            this.setupEventListeners();
            
            // تحميل البيانات مع إعادة المحاولة التلقائية
            await this.loadDataWithRetry();
            
            // إظهار المحتوى بعد التهيئة
            this.showContent();
            
            this.isInitialized = true;
            console.log('✅ تم تهيئة التطبيق مع الحماية بنجاح');
            
        } catch (error) {
            console.error('❌ فشل تهيئة التطبيق:', error);
            this.showErrorState('فشل في الاتصال بقاعدة البيانات. جاري استخدام البيانات المحلية...');
            await this.loadFromLocalStorage();
            
            this.showContent();
        }
    }

    showContent() {
        const loadingScreen = document.getElementById('loadingScreen');
        const contentWrapper = document.getElementById('contentWrapper');
        
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (contentWrapper) contentWrapper.style.display = 'block';
    }

    async initializeFirebase() {
        try {
            // استخدام إعدادات Firebase من protection.js
            if (typeof encryptedFirebaseConfig !== 'undefined') {
                const firebaseConfig = decryptConfig(encryptedFirebaseConfig);
                if (firebaseConfig) {
                    const app = firebase.initializeApp(firebaseConfig);
                    window.db = firebase.firestore(app);
                    console.log('✅ تم تهيئة Firebase بنجاح');
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.warn('⚠️ Firebase غير متاح، جاري استخدام التخزين المحلي:', error);
            return false;
        }
    }

    async loadDataWithRetry(maxRetries = 3) {
        let retries = 0;
        
        while (retries < maxRetries) {
            try {
                console.log(`📥 جاري تحميل البيانات... المحاولة ${retries + 1}`);
                await this.loadData();
                console.log('✅ تم تحميل البيانات بنجاح');
                return;
            } catch (error) {
                retries++;
                console.error(`❌ فشل تحميل البيانات (المحاولة ${retries}):`, error);
                
                if (retries < maxRetries) {
                    console.log(`🔄 إعادة المحاولة بعد 2 ثانية...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    throw error;
                }
            }
        }
    }

    async loadData() {
        try {
            const firebaseLoaded = await this.loadFromFirebase();
            
            if (firebaseLoaded) {
                console.log('✅ تم تحميل البيانات من Firebase');
                this.renderData();
            } else {
                console.log('💾 تحميل البيانات من التخزين المحلي...');
                await this.loadFromLocalStorage();
                this.renderData();
            }
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات:', error);
            await this.loadFromLocalStorage();
            this.renderData();
        }
    }

    async loadFromFirebase() {
        if (!window.db) {
            console.error('❌ Firestore غير مهيأ');
            return false;
        }

        try {
            console.log('📡 جاري جلب البيانات من Firebase...');
            
            // تحميل الأقسام
            let sectionsSnapshot;
            try {
                sectionsSnapshot = await db.collection('sections')
                    .orderBy('order')
                    .get();
            } catch (error) {
                console.warn('⚠️ فشل في ترتيب الأقسام، جاري جلب بدون ترتيب:', error);
                sectionsSnapshot = await db.collection('sections').get();
            }

            if (sectionsSnapshot.empty) {
                console.log('ℹ️ لا توجد أقسام في Firebase');
                return false;
            }

            this.sections = sectionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`✅ تم تحميل ${this.sections.length} قسم من Firebase`);
            
            // تحميل القنوات
            const channelsSnapshot = await db.collection('channels').get();
            if (!channelsSnapshot.empty) {
                this.channels = channelsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log(`✅ تم تحميل ${this.channels.length} قناة من Firebase`);
            }
            
            // حفظ في localStorage
            this.saveToLocalStorage();
            
            return true;

        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات من Firebase:', error);
            return false;
        }
    }

    async loadFromLocalStorage() {
        try {
            const savedSections = localStorage.getItem('bein_sections');
            const savedChannels = localStorage.getItem('bein_channels');
            
            if (savedSections) {
                this.sections = JSON.parse(savedSections) || [];
                console.log(`✅ تم تحميل ${this.sections.length} قسم من localStorage`);
            }
            
            if (savedChannels) {
                this.channels = JSON.parse(savedChannels) || [];
                console.log(`✅ تم تحميل ${this.channels.length} قناة من localStorage`);
            }
            
            if (this.sections.length === 0) {
                this.loadDefaultData();
            }
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات المحلية:', error);
            this.loadDefaultData();
        }
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

    showErrorState(message) {
        const container = document.getElementById('sectionsContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <i class="uil uil-exclamation-triangle text-warning mb-3" style="font-size: 3rem;"></i>
                    <p>${message}</p>
                    <button class="btn btn-primary mt-2" onclick="protectedApp.retryLoadData()">
                        <i class="uil uil-redo"></i> إعادة المحاولة
                    </button>
                </div>
            `;
        }
    }

    renderData() {
        this.renderSections();
    }

    getActiveSections() {
        return this.sections
            .filter(section => section.isActive !== false)
            .sort((a, b) => (a.order || 1) - (b.order || 1));
    }

    renderSections() {
        const container = document.getElementById('sectionsContainer');
        if (!container) {
            console.error('❌ حاوية الأقسام غير موجودة');
            return;
        }

        const activeSections = this.getActiveSections();
        
        if (activeSections.length === 0) {
            this.showErrorState('لا توجد أقسام متاحة حالياً');
            return;
        }

        console.log(`🎯 عرض ${activeSections.length} قسم في الواجهة`);
        
        container.innerHTML = `
            <div class="sections-grid">
                ${activeSections.map(section => {
                    const channelCount = this.getChannelsCount(section.id);
                    return `
                        <a href="section.html?sectionId=${section.id}" class="section-card" target="_blank">
                            <div class="section-card-link">
                                ${section.image ? `
                                    <div class="section-image">
                                        <img src="${section.image}" alt="${section.name}" 
                                             onerror="this.src='https://via.placeholder.com/200x150/2F2562/FFFFFF?text=No+Image'">
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
    }

    getChannelsCount(sectionId) {
        return this.channels.filter(channel => channel.sectionId === sectionId).length;
    }

    setupEventListeners() {
        console.log('🔧 إعداد مستمعي الأحداث...');
        
        // تأكد من أن السنة الحالية معروضة
        const yearElement = document.getElementById('currentYear');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }

    loadDefaultData() {
        console.log('📋 استخدام البيانات الافتراضية...');
        
        this.sections = [{
            id: 'default-1',
            name: 'قنوات بي إن سبورت',
            order: 1,
            isActive: true,
            description: 'جميع قنوات بي إن سبورت الرياضية',
            image: 'https://via.placeholder.com/200x150/2F2562/FFFFFF?text=BEIN+SPORT',
            createdAt: new Date()
        }, {
            id: 'default-2', 
            name: 'القنوات الرياضية',
            order: 2,
            isActive: true,
            description: 'أفضل القنوات الرياضية',
            image: 'https://via.placeholder.com/200x150/2F2562/FFFFFF?text=SPORTS',
            createdAt: new Date()
        }];
        
        this.channels = [
            {
                id: 'default-1',
                name: 'bein sport 1',
                image: 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=BEIN+1',
                url: '#',
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                downloadUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                order: 1,
                sectionId: 'default-1',
                createdAt: new Date()
            },
            {
                id: 'default-2',
                name: 'bein sport 2', 
                image: 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=BEIN+2',
                url: '#',
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                downloadUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                order: 2,
                sectionId: 'default-1',
                createdAt: new Date()
            },
            {
                id: 'default-3',
                name: 'القناة الرياضية 1',
                image: 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=SPORT+1',
                url: '#',
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                downloadUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                order: 1,
                sectionId: 'default-2',
                createdAt: new Date()
            }
        ];
        
        this.saveToLocalStorage();
    }

    async retryLoadData() {
        console.log('🔄 إعادة محاولة تحميل البيانات...');
        await this.loadDataWithRetry();
    }

    showToast(message, type = 'info') {
        // دالة مساعدة لعرض الرسائل
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'warning' ? '#ff9800' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            border-radius: 5px;
            z-index: 10000;
            font-family: Arial;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 300px;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 3000);
    }
}

// ===========================================
// الدوال العامة المساعدة
// ===========================================

// دالة فك تشفير إعدادات Firebase (للاستخدام في حالة عدم وجود protection.js)
if (typeof decryptConfig === 'undefined') {
    window.decryptConfig = function(encrypted) {
        try {
            const decoded = atob(encrypted);
            const configArray = JSON.parse(decoded);
            const config = {};
            
            configArray.forEach(item => {
                config[getConfigKey(item[0])] = item[1];
            });
            
            return config;
        } catch (e) {
            console.error("خطأ في فك تشفير الإعدادات");
            return null;
        }
    };

    window.getConfigKey = function(encryptedKey) {
        const keyMap = {
            "YXBpS2V5": "apiKey",
            "cHJvamVjdElk": "projectId",
            "c3RvcmFnZUJ1Y2tldA==": "storageBucket",
            "bWVzc2FnaW5nU2VuZGVySWQ=": "messagingSenderId",
            "YXBwSWQ=": "appId",
            "bWVhc3VyZW1lbnRJZA==": "measurementId"
        };
        
        return keyMap[encryptedKey] || encryptedKey;
    };
}

// ===========================================
// بدء التطبيق
// ===========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🏠 تهيئة التطبيق...');
    
    // التحقق من النطاق المسموح إذا كانت الدالة موجودة
    if (typeof checkAllowedDomain === 'function') {
        if (!checkAllowedDomain()) {
            return;
        }
    }
    
    // بدء التطبيق
    window.protectedApp = new ProtectedBeinSportApp();
    
    // إخفاء شاشة التحميل في حالة الخطأ
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen && loadingScreen.style.display !== 'none') {
            loadingScreen.style.display = 'none';
            const contentWrapper = document.getElementById('contentWrapper');
            if (contentWrapper) contentWrapper.style.display = 'block';
        }
    }, 10000); // بعد 10 ثوانٍ كحد أقصى
});
