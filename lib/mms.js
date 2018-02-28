var request = require('request');
var fs = require('fs');
var async = require('async');
var globalInfoBankAuth = null; // 인포뱅크 토큰, 토큰 유효기간

function getInfoBankToken(infoBankSMSConfig, callback) {
    var token_url = infoBankSMSConfig.tokenUrl;
    var options = {
        url: token_url,
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'X-IB-Client-Id': infoBankSMSConfig.serviceId,
            'X-IB-Client-Passwd': infoBankSMSConfig.servicePw
        },
        json: true
    };

    request(options, function (err, res, body) {
        if (err) {
            callback(500, err);
        } else {
            callback(res.statusCode, body);
        }
    });
}

function uploadImageToInfoBank(infoBankSMSConfig, token, filePath, callback) {
    var options = {
        url: infoBankSMSConfig.imageUploadUrl,
        method: 'POST',
        headers: {
            Authorization: 'Basic ' + token
        },
        formData: {
            fileDate: fs.createReadStream(filePath)
        },
        json: true
    };

    request(options, function (err, res, body) {
        if (err) {
            callback(500, err);
        } else {
            callback(res.statusCode, body);
        }
    });
}

function sendMessageByInfoBank(infoBankSMSConfig, token, message, callback) {
    var options = {
        url: infoBankSMSConfig.mmsSendUrl,
        method: 'POST',
        headers: {
            'Authorization': 'Basic '+ token
        },
        body: message,
        json: true
    };

    request(options, function (err, res, body) {
        if (err) {
            callback(500, err);
        } else {
            callback(res.statusCode, body);
        }
    });
}

module.exports = function (apiStoreSMSConfig, infoBankSMSConfig) {
    if (!apiStoreSMSConfig && !apiStoreSMSConfig.token && !infoBankSMSConfig && !infoBankSMSConfig.serviceId) {
        return null;
    }

    return function (from, to, title, msg, file, callback) {
        if (to.substr(0, 3) === "+82") {
            if (infoBankSMSConfig && infoBankSMSConfig.mmsUse == "true" && infoBankSMSConfig.serviceId && infoBankSMSConfig.servicePw) { // 인포뱅크

                var infoBankAuth = globalInfoBankAuth;
                var result = null;
                var infoBankFileInfo = null; // 인포뱅크 업로드한 파일 키, 키 유효기간 (1시간 내 동일파일 업로드 불가 정책있음)

                if (file && file.path && typeof file.path === 'string') {
                    file = file.path;
                }

                if (infoBankAuth && infoBankAuth.expired) {
                    // 인포뱅크 기준시간은 KST(UTC+9)이고 토큰 만료시간은 24시간임.
                    // 그냥 24 - 9 시간마다 토큰 초기화
                    var expired = infoBankAuth.expired;
                    expired = new Date(expired.slice(0, 4), expired.slice(4, 6) - 1, expired.slice(6, 8), expired.slice(8, 10), expired.slice(10, 12), expired.slice(12, 14)).getTime();

                    if (expired < new Date().getTime()) {
                        globalInfoBankAuth = null;
                    }
                }

                var seriesFuncs = [];

                if (!infoBankAuth) {
                    seriesFuncs.push(function(seriesCallback) {
                        getInfoBankToken(infoBankSMSConfig, function(status, body) {
                            if (status === 200) {
                                globalInfoBankAuth = body;
                                infoBankAuth = body;
                                seriesCallback(null, 'getInfoBankToken');
                            } else {
                                seriesCallback({
                                    status: status,
                                    body: body
                                }, 'getInfoBankToken error');
                            }
                        });
                    });
                }

                if (file) {
                    seriesFuncs.push(function (seriesCallback) {
                        uploadImageToInfoBank(infoBankSMSConfig, infoBankAuth.accessToken, file, function(status, body) {
                            if (status === 200) {
                                infoBankFileInfo = body;
                                seriesCallback(null, 'getInfoBankToken');
                            } else {
                                seriesCallback({
                                    status: status,
                                    body: body
                                }, "uploadImageToInfoBank error");
                            }
                        });
                    });
                }

                seriesFuncs.push(function(seriesCallback) {
                    var message = {
                        from: from || infoBankSMSConfig.from,
                        destinations : [{to: to}],
                        title: title, // MMS일 경우에만 실제 문자에 제목이 추가됨
                        text: msg,
                        ttl: '100'
                    };

                    if (infoBankFileInfo) {
                        message.fileKey = infoBankFileInfo.fileKey;
                    }

                    sendMessageByInfoBank(infoBankSMSConfig, infoBankAuth.accessToken, message, function(status, body) {
                        if (status === 200) {
                            result = body;
                            seriesCallback(null, 'sendMessageByInfoBank');
                        } else {
                            seriesCallback({
                                status: status,
                                body: body
                            }, "sendMessageByInfoBank error");
                        }
                    });
                });

                async.series(seriesFuncs, function(err) {
                    if (err) {
                        callback(err.status, err.body);
                    } else {
                        callback(200, result);
                    }
                });

            } else if (apiStoreSMSConfig && apiStoreSMSConfig.token) { // apiStore
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






