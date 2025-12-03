// Wait for Firebase to be fully loaded
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max
        
        const checkFirebase = () => {
            attempts++;
            
            if (typeof firebase !== 'undefined' && 
                typeof db !== 'undefined' && 
                typeof auth !== 'undefined') {
                console.log("Firebase is ready after", attempts, "attempts");
                resolve(true);
                return;
            }
            
            if (attempts >= maxAttempts) {
                console.error("Firebase failed to load after", maxAttempts, "attempts");
                reject(new Error("Firebase failed to load"));
                return;
            }
            
            setTimeout(checkFirebase, 100);
        };
        
        checkFirebase();
    });
}

// دالة التحقق من الاتصال بالإنترنت
function checkInternetConnection() {
    return new Promise((resolve, reject) => {
        // تحقق أولاً من حالة الاتصال في المتصفح
        if (!navigator.onLine) {
            reject(new Error("لا يوجد اتصال بالإنترنت"));
            return;
        }
        
        // اختبار اتصال فعلي بطلب صغير
        const testImage = new Image();
        testImage.src = 'https://www.google.com/images/phd/px.gif?' + new Date().getTime();
        let timedOut = false;
        
        const timeout = setTimeout(() => {
            timedOut = true;
            reject(new Error("انتهت مهلة الاتصال بالإنترنت"));
        }, 5000); // 5 ثواني
        
        testImage.onload = function() {
            if (!timedOut) {
                clearTimeout(timeout);
                resolve(true);
            }
        };
        
        testImage.onerror = function() {
            if (!timedOut) {
                clearTimeout(timeout);
                reject(new Error("فشل الاتصال بالإنترنت"));
            }
        };
    });
}

