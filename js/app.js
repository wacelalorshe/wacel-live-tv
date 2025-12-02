// ===========================================
// تطبيق Bein Sport - إصدار مصحح
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
            // إعداد السنة الحالية
            document.getElementById('currentYear').textContent = new Date().getFullYear();
            
            // إعداد مستمعي الأحداث
            this.setupEventListeners();
            
            // تهيئة Firebase
            await this.initializeFirebase();
            
            // تحميل البيانات
            await this.loadData();
            
            // إظهار المحتوى
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
            
            // استخدام دالة تهيئة Firebase الجديدة
            const { app, db } = await initializeFirebase();
            
            this.app = app;
            this.db = db;
            this.firebaseAvailable = true;
            
            console.log('✅ تم الاتصال بـ Firebase بنجاح');
            
        } catch (error) {
            console.error('❌ فشل الاتصال بـ Firebase:', error);
            this.firebaseAvailable = false;
            
            // إنشاء db وهمي للاستمرار في التطوير
            this.createMockDb();
        }
    }

    createMockDb() {
        console.log('🛠️ إنشاء قاعدة بيانات وهمية للتطوير');
        
        // كائن وهمي لمحاكاة Firestore
        this.db = {
            collection: (name) => ({
                where: () => ({ get: async () => ({ empty: true, docs: [] }) }),
                orderBy: () => ({ get: async () => ({ empty: true, docs: [] }) }),
                doc: () => ({ get: async () => ({ exists: false }) }),
                get: async () => ({ empty: true, docs: [] }),
                limit: () => ({ get: async () => ({ empty: true, docs: [] }) })
            })
        };
    }

    async loadData() {
        try {
            // محاولة تحميل من Firebase أولاً
            if (this.firebaseAvailable) {
                const loaded = await this.loadFromFirebase();
                if (loaded) {
                    console.log('✅ تم تحميل البيانات من Firebase');
                    this.renderData();
                    return;
                }
            }
            
            // إذا فشل Firebase، جرب localStorage
            console.log('💾 جاري تحميل البيانات من التخزين المحلي...');
            await this.loadFromLocalStorage();
            this.renderData();
            
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات:', error);
            this.loadDefaultData();
            this.renderData();
        }
    }

    async loadFromFirebase() {
        if (!this.db) {
            console.error('❌ قاعدة البيانات غير متاحة');
            return false;
        }

        try {
            console.log('📡 جاري جلب البيانات من Firebase...');
            
            // جلب الأقسام
            let sectionsSnapshot;
            try {
                sectionsSnapshot = await this.db.collection('sections').get();
            } catch (error) {
                console.error('❌ خطأ في جلب الأقسام:', error);
                return false;
            }
            
            if (sectionsSnapshot.empty) {
                console.log('ℹ️ لا توجد أقسام في قاعدة البيانات');
                return false;
            }
            
            this.sections = sectionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`✅ تم تحميل ${this.sections.length} قسم من Firebase`);
            
            // جلب القنوات
            try {
                const channelsSnapshot = await this.db.collection('channels').get();
                if (!channelsSnapshot.empty) {
                    this.channels = channelsSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    console.log(`✅ تم تحميل ${this.channels.length} قناة من Firebase`);
                }
            } catch (error) {
                console.warn('⚠️ خطأ في جلب القنوات:', error);
                // نستمر بدون القنوات
            }
            
            // حفظ نسخة في localStorage
            this.saveToLocalStorage();
            
            return true;
            
        } catch (error) {
            console.error('❌ خطأ عام في جلب البيانات:', error);
            return false;
        }
    }

    async loadFromLocalStorage() {
        try {
            // محاولة استخدام البيانات المشفرة
            const encryptedSections = localStorage.getItem('protected_bein_sections');
            const encryptedChannels = localStorage.getItem('protected_bein_channels');
            
            if (encryptedSections) {
                this.sections = decryptData(encryptedSections) || [];
                console.log(`✅ تم تحميل ${this.sections.length} قسم من localStorage`);
            }
            
            if (encryptedChannels) {
                this.channels = decryptData(encryptedChannels) || [];
                console.log(`✅ تم تحميل ${this.channels.length} قناة من localStorage`);
            }
            
            // إذا لم توجد بيانات مشفرة، جرب البيانات غير المشفرة
            if (this.sections.length === 0) {
                const plainSections = localStorage.getItem('bein_sections');
                if (plainSections) {
                    this.sections = JSON.parse(plainSections);
                    console.log(`📝 تم تحميل ${this.sections.length} قسم (غير مشفر)`);
                }
            }
            
            if (this.channels.length === 0) {
                const plainChannels = localStorage.getItem('bein_channels');
                if (plainChannels) {
                    this.channels = JSON.parse(plainChannels);
                    console.log(`📝 تم تحميل ${this.channels.length} قناة (غير مشفر)`);
                }
            }
            
            // إذا لم توجد بيانات أبداً
            if (this.sections.length === 0 && this.channels.length === 0) {
                this.loadDefaultData();
            }
            
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات المحلية:', error);
            this.loadDefaultData();
        }
    }

    saveToLocalStorage() {
        try {
            // حفظ نسخة مشفرة
            localStorage.setItem('protected_bein_sections', encryptData(this.sections));
            localStorage.setItem('protected_bein_channels', encryptData(this.channels));
            
            // حفظ نسخة غير مشفرة للتوافق
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
            container.innerHTML = `
                <div class="loading">
                    <i class="uil uil-folder text-muted mb-3" style="font-size: 3rem;"></i>
                    <p>لا توجد أقسام متاحة حالياً</p>
                    <button class="btn btn-primary mt-2" onclick="protectedApp.loadDefaultData()">
                        <i class="uil uil-plus-circle"></i> استخدام بيانات تجريبية
                    </button>
                </div>
            `;
            return;
        }

        console.log(`🎯 عرض ${activeSections.length} قسم في الواجهة`);
        
        container.innerHTML = `
            <div class="sections-grid">
                ${activeSections.map(section => {
                    const channelCount = this.getChannelsCount(section.id);
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

        this.addSectionLinkStyles();
    }

    addSectionLinkStyles() {
        // إضافة الأنماط مرة واحدة فقط
        if (!document.querySelector('#section-link-styles')) {
            const style = document.createElement('style');
            style.id = 'section-link-styles';
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
            `;
            document.head.appendChild(style);
        }
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
        console.log('📋 إنشاء بيانات تجريبية...');
        
        this.sections = [
            {
                id: 'bein-sports',
                name: 'قنوات بي إن سبورت',
                order: 1,
                isActive: true,
                description: 'جميع قنوات بي إن سبورت الرياضية',
                image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/BeIN_Sports_logo.svg/1200px-BeIN_Sports_logo.svg.png'
            },
            {
                id: 'arabic-channels', 
                name: 'القنوات العربية',
                order: 2,
                isActive: true,
                description: 'أفضل القنوات العربية والفضائية',
                image: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png'
            },
            {
                id: 'sports-channels',
                name: 'القنوات الرياضية',
                order: 3,
                isActive: true,
                description: 'القنوات الرياضية العالمية',
                image: 'https://cdn-icons-png.flaticon.com/512/857/857492.png'
            }
        ];
        
        this.channels = [
            {
                id: 'bein-1',
                name: 'bein sport 1',
                image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Bein_sports_1.png/320px-Bein_sports_1.png',
                url: '#',
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                downloadUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                order: 1,
                sectionId: 'bein-sports'
            },
            {
                id: 'bein-2',
                name: 'bein sport 2', 
                image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Bein_sports_2.png/320px-Bein_sports_2.png',
                url: '#',
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                downloadUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                order: 2,
                sectionId: 'bein-sports'
            },
            {
                id: 'bein-3',
                name: 'bein sport 3',
                image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Bein_sports_3.png/320px-Bein_sports_3.png',
                url: '#',
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                downloadUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                order: 3,
                sectionId: 'bein-sports'
            }
        ];
        
        this.saveToLocalStorage();
        
        // عرض رسالة نجاح
        if (typeof showToast === 'function') {
            showToast('تم تحميل البيانات التجريبية بنجاح', 'success');
        }
    }

    async retryLoadData() {
        console.log('🔄 إعادة محاولة تحميل البيانات...');
        await this.loadData();
    }
}

// ===========================================
// بدء التطبيق
// ===========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🏠 تهيئة التطبيق...');
    window.protectedApp = new ProtectedBeinSportApp();
});
