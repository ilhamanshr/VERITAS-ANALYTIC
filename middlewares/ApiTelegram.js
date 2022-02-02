const path          = require('path');
const BASE_DIR      = path.dirname(require.main.filename);
const config        = require(BASE_DIR + '/Config');
const utils         = require(BASE_DIR + '/Utils');
const http          = require(BASE_DIR + '/libraries/HttpHandler');
const mongo 	    = require(BASE_DIR + '/libraries/MongoDriver');
const querystring   = require('querystring');
const dbName        = process.env.DB_NAME;

class ApiTelegram {
    static telegramWhitelist = function (coll) {
        var aggData = []
    
        aggData.push({
            "$project": {
                "_id": 0,
                "alerts": 1
            }
        });
    
        aggData.push({
            "$unwind": {
                "path": "$alerts",
            }
        });
    
        aggData.push({
            "$group": {
                "_id": null,
                "username": {"$addToSet": "$alerts"}
            }
        });
    
        mongo.getAggregateData(dbName, coll, aggData, function(resAgg){
            if(resAgg[0]){
                var API = utils.duplicateObject(config.TELEGRAM_ALERT);
                API['API_PATH'] = process.env.API_TELEGRAM_REGISTER_PATH;
                var params = JSON.stringify({ "accounts": resAgg[0].username });
                
                http.apiRequest("alert", "alert", API, params, {}, function(resAPI) {
                    if(resAPI){}
                });
            }
        });
    };

    static async sendAlert(index, msg, alertAccounts, cb) {
        var self = this;
        if(index < alertAccounts.length){
            var account = alertAccounts[index]
    
            var API = utils.duplicateObject(config.TELEGRAM_ALERT);
            API['API_PATH'] = process.env.API_TELEGRAM_SEND_PATH;
            var params = {
                "account": account,
                "message": msg
            };
    
            http.apiRequest("alert", "alert", API, JSON.stringify(params), {}, function(resAPI) {
                self.sendAlert(index+1, msg, alertAccounts, function(resLoop) {
                    cb(resLoop);
                });
            });
        }else{
            cb(true)
        }
    };
}

module.exports = ApiTelegram;
