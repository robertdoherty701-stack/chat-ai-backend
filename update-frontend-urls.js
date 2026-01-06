// Script para atualizar URLs do frontend automaticamente
// Execute: node update-frontend-urls.js

const fs = require('fs');
const path = require('path');

// 🔧 CONFIGURE SUAS URLs AQUI
const API_URLS = {
    auth: 'https://chat-backend-main.onrender.com',
    chat: 'https://chat-ia-backend.onrender.com',
    api: 'https://python-backend-api.onrender.com',
    node: 'https://meu-servidor-node.onrender.com',
    admin: 'https://admin-dashboard.onrender.com'
};

console.log('🔄 Atualizando URLs do frontend...\n');

// Arquivos a serem atualizados
const files = [
    {
        path: 'app-premium.html',
        replacements: [
            {
                search: /const API_BASE_URL = ['"].*?['"]/,
                replace: `const API_BASE_URL = '${API_URLS.auth}'`
            }
        ]
    },
    {
        path: 'chat-integration.js',
        replacements: [
            {
                search: /const CHAT_API_URL = ['"].*?['"]/,
                replace: `const CHAT_API_URL = '${API_URLS.chat}'`
            }
        ]
    },
    {
        path: 'login.js',
        replacements: [
            {
                search: /const AUTH_API_URL = ['"].*?['"]/,
                replace: `const AUTH_API_URL = '${API_URLS.auth}'`
            }
        ]
    }
];

let updated = 0;
let errors = 0;

files.forEach(file => {
    try {
        const filePath = path.join(__dirname, file.path);
        
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  ${file.path} não encontrado (ignorando)`);
            return;
        }

        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        file.replacements.forEach(replacement => {
            if (content.match(replacement.search)) {
                content = content.replace(replacement.search, replacement.replace);
                modified = true;
            }
        });

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ ${file.path} atualizado`);
            updated++;
        } else {
            console.log(`ℹ️  ${file.path} já está atualizado`);
        }
    } catch (error) {
        console.log(`❌ Erro ao atualizar ${file.path}: ${error.message}`);
        errors++;
    }
});

console.log('\n📊 Resumo:');
console.log(`   ✅ Atualizados: ${updated}`);
console.log(`   ❌ Erros: ${errors}`);

if (errors === 0) {
    console.log('\n✨ URLs atualizadas com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Verifique os arquivos atualizados');
    console.log('   2. Teste o login em app-premium.html');
    console.log('   3. Teste o chat');
    console.log('   4. Faça commit das alterações');
} else {
    console.log('\n⚠️  Alguns arquivos não foram atualizados. Verifique os erros acima.');
}
