const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendEmailAlert(subject, text) {
  try {
    await transporter.sendMail({
      from: `"Monitor IA" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO,
      subject,
      text
    });
    console.log(`✅ Email enviado: ${subject}`);
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error.message);
  }
}

module.exports = { sendEmailAlert };
