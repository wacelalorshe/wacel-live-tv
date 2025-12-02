// data.js - نظام هجين يدعم Firebase والبيانات المحلية

// بيانات تجريبية للطوارئ
const sampleData = {
    sections: [
        {
            id: 'bein-sports',
            name: 'قنوات بي إن سبورت',
            description: 'جميع قنوات بي إن سبورت الرياضية المميزة',
            image: 'https://i.postimg.cc/Bb0WFJfJ/Picsart-25-01-18-03-49-12-620.png',
            order: 1,
            isActive: true
        },
        {
            id: 'arabic-channels',
            name: 'القنوات العربية',
            description: 'أفضل القنوات العربية والفضائية',
            image: 'https://i.postimg.cc/Bb0WFJfJ/Picsart-25-01-18-03-49-12-620.png',
            order: 2,
            isActive: true
        },
        {
            id: 'sports-channels',
            name: 'القنوات الرياضية',
            description: 'أهم القنوات الرياضية العالمية',
            image: 'https://i.postimg.cc/Bb0WFJfJ/Picsart-25-01-18-03-49-12-620.png',
            order: 3,
            isActive: true
        },
        {
            id: 'movies-series',
            name: 'أفلام ومسلسلات',
            description: 'أحدث الأفلام والمسلسلات',
            image: 'https://i.postimg.cc/Bb0WFJfJ/Picsart-25-01-18-03-49-12-620.png',
            order: 4,
            isActive: true
        }
    ],
    
    channels: [
        // قنوات بي إن سبورت
        {
            id: 'bein-1',
            name: 'bein sport 1',
            image: 'https://i.postimg.cc/Bb0WFJfJ/Picsart-25-01-18-03-49-12-620.png',
            url: 'https://example.com/bein1',
            sectionId: 'bein-sports',
            order: 1
        },
        {
            id: 'bein-2',
            name: 'bein sport 2',
            image: 'https://i.postimg.cc/Bb0WFJfJ/Picsart-25-01-18-03-49-12-620.png',
            url: 'https://example.com/bein2',
            sectionId: 'bein-sports',
            order: 2
        },
        {
            id: 'bein-3',
            name: 'bein sport 3',
            image: 'https://i.postimg.cc/Bb0WFJfJ/Picsart-25-01-18-03-49-12-620.png',
            url: 'https://example.com/bein3',
            sectionId: 'bein-sports',
            order: 3
        },
        
        // قنوات عربية
        {
            id: 'mbc-1',
            name: 'MBC 1',
            image: 'https://i.postimg.cc/Bb0WFJfJ/Picsart-25-01-18-03-49-12-620.png',
            url: 'https://example.com/mbc1',
            sectionId: 'arabic-channels',
            order: 1
        },
        {
            id: 'mbc-2',
            name: 'MBC 2',
            image: 'https://i.postimg.cc/Bb0WFJfJ/Picsart-25-01-18-03-49-12-620.png',
            url: 'https://example.com/mbc2',
            sectionId: 'arabic-channels',
            order: 2
        },
        
        // قنوات رياضية
        {
            id: 'espn-1',
            name: 'ESPN 1',
            image: 'https://i.postimg.cc/Bb0WFJfJ/Picsart-25-01-18-03-49-12-620.png',
            url: 'https://example.com/espn1',
            sectionId: 'sports-channels',
            order: 1
        },
        {
            id: 'sky-sports',
            name: 'Sky Sports',
            image: 'https://i.postimg.cc/Bb0WFJfJ/Picsart-25-01-18-03-49-12-620.png',
            url: 'https://example.com/skysports',
            sectionId: 'sports-channels',
            order: 2
        },
        
        // أفلام ومسلسلات
        {
            id: 'osn-movies',
            name: 'OSN Movies',
            image: 'https://i.postimg.cc/Bb0WFJfJ/Picsart-25-01-18-03-49-12-620.png',
            url: 'https://example.com/osn',
            sectionId: 'movies-series',
            order: 1
        },
        {
            id: 'shahid',
            name: 'Shahid',
            image: 'https://i.postimg.cc/Bb0WFJfJ/Picsart-25-01-18-03-49-12-620.png',
            url: 'https://example.com/shahid',
            sectionId: 'movies-series',
            order: 2
        }
    ]
};

// إعدادات Firebase الحقيقية
const firebaseConfig = {
    apiKey: "AIzaSyAKgEiYYlmpMe0NLewulheovlTQMzVC7980",
    authDomain: "bein-42f9e.firebaseapp.com",
    projectId: "bein-42f9e",
    storageBucket: "bein-42f9e.firebasestorage.app",
    messagingSenderId: "143741167050",
    appId: "1:143741167050:web:922d3a0cddb40f67b21b33",
    measurementId: "G-JH198SKCFS"
};

