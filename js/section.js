// ===========================================
// تطبيق صفحة القسم - إصدار مصحح
// ===========================================

class SectionPageApp {
    constructor() {
        this.sectionId = null;
        this.section = null;
        this.channels = [];
        this.db = null;
        this.isInitialized = false;
        this.init();
    }

    async init() {
        console.log('🚀 بدء تشغيل صفحة القسم...');
        
        try {
            // الحصول على معرف القسم من الرابط
            this.getSectionIdFromURL();
            
            if (!this.sectionId) {
                this.showError('لم يتم تحديد القسم. الرابط غير صالح.');
                return;
            }
            
            console.log('📋 معرف القسم:', this.sectionId);
            
            // إعداد السنة الحالية
            document.getElementById('currentYear').textContent = new Date().getFullYear();
            
            // إعداد مستمعي الأحداث
            this.setupEventListeners();
            
            // تحميل بيانات القسم
            await this.loadSectionData();
            
            // إظهار المحتوى
            document.getElementById('pageLoadingScreen').style.display = 'none';
            document.getElementById('pageContentWrapper').style.display = 'block';
            
            this.isInitialized = true;
            console.log('✅ تم تحميل صفحة القسم بنجاح');
            
        } catch (error) {
            console.error('❌ خطأ في تحميل الصفحة:', error);
            this.showError('حدث خطأ أثناء تحميل القسم. جاري استخدام البيانات المحلية...');
            
            // محاولة استخدام البيانات المحلية
            try {
                await this.loadFromLocalStorage();
                this.renderData();
                
                document.getElementById('pageLoadingScreen').style.display = 'none';
                document.getElementById('pageContentWrapper').style.display = 'block';
            } catch (localError) {
                console.error('❌ فشل تحميل البيانات المحلية:', localError);
                this.showCriticalError('لا يمكن تحميل القسم. الرابط قد يكون غير صحيح.');
            }
        }
    }

    getSectionIdFromURL() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            this.sectionId = urlParams.get('id');
            
            console.log('🔗 معرف القسم من الرابط:', this.sectionId);
            
            if (!this.sectionId) {
                // محاولة الحصول من hash إذا كان في الروابط القديمة
                const hash = window.location.hash.substring(1);
                if (hash) {
                    this.sectionId = hash;
                    console.log('🔗 معرف القسم من الـ hash:', this.sectionId);
                }
            }
            
