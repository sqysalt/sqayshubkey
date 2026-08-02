const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

const KEY_FILE = './activeKeys.json';
const TOKEN_FILE = './tokens.json';

// ===== Yardımcı Fonksiyonlar =====
function loadJSON(file) {
    try {
        if (fs.existsSync(file)) {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        }
    } catch (e) { console.error(file + ' yüklenemedi:', e); }
    return {};
}

function saveJSON(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (e) { console.error(file + ' kaydedilemedi:', e); }
}

let activeKeys = loadJSON(KEY_FILE);
let userTokens = loadJSON(TOKEN_FILE);

// Süresi geçenleri temizle
function cleanExpired() {
    const now = Date.now();
    let changed = false;
    for (const key in activeKeys) {
        if (now > activeKeys[key]) {
            delete activeKeys[key];
            changed = true;
        }
    }
    for (const token in userTokens) {
        if (now > userTokens[token].expire) {
            delete userTokens[token];
            changed = true;
        }
    }
    if (changed) {
        saveJSON(KEY_FILE, activeKeys);
        saveJSON(TOKEN_FILE, userTokens);
    }
}

// Çerez oku
function parseCookies(req) {
    const list = {};
    const rc = req.headers.cookie;
    if (rc) {
        rc.split(';').forEach(c => {
            const parts = c.split('=');
            list[parts.shift().trim()] = decodeURI(parts.join('='));
        });
    }
    return list;
}

// ===== ANA SAYFA (Artık Akıllı) =====
app.get('/', (req, res) => {
    cleanExpired();
    const cookies = parseCookies(req);
    const token = cookies.sqays_token;

    // Token varsa ve geçerliyse, bu token'a ait key'i bul
    let existingKey = null;
    let keyExpireTime = null;

    if (token && userTokens[token]) {
        const userId = userTokens[token].userId;
        // Bu kullanıcıya ait key var mı?
        for (const key in activeKeys) {
            if (key.startsWith(userId + '_')) {
                existingKey = key;
                keyExpireTime = activeKeys[key];
                break;
            }
        }
    }

    // Eğer key bulunduysa ve süresi dolmamışsa direkt key'i göster
    if (existingKey && keyExpireTime && Date.now() < keyExpireTime) {
        // Kalan süreyi hesapla (saat cinsinden)
        const remainingMs = keyExpireTime - Date.now();
        const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
        const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Sqays Hub - Your Key</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        background: #0b0b0e;
                        color: white;
                        font-family: 'Segoe UI', sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                    }
                    .container {
                        text-align: center;
                        background: #14141c;
                        padding: 50px 70px;
                        border-radius: 20px;
                        border: 2px solid #00ff88;
                        box-shadow: 0 0 50px rgba(0, 255, 136, 0.2);
                    }
                    h1 {
                        color: #00ff88;
                        font-size: 36px;
                        margin-bottom: 10px;
                    }
                    p {
                        color: #aaa;
                        margin-bottom: 20px;
                        font-size: 16px;
                    }
                    .key-box {
                        background: #1a1a24;
                        padding: 15px;
                        border-radius: 10px;
                        border: 1px solid #00ff88;
                        color: #00ffcc;
                        font-size: 20px;
                        font-weight: bold;
                        letter-spacing: 2px;
                        margin: 20px 0;
                        word-break: break-all;
                    }
                    .valid {
                        color: #00ff88;
                        font-size: 14px;
                    }
                    .footer {
                        margin-top: 25px;
                        font-size: 12px;
                        color: #444;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🔑 Your Key</h1>
                    <p>This key is valid for <strong>12 hours</strong> from when you first got it.</p>
                    <div class="key-box">${existingKey}</div>
                    <p class="valid">✅ Valid for ${remainingHours}h ${remainingMinutes}m more</p>
                    <div class="footer">Token expires in 12 hours. After that, get a new one via Work.ink.</div>
                </div>
            </body>
            </html>
        `);
        return;
    }

    // Eğer buraya geldiysek: ya token yok, ya key yok, ya da süresi dolmuş
    // O zaman "Get Key" butonunu göster
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Sqays Hub - Get Your Key</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    background: #0b0b0e;
                    color: white;
                    font-family: 'Segoe UI', sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .container {
                    text-align: center;
                    background: #14141c;
                    padding: 50px 70px;
                    border-radius: 20px;
                    border: 2px solid #7a00ff;
                    box-shadow: 0 0 50px rgba(122, 0, 255, 0.2);
                }
                h1 {
                    color: #bb66ff;
                    font-size: 36px;
                    margin-bottom: 10px;
                }
                p {
                    color: #aaa;
                    margin-bottom: 35px;
                    font-size: 16px;
                }
                .btn {
                    background: #7a00ff;
                    color: white;
                    border: none;
                    padding: 16px 50px;
                    font-size: 20px;
                    font-weight: bold;
                    border-radius: 50px;
                    cursor: pointer;
                    text-decoration: none;
                    display: inline-block;
                    transition: 0.3s;
                    box-shadow: 0 0 20px rgba(122, 0, 255, 0.4);
                }
                .btn:hover {
                    background: #9a44ff;
                    transform: scale(1.05);
                    box-shadow: 0 0 40px #7a00ff;
                }
                .footer {
                    margin-top: 25px;
                    font-size: 12px;
                    color: #444;
                }
                .warning {
                    color: #ff8844;
                    margin-top: 15px;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🔑 Sqays Hub</h1>
                <p>Click the button to get your 12-hour key.<br>You will be redirected to Work.ink first.</p>
                <a href="https://work.ink/2Lvi/6183581d-8712-4fe0-b2e9-fd0cbce9844b" class="btn">🚀 Get Key</a>
                ${token && userTokens[token] ? `<p class="warning">⚠️ Your previous key has expired. Get a new one.</p>` : ''}
                <div class="footer">After completing Work.ink, you will be automatically redirected back.</div>
            </div>
        </body>
        </html>
    `);
});

