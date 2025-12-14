// matches.js
// تطبيق عرض جدول المباريات
class MatchApp {
    constructor() {
        this.matches = [];
        this.channels = [];
        this.hasInstalledApp = localStorage.getItem('app_installed') === 'true';
        this.currentFilter = 'today';
        this.init();
    }

    async init() {
        console.log('⚽ بدء تشغيل جدول المباريات...');
        
        // تعيين السنة الحالية
        document.getElementById('currentYear').textContent = new Date().getFullYear();
        
        // تحميل البيانات
        await this.loadData();
        
        // إعداد نقرات الأزرار
        this.setupEventListeners();
        
        console.log('✅ تم تهيئة جدول المباريات بنجاح');
    }

    async loadData() {
        console.log('📥 جاري تحميل بيانات المباريات...');
        
        // عرض حالة التحميل
        this.showLoading();
        
        try {
            // المحاولة الأولى: من Firebase
            try {
                await this.loadFromFirebase();
                console.log('✅ تم تحميل بيانات المباريات من Firebase');
                return;
            } catch (firebaseError) {
                console.warn('⚠️ فشل تحميل Firebase:', firebaseError.message);
                
                // إذا فشل Firebase، حاول استخدام localStorage تلقائياً
                try {
                    await this.loadFromLocalStorage();
                    console.log('✅ تم تحميل بيانات المباريات من localStorage');
                    return;
                } catch (localStorageError) {
                    console.warn('⚠️ فشل تحميل localStorage:', localStorageStorageError.message);
                    throw new Error('لا توجد بيانات متاحة');
                }
            }
            
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات:', error);
            this.showError('حدث خطأ في تحميل البيانات. يرجى المحاولة مرة أخرى.');
        }
    }

    async loadFromFirebase() {
        return new Promise(async (resolve, reject) => {
            try {
                // 1. التحقق من وجود Firebase
                if (typeof firebase === 'undefined') {
                    throw new Error('Firebase SDK غير محمل');
                }
                
                // 2. تهيئة Firebase
                let db;
                try {
                    if (!firebase.apps.length) {
                        firebase.initializeApp(firebaseConfig);
                    }
                    db = firebase.firestore();
                } catch (initError) {
                    throw new Error('فشل تهيئة قاعدة البيانات');
                }
                
                if (!db) {
                    throw new Error('قاعدة البيانات غير متاحة');
                }
                
                // 3. جلب بيانات المباريات
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const matchesQuery = db.collection('matches')
                    .where('matchDate', '>=', today)
                    .orderBy('matchDate')
                    .orderBy('matchTime');
                
                const matchesSnapshot = await matchesQuery.get();
                
                if (matchesSnapshot.empty) {
                    console.log('ℹ️ لا توجد مباريات في قاعدة البيانات');
                    this.matches = [];
                } else {
                    this.matches = matchesSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    console.log(`✅ تم تحميل ${this.matches.length} مباراة`);
                }
                
                // 4. جلب بيانات القنوات
                const channelsQuery = await db.collection('channels').get();
                
                if (channelsQuery.empty) {
                    console.log('ℹ️ لا توجد قنوات في قاعدة البيانات');
                    this.channels = [];
                } else {
                    this.channels = channelsQuery.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    console.log(`✅ تم تحميل ${this.channels.length} قناة`);
                }
                
                // 5. حفظ في localStorage كنسخة احتياطية
                this.saveToLocalStorage();
                
                // 6. عرض المباريات
                this.renderMatches();
                
                resolve(true);
                
            } catch (error) {
                console.error('❌ فشل تحميل Firebase:', error);
                reject(error);
            }
        });
    }

