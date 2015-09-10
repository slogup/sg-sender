var request = require('request');
var twillio = require('twilio');

module.exports = function (twillioConfig, apiStoreSMSConfig) {

    var client = twillio(twillioConfig.accountSID, twillioConfig.token);

    return function (to, msg, data, callback) {
        if (to.substr(0, 3) == "+82") {
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

            if (process.env.NODE_ENV == 'development') {
                return callback(null);
            }
            request(options, function (err, res, body) {
                if (callback) {
                    callback(err, body);
                }
            });
        }
        else {
            client.messages.create({
                from: twillioConfig.from,
                to: to,
                body: msg
            }, callback);
        }
    };
};