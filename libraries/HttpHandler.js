const http      = require('http');
const https     = require('https');
const path      = require('path');
const BASE_DIR  = path.dirname(require.main.filename);
const logger    = require(BASE_DIR + '/Logger');
const utils     = require(BASE_DIR + '/Utils');
const msg       = require(BASE_DIR + '/Messages');

exports.apiRequest = function(reqId, clientIp, options, params, headers, cb) {
    if (options.API_HOST.includes("https://")) {
        options["API_SSL"] = true;
        options["API_HOST"] = options.API_HOST.replace("https://", "");
    } else if (options.API_HOST.includes("http://")) {
        options["API_SSL"] = false;
        options["API_HOST"] = options.API_HOST.replace("http://", "");
    }
    
    if ("API_SSL" in options && options.API_SSL) {
        exports.httpRequest(reqId, clientIp, true, options, params, headers, function(resBody, resStatusCode) {
            cb(resBody, resStatusCode);
        });
    } else {
        exports.httpRequest(reqId, clientIp, false, options, params, headers, function(resBody, resStatusCode) {
            cb(resBody, resStatusCode);
        });
    }
};

exports.httpRequest = function(reqId, clientIp, isSSL, options, params, headers, cb) {
    if (isSSL) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    
    var httpOptions = {
        host: ("API_HOST" in options ? options.API_HOST : "localhost"),
        method: ("API_METHOD" in options ? options.API_METHOD : "GET"),
        path: ("API_PATH" in options ? options.API_PATH : "/"),
        headers: { "Content-Type": "application/json" }
    };

    if ("API_PORT" in options && options.API_PORT) httpOptions["port"] = parseInt(options.API_PORT);
    if ("API_TIMEOUT" in options && options.API_TIMEOUT) httpOptions["timeout"] = parseInt(options.API_TIMEOUT);

    if (options.hasOwnProperty("API_USERNAME") && options.hasOwnProperty("API_PASSWORD") && options.API_USERNAME && options.API_PASSWORD) {
        httpOptions["headers"]["Authorization"] = "Basic "+ Buffer.from(options.API_USERNAME + ':' + options.API_PASSWORD).toString('base64');
    }

    if (headers && Object.keys(headers).length > 0) {
        for (var key in headers) {
            if (headers.hasOwnProperty(key)) {
                httpOptions["headers"][key] = headers[key];
            }
        }
    }

    if (httpOptions.method === "GET") {
        httpOptions["path"] += "?" + params;
    }

    logger.debug(__filename, JSON.stringify(httpOptions["headers"]), reqId, clientIp, "HTTP Header");
    
    if (clientIp === "daemon") {
        let tmpParams = JSON.parse(params);
        if ("base64" in tmpParams) {
            tmpParams["base64"] = "";
            logger.debug(__filename, JSON.stringify(tmpParams), reqId, clientIp, "Sending request to "+ ((isSSL) ? "https://" : "http://") + httpOptions.host + (("port" in httpOptions) ? ":"+ httpOptions.port : "") + (("path" in httpOptions) ? httpOptions.path : ""));
        } else {
            logger.debug(__filename, params, reqId, clientIp, "Sending request to "+ ((isSSL) ? "https://" : "http://") + httpOptions.host + (("port" in httpOptions) ? ":"+ httpOptions.port : "") + (("path" in httpOptions) ? httpOptions.path : ""));
        }
    } else {
        logger.debug(__filename, params, reqId, clientIp, "Sending request to "+ ((isSSL) ? "https://" : "http://") + httpOptions.host + (("port" in httpOptions) ? ":"+ httpOptions.port : "") + (("path" in httpOptions) ? httpOptions.path : ""));
    }

    var resCallback = function(res) {
        var result = "";
        var statusCode = (res) ? res.statusCode : null;

        res.on('data', function(chunk) {
            result += chunk;
        });

        res.on('end', function() {
            logger.debug(__filename, result, reqId, clientIp, "Response received from "+ ((isSSL) ? "https://" : "http://") + httpOptions.host +":"+ (("port" in httpOptions) ? httpOptions.port : "") + (("path" in httpOptions) ? httpOptions.path : ""));
            var response = utils.duplicateObject(msg.ERR_RESPONSE);
            
            if (result) {
                if (utils.isJSON(result)) {
                    result = JSON.parse(result);
                    cb(result, statusCode);
                } else {
                    if (String(statusCode).charAt(0) == 2) {
                        response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                        response["content"] = result;
                    } else {
                        response["code"] = statusCode;
                        response["message"] = result.match(/<title[^>]*>([^<]+)<\/title>/)[1];
                        response["content"] = result;
                    }

                    cb(response, statusCode);
                }
            } else {
                response = utils.duplicateObject(msg.ERR_BAD_GATEWAY);
                response["message"] = response.message +". Response from backend is null.";
                cb(response, statusCode);
            }
        });

        res.on('error', function(err) {
            logger.error(__filename, "Request id "+ reqId +" error: "+ err);
            var response = utils.duplicateObject(msg.ERR_BAD_GATEWAY);
            cb(response, statusCode);
        });
    }
    
    var req = (isSSL) ? https.request(httpOptions, resCallback) : http.request(httpOptions, resCallback);

    if ("API_TIMEOUT" in options && options.API_TIMEOUT) {
        req.on('timeout', () => {
            var response = utils.duplicateObject(msg.ERR_GATEWAY_TIMEOUT);
            logger.debug(__filename, "", reqId, clientIp, response.message);
            cb(response, 408);
            req.abort();
        });
    }

    req.on('error', function(err) {
        err = JSON.parse(JSON.stringify(err));
        var response = utils.duplicateObject(msg.ERR_RESPONSE);
        if ("code" in err && err.code !== "ECONNRESET") {
            response = utils.duplicateObject(msg.ERR_BAD_GATEWAY);
            logger.error(__filename, "Request id "+ reqId +" error: "+ JSON.stringify(err));
            cb(response, 502);
        }
    });

    if (httpOptions.method == "GET") {
        req.write("");
    } else {
        req.write(params);
    }
    
    req.end();
}