    async loadFromLocalStorage() {
        return new Promise((resolve, reject) => {
            try {
                // 1. جلب المباريات من localStorage
                const savedMatches = localStorage.getItem('bein_matches');
                if (!savedMatches) {
                    throw new Error('لا توجد بيانات محلية للمباريات');
                }
                
                this.matches = JSON.parse(savedMatches);
                console.log(`✅ تم تحميل ${this.matches.length} مباراة من localStorage`);
                
                // 2. جلب القنوات من localStorage
                const savedChannels = localStorage.getItem('bein_channels');
                if (savedChannels) {
                    this.channels = JSON.parse(savedChannels);
                    console.log(`✅ تم تحميل ${this.channels.length} قناة من localStorage`);
                } else {
                    this.channels = [];
                }
                
                // 3. عرض المباريات
                this.renderMatches();
                
                resolve(true);
                
            } catch (error) {
                console.error('❌ فشل تحميل البيانات المحلية:', error);
                reject(error);
            }
        });
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('bein_matches', JSON.stringify(this.matches));
            localStorage.setItem('bein_channels', JSON.stringify(this.channels));
            console.log('💾 تم حفظ البيانات في التخزين المحلي');
        } catch (error) {
            console.error('❌ خطأ في حفظ البيانات محلياً:', error);
        }
    }

    showLoading() {
        const container = document.getElementById('matchesContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading" style="grid-column: 1 / -1;">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">جاري التحميل...</span>
                    </div>
                    <p>جاري تحميل المباريات...</p>
                    <small>يرجى الانتظار</small>
                </div>
            `;
        }
    }

    showError(message) {
        const container = document.getElementById('matchesContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading" style="grid-column: 1 / -1;">
                    <i class="uil uil-exclamation-triangle" style="font-size: 3rem; color: #dc3545;"></i>
                    <p class="mt-3 text-danger">${message}</p>
                    <button class="btn btn-primary mt-3" onclick="location.reload()">
                        <i class="uil uil-redo"></i> إعادة المحاولة
                    </button>
                </div>
            `;
        }
    }

    renderMatches() {
        const container = document.getElementById('matchesContainer');
        if (!container) {
            console.error('❌ حاوية المباريات غير موجودة');
            return;
        }

        // تصفية المباريات حسب التاريخ
        const filteredMatches = this.filterMatchesByDate(this.currentFilter);
        
        if (filteredMatches.length === 0) {
            let message = '';
            switch(this.currentFilter) {
                case 'today':
                    message = 'لا توجد مباريات اليوم';
                    break;
                case 'tomorrow':
                    message = 'لا توجد مباريات غداً';
                    break;
                case 'week':
                    message = 'لا توجد مباريات هذا الأسبوع';
                    break;
                default:
                    message = 'لا توجد مباريات متاحة';
            }
            
            container.innerHTML = `
                <div class="no-matches">
                    <i class="uil uil-calendar-slash"></i>
                    <h4>${message}</h4>
                    <p>سيتم إضافة المباريات قريباً</p>
                </div>
            `;
            return;
        }

        console.log(`🎯 عرض ${filteredMatches.length} مباراة`);
        
        // إنشاء HTML للمباريات
        container.innerHTML = `
            <div class="matches-grid">
                ${filteredMatches.map(match => this.createMatchCard(match)).join('')}
            </div>
        `;

        // إضافة مستمعي الأحداث للمباريات
        this.addMatchClickListeners();
        
        console.log('✅ تم عرض المباريات بنجاح');
    }

    createMatchCard(match) {
        // البحث عن القناة المرتبطة بالمباراة
        const channel = this.channels.find(c => c.id === match.channelId);
        const defaultImage = 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=TV';
        
        // تحديد حالة المباراة
        const now = new Date();
        const matchDateTime = new Date(`${match.matchDate}T${match.matchTime}`);
        let status = 'upcoming';
        let statusText = 'قادمة';
        
        if (match.status === 'live' || match.isLive) {
            status = 'live';
            statusText = 'مباشر';
        } else if (matchDateTime < now) {
            status = 'finished';
            statusText = 'منتهية';
        }
        
        // تنسيق الوقت
        const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
        const matchTime = matchDateTime.toLocaleTimeString('ar-SA', timeOptions);
        
        return `
            <div class="match-card" data-match-id="${match.id}">
                <div class="match-status ${status}">${statusText}</div>
                <div class="match-teams">
                    <div class="team">${match.team1}</div>
                    <div class="vs">VS</div>
                    <div class="team">${match.team2}</div>
                </div>
                <div class="match-details">
                    <div class="detail">
                        <i class="uil uil-trophy"></i>
                        <span>${match.competition || 'بطولة'}</span>
                    </div>
                    <div class="detail">
                        <i class="uil uil-calendar-alt"></i>
                        <span>${this.formatMatchDate(match.matchDate)}</span>
                    </div>
                    <div class="detail">
                        <i class="uil uil-clock"></i>
                        <span>${matchTime}</span>
                    </div>
                </div>
                ${channel ? `
                    <div class="match-channel">
                        <div class="channel-info">
                            <div class="channel-logo">
                                <img src="${channel.image || defaultImage}" 
                                     alt="${channel.name}" 
                                     onerror="this.src='${defaultImage}'">
                            </div>
                            <div>
                                <div class="channel-name">${channel.name}</div>
                                <small class="text-muted">القناة الناقلة</small>
                            </div>
                        </div>
                        <button class="watch-btn" onclick="window.matchApp.openMatch('${match.id}'); event.stopPropagation()">
                            <i class="uil uil-play-circle"></i> مشاهدة
                        </button>
                    </div>
                ` : `
                    <div class="match-channel">
                        <div class="channel-info">
                            <i class="uil uil-tv-retro"></i>
                            <div>
                                <div class="channel-name">قناة غير محددة</div>
                                <small class="text-muted">لا توجد قناة محددة</small>
                            </div>
                        </div>
                    </div>
                `}
            </div>
        `;
    }

    formatMatchDate(dateString) {
        if (!dateString) return 'غير محدد';
        try {
            const date = new Date(dateString);
            const options = { 
                weekday: 'long',
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                calendar: 'gregory'
            };
            return date.toLocaleDateString('ar-SA', options);
        } catch (error) {
            return 'غير محدد';
        }
    }

    filterMatchesByDate(filter) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        return this.matches.filter(match => {
            if (!match.matchDate) return false;
            
            const matchDate = new Date(match.matchDate);
            matchDate.setHours(0, 0, 0, 0);
            
            switch(filter) {
                case 'today':
                    return matchDate.getTime() === today.getTime();
                case 'tomorrow':
                    return matchDate.getTime() === tomorrow.getTime();
                case 'week':
                    return matchDate >= today && matchDate <= nextWeek;
                case 'all':
                    return true;
                default:
                    return matchDate.getTime() === today.getTime();
            }
        });
    }

    filterMatches(filter) {
        this.currentFilter = filter;
        
        // تحديث أزرار الفلترة
        document.querySelectorAll('.date-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`.date-btn[onclick="filterMatches('${filter}')"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // إعادة عرض المباريات
        this.renderMatches();
    }

    addMatchClickListeners() {
        const matchCards = document.querySelectorAll('.match-card');
        matchCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // النقر على البطاقة نفسها يفتح المباراة
                const matchId = card.getAttribute('data-match-id');
                this.openMatch(matchId);
            });
        });
    }

    openMatch(matchId) {
        const match = this.matches.find(m => m.id === matchId);
        if (!match) return;
        
        console.log(`▶️ فتح المباراة: ${match.team1} vs ${match.team2}`);
        
        // إذا كانت المباراة ليس لها قناة محددة
        if (!match.channelId) {
            this.showError('لم يتم تحديد قناة لهذه المباراة');
            return;
        }
        
        // البحث عن القناة
        const channel = this.channels.find(c => c.id === match.channelId);
        if (!channel) {
            this.showError('القناة الناقلة غير متاحة');
            return;
        }
        
        // التحقق من التثبيت
        if (!this.hasInstalledApp) {
            this.showInstallModal(channel);
        } else {
            this.openChannel(channel);
        }
    }

    showInstallModal(channel) {
        const modal = document.getElementById('installModal');
        const confirmBtn = document.getElementById('confirmInstall');
        const cancelBtn = document.getElementById('cancelInstall');
        
        // إزالة المستمعين السابقين
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        
        const newConfirmBtn = document.getElementById('confirmInstall');
        const newCancelBtn = document.getElementById('cancelInstall');
        
        // إضافة مستمعين جدد
        newConfirmBtn.addEventListener('click', () => {
            this.installApp(channel);
        });
        
        newCancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        // عرض المودال
        modal.style.display = 'block';
        
        // إغلاق المودال عند النقر خارج المحتوى
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    installApp(channel) {
        console.log('📱 تثبيت التطبيق...');
        
        const modal = document.getElementById('installModal');
        modal.style.display = 'none';
        
        // فتح رابط تحميل التطبيق
        const appUrl = channel.appUrl || 'https://play.google.com/store/apps/details?id=com.xpola.player';
        window.open(appUrl, '_blank');
        
        // تحديث حالة التثبيت
        this.hasInstalledApp = true;
        localStorage.setItem('app_installed', 'true');
        
        // فتح القناة بعد ثواني
        setTimeout(() => {
            this.openChannel(channel);
        }, 2000);
    }

    openChannel(channel) {
        console.log(`📺 فتح القناة: ${channel.name}`);
        
        if (!channel.url || channel.url === '#') {
            this.showError('رابط البث غير متوفر حالياً');
            return;
        }
        
        // فتح رابط البث في نافذة جديدة
        window.open(channel.url, '_blank');
        
        // تسجيل النشاط
        this.logMatchView(channel);
    }

    logMatchView(channel) {
        try {
            console.log(`📊 تسجيل مشاهدة المباراة على القناة: ${channel.name}`);
        } catch (error) {
            console.warn('⚠️ فشل تسجيل المشاهدة:', error);
        }
    }

    setupEventListeners() {
        // إعداد أزرار الفلترة
        window.filterMatches = (filter) => this.filterMatches(filter);
        
        // إعداد زر العودة
        const backButton = document.querySelector('.back-button');
        if (backButton) {
            backButton.addEventListener('click', (e) => {
                e.preventDefault();
                window.history.back();
            });
        }
    }

    async retryLoadData() {
        console.log('🔄 إعادة محاولة تحميل بيانات المباريات...');
        await this.loadData();
    }
}

// بدء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('📂 تهيئة صفحة المباريات...');
    window.matchApp = new MatchApp();
});

// جعل الدوال متاحة عالمياً
window.reloadMatchesData = function() {
    if (window.matchApp) {
        window.matchApp.retryLoadData();
    }
};


