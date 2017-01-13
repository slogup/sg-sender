var lib = require('./lib');
var async = require('async');

function getSender(config) {
    var apn = null;
    if (config.apn && config.apn.pass) {
        apn = lib.apn(config.apn);    
    }
    var gcm = null;
    if (config.gcm) {
        gcm = lib.gcm(config.gcm);    
    }
    var email = null;
    if (config.email) {
        email = lib.email(config.email);    
    }
    var sms = null;
    sms = lib.sms(config.twillio, config.apiStoreSMS);

    var mms = null;
    mms = lib.mms(config.apiStoreSMS);

    var fcm = null;
    fcm = lib.fcm(config.fcm);

    return {
        apn: apn,
        gcm: gcm,
        email: email,
        sms: sms,
        mms: mms,
        fcm: fcm
    };
}

function emailErrorRefiner(err) {
    return err;
}

function phoneErrorRefiner(err) {
    return err;
}

module.exports.connect = function (config) {
    var sender = getSender(config);
    return function (req, res, next) {

        req.phoneErrorRefiner = phoneErrorRefiner;
        req.emailErrorRefiner = emailErrorRefiner;
        req.sendNoti = sender;
        req.sendNotiAll = function (target, to, title, msg, data, callback) {

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
                        sender.apn(to, title, msg, data, makeCallback(n));
                    });
                } else if (targets[k] == "gcm") {
                    notifications.push(function (n) {
                        sender.gcm(to, title, msg, data, makeCallback(n));
                    });
                } else if (targets[k] == "sms") {
                    notifications.push(function (n) {
                        sender.sms(to, title, msg, data, makeCallback(n));
                    });
                } else if (targets[k] == "email") {
                    notifications.push(function (n) {
                        sender.email(to, title, msg, data, makeCallback(n));
                    });
                } else if (targets[k] == "fcm") {
                    notifications.push(function (n) {
                        sender.fcm(to, title, msg, data, makeCallback(n));
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
module.exports.emailErrorRefiner = emailErrorRefiner;
module.exports.phoneErrorRefiner = phoneErrorRefiner;