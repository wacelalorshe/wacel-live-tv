// ===========================================
// تطبيق Bein Sport مع الحماية المحسّنة
// ===========================================

class ProtectedBeinSportApp {
    constructor() {
        this.sections = [];
        this.channels = [];
        this.currentSection = null;
        this.isInitialized = false;
        this.firebaseAvailable = false;
        this.init();
    }

    async init() {
        console.log('🚀 بدء تشغيل تطبيق Bein Sport...');
        
        try {
            // التحقق من الدومين المسموح
            this.checkDomainAccess();
            
            // إعداد السنة الحالية
            document.getElementById('currentYear').textContent = new Date().getFullYear();
            
            // إعداد مستمعي الأحداث
            this.setupEventListeners();
            
            // تهيئة Firebase
            await this.initializeFirebase();
            
            // تحميل البيانات مع إعادة المحاولة التلقائية
            await this.loadDataWithRetry();
            
            // إظهار المحتوى بعد التهيئة
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('contentWrapper').style.display = 'block';
            
            this.isInitialized = true;
            console.log('✅ تم تهيئة التطبيق بنجاح');
            
        } catch (error) {
            console.error('❌ فشل تهيئة التطبيق:', error);
            this.showErrorState('فشل في الاتصال بقاعدة البيانات. جاري استخدام البيانات المحلية...');
            await this.loadFromLocalStorage();
            
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('contentWrapper').style.display = 'block';
        }
    }

    async initializeFirebase() {
        try {
            console.log('📡 جاري الاتصال بـ Firebase...');
            
            // استخدام دالة تهيئة Firebase العامة
            const { app, db, matchesApp, matchesDb } = await initializeFirebase();
            
            this.app = app;
            this.db = db;
            this.matchesApp = matchesApp;
            this.matchesDb = matchesDb;
            this.firebaseAvailable = true;
            
            console.log('✅ تم الاتصال بـ Firebase بنجاح');
            
        } catch (error) {
            console.error('❌ فشل الاتصال بـ Firebase:', error);
            this.firebaseAvailable = false;
            // نستمر بدون Firebase
        }
    }

