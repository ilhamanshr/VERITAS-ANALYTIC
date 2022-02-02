const path      = require('path');
const BASE_DIR  = path.dirname(require.main.filename);
const config    = require(BASE_DIR + '/Config');
const utils     = require(BASE_DIR + '/Utils');
const http      = require(BASE_DIR + '/libraries/HttpHandler');

class ApiTwitter {

    static async registerCrawler(req, username, cb) {
        let API = utils.duplicateObject(config.API_TW);
        API["API_PATH"] += "/task";

        let params = JSON.stringify({
            "username": username
        });
        
        http.apiRequest(req.id, req.body.clientIp, API, params, {}, function(resApi, resStatusCode) {
            cb(resApi, resStatusCode);
        });
    }

}

module.exports = ApiTwitter;