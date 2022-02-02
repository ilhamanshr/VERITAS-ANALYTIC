const moment            = require('moment');
const path              = require('path');
const BASE_DIR          = path.dirname(require.main.filename);
const mongo 	        = require(BASE_DIR + '/libraries/MongoDriver');
const utils             = require(BASE_DIR + '/Utils');
const dbName            = process.env.DB_NAME;
const modelTargetInfo   = require(BASE_DIR + '/models/target/Info');

class InfoModel {
    static async caseTargetMember(bodyReq, cb) {
        let agg = [];
        let self = this;
        
        let filter = {
            "folderId": bodyReq.params.folderId,
            "caseId": bodyReq.params.caseId,
        }

        agg.push({
            "$match": filter
        });

        agg.push({
            "$group": {
                "_id": null,
                "targetIds": {
                    "$addToSet": {
                        "targetId": "$_id",
                        "targetName": "$name",
                    }
                }
            }
        });

        mongo.getAggregateData(dbName, "targets", agg, function(result) {
            if (result && result[0] && result[0].targetIds.length > 0) {
                self.targetInfoLoop(result[0].targetIds, 0, [], function(resultInfo) {
                    cb(resultInfo)
                });
            } else { 
                cb(result);
            }
        });
    }

    static async targetInfoLoop(data, index, result, cb) {
        if (index < data.length) {
            let self = this;
            let objTarget = {
                "params": {
                    "targetId": data[index].targetId
                }
            }
    
            modelTargetInfo.targetSocmedDetail(objTarget, function(resInfo) {
                let resultTmp = resInfo[0].socmed;
                resultTmp = resultTmp.map(v => ({...v, "targetId": data[index].targetId, "targetName": data[index].targetName}));
                result = result.concat(resultTmp);
                result = [...new Set(result)];
                self.targetInfoLoop(data, index + 1, result, function(resLoop) {
                    cb(resLoop);
                });
            });
        } else {
            cb(result);
        }
    }
}

module.exports = InfoModel;