const moment        = require('moment');
const path          = require('path');
const randomstring  = require('randomstring');
const BASE_DIR      = path.dirname(require.main.filename);
const mongo 	    = require(BASE_DIR + '/libraries/MongoDriver');
const telegram      = require(BASE_DIR + '/middlewares/ApiTelegram');
const utils         = require(BASE_DIR + '/Utils');
const dbName        = process.env.DB_NAME;

class GeofenceModel {
    static async insertGeofence(bodyReq, cb) {
        var docs = {
            "_id": randomstring.generate(),
            "targetId": bodyReq.params.targetId,
            "areas": bodyReq.params.areas,
            "members": bodyReq.params.members,
            "dateCreate": moment().utcOffset(7).utc(true).toDate(),
            "status" : 1,
            "userCreate": bodyReq.username,
            "dateUpdate": null,
            "userUpdate": null,
        };

        if("alerts" in bodyReq.params){
            docs["alerts"] = bodyReq.params.alerts;
        }

        mongo.insertData(dbName, "target_geofence", docs, function (res) {
            telegram.telegramWhitelist("target_geofence");
            cb(res);
        });
    }

    static async changeStatus(bodyReq, cb) {
        var filter = {
            "_id": bodyReq.params._id
        };

        mongo.updateData(dbName, "target_geofence", filter, {"status": parseInt(bodyReq.params.status), "dateUpdate": moment().utcOffset(7).utc(true).toDate(), "userUpdate": bodyReq.username}, function (res) {
            telegram.telegramWhitelist("target_geofence");
            cb(res);
        }); 
    }

    static async updateData(bodyReq, cb) {
        var self = this;

        var filter = {
            "_id": bodyReq.params.targetId
        };

        var docsUpdate = { 
            "dateUpdate": moment().utcOffset(7).utc(true).toDate(), 
            "userUpdate": bodyReq.username
        }

        if("targetId" in bodyReq.params){
            docsUpdate["targetId"] = bodyReq.params.targetId;
        }

        if (bodyReq.params.hasOwnProperty("status")) {
            var status = -1;
            if (parseInt(bodyReq.params.status) == 1) status = 1;
            if (parseInt(bodyReq.params.status) == 0) status = 0;
            docsUpdate["status"] = status;
        }

        if("areas" in bodyReq.params){
            docsUpdate["areas"] = bodyReq.params.areas;
        }

        if("alerts" in bodyReq.params){
            docsUpdate["alerts"] = bodyReq.params.alerts;
        }
        
        mongo.upsertData(dbName, "target_geofence", filter, docsUpdate, function (res) {
            telegram.telegramWhitelist("target_geofence");
            if("members" in bodyReq.params){
                var filter = {
                    "targetId": bodyReq.params.targetId
                };

                var docsUpdateMember = { 
                    "status": 0
                };

                mongo.updateManyData(dbName, "target_geofence_members", filter, docsUpdateMember, function (res) {
                    self.loopUpsert(0, bodyReq.params.targetId, bodyReq.params.members, function(res){
                        cb(res);
                    })
                });
            } else{
                cb(res);
            }
        });
    }

    static async loopUpsert(ind, targetId, arrData, cb){
        if(arrData.length>0){
            arrData.forEach(element => { 
                var filter = {
                    "_id": targetId+"_"+element.msisdn
                };
    
                var docsUpdateMember = { 
                    "targetId": targetId,
                    "msisdn": element.msisdn,
                    "interval": element.interval,
                    "type": element.type,
                    "status": 1
                };
    
                mongo.upsertData(dbName, "target_geofence_members", filter, docsUpdateMember, function (res) {});
            });
            cb(true);
        } else{
            cb(false);
        }
    }

