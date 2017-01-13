var request = require('request');

module.exports = function (apiStoreSMSConfig) {
    if (!apiStoreSMSConfig.token) {
        return null;
    }
    var client = null;
    return function (to, title, msg, data, file, callback) {
        if (to.substr(0, 3) == "+82") {
            if (apiStoreSMSConfig.token) {
                to = to.replace('+82', '0');
                var options = {
                    url: apiStoreSMSConfig.url.replace('sms', 'mms'),
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'x-waple-authorization': apiStoreSMSConfig.token
                    },
                    form: {
                        send_phone: apiStoreSMSConfig.from,
                        dest_phone: to,
                        msg_body: msg,
                        file: file
                    }
                };

                if (process.env.NODE_ENV == 'test') {
                    return callback(null);
                }
                request(options, function (err, res, body) {
                    if (callback) {
                        callback(err, body);
                    }
                });
            } else {
                callback();
            }
        }
    };
};