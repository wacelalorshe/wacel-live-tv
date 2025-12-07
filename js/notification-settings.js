// js/notification-settings.js
// لوحة إعدادات الإشعارات

class NotificationSettings {
    constructor() {
        this.init();
    }

    init() {
        this.createSettingsPanel();
        this.loadSettings();
    }

    createSettingsPanel() {
        const settingsHTML = `
            <div id="notificationSettingsPanel" class="notification-settings-panel" style="display: none;">
                <div class="settings-header">
                    <h4><i class="uil uil-cog"></i> إعدادات الإشعارات</h4>
                    <button class="settings-close" onclick="notificationSettings.hide()">
                        <i class="uil uil-times"></i>
                    </button>
                </div>
                <div class="settings-body">
                    <div class="settings-group">
                        <h5><i class="uil uil-bell"></i> الإشعارات المنبثقة</h5>
                        <div class="settings-item">
                            <label>
                                <input type="checkbox" id="enablePopups" checked>
                                <span>عرض الإشعارات تلقائياً عند فتح الموقع</span>
                            </label>
                        </div>
                        <div class="settings-item">
                            <label>تردد عرض الإشعارات:</label>
                            <select id="popupFrequency">
                                <option value="always">دائماً</option>
                                <option value="once_per_hour">مرة كل ساعة</option>
                                <option value="once_per_day">مرة يومياً</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="settings-group">
                        <h5><i class="uil uil-volume"></i> صوت الإشعارات</h5>
                        <div class="settings-item">
                            <label>
                                <input type="checkbox" id="enableSounds" checked>
                                <span>تشغيل صوت عند وصول إشعار جديد</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="settings-group">
                        <h5><i class="uil uil-palette"></i> المظهر</h5>
                        <div class="settings-item">
                            <label>نوع الرسالة:</label>
                            <select id="notificationStyle">
                                <option value="popup">نافذة منبثقة</option>
                                <option value="toast">رسائل سريعة</option>
                                <option value="both">الاثنان معاً</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="settings-group">
                        <h5><i class="uil uil-history"></i> البيانات</h5>
                        <div class="settings-item">
                            <button class="btn btn-sm btn-info" onclick="notificationSettings.clearHistory()">
                                <i class="uil uil-trash-alt"></i> مسح سجل الإشعارات
                            </button>
                            <small>مسح جميع الإشعارات المعروضة سابقاً</small>
                        </div>
                        <div class="settings-item">
                            <button class="btn btn-sm btn-warning" onclick="notificationSettings.resetSettings()">
                                <i class="uil uil-refresh"></i> إعادة التعيين
                            </button>
                            <small>العودة للإعدادات الافتراضية</small>
                        </div>
                    </div>
                </div>
                <div class="settings-footer">
                    <button class="btn btn-primary" onclick="notificationSettings.save()">
                        <i class="uil uil-save"></i> حفظ الإعدادات
                    </button>
                    <button class="btn btn-secondary" onclick="notificationSettings.hide()">
                        <i class="uil uil-times"></i> إلغاء
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', settingsHTML);
    }

    show() {
        document.getElementById('notificationSettingsPanel').style.display = 'block';
        this.loadSettings();
    }

    hide() {
        document.getElementById('notificationSettingsPanel').style.display = 'none';
    }

    loadSettings() {
        if (window.notificationPopup) {
            const prefs = window.notificationPopup.userPreferences;
            
            document.getElementById('enablePopups').checked = prefs.showPopup;
            document.getElementById('popupFrequency').value = prefs.showFrequency;
            document.getElementById('enableSounds').checked = prefs.enableSounds !== false;
            document.getElementById('notificationStyle').value = prefs.notificationStyle || 'popup';
        }
    }

    save() {
        if (window.notificationPopup) {
            window.notificationPopup.userPreferences = {
                showPopup: document.getElementById('enablePopups').checked,
                showFrequency: document.getElementById('popupFrequency').value,
                enableSounds: document.getElementById('enableSounds').checked,
                notificationStyle: document.getElementById('notificationStyle').value,
                showToasts: window.notificationPopup.userPreferences.showToasts
            };
            
            window.notificationPopup.saveUserPreferences();
            alert('تم حفظ الإعدادات بنجاح!');
            this.hide();
        }
    }

    clearHistory() {
        if (window.notificationPopup && confirm('هل تريد مسح سجل الإشعارات المعروضة؟')) {
            window.notificationPopup.clearShownNotifications();
            alert('تم مسح السجل بنجاح!');
        }
    }

    resetSettings() {
        if (window.notificationPopup && confirm('هل تريد العودة للإعدادات الافتراضية؟')) {
            window.notificationPopup.resetPreferences();
            this.loadSettings();
            alert('تم إعادة التعيين بنجاح!');
        }
    }
}

// تهيئة النظام
let notificationSettings;

document.addEventListener('DOMContentLoaded', () => {
    notificationSettings = new NotificationSettings();
    window.notificationSettings = notificationSettings;
});

// وظيفة لعرض إعدادات الإشعارات
window.showNotificationSettings = function() {
    if (window.notificationSettings) {
        window.notificationSettings.show();
    }
};