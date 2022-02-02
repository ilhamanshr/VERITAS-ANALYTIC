const path          = require('path');
const BASE_DIR      = path.dirname(require.main.filename);
const mongo 	    = require(BASE_DIR + '/libraries/MongoDriver');
const dbName        = process.env.DB_NAME;

class FaceClusterModel {

    static async getFaceCluster(bodyReq, cb) {
        let agg = [];

        agg.push({
            "$match": {
                "_id": bodyReq.params.userId
            }
        });

        agg.push({
            "$lookup" : { 
                "from" : "analyzer", 
                "let": {"userId": "$_id"},
                "pipeline" : [
                    {"$match" : {"$expr" : { "$and" : [{"$eq" : ["$userId", "$$userId"]},{"$eq" : ["$status", 1]}]}}}, 
                    {"$limit": 1}
                ], 
                "as" : "profile"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$profile",
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({
            "$project": {
                "_id": 0,
                "userId": "$_id",
                "username": "$profile.username",
                "name": "$profile.name",
                "profilePic": "$profile.profilePic",
                "isPrivate": "$profile.isPrivate",
                "isVerified": "$profile.isVerified",
                "source": "$profile.source",
                "cluster": "$cluster",
            }
        });

        mongo.getAggregateData(dbName, "rawdata_faceCluster", agg, function(result) {
            cb(result);
        });
    }

}

module.exports = FaceClusterModel;