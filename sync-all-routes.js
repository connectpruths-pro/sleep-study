const fs = require('fs');
const path = require('path');

function copyIfExist(srcName, destName) {
    const src = path.join(__dirname, srcName);
    const dest = path.join(__dirname, destName);
    if (fs.existsSync(src)) {
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(src, dest);
        console.log(`Copied ${src} -> ${dest}`);
    }
}

console.log('Syncing all route and service files in backend...');

// 1. patientRoutes.js
copyIfExist('patientRoutes.js', 'patients.js');
copyIfExist('patientRoutes.js', 'routes/patients.js');
copyIfExist('patientRoutes.js', 'routes/patientRoutes.js');

// 2. adminRoutes.js
copyIfExist('adminRoutes.js', 'admin.js');
copyIfExist('adminRoutes.js', 'routes/admin.js');
copyIfExist('adminRoutes.js', 'routes/adminRoutes.js');

// 3. authRoutes.js
copyIfExist('authRoutes.js', 'auth.js');
copyIfExist('authRoutes.js', 'routes/auth.js');
copyIfExist('authRoutes.js', 'routes/authRoutes.js');

// 4. emailService.js
copyIfExist('emailService.js', 'services/emailService.js');

console.log('✅ All backend route files synced successfully!');
