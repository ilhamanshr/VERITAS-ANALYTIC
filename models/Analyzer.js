const path          = require('path');
const BASE_DIR      = path.dirname(require.main.filename);
const mongo 	    = require(BASE_DIR + '/libraries/MongoDriver');
const dbName        = process.env.DB_NAME;

class AnalyzerModel {

    static async getProfileInfo(bodyReq, cb) {
        let agg = [];
        let filter = {};

        if ("profileId" in bodyReq.params) filter["_id"] = bodyReq.params.profileId;
        if ("_id" in bodyReq.params) filter["_id"] = bodyReq.params._id;
        
        agg.push({
            "$match": filter
        });

        agg.push({
            "$project": {
                "_id": 0,
                "profileId": "$_id",
                "name": 1,
                "username": 1,
                "userId": 1,
                "profilePic": 1,
                "profileBanner": 1,
                "source": 1,
                "collected": 1,
                "status": 1,
                "dateCreate": 1,
                "dateUpdate": 1,
                "userCreate": 1,
                "userUpdate": 1,
                "accountIds": { "$ifNull": ["$accountIds", []] }
            }
        });

        mongo.getAggregateData(dbName, "analyzer", agg, function(result) {
            if (result && result.length > 0) {
                cb(result[0]);
            } else {
                cb(false);
            }
        });
    }

    static async updateScoring(recordId, doc, cb) {
        let filter = { "_id": recordId };

        mongo.upsertData(dbName, "scoring", filter, doc, function(result) {
            cb(result);
        });
    }

    static async updateProfile(bodyReq, cb) {
        let defaultStatus = 0;
        let filter = {};
        let doc = {};

        if ("username" in bodyReq) {
            doc["dateUpdate"] = moment().utcOffset(7).utc(true).toDate();
            doc["userUpdate"] = bodyReq.username;
        }
        
        if ("profileId" in bodyReq.params) filter["_id"] = bodyReq.params.profileId;
        if ("_id" in bodyReq.params) filter["_id"] = bodyReq.params._id;
        if ("taskId" in bodyReq.params) filter["taskId"] = bodyReq.params.taskId;
        
        if ("name" in bodyReq.params) doc["name"] = bodyReq.params.name;
        if ("username" in bodyReq.params) doc["username"] = bodyReq.params.username;
        if ("userId" in bodyReq.params) doc["userId"] = bodyReq.params.userId;
        if ("isVerified" in bodyReq.params) doc["isVerified"] = bodyReq.params.isVerified;
        if ("profilePic" in bodyReq.params) doc["profilePic"] = bodyReq.params.profilePic;
        if ("profileBanner" in bodyReq.params) doc["profileBanner"] = bodyReq.params.profileBanner;
        if ("collected" in bodyReq.params) doc["collected"] = bodyReq.params.collected;
        if ("status" in bodyReq.params) {
            let status = parseInt(bodyReq.params.status);
            doc["status"] = (status === 1 || status === -1) ? status : defaultStatus;
        }
        if ("dateScoring" in bodyReq.params) doc["dateScoring"] = bodyReq.params.dateScoring;

        mongo.updateData(dbName, "analyzer", filter, doc, function(result) {
            cb(result);
        });
    }
}

module.exports = AnalyzerModel;