class DataManager {
    constructor() {
        this.firebaseAvailable = false;
        this.db = null;
        this.sections = [];
        this.channels = [];
        this.isDataLoaded = false;
        this.loadingPromise = null;
    }
    
    // تهيئة Firebase
    async initializeFirebase() {
        try {
            console.log('🚀 محاولة تهيئة Firebase...');
            
            if (typeof firebase === 'undefined') {
                console.log('❌ Firebase SDK غير محمل');
                throw new Error('Firebase SDK غير محمل');
            }
            
            // تهيئة Firebase
            let app;
            try {
                app = firebase.initializeApp(firebaseConfig);
                console.log('✅ تم تهيئة Firebase بنجاح');
            } catch (error) {
                if (error.code === 'app/duplicate-app') {
                    console.log('⚠️ Firebase مهيأ بالفعل، استخدام النسخة الحالية');
                    app = firebase.app();
                } else {
                    throw error;
                }
            }
            
            // الحصول على Firestore
            this.db = firebase.firestore(app);
            this.firebaseAvailable = true;
            
            // اختبار الاتصال
            await this.testFirebaseConnection();
            
            return true;
            
        } catch (error) {
            console.error('❌ فشل تهيئة Firebase:', error.message);
            this.firebaseAvailable = false;
            return false;
        }
    }
    
    // اختبار اتصال Firebase
    async testFirebaseConnection() {
        try {
            console.log('🧪 اختبار اتصال Firestore...');
            // محاولة جلب مستند واحد فقط للاختبار
            await this.db.collection('test').limit(1).get();
            console.log('✅ اتصال Firestore يعمل');
        } catch (error) {
            console.log('⚠️ قد تكون هناك مشكلة في اتصال Firestore:', error.code);
            // نستمر حتى مع وجود أخطاء
        }
    }
    
