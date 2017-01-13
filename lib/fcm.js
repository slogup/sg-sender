var request = require('request');

module.exports = function (config) {
    if (!config || !config.key) {
        return function (token, msg, data, callback) {
            console.error('cannot send push (invalid config)');
            callback(null, 200);
        };
    }

    return function (token, title, body, data, callback) {
        var options = {
            url: 'https://fcm.googleapis.com/fcm/send',
            headers: {
                'Authorization': 'key=' + config.key,
                'Content-Type': 'application/json'
            },
            json: {
                "notification": {
                    "title": title,
                    "body": data,
                    "sound": "default"
                },
                "to": token,
                "data": data
            }
        };
        request.post(options, function (err, res, body) {
            if (callback) {
                callback(err, body);
            }
        });
    }
};