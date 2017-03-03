var request = require('request');
var twillio = require('twilio');

module.exports = function (twillioConfig, apiStoreSMSConfig) {
    if (!apiStoreSMSConfig.token && !twillioConfig.token) {
        return null;
    }
    var client = null;
    if (twillioConfig && twillioConfig.token) {
        client = twillio(twillioConfig.accountSID, twillioConfig.token);
    }
    return function (from, to, title, msg, callback) {
        if (to.substr(0, 3) == "+82") {
            if (apiStoreSMSConfig.token) {
                to = to.replace('+82', '0');
                var options = {
                    url: apiStoreSMSConfig.url,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'x-waple-authorization': apiStoreSMSConfig.token
                    },
                    form: {
                        send_phone: apiStoreSMSConfig.from,
                        dest_phone: to,
                        msg_body: msg
                    }
                };

                if (from) {
                    options.form.send_phone = from;
                }

                if (title) {
                    options.form.subject = title;
                }

                if (process.env.NODE_ENV == 'test') {
                    return callback(null);
                }
                request(options, function (err, res, body) {
                    var result = JSON.parse(body);
                    if (result &&
                        result.result_code &&
                        result.result_message &&
                        result.result_code == "500" &&
                        result.result_message == "SendNumber Error") {
                        var saveNumOptions = {
                            url: apiStoreSMSConfig.url.replace("message/sms", "sendnumber/save"),
                            method: 'POST',
                            headers: options.headers,
                            form: {
                                sendnumber: options.form.send_phone
                            }
                        };
                        request(saveNumOptions, function (err, res, body) {
                            var result = JSON.parse(body);
                            if (result && result.result_code && result.result_code == "200") {
                                request(options, function (err, res, body) {
                                    if (callback) {
                                        callback(err, body);
                                    }
                                });
                            } else {
                                if (callback) {
                                    callback({status: result.result_code}, body);
                                }
                            }
                        });
                    } else {
                        if (callback) {
                            callback(err, body);
                        }
                    }
                });
            } else {
                callback();
            }
        }
        else {
            if (twillioConfig && twillioConfig.token) {
                client.messages.create({
                    from: twillioConfig.from,
                    to: to,
                    body: msg
                }, callback);
            } else {
                callback();
            }
        }
    };
};