            if (!this.sectionId) {
                throw new Error('لم يتم تحديد معرف القسم');
            }
            
        } catch (error) {
            console.error('❌ خطأ في الحصول على معرف القسم:', error);
            this.sectionId = null;
        }
    }

    async loadSectionData() {
        console.log('📥 جاري تحميل بيانات القسم...');
        
        // تحديث شاشة التحميل
        const loadingScreen = document.getElementById('pageLoadingScreen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div>
                <p>جاري تحميل قنوات القسم...</p>
                <small id="loadingDetails">الاتصال بقاعدة البيانات...</small>
            `;
        }
        
        // محاولة تحميل من Firebase أولاً
        let firebaseLoaded = false;
        
        try {
            firebaseLoaded = await this.tryLoadFromFirebase();
        } catch (firebaseError) {
            console.error('❌ فشل تحميل Firebase:', firebaseError);
        }
        
        // إذا فشل Firebase، جرب localStorage
        if (!firebaseLoaded) {
            await this.loadFromLocalStorage();
        }
        
        // التحقق من وجود بيانات
        if (!this.section) {
            throw new Error('القسم غير موجود');
        }
        
        // عرض البيانات
        this.renderData();
    }

    async tryLoadFromFirebase() {
        console.log('📡 محاولة الاتصال بـ Firebase...');
        
        try {
            // محاولة تهيئة Firebase
            if (!window.firebaseApp || !window.db) {
                console.log('⚠️ Firebase غير مهيأ، جاري التهيئة...');
                
                // استخدام دالة تهيئة Firebase المباشرة
                await this.initializeFirebase();
            }
            
            if (!this.db) {
                console.log('❌ قاعدة البيانات غير متاحة بعد التهيئة');
                return false;
            }
            
            console.log('✅ Firebase مهيأ، جاري جلب البيانات...');
            
            // تحديث رسالة التحميل
            const details = document.getElementById('loadingDetails');
            if (details) details.textContent = 'جاري جلب بيانات القسم...';
            
            // جلب بيانات القسم
            const sectionDoc = await this.db.collection('sections').doc(this.sectionId).get();
            
            if (!sectionDoc.exists) {
                console.log('❌ القسم غير موجود في Firebase');
                return false;
            }
            
            this.section = {
                id: sectionDoc.id,
                ...sectionDoc.data()
            };
            
            console.log('✅ تم تحميل بيانات القسم:', this.section.name);
            
            // تحديث رسالة التحميل
            if (details) details.textContent = 'جاري جلب القنوات...';
            
            // جلب القنوات
            const channelsSnapshot = await this.db.collection('channels')
                .where('sectionId', '==', this.sectionId)
                .get();
            
            this.channels = channelsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`✅ تم تحميل ${this.channels.length} قناة`);
            
            // حفظ نسخة في localStorage للاستخدام المستقبلي
            this.saveToLocalStorage();
            
            return true;
            
        } catch (error) {
            console.error('❌ خطأ في تحميل Firebase:', error);
            
            if (error.code === 'permission-denied') {
                console.log('🔒 صلاحيات غير كافية للوصول إلى Firebase');
            } else if (error.code === 'unavailable') {
                console.log('🌐 Firebase غير متاح (مشكلة في الشبكة)');
            }
            
            return false;
        }
    }

    async initializeFirebase() {
        try {
            console.log('🚀 جاري تهيئة Firebase...');
            
            // إعدادات Firebase مباشرة
            const firebaseConfig = {
                apiKey: "AIzaSyAKgEiYYlmpMe0NLewulheovlTQMzVC7980",
                authDomain: "bein-42f9e.firebaseapp.com",
                projectId: "bein-42f9e",
                storageBucket: "bein-42f9e.firebasestorage.app",
                messagingSenderId: "143741167050",
                appId: "1:143741167050:web:922d3a0cddb40f67b21b33",
                measurementId: "G-JH198SKCFS"
            };
            
            // تهيئة Firebase
            const app = firebase.initializeApp(firebaseConfig);
            this.db = firebase.firestore(app);
            
            // حفظ في المتغيرات العامة
            window.firebaseApp = app;
            window.db = this.db;
            
            console.log('✅ تم تهيئة Firebase بنجاح');
            
        } catch (error) {
            if (error.code === 'app/duplicate-app') {
                console.log('⚠️ Firebase مهيأ بالفعل، جاري استخدام النسخة الحالية');
                this.db = window.db || firebase.firestore();
            } else {
                console.error('❌ فشل تهيئة Firebase:', error);
                throw error;
            }
        }
    }

    async loadFromLocalStorage() {
        console.log('💾 جاري تحميل البيانات من التخزين المحلي...');
        
        // تحديث رسالة التحميل
        const details = document.getElementById('loadingDetails');
        if (details) details.textContent = 'جاري تحميل من التخزين المحلي...';
        
        // محاولة عدة مصادر للبيانات
        const dataSources = [
            // 1. البيانات المشفرة الجديدة
            () => {
                const encrypted = localStorage.getItem('protected_bein_sections');
                return encrypted ? decryptData(encrypted) : null;
            },
            // 2. البيانات غير المشفرة القديمة
            () => {
                const plain = localStorage.getItem('bein_sections');
                return plain ? JSON.parse(plain) : null;
            },
            // 3. البيانات من التطبيق الرئيسي
            () => {
                const mainData = window.opener ? window.opener.protectedApp?.sections : null;
                return mainData || null;
            }
        ];
        
        // البحث في جميع المصادر
        for (const source of dataSources) {
            try {
                const sections = source();
                if (sections && Array.isArray(sections)) {
                    const section = sections.find(s => s.id === this.sectionId);
                    if (section) {
                        this.section = section;
                        break;
                    }
                }
            } catch (error) {
                console.warn('⚠️ خطأ في مصدر بيانات:', error);
            }
        }
        
        if (!this.section) {
            throw new Error('القسم غير موجود في التخزين المحلي');
        }
        
        console.log('✅ تم العثور على القسم في localStorage:', this.section.name);
        
        // جلب القنوات
        const channelSources = [
            () => {
                const encrypted = localStorage.getItem('protected_bein_channels');
                return encrypted ? decryptData(encrypted) : null;
            },
            () => {
                const plain = localStorage.getItem('bein_channels');
                return plain ? JSON.parse(plain) : null;
            },
            () => {
                const mainData = window.opener ? window.opener.protectedApp?.channels : null;
                return mainData || null;
            }
        ];
        
        for (const source of channelSources) {
            try {
                const allChannels = source();
                if (allChannels && Array.isArray(allChannels)) {
                    this.channels = allChannels
                        .filter(channel => channel.sectionId === this.sectionId)
                        .sort((a, b) => (a.order || 999) - (b.order || 999));
                    
                    if (this.channels.length > 0) {
                        break;
                    }
                }
            } catch (error) {
                console.warn('⚠️ خطأ في مصدر القنوات:', error);
            }
        }
        
        console.log(`✅ تم تحميل ${this.channels.length} قناة من localStorage`);
        
        // إذا لم توجد قنوات، نستخدم بيانات تجريبية
        if (this.channels.length === 0) {
            this.loadSampleChannels();
        }
    }

    loadSampleChannels() {
        console.log('📋 استخدام بيانات قنوات تجريبية...');
        
        // بيانات تجريبية للقنوات
        const sampleChannels = {
            'bein-sports': [
                { id: 'sample-1', name: 'bein sport 1', image: 'https://via.placeholder.com/100x100/2F2562/FFFFFF?text=BEIN+1', order: 1 },
                { id: 'sample-2', name: 'bein sport 2', image: 'https://via.placeholder.com/100x100/2F2562/FFFFFF?text=BEIN+2', order: 2 },
                { id: 'sample-3', name: 'bein sport 3', image: 'https://via.placeholder.com/100x100/2F2562/FFFFFF?text=BEIN+3', order: 3 }
            ],
            'arabic-channels': [
                { id: 'sample-4', name: 'القناة العربية', image: 'https://via.placeholder.com/100x100/2F2562/FFFFFF?text=ARABIC', order: 1 },
                { id: 'sample-5', name: 'القناة الفضائية', image: 'https://via.placeholder.com/100x100/2F2562/FFFFFF?text=SATELLITE', order: 2 }
            ],
            'sports-channels': [
                { id: 'sample-6', name: 'قناة رياضية 1', image: 'https://via.placeholder.com/100x100/2F2562/FFFFFF?text=SPORTS+1', order: 1 },
                { id: 'sample-7', name: 'قناة رياضية 2', image: 'https://via.placeholder.com/100x100/2F2562/FFFFFF?text=SPORTS+2', order: 2 }
            ]
        };
        
        // الحصول على القنوات التجريبية حسب القسم
        this.channels = sampleChannels[this.sectionId] || [
            { id: 'sample-default', name: 'قناة تجريبية', image: 'https://via.placeholder.com/100x100/2F2562/FFFFFF?text=TV', order: 1 }
        ];
        
        // إضافة بيانات إضافية لكل قناة
        this.channels = this.channels.map(channel => ({
            ...channel,
            sectionId: this.sectionId,
            url: '#',
            appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
            downloadUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player'
        }));
        
        console.log(`✅ تم إنشاء ${this.channels.length} قناة تجريبية`);
    }

    saveToLocalStorage() {
        try {
            // لا نحتاج لحفظ كامل البيانات، فقط نضمن وجود القسم الحالي
            localStorage.setItem(`section_${this.sectionId}_data`, JSON.stringify({
                section: this.section,
                channels: this.channels,
                timestamp: new Date().getTime()
            }));
            
            console.log('💾 تم حفظ بيانات القسم في localStorage');
        } catch (error) {
            console.error('❌ خطأ في حفظ البيانات محلياً:', error);
        }
    }

    renderData() {
        console.log('🎨 جاري عرض البيانات...');
        
        // تحديث عنوان الصفحة
        document.getElementById('sectionHeader').textContent = this.section.name;
        document.getElementById('sectionName').textContent = this.section.name;
        document.title = `${this.section.name} - Aseel TV`;
        
        // تحديث وصف القسم
        const description = this.section.description || 
                          `استمتع بمشاهدة ${this.channels.length} قناة متاحة في هذا القسم`;
        document.getElementById('sectionDescription').textContent = description;
        
        // عرض القنوات
        this.renderChannels();
        
        // إضافة أنماط CSS إذا لم تكن موجودة
        this.addStyles();
    }

    renderChannels() {
        const container = document.getElementById('channelsContainer');
        if (!container) {
            console.error('❌ حاوية القنوات غير موجودة');
            return;
        }
        
        // ترتيب القنوات حسب الترتيب
        const sortedChannels = this.channels.sort((a, b) => (a.order || 999) - (b.order || 999));
        
        console.log(`📺 جاري عرض ${sortedChannels.length} قناة`);
        
        if (sortedChannels.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 50px; color: #B8B8B8;">
                    <i class="uil uil-tv-retro" style="font-size: 4rem; display: block; margin-bottom: 20px;"></i>
                    <h4>لا توجد قنوات في هذا القسم</h4>
                    <p>سيتم إضافة القنوات قريباً</p>
                    <a href="index.html" class="btn btn-primary mt-4" style="padding: 10px 30px;">
                        <i class="uil uil-arrow-left"></i> العودة للأقسام
                    </a>
                </div>
            `;
            return;
        }
        
        // إنشاء HTML للقنوات
        container.innerHTML = `
            <div class="channels-grid">
                ${sortedChannels.map((channel, index) => `
                    <div class="channel-card" data-channel-id="${channel.id}" 
                         onclick="sectionPageApp.openChannel(${index})"
                         style="animation-delay: ${index * 0.1}s">
                        <div class="channel-logo">
                            <img src="${channel.image || 'https://via.placeholder.com/100x100/2F2562/FFFFFF?text=TV'}" 
                                 alt="${channel.name}"
                                 onerror="this.src='https://via.placeholder.com/100x100/2F2562/FFFFFF?text=TV'">
                        </div>
                        <div class="channel-name">${channel.name}</div>
                        <div class="channel-overlay">
                            <i class="uil uil-play-circle"></i>
                            <span>مشاهدة القناة</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // إضافة تأثيرات للقنوات
        this.animateChannels();
    }

    addStyles() {
        // إضافة الأنماط إذا لم تكن موجودة
        if (!document.querySelector('#section-styles')) {
            const style = document.createElement('style');
            style.id = 'section-styles';
            style.textContent = `
                .channels-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 20px;
                    padding: 20px 0;
                }
                
                .channel-card {
                    background: linear-gradient(135deg, rgba(47, 37, 98, 0.9), rgba(58, 66, 102, 0.9));
                    border-radius: 15px;
                    padding: 20px;
                    text-align: center;
                    border: 1px solid #42318F;
                    transition: all 0.3s ease;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                    opacity: 0;
                    transform: translateY(20px);
                    animation: fadeInUp 0.5s ease forwards;
                }
                
                @keyframes fadeInUp {
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .channel-card:hover {
                    transform: translateY(-10px) scale(1.03);
                    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
                    border-color: #654FD4;
                }
                
                .channel-logo {
                    width: 100px;
                    height: 100px;
                    margin: 0 auto 15px;
                    border-radius: 50%;
                    overflow: hidden;
                    border: 3px solid #42318F;
                    background: #1A1A2E;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .channel-logo img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                
                .channel-name {
                    color: #E1E1E1;
                    font-size: 18px;
                    font-weight: bold;
                    margin-top: 10px;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                }
                
                .channel-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(101, 79, 212, 0.9);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    border-radius: 15px;
                    color: white;
                    font-size: 16px;
                    font-weight: bold;
                }
                
                .channel-card:hover .channel-overlay {
                    opacity: 1;
                }
                
                .channel-overlay i {
                    font-size: 2.5rem;
                    margin-bottom: 10px;
                }
            `;
            document.head.appendChild(style);
        }
    }

    animateChannels() {
        // إضافة تأثيرات للقنوات بعد تحميلها
        setTimeout(() => {
            const cards = document.querySelectorAll('.channel-card');
            cards.forEach((card, index) => {
                card.style.animationDelay = `${index * 0.1}s`;
            });
        }, 100);
    }

    openChannel(index) {
        const channel = this.channels[index];
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
            
            // تحديث زر التأكيد
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
    }

    showError(message) {
        const container = document.getElementById('channelsContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 50px; color: #dc3545;">
                    <i class="uil uil-exclamation-triangle" style="font-size: 4rem; display: block; margin-bottom: 20px;"></i>
                    <h4>${message}</h4>
                    <a href="index.html" class="btn btn-primary mt-4" style="padding: 10px 30px;">
                        <i class="uil uil-arrow-left"></i> العودة للأقسام
                    </a>
                </div>
            `;
        }
        
        // إخفاء شاشة التحميل
        document.getElementById('pageLoadingScreen').style.display = 'none';
        document.getElementById('pageContentWrapper').style.display = 'block';
    }

    showCriticalError(message) {
        // عرض رسالة خطأ في كامل الصفحة
        document.body.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(to right, #322769, #151825, #322769);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: white;
                text-align: center;
                padding: 20px;
            ">
                <i class="uil uil-exclamation-triangle" style="font-size: 5rem; color: #dc3545; margin-bottom: 30px;"></i>
                <h1 style="margin-bottom: 20px;">خطأ في تحميل القسم</h1>
                <p style="font-size: 18px; margin-bottom: 30px; max-width: 500px;">${message}</p>
                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <a href="index.html" class="btn btn-primary" style="padding: 12px 30px;">
                        <i class="uil uil-arrow-left"></i> العودة للأقسام
                    </a>
                    <button onclick="location.reload()" class="btn btn-secondary" style="padding: 12px 30px;">
                        <i class="uil uil-redo"></i> إعادة تحميل الصفحة
                    </button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        console.log('🔧 إعداد مستمعي الأحداث...');

        // إغلاق نافذة التثبيت عند النقر خارجها
        window.addEventListener('click', (event) => {
            if (event.target === document.getElementById('installModal')) {
                this.closeModal();
            }
        });

        // زر تأكيد التثبيت العام
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

// دالة مساعدة لفك التشفير (إذا لم تكن موجودة)
if (typeof decryptData === 'undefined') {
    window.decryptData = function(encrypted) {
        try {
            return JSON.parse(atob(encrypted));
        } catch (e) {
            console.error('خطأ في فك تشفير البيانات');
            return null;
        }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('🏠 تهيئة صفحة القسم...');
    window.sectionPageApp = new SectionPageApp();
});
