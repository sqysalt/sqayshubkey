const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Aktif keyleri tutan hafıza
const activeKeys = {}; 

// Gizli ve kimsenin tahmin edemeyeceği güvenlik şifresi
const SECRET_TOKEN = "SqaysSecurePass_9921";

// Ana sayfaya direkt gelenleri engelle
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

// 1. Key Üretme Sayfası (Sadece Work.ink'ten özel token ile gelenlere açılır)
app.get('/generate', (req, res) => {
    const userToken = req.query.token;

    // Eğer doğru token ile gelmediyse içeri alma!
    if (userToken !== SECRET_TOKEN) {
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

    // Doğru token ile geldiyse kullanıcıya butonlu güvenli sayfa göster
    res.send(`
        <html>
        <head>
            <title>Sqays Hub - Get Key</title>
            <script>
                function fetchKey() {
                    fetch('/create-key')
                    .then(response => response.json())
                    .then(data => {
                        document.getElementById('container').innerHTML = `
                            <h2>Key Successfully Generated!</h2>
                            <p>Copy the key below and paste it into your script (Valid for 12 Hours):</p>
                            <input type="text" value="\${data.key}" readonly style="padding:10px; width:300px; text-align:center; font-size:16px; background:#1a1a24; color:#00ffcc; border:1px solid #7a00ff; border-radius:5px;">
                        `;
                    });
                }
            </script>
        </head>
        <body style="background:#0b0b0e; color:white; font-family:sans-serif; text-align:center; padding-top:80px;">
            <div id="container">
                <h2>You have successfully completed the link!</h2>
                <p>Click the button below to reveal your unique key:</p>
                <button onclick="fetchKey()" style="padding:12px 24px; font-size:16px; background:#7a00ff; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">
                    Get Key Now
                </button>
            </div>
        </body>
        </html>
    `);
});

// 2. Butona basıldığında arka planda çalışan güvenli key üretici
app.get('/create-key', (req, res) => {
    const randomKey = "Sqays_" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const expirationTime = Date.now() + (12 * 60 * 60 * 1000);
    
    activeKeys[randomKey] = expirationTime;
    
    res.json({ key: randomKey });
});

// 3. Key Doğrulama Endpoint'i (Roblox Scriptinin istek attığı yer)
app.get('/verify/:key', (req, res) => {
    const userKey = req.params.key;
    const expireTime = activeKeys[userKey];
    
    if (expireTime && Date.now() < expireTime) {
        res.json({ valid: true });
    } else {
        if (expireTime) { delete activeKeys[userKey]; }
        res.json({ valid: false });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
