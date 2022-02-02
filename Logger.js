const winston   = require('winston');
const path      = require('path');
const BASE_DIR  = path.dirname(require.main.filename);
const moment    = require('moment');

var dateFormat = () => {
    return moment().format("YYYY-MM-DD HH:mm:ss.SSS");
}

exports.infoFilter = winston.format(function(info, opts) {
    return info.level === 'info' ? info : false
});

exports.debugFilter = winston.format(function(info, opts) {
    return info.level === 'debug' ? info : false
});

var myLogger = {
    levels: {
        'debug': 4,
        'info': 3,
        'error': 2
    },
    transports: [
        new(winston.transports.File) ({
            filename: BASE_DIR + '/logs/error.log',
            level: 'error',
            maxsize: 1024 * 1024 * 1024 * 10,
            maxFiles: 3,
        }),
        new(winston.transports.File)({
            filename: BASE_DIR + '/logs/debug.log',
            level: 'debug',
            format: winston.format.combine(
                exports.debugFilter()
            ), 
            maxsize: 1024 * 1024 * 1024 * 10,
            maxFiles: 3,
        }),
        new(winston.transports.File)({
            filename: BASE_DIR + '/logs/info.log',
            level: 'info',
            format: winston.format.combine(
                exports.infoFilter()
            ), 
            maxsize: 1024 * 1024 * 1024 * 10,
            maxFiles: 3,
        })
    ],
    format: winston.format.printf(function(info) {
        return info.message;
    })
}

if (process.env.ENVIRONMENT !== "PRODUCTION") {
    // myLogger.transports.unshift(new winston.transports.Console());
}

exports.myLogger = winston.createLogger(myLogger);

exports.info = function(fileName, message, reqId, clientIp, optMesaage) {
    if (typeof message !== 'undefined' && message) {
        reqId = (reqId) ? reqId : "";
        clientIp = (clientIp) ? clientIp : "";
        optMesaage = (optMesaage) ? optMesaage : "";
        if (message instanceof Object && message.constructor === Object) {
            message = JSON.stringify(message);
        }
        var allMessage = dateFormat() + "|" + clientIp + "|" + reqId + "|" + path.basename(fileName) + "|" + optMesaage + "|" + message.toString();
        var debugMessage = dateFormat() + "|INFO|" + clientIp + "|" + reqId + "|" + path.basename(fileName) + "|" + optMesaage + "|" + message.toString();
        exports.myLogger.log('info', allMessage);
        exports.myLogger.log('debug', debugMessage);
    }
};

exports.debug = function(fileName, message, reqId, clientIp, optMesaage) {
    if (typeof message !== 'undefined' && message) {
        reqId = (reqId) ? reqId : "";
        clientIp = (clientIp) ? clientIp : "";
        optMesaage = (optMesaage) ? optMesaage : "";
        if (message instanceof Object && message.constructor === Object) {
            message = JSON.stringify(message);
        }
        var allMessage = dateFormat() + "|DEBUG|" + clientIp + "|" + reqId + "|" + path.basename(fileName) + "|" + optMesaage + "|" + message.toString();
        exports.myLogger.log('debug', allMessage);
    }
};

exports.error = function(fileName, message) {
    if (typeof message !== 'undefined' && message) {
        if (message instanceof Object && message.constructor === Object) {
            message = JSON.stringify(message);
        }
        var allMessage = dateFormat() + "|" + path.basename(fileName) + "|" + message.toString();
        var debugMessage = dateFormat() + "|ERROR|" + path.basename(fileName) + "|" + message.toString();
        exports.myLogger.log('error', allMessage);
        exports.myLogger.log('debug', debugMessage);
    }
};