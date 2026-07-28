const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Aktif keyleri ve bitiş sürelerini tutan geçici hafıza (Bellek)
const activeKeys = {}; 

// 1. Rastgele Key Üretme Endpoint'i (Kullanıcı sitene girdiğinde çağrılır)
app.get('/generate', (req, res) => {
    // Rastgele bir key oluştur (Örn: Sqays_A7x9P2Q)
    const randomKey = "Sqays_" + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Süre hesaplama: Şu anki zaman + 12 saat (milisaniye cinsinden)
    const expirationTime = Date.now() + (12 * 60 * 60 * 1000);
    
    // Key'i hafızaya kaydet
    activeKeys[randomKey] = expirationTime;
    
    // Kullanıcıya bu key'i göster
    res.send(`
        <html>
        <head><title>Sqays Hub - Key System</title></head>
        <body style="background:#0b0b0e; color:white; font-family:sans-serif; text-align:center; padding-top:50px;">
            <h2>Key'iniz Başarıyla Üretildi!</h2>
            <p>Aşağıdaki key'i kopyalayın ve scriptinize yapıştırın (12 Saat geçerlidir):</p>
            <input type="text" value="${randomKey}" readonly style="padding:10px; width:300px; text-align:center; font-size:16px; background:#1a1a24; color:#00ffcc; border:1px solid #7a00ff; border-radius:5px;">
        </body>
        </html>
    `);
});

// 2. Key Doğrulama Endpoint'i (Roblox Scriptinin istek attığı yer)
app.get('/verify/:key', (req, res) => {
    const userKey = req.params.key;
    const expireTime = activeKeys[userKey];
    
    // Key veritabanında var mı ve süresi geçmemiş mi?
    if (expireTime && Date.now() < expireTime) {
        res.json({ valid: true });
    } else {
        // Süresi dolduysa hafızadan sil ve geçersiz de
        if (expireTime) { delete activeKeys[userKey]; }
        res.json({ valid: false });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
