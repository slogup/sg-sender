var emailTemplates = require('email-templates');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

module.exports = function (config) {

    return function (to, msg, data, callback) {
        emailTemplates(data.dir, function (err, template) {
            if (err) {
                console.error('emailTemplates', err);
                callback(err);
            }
            else {

                var transporter = nodemailer.createTransport(smtpTransport({
                    host: config.host, // hostname
                    port: config.port, // port for secure SMTP
                    auth: {
                        user: config.from,
                        pass: config.pass
                    }
                }));

                template(data.name, data.params, function (err, html, text) {

                    if (err) {
                        callback(err);
                    }
                    else {
                        transporter.sendMail({
                            from: config.from,
                            to: to,
                            subject: data.subject,
                            html: html,
                            text: msg,
                            attachments: data.attachments
                        }, function (err, info) {
                            if (err) {
                                console.error('email error', err, info);
                            }
                            if (callback) {
                                callback(err, info);
                            }
                        });
                    }
                });
            }
        });
    }
}