    static async getGeofenceData(bodyReq, cb) {
        var self = this;

        var filter = {
            "targetId": bodyReq.params.targetId
        };

        let agg = [
            { 
                "$match" : filter
            }, 
            {
                "$lookup" : {
                    "from": "target_geofence_members",
                    "localField": "targetId",
                    "foreignField": "targetId",
                    "as": "members"
                }
            },
            {
                "$lookup" : { 
                    "from" : "target_geofence_members", 
                    "let": {"targetId": "$targetId"},
                    "pipeline" : [
                        {"$match" : {"$expr" : { "$and" : [{"$eq" : ["$targetId", "$$targetId"]},{"$eq" : ["$status", 1]}]}}}
                    ], 
                    "as" : "members"
                }
            },
            { 
                "$unwind" : { 
                    "path" : "$members",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$group" : {
                    "_id" : "$_id",
                    "targetId" : {"$first":"$targetId"},
                    "areas" : {"$first":"$areas"},
                    "members" : {"$addToSet":"$members"},
                    "dateCreate": {"$first":"$dateCreate"},
                    "userCreate": {"$first":"$userCreate"},
                    "dateUpdate": {"$first":"$dateUpdate"},
                    "userUpdate": {"$first":"$userUpdate"},
                    "alerts": {"$first":"$alerts"}
                }
            }
        ];

        mongo.getAggregateData(dbName, "target_geofence", agg, function(result) {
            telegram.telegramWhitelist("target_geofence");
            if (result && result.length > 0) {
                cb(result);
            } else {
                cb([]);
            }
        });
    }

    static async getGeofenceTrackHistory(bodyReq, cb) {
        var filter = {
            "targetId": bodyReq.params.targetId,
            "msisdn": bodyReq.params.msisdn
        };
        var agg = [
            {
                "$match" : filter
            }
        ];

        if("search" in bodyReq.params){
            filter["$or"] = [
                {"msisdn": {$regex: new RegExp(bodyReq.params.search, 'i')}},
                {"result.contents.phone": {$regex: new RegExp(bodyReq.params.search, 'i')}},
                {"result.contents.imei": {$regex: new RegExp(bodyReq.params.search, 'i')}},
                {"result.contents.imsi": {$regex: new RegExp(bodyReq.params.search, 'i')}},
                {"result.contents.address": {$regex: new RegExp(bodyReq.params.search, 'i')}},
                {"result.contents.state": {$regex: new RegExp(bodyReq.params.search, 'i')}},
                {"result.contents.lac": {$regex: new RegExp(bodyReq.params.search, 'i')}},
                {"result.contents.ci": {$regex: new RegExp(bodyReq.params.search, 'i')}},
                {"area.name": {$regex: new RegExp(bodyReq.params.search, 'i')}},
                {"flag": {$regex: new RegExp(bodyReq.params.search, 'i')}},
            ];
        }

        agg.push({
            "$sort" : {"dateCreate": -1}
        });

        if ("sort" in bodyReq.params) {
            agg.push({
                "$sort": bodyReq.params.sort
            });
        }

        agg.push({
            "$project" : {
                "_id": 0,
                "dateCreate": 1,
                "msisdn": 1,
                "targetName": 1,
                "area" : 1,
                "flag" : 1,
                "stateCode" : {"$ifNull": ["$result.contents.state_code", null]}, 
                "stateMessage" : {"$ifNull": ["$result.contents.state", null]}, 
                "phone" : {"$ifNull": ["$result.contents.phone", null]},
                "address" : {"$ifNull": ["$result.contents.address", null]},
                "imsi" : {"$ifNull": ["$result.contents.imsi", null]},
                "imei" : {"$ifNull": ["$result.contents.imei", null]}, 
                "latitude" : {"$ifNull": ["$result.contents.latitude", null]}, 
                "longitude" : {"$ifNull": ["$result.contents.longitude", null]},
                "lac" : {"$ifNull": ["$result.contents.lac", null]},
                "ci" : {"$ifNull": ["$result.contents.ci", null]},
                "aol" : {"$ifNull": ["$result.contents.aol", null]},
                "mcc" : {"$ifNull": ["$result.contents.mcc", null]},
                "mnc" : {"$ifNull": ["$result.contents.mnc", null]},
                "msc" : {"$ifNull": ["$result.contents.msc", null]},
            }
        });

        if("offset" in bodyReq.params){
            agg.push({
                "$skip" : parseInt(bodyReq.params.offset)
            });
        }

        if("limit" in bodyReq.params){
            agg.push({
                "$limit" : parseInt(bodyReq.params.limit)
            });
        }

        mongo.getAggregateData(dbName, "target_geofence_history", agg, function(resAgg){
            mongo.countDataByFilter(dbName, "target_geofence_history", filter, function(resCount){
                cb({"results" : resAgg, "count" : resCount});
            });
        });
    };
}

module.exports = GeofenceModel;