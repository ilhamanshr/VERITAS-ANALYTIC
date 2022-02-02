const path      = require('path');
const BASE_DIR  = path.dirname(require.main.filename);
const config    = require(BASE_DIR + '/Config');
const utils     = require(BASE_DIR + '/Utils');
const http      = require(BASE_DIR + '/libraries/HttpHandler');

class ApiInstagram {

    static async registerCrawler(req, username, cb) {
        let API = utils.duplicateObject(config.API_IG);

        let params = JSON.stringify({
            "action": "Crawler",
            "subAction": "registerData",
            "body" : {
                "target": username
            }
        });
        
        http.apiRequest(req.id, req.body.clientIp, API, params, {}, function(resApi) {
            cb(resApi);
        });
    }

}

module.exports = ApiInstagram;