var lib = require('./lib');
var async = require('async');

function getSender(config) {
    var apn = lib.apn(config.apn);
    var gcm = lib.gcm(config.gcm);
    var email = lib.email(config.email);
    var sms = lib.sms(config.twillio, config.apiStoreSMS);
    return {
        apn: apn,
        gcm: gcm,
        email: email,
        sms: sms
    };
}

module.exports.connect = function (config) {
    var sender = getSender(config);
    return function (req, res, next) {

        req.sendNoti = sender;
        req.sendNotiAll = function (target, to, msg, data, callback) {

            var notifications = [];
            var targets = target.split(" ");

            function makeCallback(n) {
                return function (err, data) {
                    if (err) {
                        n(err, null);
                    } else {
                        n(null, data);
                    }
                }
            }

            for (var k in targets) {
                if (targets[k] == "apn") {
                    notifications.push(function (n) {
                        sender.apn(to, msg, data, makeCallback(n));
                    });
                } else if (targets[k] == "gcm") {
                    notifications.push(function (n) {
                        sender.gcm(to, msg, data, makeCallback(n));
                    });
                } else if (targets[k] == "sms") {
                    notifications.push(function (n) {
                        sender.sms(to, msg, data, makeCallback(n));
                    });
                } else if (targets[k] == "email") {
                    notifications.push(function (n) {
                        sender.email(to, msg, data, makeCallback(n));
                    });
                }
            }

            async.parallel(notifications, function(err, results) {
                if (callback) {
                    callback(err);
                }
            });
        };

        next();
    };
};

module.exports.getSender = getSender;