// دالة التحقق من الاتصال قبل فتح القسم
async function checkConnectionBeforeOpen() {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        color: white;
        font-size: 18px;
        text-align: center;
        backdrop-filter: blur(5px);
    `;
    
    loadingOverlay.innerHTML = `
        <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;" role="status">
            <span class="visually-hidden">جاري التحقق...</span>
        </div>
        <p>جاري التحقق من الاتصال بالإنترنت...</p>
    `;
    
    document.body.appendChild(loadingOverlay);
    
    try {
        await checkInternetConnection();
        loadingOverlay.remove();
        return true;
    } catch (error) {
        loadingOverlay.innerHTML = `
            <i class="uil uil-wifi-slash mb-3" style="font-size: 3rem; color: #ff6b6b;"></i>
            <h4>⚠️ لا يوجد اتصال بالإنترنت</h4>
            <p>${error.message || "يرجى التحقق من اتصالك بالإنترنت"}</p>
            <div class="mt-4">
                <button onclick="window.location.reload()" class="btn btn-primary me-2">
                    <i class="uil uil-redo"></i> إعادة المحاولة
                </button>
                <button onclick="this.parentElement.parentElement.remove()" class="btn btn-secondary">
                    <i class="uil uil-times"></i> إغلاق
                </button>
            </div>
        `;
        return false;
    }
}

// Enhanced Authentication system
class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.authReady = false;
        this.init();
    }

    async init() {
        try {
            await waitForFirebase();
            
            if (typeof auth === 'undefined') {
                console.error('Firebase auth is not available');
                this.setupFallbackAuth();
                return;
            }
            
            this.setupAuthListener();
            this.authReady = true;
            console.log('AuthManager initialized successfully');
            
        } catch (error) {
            console.error('AuthManager initialization failed:', error);
            this.setupFallbackAuth();
        }
    }

    setupAuthListener() {
        auth.onAuthStateChanged((user) => {
            console.log('Auth state changed:', user ? 'User signed in' : 'User signed out');
            if (user) {
                this.isAuthenticated = true;
                this.currentUser = user;
                localStorage.setItem('adminAuth', 'true');
                localStorage.setItem('adminEmail', user.email);
                console.log('User authenticated:', user.email);
            } else {
                this.isAuthenticated = false;
                this.currentUser = null;
                localStorage.removeItem('adminAuth');
                localStorage.removeItem('adminEmail');
                console.log('User signed out');
            }
        }, (error) => {
            console.error('Auth state change error:', error);
            this.setupFallbackAuth();
        });
    }

    // Fallback authentication for when Firebase fails
    setupFallbackAuth() {
        console.log('Setting up fallback authentication');
        const storedAuth = localStorage.getItem('adminAuth');
        this.isAuthenticated = storedAuth === 'true';
        this.authReady = true;
    }

    async login(email, password) {
        // If Firebase auth is not available, use fallback
        if (typeof auth === 'undefined') {
            console.log('Using fallback authentication');
            return this.fallbackLogin(email, password);
        }

        try {
            console.log('Attempting Firebase login for:', email);
            
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            this.isAuthenticated = true;
            this.currentUser = userCredential.user;
            
            localStorage.setItem('adminAuth', 'true');
            localStorage.setItem('adminEmail', email);
            
            console.log('Firebase login successful for:', email);
            return { success: true, user: userCredential.user };
            
        } catch (error) {
            console.error('Firebase login error:', error);
            
            // Fallback to simple authentication if Firebase fails
            return this.fallbackLogin(email, password);
        }
    }

    // Simple password-based authentication as fallback
    fallbackLogin(email, password) {
        console.log('Using fallback login for:', email);
        
        // Simple password check - you can change this password
        const validPassword = "Ww735981122"; // Change this to your desired password
        
        if (password === validPassword && email === "admin@aseeltv.com") {
            this.isAuthenticated = true;
            this.currentUser = { email: email };
            localStorage.setItem('adminAuth', 'true');
            localStorage.setItem('adminEmail', email);
            
            console.log('Fallback login successful');
            return { success: true, user: { email: email } };
        } else {
            let errorMessage = 'كلمة المرور غير صحيحة';
            
            if (email !== "admin@aseeltv.com") {
                errorMessage = 'البريد الإلكتروني غير صحيح';
            }
            
            return { success: false, error: errorMessage };
        }
    }

    async logout() {
        try {
            if (typeof auth !== 'undefined') {
                await auth.signOut();
            }
            
            this.isAuthenticated = false;
            this.currentUser = null;
            localStorage.removeItem('adminAuth');
            localStorage.removeItem('adminEmail');
            
            console.log('Logout successful');
            return { success: true };
            
        } catch (error) {
            console.error('Logout error:', error);
            
            // Fallback logout
            this.isAuthenticated = false;
            this.currentUser = null;
            localStorage.removeItem('adminAuth');
            localStorage.removeItem('adminEmail');
            
            return { success: true };
        }
    }

    checkAuth() {
        if (!this.authReady) {
            console.log('Auth not ready yet');
            return false;
        }
        
        const storedAuth = localStorage.getItem('adminAuth');
        this.isAuthenticated = storedAuth === 'true';
        
        console.log('Auth check:', this.isAuthenticated ? 'Authenticated' : 'Not authenticated');
        return this.isAuthenticated;
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// Main application
class BeinSportApp {
    constructor() {
        this.channels = [];
        this.unsubscribeChannels = null;
        this.init();
    }

    async init() {
        console.log('Initializing BeinSport App...');
        
        // Set current year
        document.getElementById('currentYear').textContent = new Date().getFullYear();
        
        // Wait for auth to be ready
        await this.waitForAuth();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load channels
        await this.loadChannels();
        
        console.log('App initialized successfully');
    }

    async waitForAuth() {
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds max
        
        return new Promise((resolve) => {
            const checkAuth = () => {
                attempts++;
                
                if (authManager.authReady) {
                    console.log("Auth ready after", attempts, "attempts");
                    resolve(true);
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    console.warn("Auth not ready, continuing anyway");
                    resolve(false);
                    return;
                }
                
                setTimeout(checkAuth, 100);
            };
            
            checkAuth();
        });
    }

    async loadChannels() {
        try {
            const channelsContainer = document.getElementById('channelsContainer');
            channelsContainer.innerHTML = '<div class="loading">جاري تحميل القنوات...</div>';
            
            // Try Firebase first
            if (typeof db !== 'undefined') {
                console.log('Loading channels from Firebase...');
                const snapshot = await db.collection('channels').orderBy('order').get();
                
                if (!snapshot.empty) {
                    this.channels = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    this.renderChannels();
                    return;
                }
            }
            
            // Fallback to default channels
            console.log('Using default channels (Firebase not available or no channels)');
            this.loadDefaultChannels();
            
        } catch (error) {
            console.error('Error loading channels:', error);
            this.loadDefaultChannels();
        }
    }

    loadDefaultChannels() {
        console.log('Loading default channels...');
        this.channels = [
            {
                id: 'default-1',
                name: 'bein sport 1',
                image: 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=BEIN+1',
                url: '#',
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                downloadUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                order: 1
            },
            {
                id: 'default-2',
                name: 'bein sport 2',
                image: 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=BEIN+2',
                url: '#',
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                downloadUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                order: 2
            }
        ];
        this.renderChannels();
    }

    renderChannels() {
        const container = document.getElementById('channelsContainer');
        
        if (!this.channels || this.channels.length === 0) {
            container.innerHTML = '<div class="loading">لا توجد قنوات متاحة</div>';
            return;
        }

        console.log('Rendering channels:', this.channels.length);
        
        container.innerHTML = this.channels.map(channel => `
            <div class="channel-card" data-channel-id="${channel.id}">
                <div class="channel-logo">
                    <img src="${channel.image}" alt="${channel.name}" 
                         onerror="this.src='https://via.placeholder.com/200x100/2F2562/FFFFFF?text=No+Image'">
                </div>
                <div class="channel-name">${channel.name}</div>
            </div>
        `).join('');

        // Add click events
        container.querySelectorAll('.channel-card').forEach(card => {
            card.addEventListener('click', () => {
                const channelId = card.getAttribute('data-channel-id');
                const channel = this.channels.find(c => c.id === channelId);
                if (channel) {
                    this.openChannel(channel);
                }
            });
        });
    }

    openChannel(channel) {
        console.log('Opening channel:', channel.name);
        
        if (channel.url && channel.url !== '#') {
            window.location.href = channel.url;
        } else {
            // Show install modal if no URL or demo URL
            this.showInstallModal(channel);
        }
    }

    showInstallModal(channel) {
        const modal = document.getElementById('installModal');
        if (modal) {
            modal.style.display = "block";
            
            document.getElementById('confirmInstall').onclick = () => {
                if (channel.downloadUrl) {
                    window.open(channel.downloadUrl, '_blank');
                }
                this.closeModal();
            };
            
            document.getElementById('cancelInstall').onclick = () => {
                this.closeModal();
            };
            
            document.getElementById('dontShowAgain').onclick = function() {
                if (this.checked) {
                    localStorage.setItem('appInstallPrompt', 'disabled');
                } else {
                    localStorage.removeItem('appInstallPrompt');
                }
            };
        }
    }

    closeModal() {
        const modal = document.getElementById('installModal');
        if (modal) {
            modal.style.display = "none";
        }
    }

    showAdminLogin() {
        console.log('Showing admin login modal');
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'block';
            console.log('Login modal displayed successfully');
        } else {
            console.error('Login modal not found!');
        }
    }

    hideAdminLogin() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'none';
            const adminPassword = document.getElementById('adminPassword');
            if (adminPassword) adminPassword.value = '';
            
            const loginError = document.getElementById('loginError');
            if (loginError) loginError.style.display = 'none';
        }
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Login toggle button
        const loginToggle = document.getElementById('loginToggle');
        if (loginToggle) {
            loginToggle.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Login button clicked - Auth state:', authManager.isAuthenticated);
                
                if (authManager.isAuthenticated) {
                    console.log('Redirecting to admin panel');
                    window.location.href = 'admin.html';
                } else {
                    console.log('Showing login modal');
                    this.showAdminLogin();
                }
            });
            console.log('Login toggle event listener added');
        }

        // Login button in modal
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.addEventListener('click', async (e) => {
                e.preventDefault();
                
                const email = document.getElementById('adminEmail').value;
                const password = document.getElementById('adminPassword').value;
                
                console.log('Login attempt with email:', email);
                
                if (!email || !password) {
                    this.showLoginError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
                    return;
                }
                
                const result = await authManager.login(email, password);
                
                if (result.success) {
                    console.log('Login successful, redirecting to admin');
                    this.hideAdminLogin();
                    window.location.href = 'admin.html';
                } else {
                    this.showLoginError(result.error);
                }
            });
        }

        // Cancel login
        const cancelLogin = document.getElementById('cancelLogin');
        if (cancelLogin) {
            cancelLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideAdminLogin();
            });
        }

        // Close modals when clicking outside
        window.addEventListener('click', (event) => {
            const installModal = document.getElementById('installModal');
            const loginModal = document.getElementById('loginModal');
            
            if (event.target === installModal) this.closeModal();
            if (event.target === loginModal) this.hideAdminLogin();
        });

        // Enter key in password field
        const adminPassword = document.getElementById('adminPassword');
        if (adminPassword) {
            adminPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    document.getElementById('loginButton').click();
                }
            });
        }

        console.log('All event listeners setup completed');
    }

    showLoginError(message) {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.textContent = message;
            loginError.style.display = 'block';
        }
    }

    destroy() {
        if (this.unsubscribeChannels) {
            this.unsubscribeChannels();
        }
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, starting initialization...');
    
    // Create auth manager first
    window.authManager = new AuthManager();
    
    // Wait a bit for auth to initialize, then create app
    setTimeout(() => {
        window.app = new BeinSportApp();
    }, 100);
});

// Cleanup
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.destroy();
    }
});


// Notification System
class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.notificationCheckInterval = null;
        this.notificationModal = null;
        this.notificationBell = null;
        this.notificationBadge = null;
        this.init();
    }

    async init() {
        console.log('🔔 تهيئة نظام الإشعارات...');
        
        // Create notification elements
        this.createNotificationElements();
        
        // Wait for Firebase to be ready
        await this.waitForFirebase();
        
        // Start checking for notifications
        this.startNotificationCheck();
        
        // Listen for new notifications
        this.setupNotificationListener();
    }

    createNotificationElements() {
        // Create notification bell in header
        const header = document.querySelector('header');
        if (header) {
            this.notificationBell = document.createElement('div');
            this.notificationBell.className = 'notification-bell';
            this.notificationBell.innerHTML = `
                <i class="uil uil-bell"></i>
                <span class="notification-count">0</span>
            `;
            
            this.notificationBell.style.cssText = `
                position: relative;
                cursor: pointer;
                margin-right: 20px;
                font-size: 24px;
                color: white;
            `;
            
            this.notificationBadge = this.notificationBell.querySelector('.notification-count');
            this.notificationBadge.style.cssText = `
                position: absolute;
                top: -5px;
                right: -5px;
                background: #ff4757;
                color: white;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                font-size: 11px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            this.notificationBell.addEventListener('click', () => {
                this.showNotificationsModal();
            });
            
            // Add to header
            header.appendChild(this.notificationBell);
        }

        // Create notifications modal
        this.notificationModal = document.createElement('div');
        this.notificationModal.id = 'notificationsModal';
        this.notificationModal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 9999;
            padding: 20px;
            overflow-y: auto;
        `;

        this.notificationModal.innerHTML = `
            <div class="notifications-container" style="
                max-width: 500px;
                margin: 50px auto;
                background: linear-gradient(135deg, #151825, #2F2562);
                border-radius: 15px;
                overflow: hidden;
                box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            ">
                <div class="notifications-header" style="
                    background: linear-gradient(90deg, #3545FF, #FF5200);
                    padding: 20px;
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <h3 style="margin: 0; font-size: 1.2rem;">
                        <i class="uil uil-bell"></i> الإشعارات
                    </h3>
                    <button id="closeNotifications" style="
                        background: none;
                        border: none;
                        color: white;
                        font-size: 24px;
                        cursor: pointer;
                    ">×</button>
                </div>
                <div class="notifications-body" style="padding: 20px; max-height: 500px; overflow-y: auto;">
                    <div id="notificationsList" class="loading">
                        <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                            <div class="spinner-border text-primary mb-3" role="status">
                                <span class="visually-hidden">جاري التحميل...</span>
                            </div>
                            <p>جاري تحميل الإشعارات...</p>
                        </div>
                    </div>
                </div>
                <div class="notifications-footer" style="
                    padding: 15px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    text-align: center;
                ">
                    <button id="markAllRead" style="
                        background: linear-gradient(135deg, #2ecc71, #27ae60);
                        color: white;
                        border: none;
                        padding: 8px 20px;
                        border-radius: 25px;
                        cursor: pointer;
                        font-weight: bold;
                    ">
                        <i class="uil uil-check-circle"></i> تحديد الكل كمقروء
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(this.notificationModal);

        // Setup event listeners for modal
        document.getElementById('closeNotifications').addEventListener('click', () => {
            this.hideNotificationsModal();
        });

        document.getElementById('markAllRead').addEventListener('click', () => {
            this.markAllAsRead();
        });

        // Close modal when clicking outside
        this.notificationModal.addEventListener('click', (e) => {
            if (e.target === this.notificationModal) {
                this.hideNotificationsModal();
            }
        });
    }

    async waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (typeof firebase !== 'undefined' && typeof db !== 'undefined') {
                    resolve(true);
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    startNotificationCheck() {
        // Check for notifications every 30 seconds
        this.notificationCheckInterval = setInterval(() => {
            this.checkForNewNotifications();
        }, 30000);

        // Initial check
        this.checkForNewNotifications();
    }

    async checkForNewNotifications() {
        try {
            if (!db) {
                console.log('Firestore not available for notifications');
                return;
            }

            // Calculate date 3 days ago
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            // Get notifications from last 3 days
            const snapshot = await db.collection('realtime_notifications')
                .where('timestamp', '>=', threeDaysAgo)
                .where('isRead', '==', false)
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();

            if (snapshot.empty) {
                this.unreadCount = 0;
                this.updateNotificationBadge();
                return;
            }

            const newNotifications = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                newNotifications.push({
                    id: doc.id,
                    ...data,
                    date: data.timestamp.toDate()
                });
            });

            // Check if we have new notifications
            const hasNew = this.hasNewNotifications(newNotifications);
            if (hasNew) {
                this.notifications = newNotifications;
                this.unreadCount = this.notifications.length;
                this.updateNotificationBadge();
                this.renderNotifications();
                
                // Show modal if there are new notifications and user just opened the app
                this.showNotificationsModal();
            }

        } catch (error) {
            console.error('Error checking notifications:', error);
        }
    }

    hasNewNotifications(newNotifications) {
        if (this.notifications.length === 0 && newNotifications.length > 0) {
            return true;
        }

        // Check if any notification ID is new
        const existingIds = new Set(this.notifications.map(n => n.id));
        return newNotifications.some(n => !existingIds.has(n.id));
    }

    updateNotificationBadge() {
        if (this.notificationBadge) {
            this.notificationBadge.textContent = this.unreadCount;
            this.notificationBadge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
        }
    }

    renderNotifications() {
        const container = document.getElementById('notificationsList');
        if (!container) return;

        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                    <i class="uil uil-bell-slash" style="font-size: 3rem; margin-bottom: 15px;"></i>
                    <p>لا توجد إشعارات جديدة</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.notifications.map(notification => {
            const dateStr = notification.date.toLocaleDateString('ar-AR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            let typeClass = '';
            switch (notification.type) {
                case 'success': typeClass = 'success'; break;
                case 'warning': typeClass = 'warning'; break;
                case 'important': typeClass = 'important'; break;
                case 'update': typeClass = 'update'; break;
                default: typeClass = 'info';
            }

            return `
                <div class="notification-item" data-id="${notification.id}" style="
                    background: rgba(255,255,255,0.05);
                    border-radius: 10px;
                    padding: 15px;
                    margin-bottom: 15px;
                    border-left: 4px solid var(--accent-color);
                    transition: all 0.3s ease;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <h4 style="margin: 0; color: white; font-size: 1rem;">${notification.title}</h4>
                        <span class="notification-date" style="color: rgba(255,255,255,0.6); font-size: 0.8rem;">
                            ${dateStr}
                        </span>
                    </div>
                    <p style="color: rgba(255,255,255,0.8); margin-bottom: 10px; line-height: 1.5;">
                        ${notification.message}
                    </p>
                    ${notification.image ? `
                        <img src="${notification.image}" alt="صورة الإشعار" 
                             style="max-width: 100%; border-radius: 8px; margin-bottom: 10px;"
                             onerror="this.style.display='none'">
                    ` : ''}
                    ${notification.link ? `
                        <a href="${notification.link}" target="_blank" 
                           style="display: inline-block; background: linear-gradient(135deg, #3545FF, #6a11cb);
                                  color: white; padding: 8px 15px; border-radius: 5px; 
                                  text-decoration: none; font-size: 0.9rem;">
                           <i class="uil uil-external-link-alt"></i> عرض التفاصيل
                        </a>
                    ` : ''}
                    <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
                        <button class="mark-read-btn" style="
                            background: rgba(255,255,255,0.1);
                            border: 1px solid rgba(255,255,255,0.2);
                            color: rgba(255,255,255,0.7);
                            padding: 4px 12px;
                            border-radius: 15px;
                            font-size: 0.8rem;
                            cursor: pointer;
                        ">
                            <i class="uil uil-check"></i> تمت القراءة
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners to mark as read buttons
        container.querySelectorAll('.mark-read-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const notificationItem = e.target.closest('.notification-item');
                const notificationId = notificationItem.getAttribute('data-id');
                this.markAsRead(notificationId);
            });
        });
    }

    async markAsRead(notificationId) {
        try {
            await db.collection('realtime_notifications').doc(notificationId).update({
                isRead: true,
                readAt: new Date()
            });

            // Remove from local array
            this.notifications = this.notifications.filter(n => n.id !== notificationId);
            this.unreadCount = this.notifications.length;
            this.updateNotificationBadge();
            this.renderNotifications();

            // If all notifications are read, close modal
            if (this.unreadCount === 0) {
                this.hideNotificationsModal();
            }

        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async markAllAsRead() {
        try {
            const batch = db.batch();
            this.notifications.forEach(notification => {
                const notificationRef = db.collection('realtime_notifications').doc(notification.id);
                batch.update(notificationRef, {
                    isRead: true,
                    readAt: new Date()
                });
            });

            await batch.commit();

            // Clear local array
            this.notifications = [];
            this.unreadCount = 0;
            this.updateNotificationBadge();
            this.renderNotifications();
            this.hideNotificationsModal();

        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    }

    showNotificationsModal() {
        if (this.notificationModal && this.unreadCount > 0) {
            this.notificationModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    hideNotificationsModal() {
        if (this.notificationModal) {
            this.notificationModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    setupNotificationListener() {
        if (!db) return;

        // Real-time listener for new notifications
        db.collection('realtime_notifications')
            .where('isRead', '==', false)
            .orderBy('timestamp', 'desc')
            .limit(1)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        // New notification arrived
                        this.checkForNewNotifications();
                        
                        // Show notification toast
                        const data = change.doc.data();
                        this.showNotificationToast(data);
                    }
                });
            });
    }

    // نظام الإشعارات - Firebase
class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.db = null;
        this.isFirebaseReady = false;
        this.init();
    }

    async init() {
        console.log('🔔 بدء نظام الإشعارات...');
        
        // انتظر حتى يتم تحميل Firebase
        await this.waitForFirebase();
        
        // إنشاء عناصر الواجهة
        this.createNotificationUI();
        
        // تحميل الإشعارات
        await this.loadNotifications();
        
        // بدء التحديث التلقائي
        this.startAutoRefresh();
    }

    async waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (typeof firebase !== 'undefined') {
                    try {
                        // تكوين Firebase
                        const firebaseConfig = {
                            apiKey: "AIzaSyAkgEiYYlmpMe0NLewulheovlTQMz5C980",
                            authDomain: "bein-42f9e.firebaseapp.com",
                            projectId: "bein-42f9e",
                            storageBucket: "bein-42f9e.firebasestorage.app",
                            messagingSenderId: "143741167050",
                            appId: "1:143741167050:web:922d3a0cddb40f67b21b33",
                            measurementId: "G-JH198SKCFS"
                        };

                        // تهيئة Firebase إذا لم يكن مهيأ
                        if (!firebase.apps.length) {
                            firebase.initializeApp(firebaseConfig);
                        }
                        
                        this.db = firebase.firestore();
                        this.isFirebaseReady = true;
                        
                        console.log('✅ Firebase جاهز للإشعارات');
                        resolve(true);
                    } catch (error) {
                        console.error('❌ خطأ في تهيئة Firebase:', error);
                        resolve(false);
                    }
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    createNotificationUI() {
        // البحث عن الهيدر
        const header = document.querySelector('header');
        if (!header) {
            console.error('❌ لم يتم العثور على الهيدر');
            setTimeout(() => this.createNotificationUI(), 1000);
            return;
        }

        // إنشاء عنصر الجرس
        this.createBellIcon(header);
        
        // إنشاء نافذة الإشعارات
        this.createNotificationModal();
    }

    createBellIcon(header) {
        // إنشاء حاوية الأيقونة
        const bellContainer = document.createElement('div');
        bellContainer.id = 'notificationBellContainer';
        bellContainer.style.cssText = `
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            z-index: 1001;
        `;

        bellContainer.innerHTML = `
            <div class="notification-bell" id="notificationBell" 
                 style="position: relative; width: 45px; height: 45px; 
                        background: rgba(93, 114, 214, 0.2); 
                        border-radius: 50%; display: flex; 
                        align-items: center; justify-content: center; 
                        cursor: pointer; border: 2px solid rgba(255, 255, 255, 0.3);
                        transition: all 0.3s ease;">
                <i class="uil uil-bell" 
                   style="font-size: 22px; color: white; transition: all 0.3s ease;"></i>
                <span class="notification-badge" id="notificationBadge"
                      style="position: absolute; top: -5px; right: -5px;
                             background: linear-gradient(135deg, #ff4757, #ff3838);
                             color: white; border-radius: 50%; width: 20px; height: 20px;
                             font-size: 12px; font-weight: bold; display: none;
                             align-items: center; justify-content: center;
                             box-shadow: 0 3px 8px rgba(0,0,0,0.3);">
                    0
                </span>
            </div>
        `;

        // إضافة الأنماط عند التمرير
        const style = document.createElement('style');
        style.textContent = `
            .notification-bell:hover {
                background: rgba(93, 114, 214, 0.4) !important;
                transform: scale(1.1) !important;
                box-shadow: 0 0 20px rgba(93, 114, 214, 0.5) !important;
            }
            .notification-bell:hover i {
                transform: rotate(15deg);
            }
            .notification-badge {
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);

        // إضافة إلى الهيدر
        header.appendChild(bellContainer);

        // حدث النقر على الجرس
        document.getElementById('notificationBell').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showNotificationsModal();
        });

        console.log('✅ تم إضافة أيقونة الإشعارات');
    }

    createNotificationModal() {
        // إنشاء نافذة الإشعارات
        this.modal = document.createElement('div');
        this.modal.id = 'notificationsModal';
        this.modal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            z-index: 99999;
            backdrop-filter: blur(10px);
            animation: fadeIn 0.3s ease;
        `;

        this.modal.innerHTML = `
            <div style="position: absolute; top: 50%; left: 50%; 
                        transform: translate(-50%, -50%); width: 90%; 
                        max-width: 500px; max-height: 80vh; 
                        background: linear-gradient(135deg, #0a0c1a, #151a35);
                        border-radius: 20px; overflow: hidden;
                        box-shadow: 0 25px 50px rgba(0,0,0,0.7);
                        border: 1px solid rgba(93, 114, 214, 0.3);">
                
                <!-- رأس النافذة -->
                <div style="background: linear-gradient(90deg, #3545FF, #FF5200);
                            padding: 20px; display: flex; justify-content: space-between;
                            align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <h3 style="margin: 0; color: white; font-size: 1.2rem; 
                               display: flex; align-items: center; gap: 10px;">
                        <i class="uil uil-bell"></i>
                        الإشعارات الحديثة
                    </h3>
                    <button id="closeNotificationsModal" 
                            style="background: none; border: none; color: white; 
                                   font-size: 28px; cursor: pointer; padding: 0;
                                   width: 30px; height: 30px; display: flex;
                                   align-items: center; justify-content: center;">
                        ×
                    </button>
                </div>
                
                <!-- جسم النافذة -->
                <div id="notificationsList" 
                     style="padding: 20px; max-height: 400px; overflow-y: auto;">
                    <div class="loading-notifications" 
                         style="text-align: center; padding: 40px;">
                        <div class="spinner" 
                             style="width: 40px; height: 40px; border: 4px solid rgba(93, 114, 214, 0.3);
                                    border-top: 4px solid #5d72d6; border-radius: 50%;
                                    animation: spin 1s linear infinite; margin: 0 auto 15px;"></div>
                        <p style="color: rgba(255,255,255,0.7); margin: 0;">
                            جاري تحميل الإشعارات...
                        </p>
                    </div>
                </div>
                
                <!-- تذييل النافذة -->
                <div style="padding: 15px; border-top: 1px solid rgba(255,255,255,0.1);
                            text-align: center;">
                    <button id="markAllAsReadBtn" 
                            style="background: linear-gradient(135deg, #2ecc71, #27ae60);
                                   color: white; border: none; padding: 10px 25px;
                                   border-radius: 25px; cursor: pointer; font-weight: bold;
                                   font-size: 0.9rem; transition: all 0.3s ease;">
                        <i class="uil uil-check-circle"></i>
                        تحديد الكل كمقروء
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // إضافة أحداث
        document.getElementById('closeNotificationsModal').addEventListener('click', () => {
            this.hideNotificationsModal();
        });

        document.getElementById('markAllAsReadBtn').addEventListener('click', () => {
            this.markAllAsRead();
        });

        // إغلاق عند النقر خارج النافذة
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideNotificationsModal();
            }
        });

        // إضافة أنيميشن الـ spinner
        const spinnerStyle = document.createElement('style');
        spinnerStyle.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(spinnerStyle);
    }

    async loadNotifications() {
        console.log('📥 جاري تحميل الإشعارات...');
        
        try {
            if (this.isFirebaseReady && this.db) {
                await this.loadFromFirebase();
            } else {
                await this.loadFromLocalStorage();
            }
            
            this.updateBadge();
            
        } catch (error) {
            console.error('❌ فشل تحميل الإشعارات:', error);
            this.showErrorMessage('فشل في تحميل الإشعارات');
        }
    }

    async loadFromFirebase() {
        try {
            console.log('☁️ القراءة من Firebase...');
            
            // حساب تاريخ 3 أيام مضت
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            
            // محاولة قراءة من notifications
            let querySnapshot;
            try {
                querySnapshot = await this.db.collection('notifications')
                    .where('isActive', '==', true)
                    .where('sentAt', '>=', threeDaysAgo)
                    .orderBy('sentAt', 'desc')
                    .limit(10)
                    .get();
            } catch (error) {
                console.log('⚠️ لا يمكن استخدام where مع sentAt، جلب جميع الإشعارات');
                querySnapshot = await this.db.collection('notifications')
                    .where('isActive', '==', true)
                    .orderBy('sentAt', 'desc')
                    .limit(10)
                    .get();
            }
            
            if (querySnapshot.empty) {
                console.log('ℹ️ لا توجد إشعارات في Firebase');
                this.notifications = [];
                this.renderNotifications();
                return;
            }
            
            this.notifications = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const notificationId = doc.id;
                const isRead = localStorage.getItem(`notification_read_${notificationId}`) === 'true';
                
                this.notifications.push({
                    id: notificationId,
                    title: data.title || 'إشعار بدون عنوان',
                    message: data.message || '',
                    image: data.image || null,
                    link: data.link || null,
                    type: data.type || 'info',
                    date: data.sentAt ? data.sentAt.toDate() : new Date(),
                    isRead: isRead
                });
            });
            
            console.log(`✅ تم تحميل ${this.notifications.length} إشعار`);
            
            // حفظ في localStorage
            this.saveToLocalStorage();
            
            // عرض الإشعارات
            this.renderNotifications();
            
            // عرض النافذة إذا كانت هناك إشعارات غير مقروءة
            this.showModalIfUnread();
            
        } catch (error) {
            console.error('🔥 خطأ في قراءة Firebase:', error);
            throw error;
        }
    }

    async loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('aseel_tv_notifications');
            if (saved) {
                this.notifications = JSON.parse(saved);
                console.log(`💾 تم تحميل ${this.notifications.length} إشعار من التخزين المحلي`);
                this.renderNotifications();
            }
        } catch (error) {
            console.error('❌ خطأ في قراءة التخزين المحلي:', error);
        }
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('aseel_tv_notifications', JSON.stringify(this.notifications));
        } catch (error) {
            console.error('❌ خطأ في حفظ الإشعارات محلياً:', error);
        }
    }

    renderNotifications() {
        const container = document.getElementById('notificationsList');
        if (!container) return;
        
        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.7);">
                    <i class="uil uil-bell-slash" style="font-size: 3rem; margin-bottom: 15px; 
                                                         color: #6a11cb;"></i>
                    <p style="margin: 0 0 10px 0;">لا توجد إشعارات جديدة</p>
                    <small style="color: rgba(255,255,255,0.5);">
                        سيتم إعلامك عند وجود تحديثات
                    </small>
                </div>
            `;
            return;
        }
        
        // حساب الإشعارات غير المقروءة
        this.unreadCount = this.notifications.filter(n => !n.isRead).length;
        
        container.innerHTML = this.notifications.map((notification, index) => {
            const dateStr = notification.date.toLocaleDateString('ar-AR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const isUnread = !notification.isRead;
            const borderColor = isUnread ? '#FF5200' : '#5d72d6';
            
            return `
                <div class="notification-item" data-id="${notification.id}" 
                     style="background: ${isUnread ? 'rgba(255, 82, 0, 0.1)' : 'rgba(255,255,255,0.05)'};
                            border-radius: 12px; padding: 15px; margin-bottom: 15px;
                            border-left: 4px solid ${borderColor}; transition: all 0.3s ease;
                            animation: slideIn 0.5s ease ${index * 0.1}s;
                            animation-fill-mode: both;">
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                        <div style="flex-shrink: 0; width: 40px; height: 40px; 
                                    border-radius: 10px; background: linear-gradient(135deg, #6a11cb, #2575fc);
                                    display: flex; align-items: center; justify-content: center;
                                    color: white; font-size: 18px;">
                            <i class="uil uil-megaphone"></i>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; justify-content: space-between; 
                                        align-items: flex-start; margin-bottom: 8px;">
                                <h4 style="margin: 0; color: white; font-size: 1rem; flex: 1;">
                                    ${notification.title}
                                    ${isUnread ? '<span style="color: #ff4757; font-size: 0.8em;"> ● جديد</span>' : ''}
                                </h4>
                                <small style="color: rgba(255,255,255,0.6); font-size: 0.8rem; 
                                             flex-shrink: 0; margin-right: 10px;">
                                    ${dateStr}
                                </small>
                            </div>
                            <p style="margin: 0 0 10px 0; color: rgba(255,255,255,0.8); 
                                      font-size: 0.9rem; line-height: 1.5;">
                                ${notification.message}
                            </p>
                            ${notification.image ? `
                                <img src="${notification.image}" alt="صورة الإشعار" 
                                     style="max-width: 100%; border-radius: 8px; margin-bottom: 10px;
                                            border: 1px solid rgba(255,255,255,0.1);"
                                     onerror="this.style.display='none'">
                            ` : ''}
                            <div style="display: flex; justify-content: space-between; 
                                        align-items: center; margin-top: 10px;">
                                ${notification.link ? `
                                    <a href="${notification.link}" target="_blank" 
                                       style="background: linear-gradient(135deg, #5d72d6, #6a11cb);
                                              color: white; text-decoration: none; padding: 6px 15px;
                                              border-radius: 20px; font-size: 0.85rem; 
                                              transition: all 0.3s ease;">
                                        <i class="uil uil-external-link-alt"></i> عرض التفاصيل
                                    </a>
                                ` : '<div></div>'}
                                ${isUnread ? `
                                    <button class="mark-as-read" data-id="${notification.id}"
                                            style="background: rgba(255,255,255,0.1); 
                                                   border: 1px solid rgba(255,255,255,0.2);
                                                   color: rgba(255,255,255,0.7); padding: 5px 12px;
                                                   border-radius: 15px; font-size: 0.8rem; 
                                                   cursor: pointer; transition: all 0.3s ease;">
                                        <i class="uil uil-check"></i> تمت القراءة
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // إضافة أحداث النقر على أزرار "تمت القراءة"
        container.querySelectorAll('.mark-as-read').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const notificationId = e.target.closest('.mark-as-read').getAttribute('data-id');
                this.markAsRead(notificationId);
            });
        });
        
        // إضافة أحداث النقر على الإشعارات
        container.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('a') && !e.target.closest('button')) {
                    const notificationId = item.getAttribute('data-id');
                    this.markAsRead(notificationId);
                    
                    // فتح الرابط إذا كان موجوداً
                    const link = item.querySelector('a');
                    if (link) {
                        window.open(link.href, '_blank');
                    }
                }
            });
        });
        
        // إضافة أنيميشن slideIn
        const slideInStyle = document.createElement('style');
        slideInStyle.textContent = `
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
        `;
        document.head.appendChild(slideInStyle);
    }

    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && !notification.isRead) {
            notification.isRead = true;
            localStorage.setItem(`notification_read_${notificationId}`, 'true');
            this.unreadCount--;
            this.updateBadge();
            this.renderNotifications();
            this.saveToLocalStorage();
        }
    }

    markAllAsRead() {
        this.notifications.forEach(notification => {
            if (!notification.isRead) {
                notification.isRead = true;
                localStorage.setItem(`notification_read_${notification.id}`, 'true');
            }
        });
        this.unreadCount = 0;
        this.updateBadge();
        this.renderNotifications();
        this.saveToLocalStorage();
    }

    updateBadge() {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.textContent = this.unreadCount;
            badge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
        }
    }

    showNotificationsModal() {
        if (this.modal) {
            this.modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    hideNotificationsModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    showModalIfUnread() {
        // عرض النافذة تلقائياً إذا كانت هناك إشعارات غير مقروءة
        if (this.unreadCount > 0) {
            // تأخير العرض لبضع ثوان
            setTimeout(() => {
                if (!localStorage.getItem('notification_modal_shown_today')) {
                    this.showNotificationsModal();
                    localStorage.setItem('notification_modal_shown_today', 'true');
                    
                    // إعادة تعيين في منتصف الليل
                    const now = new Date();
                    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
                    const timeUntilMidnight = midnight.getTime() - now.getTime();
                    
                    setTimeout(() => {
                        localStorage.removeItem('notification_modal_shown_today');
                    }, timeUntilMidnight);
                }
            }, 2000);
        }
    }

    showErrorMessage(message) {
        const container = document.getElementById('notificationsList');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ff6b6b;">
                    <i class="uil uil-exclamation-triangle" 
                       style="font-size: 3rem; margin-bottom: 15px;"></i>
                    <p style="margin: 0 0 15px 0;">${message}</p>
                    <button onclick="notificationSystem.loadNotifications()" 
                            style="background: linear-gradient(135deg, #6a11cb, #2575fc);
                                   color: white; border: none; padding: 10px 20px;
                                   border-radius: 20px; cursor: pointer; font-weight: bold;">
                        <i class="uil uil-redo"></i> إعادة المحاولة
                    </button>
                </div>
            `;
        }
    }

    startAutoRefresh() {
        // تحديث الإشعارات كل 30 ثانية
        setInterval(() => {
            if (this.isFirebaseReady) {
                this.loadNotifications();
            }
        }, 30000);
        
        // تحديث أولي بعد 5 دقائق
        setTimeout(() => {
            this.loadNotifications();
        }, 300000);
    }
}

// إعداد نظام الإشعارات بعد تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏠 بدء نظام الإشعارات في الصفحة الرئيسية');
    
    // الانتظار لضمان تحميل الصفحة
    setTimeout(() => {
        window.notificationSystem = new NotificationSystem();
        
        // إذا لم تظهر الأيقونة بعد 10 ثوان، أضفها يدوياً
        setTimeout(() => {
            if (!document.getElementById('notificationBellContainer')) {
                console.log('⚠️ إضافة أيقونة الإشعارات يدوياً...');
                const header = document.querySelector('header');
                if (header) {
                    notificationSystem.createBellIcon(header);
                }
            }
        }, 10000);
        
    }, 2000);
});

// استمع لرسائل التصحيح من Firebase
window.addEventListener('firebase-error', (e) => {
    console.error('🔥 خطأ Firebase:', e.detail);
});