    // تحميل البيانات من Firebase
    async loadFromFirebase() {
        if (!this.firebaseAvailable || !this.db) {
            console.log('⚠️ Firebase غير متاح لتحميل البيانات');
            return false;
        }
        
        try {
            console.log('📡 جاري تحميل البيانات من Firebase...');
            
            // تحميل الأقسام
            let sectionsSnapshot;
            try {
                sectionsSnapshot = await this.db.collection('sections').get();
            } catch (error) {
                console.error('❌ خطأ في تحميل الأقسام:', error.message);
                return false;
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
            try {
                const channelsSnapshot = await this.db.collection('channels').get();
                if (!channelsSnapshot.empty) {
                    this.channels = channelsSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    console.log(`✅ تم تحميل ${this.channels.length} قناة من Firebase`);
                } else {
                    console.log('ℹ️ لا توجد قنوات في Firebase');
                    this.channels = [];
                }
            } catch (error) {
                console.error('❌ خطأ في تحميل القنوات:', error.message);
                // نستمر حتى مع خطأ القنوات
                this.channels = [];
            }
            
            // حفظ نسخة في localStorage للاستخدام المستقبلي
            this.saveToLocalStorage();
            
            return true;
            
        } catch (error) {
            console.error('❌ خطأ عام في تحميل Firebase:', error.message);
            return false;
        }
    }
    
    // تحميل البيانات من localStorage
    loadFromLocalStorage() {
        try {
            console.log('💾 جاري تحميل البيانات من localStorage...');
            
            const sectionsStr = localStorage.getItem('bein_sections');
            const channelsStr = localStorage.getItem('bein_channels');
            
            if (sectionsStr) {
                this.sections = JSON.parse(sectionsStr);
                console.log(`📋 تم تحميل ${this.sections.length} قسم من localStorage`);
            } else {
                this.sections = [];
                console.log('ℹ️ لا توجد أقسام في localStorage');
            }
            
            if (channelsStr) {
                this.channels = JSON.parse(channelsStr);
                console.log(`📋 تم تحميل ${this.channels.length} قناة من localStorage`);
            } else {
                this.channels = [];
                console.log('ℹ️ لا توجد قنوات في localStorage');
            }
            
            return this.sections.length > 0;
            
        } catch (error) {
            console.error('❌ خطأ في تحميل localStorage:', error.message);
            return false;
        }
    }
    
    // استخدام البيانات الافتراضية
    useDefaultData() {
        console.log('🔄 استخدام البيانات الافتراضية');
        this.sections = [...sampleData.sections];
        this.channels = [...sampleData.channels];
        this.saveToLocalStorage();
        return true;
    }
    
    // حفظ البيانات في localStorage
    saveToLocalStorage() {
        try {
            localStorage.setItem('bein_sections', JSON.stringify(this.sections));
            localStorage.setItem('bein_channels', JSON.stringify(this.channels));
            console.log('💾 تم حفظ البيانات في localStorage');
        } catch (error) {
            console.error('❌ خطأ في حفظ البيانات:', error.message);
        }
    }
    
    // الدالة الرئيسية لتحميل البيانات
    async loadData() {
        console.log('📥 بدء تحميل البيانات...');
        
        // إذا كانت البيانات محملة بالفعل، لا نحملها مرة أخرى
        if (this.isDataLoaded) {
            console.log('ℹ️ البيانات محملة بالفعل');
            return;
        }
        
        // إذا كان هناك promise تحميل قيد التنفيذ، نعيده
        if (this.loadingPromise) {
            return this.loadingPromise;
        }
        
        // إنشاء promise جديد للتحميل
        this.loadingPromise = new Promise(async (resolve) => {
            try {
                // 1. محاولة تهيئة Firebase
                const firebaseInitialized = await this.initializeFirebase();
                
                // 2. إذا تم تهيئة Firebase بنجاح، حاول تحميل البيانات منه
                let dataLoaded = false;
                if (firebaseInitialized) {
                    dataLoaded = await this.loadFromFirebase();
                }
                
                // 3. إذا فشل تحميل Firebase، جرب localStorage
                if (!dataLoaded) {
                    dataLoaded = this.loadFromLocalStorage();
                }
                
                // 4. إذا فشل كل شيء، استخدم البيانات الافتراضية
                if (!dataLoaded || this.sections.length === 0) {
                    this.useDefaultData();
                }
                
                this.isDataLoaded = true;
                console.log('✅ تم تحميل البيانات بنجاح');
                resolve();
                
            } catch (error) {
                console.error('❌ خطأ في تحميل البيانات:', error.message);
                // حتى في حالة الخطأ، نستخدم البيانات الافتراضية
                this.useDefaultData();
                this.isDataLoaded = true;
                resolve();
            } finally {
                this.loadingPromise = null;
            }
        });
        
        return this.loadingPromise;
    }
    
    // الحصول على قسم محدد
    getSectionById(sectionId) {
        return this.sections.find(section => section.id === sectionId);
    }
    
    // الحصول على قنوات قسم محدد
    getChannelsBySectionId(sectionId) {
        return this.channels
            .filter(channel => channel.sectionId === sectionId)
            .sort((a, b) => (a.order || 999) - (b.order || 999));
    }
    
    // الحصول على جميع الأقسام النشطة
    getAllSections() {
        return this.sections
            .filter(section => section.isActive !== false)
            .sort((a, b) => (a.order || 999) - (b.order || 999));
    }
    
    // إضافة قسم جديد
    async addSection(sectionData) {
        try {
            if (this.firebaseAvailable && this.db) {
                const docRef = await this.db.collection('sections').add(sectionData);
                console.log('✅ تم إضافة قسم جديد في Firebase:', docRef.id);
                return docRef.id;
            } else {
                const newId = 'local_' + Date.now();
                this.sections.push({ id: newId, ...sectionData });
                this.saveToLocalStorage();
                console.log('✅ تم إضافة قسم جديد في localStorage:', newId);
                return newId;
            }
        } catch (error) {
            console.error('❌ خطأ في إضافة قسم:', error.message);
            throw error;
        }
    }
    
    // إضافة قناة جديدة
    async addChannel(channelData) {
        try {
            if (this.firebaseAvailable && this.db) {
                const docRef = await this.db.collection('channels').add(channelData);
                console.log('✅ تم إضافة قناة جديدة في Firebase:', docRef.id);
                return docRef.id;
            } else {
                const newId = 'local_' + Date.now();
                this.channels.push({ id: newId, ...channelData });
                this.saveToLocalStorage();
                console.log('✅ تم إضافة قناة جديدة في localStorage:', newId);
                return newId;
            }
        } catch (error) {
            console.error('❌ خطأ في إضافة قناة:', error.message);
            throw error;
        }
    }
}

// إنشاء نسخة عامة من DataManager
window.dataManager = new DataManager();

// بدء تحميل البيانات تلقائياً عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 الصفحة محملة، بدء تحميل البيانات...');
    window.dataManager.loadData();
});
