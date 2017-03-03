var request = require('request');
var fs = require('fs');

module.exports = function (apiStoreSMSConfig, infoBankSMSConfig) {
    if (!apiStoreSMSConfig.token) {
        return null;
    }
    var client = null;
    var fileAccessKey = null;
    return function (from, to, title, msg, file, callback) {
        if (to.substr(0, 3) == "+82") {

            if (infoBankSMSConfig.serviceId && infoBankSMSConfig.servicePw && infoBankSMSConfig.mmsUse == "true"){
                var nowDate = new Date();
                var clientExpired = null;
                if(client && client.expired){
                    var expired = client.expired;
                    clientExpired = new Date(expired.slice(0, 4), expired.slice(4, 6) - 1, expired.slice(6, 8),
                        expired.slice(8, 10), expired.slice(10, 12), expired.slice(12, 14))
                }

                if(client == null || clientExpired == null || clientExpired.getTime() < nowDate.getTime()){
                    getTokenInfoBank(infoBankSMSConfig, function(status, data){
                        if(status == "success"){
                            client = data;
                            setImageFileInfoBank(infoBankSMSConfig, client, file, function(status, data){
                                if(status == "success"){
                                    fileAccessKey = data;
                                    var body = {
                                        client: client,
                                        title: title,
                                        to: to,
                                        msg: msg,
                                        fileAccessKey: fileAccessKey
                                    };
                                    sendMmsInfoBank(infoBankSMSConfig, body, function(status, data){
                                        if(status == "success"){
                                            callback({status: 204}, data);
                                        }
                                        else{
                                            callback("error", "sendMmsInfoBank error");
                                        }
                                    });
                                }
                                else{
                                    callback("error", "setImageFileInfoBank error");
                                }

                            });
                        }
                        else{
                            callback("error", "getTokenInfoBank error");
                        }
                    });
                }
                else {
                    var fileExpiredExpiredToDate = null;
                    if(fileAccessKey && fileAccessKey.fileKey && fileAccessKey.expired ){
                        var fileExpired = fileAccessKey.expired;
                        fileExpiredExpiredToDate = new Date(fileExpired.slice(0, 4), fileExpired.slice(4, 6) - 1, fileExpired.slice(6, 8),
                            fileExpired.slice(8, 10), fileExpired.slice(10, 12), fileExpired.slice(12, 14));
                    }

                    //파일이 없는 경우 or 만료된 경우
                    if (fileAccessKey && fileAccessKey.fileKey && fileAccessKey.expired && fileExpiredExpiredToDate.getTime() < nowDate.getTime()){
                        setImageFileInfoBank(infoBankSMSConfig, client, file, function(status, data){
                            if(status == "success"){
                                fileAccessKey = data;
                                var body = {
                                    client: client,
                                    title: title,
                                    to: to,
                                    msg: msg,
                                    fileAccessKey: fileAccessKey
                                };
                                sendMmsInfoBank(infoBankSMSConfig, body, function(status, data){
                                    if(status == "success"){
                                        callback({status: 204}, data);
                                    }
                                    else{
                                        callback("error", "sendMmsInfoBank error");
                                    }
                                });
                            }
                            else{
                                callback("error", "setImageFileInfoBank error");
                            }
                        });
                    }
                    else{
                        sendMmsInfoBank(infoBankSMSConfig, body, function(status, data){
                            if(status == "success"){
                                callback({status: 204}, data);
                            }
                            else{
                                callback("error", "sendMmsInfoBank error");
                            }
                        });
                    }
                }
            }


            else if (apiStoreSMSConfig.token) {
                to = to.replace('+82', '0');
                var options = {
                    url: apiStoreSMSConfig.url.replace('sms', 'mms'),
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'x-waple-authorization': apiStoreSMSConfig.token
                    },
                    formData: {
                        send_phone: apiStoreSMSConfig.from,
                        dest_phone: to,
                        msg_body: msg
                    }
                };

                if (from && typeof from == "string") {
                    options.formData.send_phone = from;
                }

                if (title && typeof title == "string") {
                    options.formData.subject = title;
                }

                if (file && file.path && typeof file.path == "string") { // send only first file.
                    options.formData.file = fs.createReadStream(file.path);
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
                                sendnumber: options.formData.send_phone
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

var setImageFileInfoBank = function(infoBankSMSConfig, client, file, callback){
    var options = {
        url: infoBankSMSConfig.imageUploadUrl,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic '+client.accessToken,
        },
        formData: {

        }
    };

    if (file && file.path && typeof file.path == "string") {
        console.log(file.path);
        options.formData.fileDate = fs.createReadStream(file.path);
    }

    request(options, function (err, res, body) {
        var result = JSON.parse(body);
        if(result){
            console.log(result);
            callback("success", result)

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
        fileKey: content.fileAccessKey.fileKey,
        "ttl":"100",
        destinations : [{to: content.to}]
    };

    var options = {
        url: infoBankSMSConfig.mmsSendUrl,
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Basic '+ content.client.accessToken,
        },
        body: JSON.stringify(form)
    };

    request(options, function (err, res, body) {
        var result = JSON.parse(body);
        if(result){
            console.log(result);
            if(result.groupId){
                callback("success", result);
            }
            else{
                callback("error", "sendMmsInfoBank error");
            }
        }
        else{
            cosnole.log(result);
            callback("error", "error");
        }
    });
};
