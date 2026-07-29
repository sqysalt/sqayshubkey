const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

const KEY_FILE = './activeKeys.json';
const SECRET_TOKEN = "SqaysSecurePass_9921";

// Kayıtlı keyleri dosyadan yükleme
function loadKeysFromDisk() {
    try {
        if (fs.existsSync(KEY_FILE)) {
            const data = fs.readFileSync(KEY_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("Keyler yüklenirken hata oluştu:", e);
    }
    return {};
}

// Keyleri dosyaya kaydetme
function saveKeysToDisk(keys) {
    try {
        fs.writeFileSync(KEY_FILE, JSON.stringify(keys, null, 2));
    } catch (e) {
        console.error("Keyler kaydedilirken hata oluştu:", e);
    }
}

// Aktif keyleri ve çerezleri tutan hafıza
let activeKeys = loadKeysFromDisk();
const userActiveKey = {};

// Süresi geçen keyleri otomatik temizleme fonksiyonu
function cleanExpiredKeys() {
    const now = Date.now();
    let changed = false;
    for (const key in activeKeys) {
        if (now > activeKeys[key]) {
            delete activeKeys[key];
            changed = true;
        }
    }
    if (changed) {
        saveKeysToDisk(activeKeys);
    }
}

// Çerez okuma yardımcısı
function parseCookies(request) {
    const list = {};
    const rc = request.headers.cookie;
    if (rc) {
        rc.split(';').forEach(function(cookie) {
            const parts = cookie.split('=');
            list[parts.shift().trim()] = decodeURI(parts.join('='));
        });
    }
    return list;
}

// Ana sayfa engeli
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head><title>Access Denied - Sqays Hub</title></head>
        <body style="background:#0b0b0e; color:#ff4444; font-family:sans-serif; text-align:center; padding-top:100px;">
            <h2>Access Denied!</h2>
            <p>You must complete the Work.ink link to access this page.</p>
        </body>
        </html>
    `);
});

// 1. Key Üretme Sayfası
app.get('/generate', (req, res) => {
    cleanExpiredKeys();
    const userToken = req.query.token;
    const cookies = parseCookies(req);
    let cookieId = cookies.sqays_user;

    if (!cookieId) {
        cookieId = "User_" + Math.random().toString(36).substring(2, 15);
        res.setHeader('Set-Cookie', `sqays_user=${cookieId}; Max-Age=${12 * 60 * 60}; Path=/; HttpOnly`);
    }

    if (userToken !== SECRET_TOKEN && (!userActiveKey[cookieId] || Date.now() > userActiveKey[cookieId].expireTime)) {
        return res.send(`
            <html>
            <head><title>Access Denied - Sqays Hub</title></head>
            <body style="background:#0b0b0e; color:#ff4444; font-family:sans-serif; text-align:center; padding-top:100px;">
                <h2>Invalid Access!</h2>
                <p>Please complete the official Work.ink link.</p>
            </body>
            </html>
        `);
    }

    if (userActiveKey[cookieId] && Date.now() < userActiveKey[cookieId].expireTime) {
        const existingKey = userActiveKey[cookieId].key;
        return res.send(`
            <html>
            <head><title>Sqays Hub - Get Key</title></head>
            <body style="background:#0b0b0e; color:white; font-family:sans-serif; text-align:center; padding-top:80px;">
                <h2>You already have an active key!</h2>
                <p>You can only generate a new key after 12 hours. Here is your current key:</p>
                <input type="text" value="${existingKey}" readonly style="padding:10px; width:300px; text-align:center; font-size:16px; background:#1a1a24; color:#00ffcc; border:1px solid #7a00ff; border-radius:5px;">
            </body>
            </html>
        `);
    }

    const randomKey = "Sqays_" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const expirationTime = Date.now() + (12 * 60 * 60 * 1000);
    
    activeKeys[randomKey] = expirationTime;
    saveKeysToDisk(activeKeys); // Dosyaya kalıcı kaydet

    userActiveKey[cookieId] = { key: randomKey, expireTime: expirationTime };
    
    res.send(`
        <html>
        <head><title>Sqays Hub - Get Key</title></head>
        <body style="background:#0b0b0e; color:white; font-family:sans-serif; text-align:center; padding-top:80px;">
            <h2>Key Successfully Generated!</h2>
            <p>Copy the key below and paste it into your script (Valid for 12 Hours):</p>
            <input type="text" value="${randomKey}" readonly style="padding:10px; width:300px; text-align:center; font-size:16px; background:#1a1a24; color:#00ffcc; border:1px solid #7a00ff; border-radius:5px;">
        </body>
        </html>
    `);
});

// 2. Key Doğrulama Endpoint'i (Roblox Scriptinin istek attığı yer)
app.get('/verify/:key', (req, res) => {
    cleanExpiredKeys();
    const userKey = req.params.key;
    const expireTime = activeKeys[userKey];
    
    if (expireTime && Date.now() < expireTime) {
        res.json({ valid: true });
    } else {
        if (expireTime) {
            delete activeKeys[key];
            saveKeysToDisk(activeKeys);
        }
        res.json({ valid: false });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
