const moment        = require('moment');
const path          = require('path');
const BASE_DIR      = path.dirname(require.main.filename);
const mongo 	    = require(BASE_DIR + '/libraries/MongoDriver');
const utils         = require(BASE_DIR + '/Utils');
const dbName        = process.env.DB_NAME;

class InfoModel {
    static async targetSocmedDetail(bodyReq, cb) {
        let agg = [];

        let filter = {
            "targetId": bodyReq.params.targetId
        }

        agg.push({
            "$match": filter
        });


        mongo.getAggregateData(dbName, "view_target_socmed_detail", agg, function(result) {
            cb(result);
        });
    }
}

module.exports = InfoModel;