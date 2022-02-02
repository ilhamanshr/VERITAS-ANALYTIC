const path          = require('path');
const BASE_DIR      = path.dirname(require.main.filename);
const mongo 	    = require(BASE_DIR + '/libraries/MongoDriver');
const dbName        = process.env.DB_NAME;

class LeakageModel {

    static async getDataLeakage(bodyReq, cb) {
        let agg = [];

        agg.push({
            "$match": {
                "analyzerUsername": bodyReq.params.username,
                "analyzerName": bodyReq.params.name,
                "analyzerSource": bodyReq.params.source
            }
        });

        agg.push({
            "$project": {
                "_id": 0,
                "accounts": 1,
                "educations": 1,
                "emails": 1,
                "jobs": 1,
                "phones": 1,
                "socialMedia": 1
            }
        });

        mongo.getAggregateData(dbName, "leakage", agg, function(result) {
            if (result && result.length > 0) {
                cb(result[0]);
            } else {
                cb(false);
            }
        });
    }
    
    static async getDataLeakageMulti(bodyReq, cb) {
        let agg = [];

        agg.push({
            "$match": {
                "$or": []
            }
        });

        agg.push({
            "$project": {
                "_id": 0,
                "accounts": { "$ifNull": ['$accounts', []] },
                "educations": { "$ifNull": ['$educations', []] },
                "emails": { "$ifNull": ['$emails', []] },
                "jobs": { "$ifNull": ['$jobs', []] },
                "phones": { "$ifNull": ['$phones', []] },
                "socialMedia": { "$ifNull": ['$socialMedia', []] },
            }
        });
        
        Array.from(bodyReq.params.accounts).forEach(function(v, i) {
            agg[0]["$match"]["$or"].push({ "$and": [{ "analyzerUsername": { "$eq": v.username }}, { "analyzerSource": { "$eq": v.source }}] });
        });

        mongo.getAggregateData(dbName, "leakage", agg, function(result) {
            cb(result);
        });
    }

}

module.exports = LeakageModel;