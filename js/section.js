// ===========================================
// تطبيق صفحة القسم المنفصلة
// ===========================================

class SectionPageApp {
    constructor() {
        this.sectionId = null;
        this.section = null;
        this.channels = [];
        this.db = null;
        this.init();
    }

    async init() {
        console.log('🚀 بدء تشغيل صفحة القسم المنفصلة...');
        
        try {
            // الحصول على معرف القسم من الرابط
            this.getSectionIdFromURL();
            
            if (!this.sectionId) {
                this.showError('لم يتم تحديد القسم. الرابط غير صالح.');
                return;
            }
            
            // إعداد السنة الحالية
            document.getElementById('currentYear').textContent = new Date().getFullYear();
            
            // إعداد مستمعي الأحداث
            this.setupEventListeners();
            
            // محاولة الاتصال بـ Firebase
            await this.initializeFirebase();
            
            // تحميل بيانات القسم
            await this.loadSectionData();
            
            // إظهار المحتوى
            document.getElementById('pageLoadingScreen').style.display = 'none';
            document.getElementById('pageContentWrapper').style.display = 'block';
            
            console.log('✅ تم تهيئة صفحة القسم بنجاح');
            
        } catch (error) {
            console.error('❌ خطأ في تحميل الصفحة:', error);
            this.showError('حدث خطأ أثناء تحميل القسم. جاري استخدام البيانات المحلية...');
            await this.loadFromLocalStorage();
            
            document.getElementById('pageLoadingScreen').style.display = 'none';
            document.getElementById('pageContentWrapper').style.display = 'block';
        }
    }

    async initializeFirebase() {
        try {
            // استخدام دالة تهيئة Firebase العامة
            const { app, db } = await initializeFirebase();
            this.db = db;
            console.log('✅ تم الاتصال بـ Firebase بنجاح');
        } catch (error) {
            console.error('❌ فشل الاتصال بـ Firebase:', error);
            this.db = null;
        }
    }

    getSectionIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        this.sectionId = urlParams.get('id');
        
        console.log('📋 معرف القسم من الرابط:', this.sectionId);
        
