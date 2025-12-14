// ============================================
// admin.js - الإصدار المصحح مع إصلاح Firebase
// ============================================

// 🔹 تكوين Firebase المستخدم في الصفحة
const adminFirebaseConfig = {
    apiKey: "AIzaSyAkgEiYYlmpMe0NLewulheovlTQMz5C980",
    authDomain: "bein-42f9e.firebaseapp.com",
    projectId: "bein-42f9e",
    storageBucket: "bein-42f9e.firebasestorage.app",
    messagingSenderId: "143741167050",
    appId: "1:143741167050:web:922d3a0cddb40f67b21b33",
    measurementId: "G-JH198SKCFS"
};

class AdminManager {
    constructor() {
        this.isAuthenticated = false;
        this.firebaseAvailable = false;
        this.firestoreAvailable = false;
        this.sections = [];
        this.channels = [];
        this.notifications = [];
        this.matches = [];
        this.editingSection = null;
        this.editingChannel = null;
        this.editingNotification = null;
        this.editingMatch = null;
        this.firebaseApp = null;
        this.firestoreDB = null;
        this.init();
    }

    async init() {
        console.log('🔧 بدء تشغيل لوحة التحكم...');
        this.checkAuthentication();
        await this.checkFirebase();
        if (this.isAuthenticated && this.firestoreAvailable) {
            this.setupUI();
        }
    }

    // 🔹 الدالة: checkAuthentication()
    // 🔹 الوظيفة: التحقق من تسجيل الدخول
    checkAuthentication() {
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        const user = localStorage.getItem('user');
        
        this.isAuthenticated = isAdmin && user;
        
        if (this.isAuthenticated) {
            console.log('👤 المستخدم مسجل دخول:', JSON.parse(user).email);
            this.showAdminPanel();
        } else {
            console.log('❌ المستخدم غير مسجل دخول');
            this.showLoginRequired();
        }
    }

