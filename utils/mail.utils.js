const sgMail = require('@sendgrid/mail');
const templates = require('../templates/mail.tempate');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function sendVerificationMail(data) {
    return sgMail.send({
        subject: data.subject,
        to: data.to,
        from: {
            email: data.email,
            name: data.name
        },
        html: templates.getVerificationMail(data)
    });
}