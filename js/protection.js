// ===========================================
// نظام الحماية
// ===========================================

// تشفير بيانات Firebase - إصدار مصحح
const encryptedFirebaseConfig = "W1siYXBpS2V5IiwiQUl6YVN5QUtnRWlZWWxtcE1lME5MZXd1bGhlb3ZsVFFNelZDNzk4MCJdLFsicHJvamVjdElkIiwiYmVpbi00MmY5ZSJdLFsic3RvcmFnZUJ1Y2tldCIsImJlaW4tNDJmOWUuZmlyZWJhc2VzdG9yYWdlLmFwcCJdLFsibWVzc2FnaW5nU2VuZGVySWQiLCIxNDM3NDExNjcwNTAiXSxbImFwcElkIiwiMToxNDM3NDExNjcwNTA6d2ViOjkyMmQzYTBjZGRiNDBmNjdiMjFiMzMiXSxbIm1lYXN1cmVtZW50SWQiLCJHIEpIMTk4U0tDRlMiXV0=";
const encryptedMatchesConfig = "W1siYXBpS2V5IiwiQUl6YVN5Q3FFN1p3dmVIZzFkSWhZZjFIbG83T3BIeUNadWRlWnZNIl0sWyJwcm9qZWN0SWQiLCJ3YWNlbC1saXZlIl0sWyJkYXRhYmFzZVVSTCIsImh0dHBzOi8vd2FjZWwtbGl2ZS1kZWZhdWx0LXJ0ZGIuYXNpYS1zb3V0aGVhc3QxLmZpcmViYXNlZGF0YWJhc2UuYXBwIl0sWyJzdG9yYWdlQnVja2V0Iiwid2FjZWwtbGl2ZS5maXJlYmFzZXN0b3JhZ2UuYXBwIl0sWyJtZXNzYWdpbmdTZW5kZXJJZCIsIjE4NTEwODU1NDAwNiJdLFsiYXBwSWQiLCIxOjE4NTEwODU1NDAwNjp3ZWI6OTMxNzE4OTViMWQ0YmIwN2M2ZjAzNyJdXQ==";

// دالة فك التشفير - إصدار مصحح
function decryptConfig(encrypted) {
    try {
        console.log('🔐 فك تشفير بيانات Firebase...');
        const decoded = atob(encrypted);
        console.log('🔓 نص مفكوك:', decoded);
        const configArray = JSON.parse(decoded);
        const config = {};
        
        configArray.forEach(item => {
            // استخدام مفتاح غير مشفر مباشرة
            const key = decryptKey(item[0]);
            config[key] = item[1];
            console.log(`🔑 ${key}: ${item[1].substring(0, 10)}...`);
        });
        
        console.log('✅ تم فك تشفير الإعدادات بنجاح');
        return config;
    } catch (e) {
        console.error("❌ خطأ في فك تشفير الإعدادات:", e);
        
        // نسخة احتياطية من الإعدادات
        const backupConfig = {
            "apiKey": "AIzaSyAKgEiYYlmpMe0NLewulheovlTQMzVC7980",
            "projectId": "bein-42f9e",
            "storageBucket": "bein-42f9e.firebasestorage.app",
            "messagingSenderId": "143741167050",
            "appId": "1:143741167050:web:922d3a0cddb40f67b21b33",
            "measurementId": "G JH198SKCFS"
        };
        
        console.log('⚠️ استخدام إعدادات Firebase احتياطية');
        return backupConfig;
    }
}

// دالة لفك تشفير المفاتيح
function decryptKey(encryptedKey) {
    // محاولة فك التشفير، إذا فشل نستخدم المفتاح كما هو
    try {
        // مفاتيح معروفة
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
        
        if (keyMap[encryptedKey]) {
            return keyMap[encryptedKey];
        }
        
        // إذا لم نجد في الـ map، حاول فك التشفير
        return atob(encryptedKey);
    } catch (e) {
        // إذا فشل فك التشفير، استخدم المفتاح كما هو
        return encryptedKey;
    }
}

// دالة مبسطة لفك التشفير مع fallback
function simpleDecryptConfig(encrypted) {
    try {
        const decoded = atob(encrypted);
        const configArray = JSON.parse(decoded);
        const config = {};
        
        // افترض أن العناصر تأتي بالترتيب الصحيح
        const keys = ["apiKey", "projectId", "storageBucket", "messagingSenderId", "appId", "measurementId", "databaseURL", "authDomain"];
        
        configArray.forEach((item, index) => {
            if (keys[index]) {
                config[keys[index]] = item[1];
            } else {
                config[`key${index}`] = item[1];
            }
        });
        
        return config;
    } catch (e) {
        console.error("Simple decrypt failed:", e);
        return null;
    }
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

// التحقق من النطاق المسموح - نسخة مبسطة
function checkAllowedDomain() {
    // السماح بجميع النطاقات للتطوير
    return true;
}

// إظهار رسالة تنبيه
function showToast(message, type = 'info') {
    if (!document.body) return;
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'warning' ? '#ff9800' : type === 'success' ? '#28a745' : '#2196f3'};
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
        if (toast.parentNode) {
            document.body.removeChild(toast);
        }
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
