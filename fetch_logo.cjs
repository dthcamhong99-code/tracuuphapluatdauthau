const fs = require('fs');
const https = require('https');

https.get('https://storage.googleapis.com/antigravity-attachments/9d5a7dcd-0819-4a0b-9cde-6072485fb0b2.jpg', (res) => {
    const path = 'public/logo.jpg';
    const filePath = fs.createWriteStream(path);
    res.pipe(filePath);
    filePath.on('finish',() => {
        filePath.close();
        console.log('Download Completed');
    })
});
