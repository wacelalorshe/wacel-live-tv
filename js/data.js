// data.js - نظام هجين (Firebase + بيانات محلية)

const sampleData = {
    sections: [...], // نفس البيانات السابقة
    channels: [...]  // نفس البيانات السابقة
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
    }
    
    // تهيئة Firebase
    async initializeFirebase() {
        try {
            if (typeof firebase === 'undefined') {
                console.log('❌ Firebase SDK غير محمل');
                return false;
            }
            
            // تهيئة Firebase
            const app = firebase.initializeApp(firebaseConfig);
            this.db = firebase.firestore(app);
            this.firebaseAvailable = true;
            
            console.log('✅ تم تهيئة Firebase بنجاح');
            return true;
            
        } catch (error) {
            if (error.code === 'app/duplicate-app') {
                console.log('⚠️ Firebase مهيأ بالفعل');
                this.db = firebase.firestore();
                this.firebaseAvailable = true;
                return true;
            }
            console.error('❌ فشل تهيئة Firebase:', error);
            return false;
        }
    }
    
    // تحميل البيانات من Firebase
    async loadFromFirebase() {
        if (!this.firebaseAvailable) {
            console.log('⚠️ Firebase غير متاح');
            return false;
        }
        
        try {
            console.log('📡 جاري تحميل البيانات من Firebase...');
            
            // تحميل الأقسام
            const sectionsSnapshot = await this.db.collection('sections').get();
            this.sections = sectionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`✅ تم تحميل ${this.sections.length} قسم من Firebase`);
            
            // تحميل القنوات
            const channelsSnapshot = await this.db.collection('channels').get();
            this.channels = channelsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`✅ تم تحميل ${this.channels.length} قناة من Firebase`);
            
            // حفظ نسخة في localStorage للاستخدام المستقبلي
            this.saveToLocalStorage();
            
            return true;
            
        } catch (error) {
            console.error('❌ خطأ في تحميل Firebase:', error);
            return false;
        }
    }
    
    // تحميل البيانات من localStorage
    loadFromLocalStorage() {
        try {
            const sections = localStorage.getItem('bein_sections');
            const channels = localStorage.getItem('bein_channels');
            
            if (sections) {
                this.sections = JSON.parse(sections);
            }
            
            if (channels) {
                this.channels = JSON.parse(channels);
            }
            
            console.log(`📋 تم تحميل ${this.sections.length} قسم و ${this.channels.length} قناة من localStorage`);
            
            return this.sections.length > 0;
            
        } catch (error) {
            console.error('❌ خطأ في تحميل localStorage:', error);
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
            console.error('❌ خطأ في حفظ البيانات:', error);
        }
    }
    
    // الدالة الرئيسية لتحميل البيانات
    async loadData() {
        console.log('📥 بدء تحميل البيانات...');
        
        // 1. محاولة تهيئة Firebase
        await this.initializeFirebase();
        
        // 2. محاولة تحميل من Firebase
        if (this.firebaseAvailable) {
            const firebaseLoaded = await this.loadFromFirebase();
            if (firebaseLoaded && this.sections.length > 0) {
                console.log('✅ تم تحميل البيانات من Firebase بنجاح');
                return;
            }
        }
        
        // 3. إذا فشل Firebase، جرب localStorage
        const localStorageLoaded = this.loadFromLocalStorage();
        if (localStorageLoaded && this.sections.length > 0) {
            console.log('✅ تم استخدام البيانات من localStorage');
            return;
        }
        
        // 4. إذا فشل كل شيء، استخدم البيانات الافتراضية
        this.useDefaultData();
        console.log('✅ تم استخدام البيانات الافتراضية');
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
    
    // الحصول على جميع الأقسام
    getAllSections() {
        return this.sections
            .filter(section => section.isActive !== false)
            .sort((a, b) => (a.order || 999) - (b.order || 999));
    }
}

// إنشاء نسخة عامة
window.dataManager = new DataManager();

// تحميل البيانات تلقائياً
document.addEventListener('DOMContentLoaded', () => {
    window.dataManager.loadData();
});
