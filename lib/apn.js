module.exports = function (config) {
    if (!config.key || !config.cert || !config.pass) {
        return function (token, title, msg, data, callback) {
            console.error('cannot send push (invalid config)')
            callback(null, 200);
        };
    }

    if (!config.gateway) config.gateway = "gateway.sandbox.push.apple.com";
    if (!config.port) config.port = 2195;
    if (!config.cacheLength) config.cacheLength = 100;

    var apn = require('apn');
    var fs = require('fs');

    var path = require('path');
    var certPath = path.resolve(config.cert);
    var keyPath = path.resolve(config.key);

    var cert = fs.readFileSync(certPath, 'utf8');
    var key = fs.readFileSync(keyPath, 'utf8');

    var _options = {
        certData: cert,
        keyData: key,
        passphrase: config.pass,
        ca: null,
        gateway: config.gateway,
        port: config.port,
        enhanced: true,
        errorCallback: function (err, notification) {
            if (err) {
                console.error('apn error', err);
            }
        },
        cacheLength: config.cacheLength
    };

    var apnConnection = new apn.Connection(_options);

    return function (token, msg, data, callback) {

        var noti = new apn.Notification();

        noti.expiry = Math.floor(Date.now() / 1000) + 3600;
        noti.badge = data.badge;
        noti.sound = "default";
        noti.alert = msg;
        noti.payload = {
            data: data
        };

        apnConnection.pushNotification(noti, token);
        callback(null, 200);
    };
}