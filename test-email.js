require('dotenv').config();
const { sendEmailAlert } = require('./email-service');

// Teste de envio de email
async function testEmail() {
  console.log('📧 Testando envio de email...');
  
  await sendEmailAlert(
    '✅ Teste de Email - Sistema IA',
    'Este é um email de teste do sistema de monitoramento.\n\nSistema funcionando corretamente!'
  );
  
  console.log('✅ Teste concluído!');
}

testEmail();