        if (!this.sectionId) {
            console.error('❌ لم يتم تحديد معرف القسم في الرابط');
            return;
        }
    }

    async loadSectionData() {
        try {
            let loadedFromFirebase = false;
            
            // محاولة تحميل من Firebase أولاً
            if (this.db) {
                loadedFromFirebase = await this.loadFromFirebase();
            }
            
            // إذا فشل تحميل Firebase، استخدم localStorage
            if (!loadedFromFirebase) {
                await this.loadFromLocalStorage();
            }
            
            this.renderData();
            
        } catch (error) {
            console.error('❌ خطأ في تحميل بيانات القسم:', error);
            throw error;
        }
    }

    async loadFromFirebase() {
        if (!this.db) {
            throw new Error('Firestore غير مهيأ');
        }

        try {
            console.log('📡 جاري جلب بيانات القسم من Firebase...');
            
            // جلب بيانات القسم
            const sectionDoc = await this.db.collection('sections').doc(this.sectionId).get();
            
            if (!sectionDoc.exists) {
                throw new Error('القسم غير موجود في قاعدة البيانات');
            }

            this.section = {
                id: sectionDoc.id,
                ...sectionDoc.data()
            };
            
            console.log('✅ تم تحميل بيانات القسم من Firebase:', this.section.name);
            
            // جلب قنوات القسم
            const channelsSnapshot = await this.db.collection('channels')
                .where('sectionId', '==', this.sectionId)
                .get();

            this.channels = channelsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`✅ تم تحميل ${this.channels.length} قناة من Firebase`);
            
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
                const sections = decryptData(savedSections) || [];
                this.section = sections.find(s => s.id === this.sectionId);
            }
            
            if (savedChannels) {
                const allChannels = decryptData(savedChannels) || [];
                this.channels = allChannels.filter(channel => channel.sectionId === this.sectionId);
            }
            
            if (!this.section) {
                throw new Error('القسم غير موجود في التخزين المحلي');
            }
            
            console.log(`✅ تم تحميل ${this.channels.length} قناة من localStorage`);
            
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات المحلية:', error);
            throw error;
        }
    }

    renderData() {
        // تحديث عنوان الصفحة
        document.getElementById('sectionHeader').textContent = this.section.name;
        document.getElementById('sectionName').textContent = this.section.name;
        document.title = `${this.section.name} - Aseel TV`;
        
        // تحديث وصف القسم
        const description = this.section.description || 
                          `استمتع بمشاهدة ${this.channels.length} قناة متاحة في قسم ${this.section.name}`;
        document.getElementById('sectionDescription').textContent = description;
        
        // عرض القنوات
        this.renderChannels();
    }

    renderChannels() {
        const container = document.getElementById('channelsContainer');
        if (!container) {
            console.error('❌ حاوية القنوات غير موجودة');
            return;
        }

        // ترتيب القنوات حسب الترتيب
        const sortedChannels = this.channels.sort((a, b) => (a.order || 999) - (b.order || 999));
        
        if (sortedChannels.length === 0) {
            container.innerHTML = `
                <div class="loading">
                    <i class="uil uil-tv-retro" style="font-size: 4rem; color: #6c757d;"></i>
                    <h4 class="mt-3 text-muted">لا توجد قنوات في هذا القسم</h4>
                    <p>سيتم إضافة القنوات قريباً</p>
                    <a href="index.html" class="btn btn-primary mt-3">
                        <i class="uil uil-arrow-left"></i> العودة للأقسام
                    </a>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="channels-grid">
                ${sortedChannels.map(channel => `
                    <div class="channel-card" data-channel-id="${channel.id}" onclick="sectionPageApp.openChannel('${channel.id}')">
                        <div class="channel-logo">
                            <img src="${channel.image || 'https://via.placeholder.com/100x100/2F2562/FFFFFF?text=TV'}" 
                                 alt="${channel.name}"
                                 onerror="this.src='https://via.placeholder.com/100x100/2F2562/FFFFFF?text=TV'">
                        </div>
                        <div class="channel-name">${channel.name}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    openChannel(channelId) {
        const channel = this.channels.find(c => c.id === channelId);
        if (!channel) return;

        console.log('🔗 فتح القناة:', channel.name);
        
        if (channel.url && channel.url !== '#' && channel.url.trim() !== '') {
            try {
                // فتح الرابط في نافذة جديدة
                window.open(channel.url, '_blank');
            } catch (error) {
                console.error('❌ خطأ في فتح الرابط:', error);
                this.showInstallModal(channel);
            }
        } else {
            this.showInstallModal(channel);
        }
    }

    showInstallModal(channel) {
        const modal = document.getElementById('installModal');
        if (modal) {
            modal.style.display = "block";
            const confirmBtn = document.getElementById('confirmInstall');
            if (confirmBtn) {
                confirmBtn.onclick = () => {
                    const downloadUrl = channel.downloadUrl || channel.appUrl || 'https://play.google.com/store/apps/details?id=com.xpola.player';
                    window.open(downloadUrl, '_blank');
                    this.closeModal();
                };
            }
        }
    }

    closeModal() {
        const modal = document.getElementById('installModal');
        if (modal) modal.style.display = "none";
        
        // إعادة تعيين الحدث
        const confirmBtn = document.getElementById('confirmInstall');
        if (confirmBtn) {
            confirmBtn.onclick = null;
        }
    }

    showError(message) {
        const container = document.getElementById('channelsContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <i class="uil uil-exclamation-triangle" style="font-size: 4rem; color: #dc3545;"></i>
                    <h4 class="mt-3">${message}</h4>
                    <a href="index.html" class="btn btn-primary mt-3">
                        <i class="uil uil-arrow-left"></i> العودة للأقسام
                    </a>
                </div>
            `;
        }
    }

    setupEventListeners() {
        console.log('🔧 إعداد مستمعي الأحداث...');

        // إغلاق نافذة التثبيت عند النقر خارجها
        window.addEventListener('click', (event) => {
            if (event.target === document.getElementById('installModal')) {
                this.closeModal();
            }
        });

        // زر تأكيد التثبيت
        const confirmInstall = document.getElementById('confirmInstall');
        if (confirmInstall) {
            confirmInstall.addEventListener('click', () => {
                window.open('https://play.google.com/store/apps/details?id=com.xpola.player', '_blank');
                this.closeModal();
            });
        }

        // زر إلغاء التثبيت
        const cancelInstall = document.getElementById('cancelInstall');
        if (cancelInstall) {
            cancelInstall.addEventListener('click', () => {
                this.closeModal();
            });
        }
    }
}

// ===========================================
// بدء تطبيق صفحة القسم
// ===========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🏠 تهيئة صفحة القسم...');
    window.sectionPageApp = new SectionPageApp();
});
