var request = require('request');

module.exports = function (config) {
    if (!config || !config.key) {
        return function (token, title, body, badge, data, platform, callback) {
            console.error('cannot send push (invalid config)');
            callback(null, 200);
        };
    }

    return function (token, title, body, badge, data, platform, callback) {

        var options;

        if (platform == 'android') {

            data.title = title;
            data.body = body;

            options = {
                url: 'https://fcm.googleapis.com/fcm/send',
                headers: {
                    'Authorization': 'key=' + config.key,
                    'Content-Type': 'application/json'
                },
                json: {
                    "to": token,
                    "data": data
                }
            };
        }

        if (platform == 'ios') {
            options = {
                url: 'https://fcm.googleapis.com/fcm/send',
                headers: {
                    'Authorization': 'key=' + config.key,
                    'Content-Type': 'application/json'
                },
                json: {
                    "notification": {
                        "title": title,
                        "body": body,
                        "sound": "default",
                        "badge": badge
                    },
                    "to": token,
                    "data": data
                }
            };
        }

        request.post(options, function (err, res, body) {
            if (callback) {
                callback(err, body);
            }
        });
    }
};