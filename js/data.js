// data.js - بيانات ثابتة للتجربة
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

// حفظ البيانات في localStorage
function saveDataToStorage() {
    localStorage.setItem('bein_sections', JSON.stringify(sampleData.sections));
    localStorage.setItem('bein_channels', JSON.stringify(sampleData.channels));
    console.log('✅ تم حفظ البيانات في localStorage');
}

// تحميل البيانات من localStorage
function loadDataFromStorage() {
    const sections = JSON.parse(localStorage.getItem('bein_sections') || '[]');
    const channels = JSON.parse(localStorage.getItem('bein_channels') || '[]');
    
    // إذا لم توجد بيانات، استخدم البيانات الافتراضية
    if (sections.length === 0) {
        saveDataToStorage();
        return sampleData;
    }
    
    return { sections, channels };
}

// الحصول على قسم محدد
function getSectionById(sectionId) {
    const { sections } = loadDataFromStorage();
    return sections.find(section => section.id === sectionId);
}

// الحصول على قنوات قسم محدد
function getChannelsBySectionId(sectionId) {
    const { channels } = loadDataFromStorage();
    return channels
        .filter(channel => channel.sectionId === sectionId)
        .sort((a, b) => (a.order || 999) - (b.order || 999));
}

// تصدير الدوال للاستخدام
window.dataManager = {
    saveDataToStorage,
    loadDataFromStorage,
    getSectionById,
    getChannelsBySectionId,
    sampleData
};

// حفظ البيانات عند تحميل الملف
saveDataToStorage();