    checkDomainAccess() {
        const hostname = window.location.hostname;
        const allowedDomains = ['localhost', '127.0.0.1', 'aseeltv.com', 'wacellive.com'];
        
        const isLocal = hostname === 'localhost' || 
                       hostname === '127.0.0.1' ||
                       hostname.startsWith('192.168.') ||
                       hostname.startsWith('10.0.') ||
                       hostname === '';
        
        const isAllowed = isLocal || allowedDomains.some(domain => hostname.includes(domain));
        
        if (!isAllowed) {
            console.warn('⚠️ تحذير: التطبيق يعمل على نطاق غير رسمي:', hostname);
        } else {
            console.log('✅ النطاق مسموح:', hostname);
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
            let firebaseLoaded = false;
            
            if (this.firebaseAvailable && this.db) {
                firebaseLoaded = await this.loadFromFirebase();
            }
            
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
        if (!this.db) {
            console.error('❌ Firestore غير مهيأ');
            return false;
        }

        try {
            console.log('📡 جاري جلب البيانات من Firebase...');
            
            // تحميل الأقسام
            let sectionsSnapshot;
            try {
                sectionsSnapshot = await this.db.collection('sections')
                    .orderBy('order')
                    .get();
            } catch (error) {
                console.warn('⚠️ فشل في ترتيب الأقسام، جاري جلب بدون ترتيب:', error);
                sectionsSnapshot = await this.db.collection('sections').get();
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
            const channelsSnapshot = await this.db.collection('channels').get();
            if (!channelsSnapshot.empty) {
                this.channels = channelsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log(`✅ تم تحميل ${this.channels.length} قناة من Firebase`);
            }
            
            // حفظ في localStorage مع التشفير
            this.saveToLocalStorage();
            
            return true;

        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات من Firebase:', error);
            return false;
        }
    }

    async loadFromLocalStorage() {
        try {
            const savedSections = localStorage.getItem('protected_bein_sections');
            const savedChannels = localStorage.getItem('protected_bein_channels');
            
            if (savedSections) {
                this.sections = decryptData(savedSections) || [];
                console.log(`✅ تم تحميل ${this.sections.length} قسم من localStorage`);
            }
            
            if (savedChannels) {
                this.channels = decryptData(savedChannels) || [];
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
            localStorage.setItem('protected_bein_sections', encryptData(this.sections));
            localStorage.setItem('protected_bein_channels', encryptData(this.channels));
            console.log('💾 تم حفظ البيانات في التخزين المحلي مع التشفير');
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
            .sort((a, b) => (a.order || 999) - (b.order || 999));
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
                    // إنشاء رابط فريد لكل قسم
                    const sectionLink = `section.html?id=${section.id}`;
                    
                    return `
                        <a href="${sectionLink}" class="section-card-link" target="_blank">
                            <div class="section-card" data-section-id="${section.id}">
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
                                <div class="section-link-indicator">
                                    <i class="uil uil-external-link-alt"></i>
                                    <span>فتح في صفحة جديدة</span>
                                </div>
                            </div>
                        </a>
                    `;
                }).join('')}
            </div>
        `;

        // إضافة أنماط CSS للروابط
        this.addSectionLinkStyles();
    }

    addSectionLinkStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .section-card-link {
                text-decoration: none;
                color: inherit;
                display: block;
                transition: transform 0.3s ease;
            }
            
            .section-card-link:hover {
                transform: translateY(-5px);
            }
            
            .section-link-indicator {
                position: absolute;
                bottom: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.7);
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 12px;
                color: #654FD4;
                display: flex;
                align-items: center;
                gap: 5px;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .section-card:hover .section-link-indicator {
                opacity: 1;
            }
            
            .section-card {
                position: relative;
                transition: all 0.3s ease;
            }
            
            .section-card:hover {
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                transform: scale(1.02);
            }
        `;
        document.head.appendChild(style);
    }

    getChannelsCount(sectionId) {
        return this.channels.filter(channel => channel.sectionId === sectionId).length;
    }

    setupEventListeners() {
        console.log('🔧 إعداد مستمعي الأحداث...');

        window.addEventListener('click', (event) => {
            if (event.target === document.getElementById('installModal')) {
                this.closeModal();
            }
        });

        const confirmInstall = document.getElementById('confirmInstall');
        if (confirmInstall) {
            confirmInstall.addEventListener('click', () => {
                window.open('https://play.google.com/store/apps/details?id=com.xpola.player', '_blank');
                this.closeModal();
            });
        }

        const cancelInstall = document.getElementById('cancelInstall');
        if (cancelInstall) {
            cancelInstall.addEventListener('click', () => {
                this.closeModal();
            });
        }
    }

    closeModal() {
        const modal = document.getElementById('installModal');
        if (modal) modal.style.display = "none";
    }

    loadDefaultData() {
        console.log('📋 استخدام البيانات الافتراضية...');
        
        this.sections = [{
            id: 'default-1',
            name: 'قنوات بي إن سبورت',
            order: 1,
            isActive: true,
            description: 'جميع قنوات بي إن سبورت الرياضية',
            image: 'https://via.placeholder.com/200x150/2F2562/FFFFFF?text=BEIN+SPORT'
        }, {
            id: 'default-2', 
            name: 'القنوات الرياضية',
            order: 2,
            isActive: true,
            description: 'أفضل القنوات الرياضية',
            image: 'https://via.placeholder.com/200x150/2F2562/FFFFFF?text=SPORTS'
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
                sectionId: 'default-1'
            },
            {
                id: 'default-2',
                name: 'bein sport 2', 
                image: 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=BEIN+2',
                url: '#',
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                downloadUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                order: 2,
                sectionId: 'default-1'
            }
        ];
        
        this.saveToLocalStorage();
    }

    async retryLoadData() {
        console.log('🔄 إعادة محاولة تحميل البيانات...');
        await this.loadDataWithRetry();
    }
}

// ===========================================
// الدوال العامة
// ===========================================

function showPage(pageId) {
    document.getElementById('mainPage').style.display = 'none';
    document.getElementById('sectionPage').style.display = 'none';
    document.getElementById('matchesPage').style.display = 'none';
    
    document.getElementById(pageId).style.display = 'block';
}

// ===========================================
// بدء التطبيق
// ===========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🏠 تهيئة التطبيق...');
    window.protectedApp = new ProtectedBeinSportApp();
});
