const moment        = require('moment');
const path          = require('path');
const BASE_DIR      = path.dirname(require.main.filename);
const mongo 	    = require(BASE_DIR + '/libraries/MongoDriver');
const utils         = require(BASE_DIR + '/Utils');
const dbName        = process.env.DB_NAME;

class AnalyticModel {
    static async getCaseScoring(bodyReq, data, cb){
        let agg = [];
        let filter = {
            "status": 1,
            "folderId": bodyReq.params.folderId,
            "caseId": bodyReq.params.caseId,
        };

        filter["targetId"] = {"$in": this.matchTargetIds(data)};
        
        agg.push({
            "$match": filter
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$socmed",
            }
        });

        agg.push({
            "$lookup" : { 
                "from" : "rawdata", 
                "let": {"userId": "$socmed.id", "source": "$socmed.source"},
                "pipeline" : [
                    {"$match" : {"$expr" : { "$and" : [{"$eq" : ["$userId", "$$userId"]},{"$eq" : ["$source", "$source"]}]}}}, 
                    {"$group": {"_id": null, "totalInteraction": {"$sum": "$totalInteraction"}, "totalPost": {"$sum": 1}}}
                ], 
                "as" : "totalInteraction"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$totalInteraction",
            }
        });

        agg.push({
            "$lookup" : { 
                "from" : "scoring_target", 
                "localField" : "targetId", 
                "foreignField" : "_id", 
                "as" : "score"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$score",
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : {
                    "targetId": '$targetId',
                    "folderId": '$folderId',
                    "caseId": '$caseId',
                },
                "targetName": {"$first": "$targetName"},
                "totalInteraction": {"$sum": "$totalInteraction.totalInteraction"},
                "totalPost": {"$sum": "$totalInteraction.totalPost"},
                "Radicalism" : {"$max": {"$ifNull": ["$score.content.Radicalism", 0]}}, 
                "Hateful" : {"$max": {"$ifNull": ["$score.content.Hateful", 0]}},
                "Porn" : {"$max": {"$ifNull": ["$score.content.Porn", 0]}},
                "Terrorism" : {"$max": {"$ifNull": ["$score.content.Terrorism", 0]}},
                "LGBT" :{"$max": {"$ifNull": ["$score.content.LGBT", 0]}},
                "socmed": {"$push": "$socmed"}
            }
        });

        agg.push({ 
            "$project" : { 
                "_id" : 0,
                "caseId": "$_id.caseId",
                "folderId": "$_id.folderId",
                "targetId": "$_id.targetId",
                "targetName": "$targetName",
                "totalInteraction": "$totalInteraction",
                "totalPost": "$totalPost",
                "totalScore": {"$max": ["$Radicalism", "$Hateful", "$Porn", "$Terrorism", "$LGBT"]}
            }
        });
        
        mongo.getAggregateData(dbName, "view_target_socmed_detail", agg, function(result) {
            cb(result);
        });
    }

    static matchTargetIds (data) {
        let result = [];

        data.forEach(element => {
            result.push(element.targetId);
        });
        
        return [...new Set(result)];
    }
}

module.exports = AnalyticModel;