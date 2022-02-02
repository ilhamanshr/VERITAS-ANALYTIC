const path      = require('path');
const crypto    = require('crypto');
const BASE_DIR  = path.dirname(require.main.filename);
const config    = require(BASE_DIR + '/Config');
const logger    = require(BASE_DIR + '/Logger');
const utils     = require(BASE_DIR + '/Utils');
const msg       = require(BASE_DIR + '/Messages');
const http      = require(BASE_DIR + '/libraries/HttpHandler');

exports.checkTokenPermissionRequired = function(req, res, clientIp, cb) {
    if (req.body.hasOwnProperty("token") && req.body.hasOwnProperty("permission") && req.body.token && req.body.permission) {
        cb();
    } else {
        var response = exports.duplicateObject(msg.ERR_UNAUTHORIZED);
        logger.info(__filename, JSON.stringify(req.body), req.id, clientIp, "Token and permission is required");
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
    }
}

exports.validateSession = function(req, res, cb) {
    var response    = utils.duplicateObject(msg.ERR_RESPONSE);
    var token       = req.body.token;
    var clientIp    = req.body.clientIp;
    var permission  = req.body.permission;
    var userAgent   = req.body.userAgent;

    try {
        var API = utils.duplicateObject(config.API_SSO);
        API['API_PATH']     = "/auth/app/check_token";
        API['API_USERNAME'] = config.SSO_CLIENT_ID;
        API['API_PASSWORD'] = config.SSO_CLIENT_SECRET;

        var params = JSON.stringify({});
        var headers = {
            "Content-Type"  : "application/x-www-form-urlencoded",
            "User-Token"    : token,
            "userAgent"     : userAgent
        }

        http.apiRequest(req.id, clientIp, API, params, headers, function(resApiToken) {
            if (resApiToken.code === 0) {
                exports.getUserInfo(req, clientIp, userAgent, resApiToken.body.token, function(resAPI) {
                    if (resAPI.code === 0) {
                        if (resAPI.body.hasOwnProperty("permissions") && resAPI.body.permissions.length && resAPI.body.permissions.indexOf(permission) > -1) {
                            cb(resAPI.body);
                        } else {
                            response = utils.duplicateObject(msg.ERR_FORBIDDEN);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(response));
                        }
                    }
                });
            } else {
                response = utils.duplicateObject(msg.ERR_UNAUTHORIZED);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(response));
            }
        });
    } catch (err) {
        response['message'] = JSON.stringify(err);
        logger.error(__filename, err);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
    }
}

exports.getUserInfo = function(req, clientIp, userAgent, token, cb) {
    exports.encrypt(config.SSO_CLIENT_SECRET, token, function(tokenEncrypted) {
        var API = utils.duplicateObject(config.API_SSO);
        API['API_PATH'] = "/auth/api/" + config.SSO_CLIENT_ID + "/me";

        var params = JSON.stringify({});
        var headers = {
            "Authorization" : "Bearer " + tokenEncrypted,
            "userAgent"     : userAgent
        }
        
        http.apiRequest(req.id, clientIp, API, params, headers, function(resAPI) {
            if (cb) cb(resAPI);
        });
    });
}

exports.encrypt = function(clientSecret, token, cb) {
    var buff = new Buffer.from(token, 'base64');
    var cipher = crypto.createCipheriv('aes-128-cbc', clientSecret, clientSecret);
    var mystr = new Buffer.concat([cipher.update(buff), cipher.final()]);
    var x = new Buffer.concat([new Buffer.from(clientSecret), mystr]);
    var bearerAuth = new Buffer.from(x).toString('base64');
    if (cb) cb(bearerAuth);
}