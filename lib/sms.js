var request = require('request');
var twillio = require('twilio');

module.exports = function (twillioConfig, apiStoreSMSConfig, infoBankSMSConfig) {

    if (!infoBankSMSConfig && !infoBankSMSConfig.serviceId && !apiStoreSMSConfig && !apiStoreSMSConfig.token && !twillioConfig && !twillioConfig.token) {
        return null;
    }
    var client = null;
    if (twillioConfig && twillioConfig.token) {
        client = twillio(twillioConfig.accountSID, twillioConfig.token);
    }
    return function (from, to, title, msg, callback) {
        if (to.substr(0, 3) == "+82") {
            if (infoBankSMSConfig && infoBankSMSConfig.serviceId && infoBankSMSConfig.servicePw){
                var nowDate = new Date();
                var clientExpired = null;
                if(client && client.expired){
                    var expired = client.expired;
                    clientExpired = new Date(expired.slice(0, 4), expired.slice(4, 6) - 1, expired.slice(6, 8),
                        expired.slice(8, 10), expired.slice(10, 12), expired.slice(12, 14))
                }

                if (process.env.NODE_ENV == 'test') {
                    return callback(null);
                }

                if(client == null || clientExpired == null || clientExpired.getTime() - 43200000 < nowDate.getTime()){
                    getTokenInfoBank(infoBankSMSConfig, function(status, data){
                        if(status == "success"){
                            client = data;
                            var body = {
                                client: client,
                                title: title,
                                to: to,
                                msg: msg
                            };
                            sendMmsInfoBank(infoBankSMSConfig, body, function(status, data){
                                if(status == "success"){
                                    if (callback) {
                                        callback({status: 204}, data);
                                    }
                                }
                                else{
                                    callback("error", data);
                                }
                            });
                        }
                        else{
                            callback("error", "getTokenInfoBank error");
                        }
                    });
                }
                else {
                    var body = {
                        client: client,
                        title: title,
                        to: to,
                        msg: msg
                    };
                    sendMmsInfoBank(infoBankSMSConfig, body, function(status, data){
                        if(status == "success"){
                            if (callback) {
                                callback({status: 204}, data);
                            }
                        }
                        else{
                            callback("error", data);
                        }
                    });
                }

            }

            else if (apiStoreSMSConfig && apiStoreSMSConfig.token) {
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



var getTokenInfoBank = function(infoBankSMSConfig, callback){
    var token_url = infoBankSMSConfig.tokenUrl;
    var options = {
        url: token_url,
        method: 'POST',
        headers: {
            "Accept": "application/json",
            'X-IB-Client-Id': infoBankSMSConfig.serviceId,
            'X-IB-Client-Passwd': infoBankSMSConfig.servicePw
        }
    };

    request(options, function (err, res, body) {
        var result = JSON.parse(body);
        if(result){
            console.log(result);
            callback("success", result);
        }
        else{
            cosnole.log(result);
            callback("error", "error");
        }
    });
};


var sendMmsInfoBank = function(infoBankSMSConfig, content, callback){

    var form = {
        title: content.title,
        from: infoBankSMSConfig.from,
        text: content.msg,
        "ttl":"100",
        destinations : [{to: content.to}]
    };

    var options = {
        url: infoBankSMSConfig.mmsSendUrl,
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Basic '+ content.client.accessToken
        },
        body: JSON.stringify(form)
    };

    request(options, function (err, res, body) {
        var result = JSON.parse(body);
        if(result){
            if(result.groupId){
                callback("success", result);
            }
            else{
                callback("error", result);
            }
        }
        else{
            callback("error", result);
        }
    });
};