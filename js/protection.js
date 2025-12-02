// ===========================================
// نظام الحماية
// ===========================================

// تشفير بيانات Firebase
const encryptedFirebaseConfig = "W1siYXBpS2V5IiwiQUl6YVN5QUtnRWlZWWxtcE1lME5MZXd1bGhlb3ZsVFFNelZDNzk4MCJdLFsicHJvamVjdElkIiwiYmVpbi00MmY5ZSJdLFsic3RvcmFnZUJ1Y2tldCIsImJlaW4tNDJmOWUuZmlyZWJhc2VzdG9yYWdlLmFwcCJdLFsibWVzc2FnaW5nU2VuZGVySWQiLCIxNDM3NDExNjcwNTAiXSxbImFwcElkIiwiMToxNDM3NDExNjcwNTA6d2ViOjkyMmQzYTBjZGRiNDBmNjdiMjFiMzMiXSxbIm1lYXN1cmVtZW50SWQiLCJHIEpIMTk4U0tDRlMiXV0=";
const encryptedMatchesConfig = "W1siYXBpS2V5IiwiQUl6YVN5Q3FFN1p3dmVIZzFkSWhZZjFIbG83T3BIeUNadWRlWnZNIl0sWyJwcm9qZWN0SWQiLCJ3YWNlbC1saXZlIl0sWyJkYXRhYmFzZVVSTCIsImh0dHBzOi8vd2FjZWwtbGl2ZS1kZWZhdWx0LXJ0ZGIuYXNpYS1zb3V0aGVhc3QxLmZpcmViYXNlZGF0YWJhc2UuYXBwIl0sWyJzdG9yYWdlQnVja2V0Iiwid2FjZWwtbGl2ZS5maXJlYmFzZXN0b3JhZ2UuYXBwIl0sWyJtZXNzYWdpbmdTZW5kZXJJZCIsIjE4NTEwODU1NDAwNiJdLFsiYXBwSWQiLCIxOjE4NTEwODU1NDAwNjp3ZWI6OTMxNzE4OTViMWQ0YmIwN2M2ZjAzNyJdXQ==";

// دالة فك التشفير
function decryptConfig(encrypted) {
    try {
        const decoded = atob(encrypted);
        const configArray = JSON.parse(decoded);
        const config = {};
        
        configArray.forEach(item => {
            config[getConfigKey(item[0])] = item[1];
        });
        
        return config;
    } catch (e) {
        console.error("خطأ في فك تشفير الإعدادات");
        return null;
    }
}

// دالة للحصول على مفتاح التكوين
function getConfigKey(encryptedKey) {
    const keyMap = {
        "YXBpS2V5": "apiKey",
        "cHJvamVjdElk": "projectId",
        "c3RvcmFnZUJ1Y2tldA==": "storageBucket",
        "bWVzc2FnaW5nU2VuZGVySWQ=": "messagingSenderId",
        "YXBwSWQ=": "appId",
        "bWVhc3VyZW1lbnRJZA==": "measurementId",
        "ZGF0YWJhc2VVUkw=": "databaseURL",
        "YXV0aERvbWFpbg==": "authDomain"
    };
    
    return keyMap[encryptedKey] || encryptedKey;
}

// منع النسخ والنقر بزر الماوس الأيمن
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    showToast('هذا الإجراء غير مسموح', 'warning');
    return false;
});

// منع اختيار النص
document.addEventListener('selectstart', function(e) {
    e.preventDefault();
    return false;
});

// منع فحص العناصر
document.addEventListener('keydown', function(e) {
    // F12
    if (e.keyCode === 123) {
        e.preventDefault();
        showToast('أدوات المطورين غير مسموحة', 'warning');
        return false;
    }
    // Ctrl+Shift+I
    if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
        e.preventDefault();
        showToast('أدوات المطورين غير مسموحة', 'warning');
        return false;
    }
    // Ctrl+U
    if (e.ctrlKey && e.keyCode === 85) {
        e.preventDefault();
        showToast('عرض المصدر غير مسموح', 'warning');
        return false;
    }
});

// منع السحب والإفلات
document.addEventListener('dragstart', function(e) {
    e.preventDefault();
    return false;
});

// التحقق من النطاق المسموح
function checkAllowedDomain() {
    const allowedDomains = ['localhost', '127.0.0.1', 'aseeltv.com', 'wacellive.com'];
    const currentDomain = window.location.hostname;
    
    if (!allowedDomains.some(domain => currentDomain.includes(domain))) {
        document.body.innerHTML = '<div style="text-align:center; padding:50px; color:white; background:#151825;"><h2>غير مصرح بالوصول</h2><p>هذا التطبيق غير متاح على هذا النطاق</p></div>';
        return false;
    }
    return true;
}

// إظهار رسالة تنبيه
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'warning' ? '#ff9800' : '#2196f3'};
        color: white;
        border-radius: 5px;
        z-index: 10000;
        font-family: Arial;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 300px;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        document.body.removeChild(toast);
    }, 3000);
}

// تشفير البيانات المحفوظة محلياً
function encryptData(data) {
    try {
        return btoa(JSON.stringify(data));
    } catch (e) {
        console.error("خطأ في تشفير البيانات");
        return null;
    }
}

function decryptData(encrypted) {
    try {
        return JSON.parse(atob(encrypted));
    } catch (e) {
        console.error("خطأ في فك تشفير البيانات");
        return null;
    }
}

// التحقق من الدومين عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    checkAllowedDomain();
});
