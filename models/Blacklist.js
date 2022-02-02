const moment        = require('moment');
const randomstring  = require('randomstring');
const path          = require('path');
const BASE_DIR      = path.dirname(require.main.filename);
const mongo 	    = require(BASE_DIR + '/libraries/MongoDriver');
const dbName        = process.env.DB_NAME;

class BlacklistModel{
    static async checkBlacklistByValue(value, cb){
        let agg = [];

        agg.push({
            "$match": {
                "value" : value
            }
        });

        mongo.getAggregateData(dbName, "blacklists", agg, function(result) {
            if (result && result.length > 0) {
                cb(result);
            } else {
                cb([]);
            }
        });
    }
}

module.exports = BlacklistModel