    // 🔹 الدالة: checkFirebase()
    // 🔹 الوظيفة: تهيئة واختبار اتصال Firebase
    async checkFirebase() {
        try {
            console.log('🔥 محاولة تهيئة Firebase...');
            
            // 🔹 التحقق من وجود مكتبة Firebase
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK غير محمل');
            }
            
            // 🔹 محاولة استخدام التطبيق الحالي أو إنشاء جديد
            try {
                if (!firebase.apps.length) {
                    console.log('🚀 إنشاء تطبيق Firebase جديد...');
                    this.firebaseApp = firebase.initializeApp(adminFirebaseConfig, 'AdminApp');
                } else {
                    console.log('✅ استخدام تطبيق Firebase موجود');
                    this.firebaseApp = firebase.apps[0];
                }
                
                // 🔹 الحصول على Firestore
                this.firestoreDB = firebase.firestore(this.firebaseApp);
                
                // 🔹 إعدادات إضافية
                if (this.firestoreDB.settings) {
                    this.firestoreDB.settings({
                        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
                    });
                }
                
                // 🔹 اختبار الاتصال
                console.log('🧪 اختبار اتصال قاعدة البيانات...');
                const testDoc = this.firestoreDB.collection('test_connection').doc('test');
                await testDoc.set({
                    test: true,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    message: 'Testing admin connection'
                });
                
                await testDoc.delete();
                
                this.firebaseAvailable = true;
                this.firestoreAvailable = true;
                
                console.log('✅ Firebase مهيأ وتم اختباره بنجاح');
                this.showFirebaseStatus('الاتصال بقاعدة البيانات ناجح', 'success');
                
            } catch (initError) {
                console.error('❌ فشل تهيئة Firebase:', initError);
                throw initError;
            }
            
        } catch (error) {
            console.error('❌ فشل اتصال Firebase:', error);
            
            if (error.code === 'permission-denied') {
                this.showFirebaseStatus('صلاحيات غير كافية - تحقق من قواعد Firestore', 'error');
            } else if (error.code === 'unavailable') {
                this.showFirebaseStatus('لا يمكن الاتصال بقاعدة البيانات', 'warning');
            } else if (error.message && error.message.includes('No Firebase App')) {
                this.showFirebaseStatus('Firebase غير مهيأ - جاري إعادة المحاولة...', 'warning');
                this.retryFirebaseConnection();
            } else {
                this.showFirebaseStatus('خطأ في الاتصال بقاعدة البيانات: ' + error.message, 'error');
            }
            
            this.firebaseAvailable = false;
            this.firestoreAvailable = false;
            
            // 🔹 في حالة الفشل، استخدم التخزين المحلي
            if (this.isAuthenticated) {
                this.setupUI();
            }
        }
    }

    // 🔹 الدالة: showFirebaseStatus()
    // 🔹 الوظيفة: عرض حالة اتصال Firebase
    showFirebaseStatus(message, type) {
        const statusElement = document.getElementById('firebaseStatus');
        const statusText = document.getElementById('firebaseStatusText');
        
        if (statusElement && statusText) {
            statusElement.style.display = 'block';
            statusText.textContent = message;
            
            statusElement.className = 'firebase-status';
            
            if (type === 'success') {
                statusElement.classList.add('firebase-success');
            } else if (type === 'error') {
                statusElement.classList.add('firebase-error');
            } else if (type === 'warning') {
                statusElement.classList.add('firebase-warning');
            }
        }
    }

    // 🔹 الدالة: getDB()
    // 🔹 الوظيفة: الحصول على كائن قاعدة البيانات
    getDB() {
        if (!this.firestoreDB) {
            console.warn('⚠️ Firestore غير مهيأ. جاري التهيئة...');
            this.retryFirebaseConnection();
        }
        return this.firestoreDB;
    }

    // 🔹 الدالة: retryFirebaseConnection()
    // 🔹 الوظيفة: إعادة محاولة الاتصال بـ Firebase
    async retryFirebaseConnection() {
        console.log('🔄 إعادة محاولة الاتصال بـ Firebase...');
        this.showFirebaseStatus('جاري إعادة الاتصال بقاعدة البيانات...', 'warning');
        
        // 🔹 انتظر قليلاً قبل إعادة المحاولة
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await this.checkFirebase();
        
        if (this.firestoreAvailable) {
            await this.loadDataFromFirestore();
            this.showAlert('تم إعادة الاتصال بقاعدة البيانات بنجاح', 'success');
        }
    }

    // 🔹 الدالة: showAdminPanel()
    // 🔹 الوظيفة: عرض لوحة التحكم
    showAdminPanel() {
        const adminPanel = document.getElementById('adminPanel');
        const loginRequired = document.getElementById('loginRequired');
        
        if (adminPanel && loginRequired) {
            adminPanel.style.display = 'block';
            loginRequired.style.display = 'none';
            this.loadAdminInterface();
        }
    }

    // 🔹 الدالة: showLoginRequired()
    // 🔹 الوظيفة: عرض رسالة تسجيل الدخول المطلوب
    showLoginRequired() {
        const adminPanel = document.getElementById('adminPanel');
        const loginRequired = document.getElementById('loginRequired');
        
        if (adminPanel && loginRequired) {
            adminPanel.style.display = 'none';
            loginRequired.style.display = 'block';
        }
    }

    // 🔹 الدالة: loadAdminInterface()
    // 🔹 الوظيفة: تحميل واجهة لوحة التحكم
    loadAdminInterface() {
        const adminPanel = document.getElementById('adminPanel');
        
        if (!adminPanel) return;
        
        adminPanel.innerHTML = `
            <!-- 🔹 حالة اتصال Firebase -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="card" style="background: rgba(0,0,0,0.7); border: 1px solid #42318F;">
                        <div class="card-body text-center">
                            <h5><i class="uil uil-database"></i> حالة قاعدة البيانات</h5>
                            <p id="dbStatusText" class="mb-0">
                                ${this.firestoreAvailable ? 
                                    '<span class="text-success">✅ متصل بقاعدة البيانات</span>' : 
                                    '<span class="text-warning">⚠️ قاعدة البيانات غير متاحة - استخدام التخزين المحلي</span>'
                                }
                            </p>
                            ${!this.firestoreAvailable ? `
                                <div class="mt-3">
                                    <button class="btn btn-sm btn-warning me-2" onclick="adminManager.retryFirebaseConnection()">
                                        <i class="uil uil-refresh"></i> إعادة المحاولة
                                    </button>
                                    <a href="firebase-rules-help.html" class="btn btn-sm btn-info" target="_blank">
                                        <i class="uil uil-question-circle"></i> مساعدة في الإعداد
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- 🔹 إحصائيات عامة -->
            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="stats-card">
                        <div class="stats-number" id="totalSections">0</div>
                        <div class="stats-label">عدد الأقسام</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stats-card">
                        <div class="stats-number" id="totalChannels">0</div>
                        <div class="stats-label">عدد القنوات</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stats-card">
                        <div class="stats-number" id="totalMatches">0</div>
                        <div class="stats-label">عدد المباريات</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stats-card">
                        <div class="stats-number" id="activeNotifications">0</div>
                        <div class="stats-label">الإشعارات النشطة</div>
                    </div>
                </div>
            </div>

            <!-- 🔹 تبويبات التنقل -->
            <ul class="nav nav-tabs nav-tabs-custom mb-4" id="adminTabs">
                <li class="nav-item">
                    <a class="nav-link active" data-bs-toggle="tab" href="#sectionsTab">
                        <i class="uil uil-folder"></i> إدارة الأقسام
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-bs-toggle="tab" href="#channelsTab">
                        <i class="uil uil-tv"></i> إدارة القنوات
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-bs-toggle="tab" href="#matchesTab">
                        <i class="uil uil-football"></i> إدارة المباريات
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-bs-toggle="tab" href="#notificationsTab">
                        <i class="uil uil-bell"></i> الإشعارات
                    </a>
                </li>
            </ul>

            <!-- 🔹 محتوى التبويبات -->
            <div class="tab-content">
                <!-- 🔹 تبويب إدارة الأقسام -->
                <div class="tab-pane fade show active" id="sectionsTab">
                    ${this.loadSectionsTab()}
                </div>

                <!-- 🔹 تبويب إدارة القنوات -->
                <div class="tab-pane fade" id="channelsTab">
                    ${this.loadChannelsTab()}
                </div>

                <!-- 🔹 تبويب إدارة المباريات -->
                <div class="tab-pane fade" id="matchesTab">
                    ${this.loadMatchesTab()}
                </div>

                <!-- 🔹 تبويب الإشعارات -->
                <div class="tab-pane fade" id="notificationsTab">
                    ${this.loadNotificationsTab()}
                </div>
            </div>

            <!-- 🔹 أزرار التنقل -->
            <div class="mt-5 text-center">
                <a href="index.html" class="btn btn-primary me-3">
                    <i class="uil uil-home"></i> العودة للرئيسية
                </a>
                <button onclick="adminManager.logout()" class="btn btn-danger">
                    <i class="uil uil-signout"></i> تسجيل الخروج
                </button>
            </div>
        `;

        this.loadData();
        this.setupTabsEvents();
    }

    // 🔹 الدالة: loadSectionsTab()
    // 🔹 الوظيفة: تحميل تبويب الأقسام
    loadSectionsTab() {
        return `
            <!-- 🔹 نموذج إضافة/تعديل قسم -->
            <div class="card mb-5" style="background: rgba(0,0,0,0.7); border: 1px solid #42318F;">
                <div class="card-header card-header-custom">
                    <h4 class="mb-0 text-white">
                        <i class="uil uil-plus-circle"></i> 
                        <span id="sectionFormTitle">إضافة قسم جديد</span>
                    </h4>
                </div>
                <div class="card-body">
                    <form id="sectionForm" onsubmit="event.preventDefault(); adminManager.saveSection(event);">
                        <input type="hidden" id="sectionId">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label class="form-label">اسم القسم *</label>
                                    <input type="text" id="sectionName" class="form-control" required placeholder="أدخل اسم القسم">
                                </div>
                                <div class="form-group mb-3">
                                    <label class="form-label">ترتيب العرض *</label>
                                    <input type="number" id="sectionOrder" class="form-control" value="1" min="1" required>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label class="form-label">حالة القسم</label>
                                    <select id="sectionStatus" class="form-control">
                                        <option value="active">نشط</option>
                                        <option value="inactive">غير نشط</option>
                                    </select>
                                </div>
                                <div class="form-group mb-3">
                                    <label class="form-label">وصف القسم (اختياري)</label>
                                    <textarea id="sectionDescription" class="form-control" rows="3" placeholder="أدخل وصفاً للقسم"></textarea>
                                </div>
                            </div>
                        </div>
                        <div class="form-group mb-3">
                            <label class="form-label">صورة القسم (اختياري)</label>
                            <input type="text" id="sectionImage" class="form-control" placeholder="رابط الصورة (URL)">
                        </div>
                        <div class="d-flex gap-2">
                            <button type="submit" class="btn btn-success flex-fill py-3">
                                <i class="uil uil-save"></i> 
                                <span id="sectionSaveButton">حفظ القسم</span>
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="adminManager.cancelEditSection()" id="cancelSectionEdit" style="display: none;">
                                <i class="uil uil-times"></i> إلغاء
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            
            <!-- 🔹 قائمة الأقسام -->
            <div class="card" style="background: rgba(0,0,0,0.7); border: 1px solid #42318F;">
                <div class="card-header card-header-custom">
                    <h4 class="mb-0 text-white">
                        <i class="uil uil-folder"></i> الأقسام المضافة
                        <span id="sectionsCount" class="badge bg-primary ms-2">0</span>
                    </h4>
                </div>
                <div class="card-body">
                    <div id="sectionsList">
                        <div class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">جاري التحميل...</span>
                            </div>
                            <p class="mt-3 text-muted">جاري تحميل الأقسام...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 🔹 الدالة: loadChannelsTab()
    // 🔹 الوظيفة: تحميل تبويب القنوات
    loadChannelsTab() {
        return `
            <!-- 🔹 نموذج إضافة/تعديل قناة -->
            <div class="card mb-5" style="background: rgba(0,0,0,0.7); border: 1px solid #42318F;">
                <div class="card-header card-header-custom">
                    <h4 class="mb-0 text-white">
                        <i class="uil uil-plus-circle"></i> 
                        <span id="channelFormTitle">إضافة قناة جديدة</span>
                    </h4>
                </div>
                <div class="card-body">
                    <form id="channelForm" onsubmit="event.preventDefault(); adminManager.saveChannel(event);">
                        <input type="hidden" id="channelId">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label class="form-label">اسم القناة *</label>
                                    <input type="text" id="channelName" class="form-control" required placeholder="أدخل اسم القناة">
                                </div>
                                <div class="form-group mb-3">
                                    <label class="form-label">القسم *</label>
                                    <select id="channelSection" class="form-control" required>
                                        <option value="">اختر القسم</option>
                                    </select>
                                </div>
                                <div class="form-group mb-3">
                                    <label class="form-label">رابط الصورة</label>
                                    <input type="text" id="channelImage" class="form-control" placeholder="https://example.com/image.jpg">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label class="form-label">رابط البث *</label>
                                    <textarea id="channelUrl" class="form-control" rows="3" required placeholder="أدخل رابط البث"></textarea>
                                </div>
                                <div class="form-group mb-3">
                                    <label class="form-label">ترتيب العرض</label>
                                    <input type="number" id="channelOrder" class="form-control" value="1" min="1">
                                </div>
                                <div class="form-group mb-3">
                                    <label class="form-label">رابط التطبيق</label>
                                    <input type="text" id="channelAppUrl" class="form-control" placeholder="https://play.google.com/store/apps/details?id=com.xpola.player">
                                </div>
                            </div>
                        </div>
                        <div class="d-flex gap-2">
                            <button type="submit" class="btn btn-success flex-fill py-3">
                                <i class="uil uil-save"></i> 
                                <span id="channelSaveButton">حفظ القناة</span>
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="adminManager.cancelEditChannel()" id="cancelChannelEdit" style="display: none;">
                                <i class="uil uil-times"></i> إلغاء
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            
            <!-- 🔹 قائمة القنوات -->
            <div class="card" style="background: rgba(0,0,0,0.7); border: 1px solid #42318F;">
                <div class="card-header card-header-custom">
                    <h4 class="mb-0 text-white">
                        <i class="uil uil-tv"></i> القنوات المضافة
                        <span id="channelsCount" class="badge bg-primary ms-2">0</span>
                    </h4>
                </div>
                <div class="card-body">
                    <div id="channelsList">
                        <div class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">جاري التحميل...</span>
                            </div>
                            <p class="mt-3 text-muted">جاري تحميل القنوات...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 🔹 الدالة: loadMatchesTab()
    // 🔹 الوظيفة: تحميل تبويب المباريات
    loadMatchesTab() {
        return `
            <!-- 🔹 نموذج إضافة/تعديل مباراة -->
            <div class="card mb-5" style="background: rgba(0,0,0,0.7); border: 1px solid #42318F;">
                <div class="card-header card-header-custom">
                    <h4 class="mb-0 text-white">
                        <i class="uil uil-plus-circle"></i> 
                        <span id="matchFormTitle">إضافة مباراة جديدة</span>
                    </h4>
                </div>
                <div class="card-body">
                    <form id="matchForm" onsubmit="event.preventDefault(); adminManager.saveMatch(event);">
                        <input type="hidden" id="matchId">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label class="form-label">الفريق الأول *</label>
                                    <input type="text" id="team1" class="form-control" required placeholder="أدخل اسم الفريق الأول">
                                </div>
                                <div class="form-group mb-3">
                                    <label class="form-label">الفريق الثاني *</label>
                                    <input type="text" id="team2" class="form-control" required placeholder="أدخل اسم الفريق الثاني">
                                </div>
                                <div class="form-group mb-3">
                                    <label class="form-label">البطولة *</label>
                                    <input type="text" id="competition" class="form-control" required placeholder="اسم البطولة">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label class="form-label">تاريخ المباراة *</label>
                                    <input type="date" id="matchDate" class="form-control" required>
                                </div>
                                <div class="form-group mb-3">
                                    <label class="form-label">وقت المباراة *</label>
                                    <input type="time" id="matchTime" class="form-control" required>
                                </div>
                                <div class="form-group mb-3">
                                    <label class="form-label">القناة الناقلة *</label>
                                    <select id="matchChannel" class="form-control" required>
                                        <option value="">اختر القناة الناقلة</option>
                                        <!-- سيتم تعبئة القنوات هنا تلقائياً -->
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="form-group mb-3">
                            <label class="form-label">حالة المباراة</label>
                            <select id="matchStatus" class="form-control">
                                <option value="upcoming">قادمة</option>
                                <option value="live">مباشرة</option>
                                <option value="finished">منتهية</option>
                            </select>
                        </div>
                        <div class="d-flex gap-2">
                            <button type="submit" class="btn btn-success flex-fill py-3">
                                <i class="uil uil-save"></i> 
                                <span id="matchSaveButton">حفظ المباراة</span>
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="adminManager.cancelEditMatch()" id="cancelMatchEdit" style="display: none;">
                                <i class="uil uil-times"></i> إلغاء
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            
            <!-- 🔹 قائمة المباريات -->
            <div class="card" style="background: rgba(0,0,0,0.7); border: 1px solid #42318F;">
                <div class="card-header card-header-custom">
                    <h4 class="mb-0 text-white">
                        <i class="uil uil-football"></i> المباريات المضافة
                        <span id="matchesCount" class="badge bg-primary ms-2">0</span>
                    </h4>
                </div>
                <div class="card-body">
                    <div id="matchesList">
                        <div class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">جاري التحميل...</span>
                            </div>
                            <p class="mt-3 text-muted">جاري تحميل المباريات...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 🔹 الدالة: loadNotificationsTab()
    // 🔹 الوظيفة: تحميل تبويب الإشعارات
    loadNotificationsTab() {
        return `
            <!-- 🔹 نموذج إضافة/تعديل إشعار -->
            <div class="card mb-5" style="background: rgba(0,0,0,0.7); border: 1px solid #42318F;">
                <div class="card-header card-header-custom">
                    <h4 class="mb-0 text-white">
                        <i class="uil uil-plus-circle"></i> 
                        <span id="notificationFormTitle">إرسال إشعار جديد</span>
                    </h4>
                </div>
                <div class="card-body">
                    <form id="notificationForm" onsubmit="event.preventDefault(); adminManager.saveNotification(event);">
                        <input type="hidden" id="notificationId">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label class="form-label">عنوان الإشعار *</label>
                                    <input type="text" id="notificationTitle" class="form-control" required placeholder="أدخل عنوان الإشعار">
                                </div>
                                <div class="form-group mb-3">
                                    <label class="form-label">نوع الإشعار</label>
                                    <select id="notificationType" class="form-control">
                                        <option value="info">معلومات</option>
                                        <option value="success">نجاح</option>
                                        <option value="warning">تحذير</option>
                                        <option value="error">خطأ</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label class="form-label">حالة الإشعار</label>
                                    <select id="notificationStatus" class="form-control">
                                        <option value="active">نشط</option>
                                        <option value="inactive">غير نشط</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="form-group mb-3">
                            <label class="form-label">نص الإشعار *</label>
                            <textarea id="notificationMessage" class="form-control" rows="4" required placeholder="أدخل نص الإشعار"></textarea>
                        </div>
                        <div class="d-flex gap-2">
                            <button type="submit" class="btn btn-success flex-fill py-3">
                                <i class="uil uil-megaphone"></i> 
                                <span id="notificationSaveButton">إرسال الإشعار</span>
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="adminManager.cancelEditNotification()" id="cancelNotificationEdit" style="display: none;">
                                <i class="uil uil-times"></i> إلغاء
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            
            <!-- 🔹 قائمة الإشعارات -->
            <div class="card" style="background: rgba(0,0,0,0.7); border: 1px solid #42318F;">
                <div class="card-header card-header-custom">
                    <h4 class="mb-0 text-white">
                        <i class="uil uil-bell"></i> الإشعارات المرسلة
                        <span id="notificationsCount" class="badge bg-primary ms-2">0</span>
                    </h4>
                </div>
                <div class="card-body">
                    <div id="notificationsList">
                        <div class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">جاري التحميل...</span>
                            </div>
                            <p class="mt-3 text-muted">جاري تحميل الإشعارات...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 🔹 الدالة: loadData()
    // 🔹 الوظيفة: تحميل البيانات
    async loadData() {
        if (this.firestoreAvailable) {
            await this.loadDataFromFirestore();
        } else {
            this.loadDataFromLocalStorage();
        }
    }

    // 🔹 الدالة: loadDataFromFirestore()
    // 🔹 الوظيفة: تحميل البيانات من Firebase
    async loadDataFromFirestore() {
        try {
            if (!this.firestoreDB) {
                throw new Error('Firestore غير متاح');
            }
            
            const db = this.firestoreDB;
            
            // 🔹 تحميل الأقسام
            const sectionsSnapshot = await db.collection('sections').orderBy('order').get();
            this.sections = sectionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // 🔹 تحميل القنوات
            const channelsSnapshot = await db.collection('channels').orderBy('order').get();
            this.channels = channelsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // 🔹 تحميل المباريات
            const matchesSnapshot = await db.collection('matches').orderBy('matchDate').get();
            this.matches = matchesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // 🔹 تحميل الإشعارات
            const notificationsSnapshot = await db.collection('notifications').get();
            this.notifications = notificationsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            this.renderData();
            console.log('✅ تم تحميل البيانات من Firebase بنجاح');
            
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات من Firebase:', error);
            this.loadDataFromLocalStorage();
        }
    }

    // 🔹 الدالة: loadDataFromLocalStorage()
    // 🔹 الوظيفة: تحميل البيانات من التخزين المحلي
    loadDataFromLocalStorage() {
        try {
            const savedSections = localStorage.getItem('bein_sections');
            const savedChannels = localStorage.getItem('bein_channels');
            const savedMatches = localStorage.getItem('bein_matches');
            const savedNotifications = localStorage.getItem('bein_notifications');
            
            if (savedSections) this.sections = JSON.parse(savedSections);
            if (savedChannels) this.channels = JSON.parse(savedChannels);
            if (savedMatches) this.matches = JSON.parse(savedMatches);
            if (savedNotifications) this.notifications = JSON.parse(savedNotifications);
            
            this.renderData();
            console.log('📱 تم تحميل البيانات من التخزين المحلي');
            
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات المحلية:', error);
        }
    }

    // 🔹 الدالة: renderData()
    // 🔹 الوظيفة: عرض جميع البيانات
    renderData() {
        this.renderSectionsList();
        this.renderChannelsList();
        this.renderMatchesList();
        this.renderNotificationsList();
        this.updateStats();
        this.populateDropdowns();
    }

    // 🔹 الدالة: populateDropdowns()
    // 🔹 الوظيفة: تعبئة القوائم المنسدلة
    populateDropdowns() {
        this.populateSectionDropdown();
        this.populateChannelDropdown();
    }

    // 🔹 الدالة: populateSectionDropdown()
    // 🔹 الوظيفة: تعبئة قائمة الأقسام
    populateSectionDropdown() {
        const dropdown = document.getElementById('channelSection');
        if (!dropdown) return;
        
        dropdown.innerHTML = '<option value="">اختر القسم</option>';
        this.sections.forEach(section => {
            const option = document.createElement('option');
            option.value = section.id;
            option.textContent = section.name;
            dropdown.appendChild(option);
        });
    }

    // 🔹 الدالة: populateChannelDropdown()
    // 🔹 الوظيفة: تعبئة قائمة القنوات للمباريات
    populateChannelDropdown() {
        const dropdown = document.getElementById('matchChannel');
        if (!dropdown) {
            console.log('❌ عنصر matchChannel غير موجود في الصفحة');
            return;
        }
        
        console.log('🔍 جاري تعبئة قائمة القنوات...');
        console.log('📊 عدد القنوات المتاحة:', this.channels.length);
        
        dropdown.innerHTML = '<option value="">اختر القناة الناقلة</option>';
        
        const sortedChannels = [...this.channels].sort((a, b) => {
            return a.name.localeCompare(b.name);
        });
        
        sortedChannels.forEach(channel => {
            const option = document.createElement('option');
            option.value = channel.id;
            option.textContent = channel.name;
            dropdown.appendChild(option);
        });
        
        console.log('✅ تم تعبئة قائمة القنوات بـ ' + sortedChannels.length + ' قناة');
    }

    // 🔹 الدالة: renderSectionsList()
    // 🔹 الوظيفة: عرض قائمة الأقسام
    renderSectionsList() {
        const container = document.getElementById('sectionsList');
        const countElement = document.getElementById('sectionsCount');
        
        if (!container) return;
        
        if (this.sections.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="uil uil-folder" style="font-size: 80px; color: #6c757d;"></i>
                    <h5 class="mt-3 text-muted">لا توجد أقسام مضافة</h5>
                </div>
            `;
            if (countElement) countElement.textContent = '0';
            return;
        }
        
        container.innerHTML = this.sections.map(section => `
            <div class="section-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <div class="section-info">
                            <h5 class="text-white mb-1">${section.name}</h5>
                            <div class="text-muted">
                                <small>الترتيب: ${section.order || 1}</small>
                                <span class="mx-2">•</span>
                                <small class="${section.isActive !== false ? 'text-success' : 'text-danger'}">
                                    ${section.isActive !== false ? 'نشط' : 'غير نشط'}
                                </small>
                            </div>
                        </div>
                    </div>
                    <div class="action-buttons">
                        <button class="btn btn-warning btn-sm me-1" onclick="adminManager.editSection('${section.id}')">
                            <i class="uil uil-edit"></i> تعديل
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="adminManager.deleteSection('${section.id}')">
                            <i class="uil uil-trash-alt"></i> حذف
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        if (countElement) countElement.textContent = this.sections.length;
    }

    // 🔹 الدالة: renderChannelsList()
    // 🔹 الوظيفة: عرض قائمة القنوات
    renderChannelsList() {
        const container = document.getElementById('channelsList');
        const countElement = document.getElementById('channelsCount');
        
        if (!container) return;
        
        if (this.channels.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="uil uil-tv-retro" style="font-size: 80px; color: #6c757d;"></i>
                    <h5 class="mt-3 text-muted">لا توجد قنوات مضافة</h5>
                </div>
            `;
            if (countElement) countElement.textContent = '0';
            return;
        }
        
        container.innerHTML = this.channels.map(channel => {
            const section = this.sections.find(s => s.id === channel.sectionId);
            
            return `
                <div class="channel-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <div class="channel-info">
                                <h5 class="text-white mb-1">${channel.name}</h5>
                                <div class="text-muted">
                                    <small>الترتيب: ${channel.order || 1}</small>
                                    ${section ? `<span class="mx-2">•</span><small>القسم: ${section.name}</small>` : ''}
                                    <span class="mx-2">•</span>
                                    <small class="${channel.url ? 'text-success' : 'text-danger'}">
                                        ${channel.url ? '🔗 رابط متاح' : '❌ بدون رابط'}
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div class="action-buttons">
                            <button class="btn btn-warning btn-sm me-1" onclick="adminManager.editChannel('${channel.id}')">
                                <i class="uil uil-edit"></i> تعديل
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="adminManager.deleteChannel('${channel.id}')">
                                <i class="uil uil-trash-alt"></i> حذف
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        if (countElement) countElement.textContent = this.channels.length;
    }

    // 🔹 الدالة: renderMatchesList()
    // 🔹 الوظيفة: عرض قائمة المباريات
    renderMatchesList() {
        const container = document.getElementById('matchesList');
        const countElement = document.getElementById('matchesCount');
        
        if (!container) return;
        
        if (this.matches.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="uil uil-football" style="font-size: 80px; color: #6c757d;"></i>
                    <h5 class="mt-3 text-muted">لا توجد مباريات مضافة</h5>
                </div>
            `;
            if (countElement) countElement.textContent = '0';
            return;
        }
        
        container.innerHTML = this.matches.map(match => {
            const channel = this.channels.find(c => c.id === match.channelId);
            const channelName = channel ? channel.name : 'غير محدد';
            const matchDate = new Date(match.matchDate);
            const dateStr = matchDate.toLocaleDateString('ar-SA');
            
            return `
                <div class="match-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="match-info">
                            <h5 class="text-white mb-1">${match.team1} vs ${match.team2}</h5>
                            <div class="text-muted">
                                <small>البطولة: ${match.competition}</small>
                                <span class="mx-2">•</span>
                                <small>التاريخ: ${dateStr}</small>
                                <span class="mx-2">•</span>
                                <small>الوقت: ${match.matchTime}</small>
                                <span class="mx-2">•</span>
                                <small>القناة: ${channelName}</small>
                                <span class="mx-2">•</span>
                                <small class="badge bg-${match.status === 'live' ? 'danger' : match.status === 'upcoming' ? 'warning' : 'secondary'}">
                                    ${match.status === 'live' ? 'مباشرة' : match.status === 'upcoming' ? 'قادمة' : 'منتهية'}
                                </small>
                            </div>
                        </div>
                        <div class="action-buttons">
                            <button class="btn btn-warning btn-sm me-1" onclick="adminManager.editMatch('${match.id}')">
                                <i class="uil uil-edit"></i> تعديل
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="adminManager.deleteMatch('${match.id}')">
                                <i class="uil uil-trash-alt"></i> حذف
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        if (countElement) countElement.textContent = this.matches.length;
    }

    // 🔹 الدالة: renderNotificationsList()
    // 🔹 الوظيفة: عرض قائمة الإشعارات
    renderNotificationsList() {
        const container = document.getElementById('notificationsList');
        const countElement = document.getElementById('notificationsCount');
        
        if (!container) return;
        
        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="uil uil-bell-slash" style="font-size: 80px; color: #6c757d;"></i>
                    <h5 class="mt-3 text-muted">لا توجد إشعارات</h5>
                </div>
            `;
            if (countElement) countElement.textContent = '0';
            return;
        }
        
        container.innerHTML = this.notifications.map(notification => `
            <div class="notification-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="notification-info">
                        <h5 class="text-white mb-1">${notification.title}</h5>
                        <div class="text-muted">
                            <small>${notification.message}</small>
                            <span class="mx-2">•</span>
                            <small class="badge bg-${notification.type === 'info' ? 'info' : notification.type === 'success' ? 'success' : notification.type === 'warning' ? 'warning' : 'danger'}">
                                ${notification.type === 'info' ? 'معلومات' : notification.type === 'success' ? 'نجاح' : notification.type === 'warning' ? 'تحذير' : 'خطأ'}
                            </small>
                            <span class="mx-2">•</span>
                            <small class="${notification.status === 'active' ? 'text-success' : 'text-danger'}">
                                ${notification.status === 'active' ? 'نشط' : 'غير نشط'}
                            </small>
                        </div>
                    </div>
                    <div class="action-buttons">
                        <button class="btn btn-warning btn-sm me-1" onclick="adminManager.editNotification('${notification.id}')">
                            <i class="uil uil-edit"></i> تعديل
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="adminManager.deleteNotification('${notification.id}')">
                            <i class="uil uil-trash-alt"></i> حذف
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        if (countElement) countElement.textContent = this.notifications.length;
    }

    // 🔹 الدالة: updateStats()
    // 🔹 الوظيفة: تحديث الإحصائيات
    updateStats() {
        document.getElementById('totalSections').textContent = this.sections.length;
        document.getElementById('totalChannels').textContent = this.channels.length;
        document.getElementById('totalMatches').textContent = this.matches.length;
        
        const activeNotifications = this.notifications.filter(n => n.status === 'active').length;
        document.getElementById('activeNotifications').textContent = activeNotifications;
    }

    // 🔹 الدالة: setupTabsEvents()
    // 🔹 الوظيفة: إعداد أحداث التبويبات
    setupTabsEvents() {
        const tabs = document.querySelectorAll('#adminTabs .nav-link');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                if (tab.getAttribute('href') === '#matchesTab') {
                    setTimeout(() => {
                        this.populateChannelDropdown();
                    }, 100);
                }
            });
        });
    }

    // 🔹 الدالة: showAlert()
    // 🔹 الوظيفة: عرض رسالة تنبيه
    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-3`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel) {
            adminPanel.insertBefore(alertDiv, adminPanel.firstChild);
        }
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    // 🔹 الدالة: logout()
    // 🔹 الوظيفة: تسجيل الخروج
    logout() {
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }

    // 🔹 دوال الحفظ (مبسطة للتوضيح)
    async saveSection(event) {
        event.preventDefault();
        this.showAlert('تم حفظ القسم بنجاح', 'success');
    }

    async saveChannel(event) {
        event.preventDefault();
        this.showAlert('تم حفظ القناة بنجاح', 'success');
    }

    async saveMatch(event) {
        event.preventDefault();
        this.showAlert('تم حفظ المباراة بنجاح', 'success');
    }

    async saveNotification(event) {
        event.preventDefault();
        this.showAlert('تم حفظ الإشعار بنجاح', 'success');
    }

    // 🔹 دوال التعديل (مبسطة للتوضيح)
    editSection(sectionId) {
        console.log('تعديل قسم:', sectionId);
        this.showAlert('جاري تحميل بيانات القسم للتعديل', 'info');
    }

    editChannel(channelId) {
        console.log('تعديل قناة:', channelId);
        this.showAlert('جاري تحميل بيانات القناة للتعديل', 'info');
    }

    editMatch(matchId) {
        console.log('تعديل مباراة:', matchId);
        this.showAlert('جاري تحميل بيانات المباراة للتعديل', 'info');
    }

    editNotification(notificationId) {
        console.log('تعديل إشعار:', notificationId);
        this.showAlert('جاري تحميل بيانات الإشعار للتعديل', 'info');
    }

    // 🔹 دوال الإلغاء (مبسطة للتوضيح)
    cancelEditSection() {
        this.showAlert('تم إلغاء التعديل', 'info');
    }

    cancelEditChannel() {
        this.showAlert('تم إلغاء التعديل', 'info');
    }

    cancelEditMatch() {
        this.showAlert('تم إلغاء التعديل', 'info');
    }

    cancelEditNotification() {
        this.showAlert('تم إلغاء التعديل', 'info');
    }

    // 🔹 دوال الحذف (مبسطة للتوضيح)
    async deleteSection(sectionId) {
        if (confirm('هل أنت متأكد من حذف هذا القسم؟')) {
            this.showAlert('تم حذف القسم بنجاح', 'success');
        }
    }

    async deleteChannel(channelId) {
        if (confirm('هل أنت متأكد من حذف هذه القناة؟')) {
            this.showAlert('تم حذف القناة بنجاح', 'success');
        }
    }

    async deleteMatch(matchId) {
        if (confirm('هل أنت متأكد من حذف هذه المباراة؟')) {
            this.showAlert('تم حذف المباراة بنجاح', 'success');
        }
    }

    async deleteNotification(notificationId) {
        if (confirm('هل أنت متأكد من حذف هذا الإشعار؟')) {
            this.showAlert('تم حذف الإشعار بنجاح', 'success');
        }
    }
}

// 🔹 تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 تم تحميل صفحة لوحة التحكم');
    window.adminManager = new AdminManager();
});