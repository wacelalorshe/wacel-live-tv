// ===========================================
// تطبيق Bein Sport مع الحماية المحسّنة
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
            // تهيئة Firebase مع إعادة المحاولة التلقائية
            const { app, db, matchesApp, matchesDb } = await initializeFirebase();
            this.db = db;
            this.matchesDb = matchesDb;
            
            // إعداد السنة الحالية
            document.getElementById('currentYear').textContent = new Date().getFullYear();
            
            // إعداد مستمعي الأحداث
            this.setupEventListeners();
            
            // تحميل البيانات مع إعادة المحاولة التلقائية
            await this.loadDataWithRetry();
            
            // إظهار المحتوى بعد التهيئة
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('contentWrapper').style.display = 'block';
            
            this.isInitialized = true;
            console.log('✅ تم تهيئة التطبيق مع الحماية بنجاح');
            
        } catch (error) {
            console.error('❌ فشل تهيئة التطبيق:', error);
            this.showErrorState('فشل في الاتصال بقاعدة البيانات. جاري استخدام البيانات المحلية...');
            await this.loadFromLocalStorage();
            
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('contentWrapper').style.display = 'block';
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
                        <div class="section-card" data-section-id="${section.id}">
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
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        this.setupSectionEventListeners();
    }

    getChannelsCount(sectionId) {
        return this.channels.filter(channel => channel.sectionId === sectionId).length;
    }

    setupSectionEventListeners() {
        const sectionCards = document.querySelectorAll('.section-card');
        sectionCards.forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = card.getAttribute('data-section-id');
                console.log('🎯 تم النقر على القسم:', sectionId);
                this.showSection(sectionId);
            });
        });
    }

    showSection(sectionId) {
        console.log('📂 محاولة عرض القسم:', sectionId);
        
        const section = this.sections.find(s => s.id === sectionId);
        if (!section) {
            console.error('❌ القسم غير موجود:', sectionId);
            return;
        }

        this.currentSection = section;
        
        document.getElementById('sectionHeader').textContent = section.name;
        document.getElementById('sectionName').textContent = section.name;
        document.getElementById('sectionDescription').textContent = section.description || 'استمتع بمشاهدة القنوات المتاحة في هذا القسم';
        
        this.renderSectionChannels(sectionId);
        
        showPage('sectionPage');
    }

    renderSectionChannels(sectionId) {
        const container = document.getElementById('channelsContainer');
        if (!container) {
            console.error('❌ حاوية القنوات غير موجودة');
            return;
        }

        const sectionChannels = this.channels
            .filter(channel => channel.sectionId === sectionId)
            .sort((a, b) => (a.order || 1) - (b.order || 1));

        console.log(`📺 عرض ${sectionChannels.length} قناة في قسم ${sectionId}`);

        if (sectionChannels.length === 0) {
            container.innerHTML = '<div class="loading">لا توجد قنوات في هذا القسم</div>';
            return;
        }

        container.innerHTML = sectionChannels.map(channel => `
            <div class="channel-card" data-channel-id="${channel.id}">
                <div class="channel-logo">
                    <img src="${channel.image || 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=No+Image'}" 
                         alt="${channel.name}"
                         onerror="this.src='https://via.placeholder.com/200x100/2F2562/FFFFFF?text=No+Image'">
                </div>
                <div class="channel-name">${channel.name}</div>
            </div>
        `).join('');

        this.setupChannelEventListeners(sectionChannels);
    }

    setupChannelEventListeners(sectionChannels) {
        document.querySelectorAll('.channel-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const channelId = card.getAttribute('data-channel-id');
                const channel = sectionChannels.find(c => c.id === channelId);
                if (channel) {
                    console.log('🔗 فتح القناة:', channel.name);
                    this.openChannel(channel);
                }
            });
        });
    }

    openChannel(channel) {
        if (channel.url && channel.url !== '#' && channel.url.trim() !== '') {
            try {
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
// الدوال العامة مع الحماية
// ===========================================

function showPage(pageId) {
    document.getElementById('mainPage').style.display = 'none';
    document.getElementById('sectionPage').style.display = 'none';
    document.getElementById('matchesPage').style.display = 'none';
    
    document.getElementById(pageId).style.display = 'block';
}

function loadMatches() {
    if (!window.protectedApp || !window.protectedApp.matchesDb) {
        showToast('التطبيق غير مهيأ بشكل صحيح', 'warning');
        return;
    }

    const container = document.getElementById('matchesContainer');
    const dateElement = document.getElementById('matchesDate');
    
    const today = new Date();
    dateElement.textContent = today.toLocaleDateString('ar-AR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    container.innerHTML = '<div class="loading"><i class="uil uil-refresh"></i> جاري تحميل المباريات...</div>';

    window.protectedApp.matchesDb.ref('matches').on('value', snapshot => {
        displayMatches(snapshot);
    }, error => {
        console.error(error);
        container.innerHTML = '<div class="loading">❌ حدث خطأ في تحميل المباريات</div>';
    });
}

function displayMatches(snapshot) {
    const container = document.getElementById('matchesContainer');
    container.innerHTML = '';
    
    if (!snapshot.exists()) { 
        container.innerHTML = '<div class="loading">لا توجد مباريات اليوم</div>'; 
        return; 
    }

    const matches = snapshot.val();
    let hasMatches = false;
    
    for (const key in matches) {
        const match = matches[key];
        if (match && (match.team1 || match.team2)) {
            hasMatches = true;
            const matchDiv = document.createElement('div');
            matchDiv.className = 'match-box fade-in';
            matchDiv.innerHTML = `
                <div class="match-info">
                    <div>
                        <img src="${match.team1Logo||'https://via.placeholder.com/50x50/2F2562/FFFFFF?text=TEAM1'}" 
                             alt="${match.team1||'فريق 1'}"
                             onerror="this.src='https://via.placeholder.com/50x50/2F2562/FFFFFF?text=TEAM1'">
                        <p>${match.team1||'فريق 1'}</p>
                    </div>
                    <div>
                        <span class="match-time">${match.time||'00:00'}</span>
                    </div>
                    <div>
                        <img src="${match.team2Logo||'https://via.placeholder.com/50x50/2F2562/FFFFFF?text=TEAM2'}" 
                             alt="${match.team2||'فريق 2'}"
                             onerror="this.src='https://via.placeholder.com/50x50/2F2562/FFFFFF?text=TEAM2'">
                        <p>${match.team2||'فريق 2'}</p>
                    </div>
                </div>
                <div class="match-details">
                    <div>${match.channel||'قناة غير محددة'}</div>
                    <div>${match.commentator||'معلق غير محدد'}</div>
                </div>
                <div class="match-actions">
                    <button class="match-btn match-btn-success" onclick="openXpolaApp('${match.xmtvLink||'#'}')">
                        <i class="uil uil-play-circle"></i> مشاهدة المباراة
                    </button>
                    <button class="match-btn match-btn-info" onclick="window.open('https://play.google.com/store/apps/details?id=com.xpola.player','_blank')">
                        <i class="uil uil-import"></i> تحميل المشغل
                    </button>
                </div>
            `;
            container.appendChild(matchDiv);
        }
    }
    
    if (!hasMatches) {
        container.innerHTML = '<div class="loading">لا توجد مباريات متاحة اليوم</div>';
    }
}

function openXpolaApp(link) { 
    if (link && link !== '#') {
        window.location.href = link;
    } else {
        showToast('رابط البث غير متاح حالياً', 'warning');
    }
}

// ===========================================
// بدء التطبيق مع الحماية
// ===========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🏠 تهيئة التطبيق مع الحماية...');
    window.protectedApp = new ProtectedBeinSportApp();
});