// ===== WORK.INK'ten Gelen Kullanıcı =====
app.get('/start', (req, res) => {
    cleanExpired();

    const token = 'T_' + Math.random().toString(36).substring(2, 12) + 
                  Math.random().toString(36).substring(2, 12);
    const expire = Date.now() + 12 * 60 * 60 * 1000;
    const userId = 'User_' + Math.random().toString(36).substring(2, 10);

    userTokens[token] = { userId, expire };
    saveJSON(TOKEN_FILE, userTokens);

    res.cookie('sqays_token', token, {
        maxAge: 12 * 60 * 60 * 1000,
        httpOnly: true,
        path: '/'
    });

    res.redirect(`/generate?token=${token}`);
});

// ===== KEY ALMA SAYFASI =====
app.get('/generate', (req, res) => {
    cleanExpired();

    const token = req.query.token;
    const cookies = parseCookies(req);
    const cookieToken = cookies.sqays_token;

    if (!token || !userTokens[token]) {
        return res.send(`
            <html>
            <head><title>Invalid Token</title></head>
            <body style="background:#0b0b0e; color:#ff4444; font-family:sans-serif; text-align:center; padding-top:100px;">
                <h2>Invalid or expired token!</h2>
                <p>Please go through the Work.ink link again.</p>
            </body>
            </html>
        `);
    }

    if (cookieToken !== token) {
        return res.send(`
            <html>
            <head><title>Unauthorized</title></head>
            <body style="background:#0b0b0e; color:#ff4444; font-family:sans-serif; text-align:center; padding-top:100px;">
                <h2>Unauthorized access!</h2>
                <p>This token is not linked to your browser.</p>
            </body>
            </html>
        `);
    }

    if (Date.now() > userTokens[token].expire) {
        delete userTokens[token];
        saveJSON(TOKEN_FILE, userTokens);
        return res.send(`
            <html>
            <head><title>Token Expired</title></head>
            <body style="background:#0b0b0e; color:#ff4444; font-family:sans-serif; text-align:center; padding-top:100px;">
                <h2>Your token has expired (12 hours).</h2>
                <p>Please go through the Work.ink link again.</p>
            </body>
            </html>
        `);
    }

    const userId = userTokens[token].userId;
    let foundKey = null;
    for (const key in activeKeys) {
        if (key.startsWith(userId + '_')) {
            foundKey = key;
            break;
        }
    }

    if (!foundKey) {
        const newKey = userId + '_' + Math.random().toString(36).substring(2, 10).toUpperCase();
        const expireTime = Date.now() + 12 * 60 * 60 * 1000;
        activeKeys[newKey] = expireTime;
        saveJSON(KEY_FILE, activeKeys);
        foundKey = newKey;
    }

    res.send(`
        <html>
        <head><title>Your Key - Sqays Hub</title></head>
        <body style="background:#0b0b0e; color:white; font-family:sans-serif; text-align:center; padding-top:80px;">
            <h2>🔑 Your Key (Valid 12 Hours)</h2>
            <p>Copy this key and paste it into the script:</p>
            <input type="text" value="${foundKey}" readonly 
                   style="padding:10px; width:300px; text-align:center; font-size:16px; 
                          background:#1a1a24; color:#00ffcc; border:1px solid #7a00ff; 
                          border-radius:5px;">
            <br><br>
            <p style="color:#888; font-size:12px;">Token expires in 12 hours. After that, get a new one via Work.ink.</p>
        </body>
        </html>
    `);
});

// ===== KEY DOĞRULAMA (Roblox Script'i) =====
app.get('/verify/:key', (req, res) => {
    cleanExpired();
    const userKey = req.params.key;
    const expireTime = activeKeys[userKey];
    if (expireTime && Date.now() < expireTime) {
        res.json({ valid: true });
    } else {
        if (expireTime) {
            delete activeKeys[userKey];
            saveJSON(KEY_FILE, activeKeys);
        }
        res.json({ valid: false });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📌 Work.ink link should point to: https://sqayskey.onrender.com/start`);
});
