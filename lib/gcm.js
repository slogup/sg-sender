var gcm = require('node-gcm');

module.exports = function (config) {

    return function (token, msg, data, callback) {

        var message = new gcm.Message({
            data: data || {}
        });

        message.badge = data.badge;
        message.data.msg = msg;

        var sender = new gcm.Sender(config.key);
        sender.send(message, [token], config.retry, function (err, result) {
            if (err) {
                console.error('gcm error', err, result);
            }
            if (callback) {
                callback(err, result);
            }
        });
    };
};

