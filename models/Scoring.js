const path          = require('path');
const BASE_DIR      = path.dirname(require.main.filename);
const mongo 	    = require(BASE_DIR + '/libraries/MongoDriver');
const dbName        = process.env.DB_NAME;
const dbNameTW      = process.env.DB_NAME_TW;

class ScoringModel {

    static async getScoringTweetAccount(bodyReq, cb){

        let agg = [];

        agg.push({ 
            "$match" : { 
                "user_id" : "146337238"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "localField" : "_id", 
                "foreignField" : "foreignId", 
                "as" : "classificationText"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationText", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "media", 
                "localField" : "_id", 
                "foreignField" : "tweet_id", 
                "as" : "media"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$media", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationImage", 
                "localField" : "media._id", 
                "foreignField" : "_id", 
                "as" : "classificationImage"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationImage", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$project" : { 
                "created_at" : 1.0, 
                "hour" : { 
                    "$hour" : "$created_at"
                }, 
                "favorite_count" : 1.0, 
                "in_reply_to_status_id" : 1.0, 
                "quote_count" : 1.0, 
                "quoted_status_id" : 1.0, 
                "reply_count" : 1.0, 
                "retweet_count" : 1.0, 
                "classificationText" : 1.0, 
                "classificationImage" : 1.0
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : { 
                    "_id" : "$_id", 
                    "dateString" : { 
                        "$dateToString" : { 
                            "format" : "%Y-%m-%d", 
                            "date" : "$created_at"
                        }
                    },
                    "hour" : "$hour"
                }, 
                // "favorite_count" : { 
                //     "$first" : "$favorite_count"
                // }, 
                "in_reply_to_status_id" : { 
                    "$first" : "$in_reply_to_status_id"
                }, 
                // "quote_count" : { 
                //     "$first" : "$quote_count"
                // }, 
                "quoted_status_id" : { 
                    "$first" : "$quoted_status_id"
                }, 
                // "reply_count" : { 
                //     "$first" : "$reply_count"
                // }, 
                // "retweet_count" : { 
                //     "$first" : "$retweet_count"
                // }, 
                "classificationText" : { 
                    "$first" : "$classificationText"
                }, 
                "classificationImage" : { 
                    "$first" : "$classificationImage"
                }
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "tweet", 
                "localField" : "_id._id", 
                "foreignField" : "in_reply_to_status_id", 
                "as" : "dataReply"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$dataReply", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "tweet", 
                "localField" : "_id._id", 
                "foreignField" : "quoted_status_id", 
                "as" : "dataQuote"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$dataQuote", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "tweet_retweet", 
                "localField" : "_id._id", 
                "foreignField" : "_id", 
                "as" : "retweet"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$retweet", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "profile", 
                "localField" : "retweet.data", 
                "foreignField" : "_id", 
                "as" : "dataRetweet"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$dataRetweet", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "tweet_favorites", 
                "localField" : "_id._id", 
                "foreignField" : "_id", 
                "as" : "favorite"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$favorite", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "profile", 
                "localField" : "favorite.data", 
                "foreignField" : "_id", 
                "as" : "dataFavorite"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$dataFavorite", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({
            "$project" : {
                "_id": 1,
                "classificationText": 1,
                "classificationImage": 1,
                "dataReply": 1,
                "dataQuote": 1,
                "dataRetweet": 1,
                "dataFavorite": 1
              }
        });
        
        agg.push({ 
            "$group" : { 
                "_id" : { 
                    "dateString" : "$_id.dateString",
                    "hour" : "$_id.hour"
                }, 
                "textHate": {"$sum": {"$ifNull": ["$classificationText.hateful", 0]}},
                "textPorn": {"$sum": {"$ifNull": ["$classificationText.porn", 0]}},
                "textRadicalism": {"$sum": {"$ifNull": ["$classificationText.radicalism", 0]}},
                "textLgbt": {"$sum": {"$ifNull": ["$classificationText.lgbt", 0]}},
                "imageHate": {"$sum": {"$ifNull": ["$classificationImage.hateful", 0]}},
                "imagePorn": {"$sum": {"$ifNull": ["$classificationImage.porn", 0]}},
                "imageRadicalism": {"$sum": {"$ifNull": ["$classificationImage.radicalism", 0]}},
                "imageTerrorism": {"$sum": {"$ifNull": ["$classificationImage.terrorism", 0]}},
                "imageLgbt": {"$sum": {"$ifNull": ["$classificationImage.lgbt", 0]}},
                "dataTweet" : {"$sum": {"$cond": [ { "$ifNull": ["$_id._id", false] }, 1, 0 ]}},
                "dataReply" : {"$sum": {"$cond": [ { "$ifNull": ["$dataReply", false] }, 1, 0 ]}},
                "dataQuote" : {"$sum": {"$cond": [ { "$ifNull": ["$dataQuote", false] }, 1, 0 ]}},
                "dataRetweet" : {"$sum": {"$cond": [ { "$ifNull": ["$dataRetweet", false] }, 1, 0 ]}},
                "dataFavorite" : {"$sum": {"$cond": [ { "$ifNull": ["$dataFavorite", false] }, 1, 0 ]}}
            }
        });

        agg.push({
            "$project": {
                "date": "$_id.dateString",
                "hour": "$_id.hour",
                // "hateful" : {"$cond":[{"$or":[{"$gte":["$textHate",1]},{"$gte":["$imageHate",1]}]},1,0]},
                // "porn" : {"$cond":[{"$or":[{"$gte":["$textPorn",1]},{"$gte":["$imagePorn",1]}]},1,0]},
                // "radicalism" : {"$cond":[{"$or":[{"$gte":["$textRadicalism",1]},{"$gte":["$imageRadicalism",1]}]},1,0]},
                // "lgbt" : {"$cond":[{"$or":[{"$gte":["$textLgbt",1]},{"$gte":["$imageLgbt",1]}]},1,0]},
                // "terrorism" : {"$cond":[{"$or":[{"$gte":["$imageTerrorism",1]}]},1,0]},
                "textHate": 1,
                "textPorn": 1,
                "textRadicalism": 1,
                "textLgbt": 1,
                "imageHate": 1,
                "imagePorn": 1,
                "imageRadicalism": 1,
                "imageTerrorism": 1,
                "imageLgbt": 1,
                "dataTweet" : 1,
                "dataReply": 1,
                "dataQuote": 1,
                "dataRetweet": 1,
                "dataFavorite": 1,
                "_id": 0
            }   
        });

        agg.push({
            "$sort":{
                "date" : 1,
                "hour" : 1
            }
        });

        mongo.getAggregateData(dbNameTW, "tweet", agg, function(result) {
            if (result && result.length > 0) {
                cb(result);
            } else {
                cb(false);
            }
        });
    }

    static async getScoring(bodyReq, cb){
        let agg = [];

        agg.push({ 
            "$match" : {
                "userId" : bodyReq.params.userId,
                "source" : bodyReq.params.source
            }
        });

        agg.push({ 
            "$project" : { 
                "content" : 1.0,
                "tooltip" : 1.0, 
                "reason" : 1.0,
                "_id" : 0.0
            }
        });

        mongo.getAggregateData(dbName, "scoring", agg, function(result) {
            if (result && result.length > 0) {
                cb(result[0]);
            } else {
                cb(false);
            }
        });
    }

    static async getScoringTarget(bodyReq, cb){
        let agg = [];

        agg.push({ 
            "$match" : { 
                "userId" : { 
                    "$in" : bodyReq.params.userId
                }
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : null, 
                "Radicalism" : { 
                    "$sum" : "$content.Radicalism"
                }, 
                "Hateful" : { 
                    "$sum" : "$content.Hateful"
                }, 
                "Porn" : { 
                    "$sum" : "$content.Porn"
                }, 
                "Terrorism" : { 
                    "$sum" : "$content.Terrorism"
                }, 
                "LGBT" : { 
                    "$sum" : "$content.LGBT"
                }, 
                "RadicalismtextScoring" : { 
                    "$sum" : "$tooltip.Radicalism.textScoring"
                }, 
                "HatefultextScoring" : { 
                    "$sum" : "$tooltip.Hateful.textScoring"
                }, 
                "PorntextScoring" : { 
                    "$sum" : "$tooltip.Porn.textScoring"
                }, 
                "TerrorismtextScoring" : { 
                    "$sum" : "$tooltip.Terrorism.textScoring"
                }, 
                "LGBTtextScoring" : { 
                    "$sum" : "$tooltip.LGBT.textScoring"
                }, 
                "RadicalismimgScoring" : { 
                    "$sum" : "$tooltip.Radicalism.imgScoring"
                }, 
                "HatefulimgScoring" : { 
                    "$sum" : "$tooltip.Hateful.imgScoring"
                }, 
                "PornimgScoring" : { 
                    "$sum" : "$tooltip.Porn.imgScoring"
                }, 
                "TerrorismimgScoring" : { 
                    "$sum" : "$tooltip.Terrorism.imgScoring"
                }, 
                "LGBTimgScoring" : { 
                    "$sum" : "$tooltip.LGBT.imgScoring"
                }, 
                "RadicalismdailyPostScoring" : { 
                    "$sum" : "$tooltip.Radicalism.daily"
                }, 
                "HatefuldailyPostScoring" : { 
                    "$sum" : "$tooltip.Hateful.daily"
                }, 
                "PorndailyPostScoring" : { 
                    "$sum" : "$tooltip.Porn.daily"
                }, 
                "TerrorismdailyPostScoring" : { 
                    "$sum" : "$tooltip.Terrorism.daily"
                }, 
                "LGBTdailyPostScoring" : { 
                    "$sum" : "$tooltip.LGBT.daily"
                }, 
                "RadicalisminteractionScoring" : { 
                    "$sum" : "$tooltip.Radicalism.interaction"
                }, 
                "HatefulinteractionScoring" : { 
                    "$sum" : "$tooltip.Hateful.interaction"
                }, 
                "PorninteractionScoring" : { 
                    "$sum" : "$tooltip.Porn.interaction"
                }, 
                "TerrorisminteractionScoring" : { 
                    "$sum" : "$tooltip.Terrorism.interaction"
                }, 
                "LGBTinteractionScoring" : { 
                    "$sum" : "$tooltip.LGBT.interaction"
                },
                "Reason" : {
                    "$addToSet" : "$reason"
                }
            }
        });

        agg.push({ 
            "$project" : { 
                "Radicalism" : { 
                    "$divide" : [
                        "$Radicalism", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "Hateful" : { 
                    "$divide" : [
                        "$Hateful", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "Porn" : { 
                    "$divide" : [
                        "$Porn", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "Terrorism" : { 
                    "$divide" : [
                        "$Terrorism", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "LGBT" : { 
                    "$divide" : [
                        "$LGBT", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "RadicalismtextScoring" : { 
                    "$divide" : [
                        "$RadicalismtextScoring", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "HatefultextScoring" : { 
                    "$divide" : [
                        "$HatefultextScoring", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "PorntextScoring" : { 
                    "$divide" : [
                        "$PorntextScoring", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "TerrorismtextScoring" : { 
                    "$divide" : [
                        "$TerrorismtextScoring", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "LGBTtextScoring" : { 
                    "$divide" : [
                        "$LGBTtextScoring", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "RadicalismimgScoring" : { 
                    "$divide" : [
                        "$RadicalismimgScoring", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "HatefulimgScoring" : { 
                    "$divide" : [
                        "$HatefulimgScoring", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "PornimgScoring" : { 
                    "$divide" : [
                        "$PornimgScoring", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "TerrorismimgScoring" : { 
                    "$divide" : [
                        "$TerrorismimgScoring", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "LGBTimgScoring" : { 
                    "$divide" : [
                        "$LGBTimgScoring", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "RadicalismdailyPostScoring" : { 
                    "$divide" : [
                        "$RadicalismdailyPostScoring", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "HatefuldailyPostScoring" : { 
                    "$divide" : [
                        "$HatefuldailyPostScoring", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "PorndailyPostScoring" : { 
                    "$divide" : [
                        "$PorndailyPostScoring", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "TerrorismdailyPostScoring" : { 
                    "$divide" : [
                        "$TerrorismdailyPostScoring", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "LGBTdailyPostScoring" : { 
                    "$divide" : [
                        "$LGBTdailyPostScoring", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "RadicalisminteractionScoring" : { 
                    "$divide" : [
                        "$RadicalisminteractionScoring", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "HatefulinteractionScoring" : { 
                    "$divide" : [
                        "$HatefulinteractionScoring", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "PorninteractionScoring" : { 
                    "$divide" : [
                        "$PorninteractionScoring", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "TerrorisminteractionScoring" : { 
                    "$divide" : [
                        "$TerrorisminteractionScoring", 
                        bodyReq.params.userId.length
                    ]
                }, 
                "LGBTinteractionScoring" : { 
                    "$divide" : [
                        "$LGBTinteractionScoring", 
                        bodyReq.params.userId.length
                    ]
                },
                "Reason" : 1
            }
        });
        
        agg.push({ "$unwind": {
            "path":"$Reason",
            "preserveNullAndEmptyArrays": true
        }});

        agg.push({ "$unwind": {
            "path":"$Reason",
            "preserveNullAndEmptyArrays": true
        }});

        agg.push({
            "$group":{
                "_id": null,
                "Reason": {"$push":"$Reason"},
                "Radicalism": {"$first":"$Radicalism"},
                "Hateful": {"$first":"$Hateful"},
                "Porn": {"$first":"$Porn"},
                "Terrorism": {"$first":"$Terrorism"},
                "LGBT": {"$first":"$LGBT"},
                "RadicalismtextScoring": {"$first":"$RadicalismtextScoring"},
                "HatefultextScoring": {"$first":"$HatefultextScoring"},
                "PorntextScoring": {"$first":"$PorntextScoring"},
                "TerrorismtextScoring": {"$first":"$TerrorismtextScoring"},
                "LGBTtextScoring": {"$first":"$LGBTtextScoring"},
                "RadicalismimgScoring": {"$first":"$RadicalismimgScoring"},
                "HatefulimgScoring": {"$first":"$HatefulimgScoring"},
                "PornimgScoring": {"$first":"$PornimgScoring"},
                "TerrorismimgScoring": {"$first":"$TerrorismimgScoring"},
                "LGBTimgScoring": {"$first":"$LGBTimgScoring"},
                "RadicalismdailyPostScoring": {"$first":"$RadicalismdailyPostScoring"},
                "HatefuldailyPostScoring": {"$first":"$HatefuldailyPostScoring"},
                "PorndailyPostScoring": {"$first":"$PorndailyPostScoring"},
                "TerrorismdailyPostScoring": {"$first":"$TerrorismdailyPostScoring"},
                "LGBTdailyPostScoring": {"$first":"$LGBTdailyPostScoring"},
                "RadicalisminteractionScoring": {"$first":"$RadicalisminteractionScoring"},
                "HatefulinteractionScoring": {"$first":"$HatefulinteractionScoring"},
                "PorninteractionScoring": {"$first":"$PorninteractionScoring"},
                "TerrorisminteractionScoring": {"$first":"$TerrorisminteractionScoring"},
                "LGBTinteractionScoring": {"$first":"$LGBTinteractionScoring"},
              }
        });

        mongo.getAggregateData(dbName, "scoring", agg, function(result) {
            if (result && result.length > 0) {
                cb(result[0]);
            } else {
                cb(false);
            }
        });
    }

    static async getProfileListForScoring(bodyReq, cb) {
        let agg = [];
        let status = parseInt(bodyReq.params.status);
        
        agg.push({
            "$match": {
                "status": status
            }
        });

        mongo.getAggregateData(dbName, "scoring", agg, function(result) {
            cb(result);
        });
    }

    static async updateScoring(bodyReq, cb) {
        let defaultStatus = 0;
        let filter = {};
        let doc = {};

        if ("_id" in bodyReq) filter["_id"] = bodyReq._id;
        // if ("status" in bodyReq.params) {
        //     let status = parseInt(bodyReq.params.status);
        //     doc["status"] = (status === 1 || status === -1) ? status : defaultStatus;
        // }
        doc["status"] = defaultStatus;

        mongo.updateData(dbName, "scoring", filter, doc, function(result) {
            cb(result);
        });
    }
}

module.exports = ScoringModel;