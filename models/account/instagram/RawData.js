const moment        = require('moment');
const path          = require('path');
const BASE_DIR      = path.dirname(require.main.filename);
const mongo 	    = require(BASE_DIR + '/libraries/MongoDriver');
const utils         = require(BASE_DIR + '/Utils');
const dbName        = process.env.DB_NAME_IG;

class RawDataModel {

    static async getTimeBaseAnalytics(bodyReq, cb){
        let filter = {
            "userId" : bodyReq.params.userId
        };
        
        if ("date" in bodyReq.params) {
            filter["dateCreate"] = { 
                "$gte": moment(bodyReq.params.date).utc(true).toDate(),
                "$lte":  moment(bodyReq.params.date).add(23, 'hours').add(59, 'minutes').add(59, 'seconds').add(999, 'millisecond').utc(true).toDate()
            }
        } else if ("dateFrom" in bodyReq.params && "dateUntil" in bodyReq.params){
            filter["dateCreate"] = {
                "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                "$lte": moment(bodyReq.params.dateUntil).add(23, 'hours').add(59, 'minutes').add(59, 'seconds').add(999, 'millisecond').utc(true).toDate()
            };
        }

        if ("dayOfWeek" in bodyReq.params && "hour" in bodyReq.params) {
            filter["dayOfWeek"] = parseInt(bodyReq.params.dayOfWeek);
            filter["hour"] = parseInt(bodyReq.params.hour);
        }

        if ("search" in bodyReq.params) {
            filter["$or"] = [
                { "text": { $regex: new RegExp('.' + bodyReq.params.search + '.', 'i') } },
            ];
        }

        let and = [];
        if ("categories" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.categories.length > 0){
                if(bodyReq.params.categories.length == 5){
                } else{
                    let filterMatch = {};
                    bodyReq.params.categories.forEach((element) => {
                        if (element == "lgbt"){
                            
                        } else if (element != "terrorism"){
                            filterMatch = { "$or": [{}, {}] };
                            filterMatch["$or"][0]["predict."+ element] = 1;
                            filterMatch["$or"][1]["media.predict."+ element] = 1;
                        } else {
                            filterMatch = {};
                            filterMatch["media.predict."+ element] = 1;
                        }
                        or.push(filterMatch);
                    });
                    and.push({"$or":or});
                    filter["$and"] = and;
                }
            }
        }

        if ("includeKeywords" in  bodyReq.params) {
            let or = [];
            if(bodyReq.params.includeKeywords.length > 0){
                bodyReq.params.includeKeywords.forEach((element) => {
                    or.push({ "text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$or":or});
                filter["$and"] = and;
            }
        }

        if ("excludeKeywords" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.excludeKeywords.length > 0){
                bodyReq.params.excludeKeywords.forEach((element) => {
                    or.push({ "text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$nor":or});
                filter["$and"] = and;
            }
        }

        if ("type" in bodyReq.params) {
            if (bodyReq.params.type === 0) {
                if ("$or" in filter) {
                    filter["$or"].push({"predict.sentiment": -1});
                    filter["$or"].push({"predict.propaganda": 1});
                    filter["$or"].push({"predict.offensive": 1});
                    filter["$or"].push({"predict.porn": 1});
                    filter["$or"].push({"predict.radicalism": 1});
                    filter["$or"].push({"predict.lgbt": 1});
                    filter["$or"].push({"media":{"$elemMatch": {"predict.radicalism": 1}}});
                    filter["$or"].push({"media":{"$elemMatch": {"predict.hate": 1}}});
                    filter["$or"].push({"media":{"$elemMatch": {"predict.porn": 1}}});
                    filter["$or"].push({"media":{"$elemMatch": {"predict.terrorism": 1}}});
                    filter["$or"].push({"media":{"$elemMatch": {"predict.lgbt": 1}}});
                } else {
                    filter["$or"] = [
                        {"predict.sentiment": -1},
                        {"predict.propaganda": 1},
                        {"predict.offensive": 1},
                        {"predict.porn": 1},
                        {"predict.radicalism": 1},
                        {"predict.lgbt": 1},
                        {"media":{"$elemMatch": {"predict.radicalism": 1}}},
                        {"media":{"$elemMatch": {"predict.hate": 1}}},
                        {"media":{"$elemMatch": {"predict.porn": 1}}},
                        {"media":{"$elemMatch": {"predict.terrorism": 1}}},
                        {"media":{"$elemMatch": {"predict.lgbt": 1}}}
                    ]
                }
            } else {
                if ("$and" in filter) {
                    filter["$and"].push({"predict.sentiment": {"$ne": -1}});
                    filter["$and"].push({"predict.propaganda": {"$ne": 1}});
                    filter["$and"].push({"predict.offensive": {"$ne": 1}});
                    filter["$and"].push({"predict.porn": {"$ne": 1}});
                    filter["$and"].push({"predict.radicalism": {"$ne": 1}});
                    filter["$and"].push({"predict.lgbt": {"$ne": 1}});
                    filter["$and"].push({"media":{"$elemMatch": {"predict.radicalism": 0}}});
                    filter["$and"].push({"media":{"$elemMatch": {"predict.hate": 0}}});
                    filter["$and"].push({"media":{"$elemMatch": {"predict.porn": 0}}});
                    filter["$and"].push({"media":{"$elemMatch": {"predict.terrorism": 0}}});
                    filter["$and"].push({"media":{"$elemMatch": {"predict.lgbt": 0}}});
                } else {
                    filter["$and"] = [
                        {"predict.sentiment": {"$ne": -1}},
                        {"predict.propaganda": {"$ne": 1}},
                        {"predict.offensive": {"$ne": 1}},
                        {"predict.porn": {"$ne": 1}},
                        {"predict.radicalism": {"$ne": 1}},
                        {"predict.lgbt": {"$ne": 1}},
                        {"media":{"$elemMatch": {"predict.radicalism": {"$ne": 1}}}},
                        {"media":{"$elemMatch": {"predict.hate": {"$ne": 1}}}},
                        {"media":{"$elemMatch": {"predict.porn": {"$ne": 1}}}},
                        {"media":{"$elemMatch": {"predict.terrorism": {"$ne": 1}}}},
                        {"media":{"$elemMatch": {"predict.lgbt": {"$ne": 1}}}}
                    ]
                }
            }
        }

        mongo.countDataByFilter(dbName, "view_TimeBaseAnalytics", filter, function (resCount) {
            if ("sort" in bodyReq.params) {
                mongo.searchDataByOffsetLimitSort(dbName, "view_TimeBaseAnalytics", filter, bodyReq.params.sort, parseInt(bodyReq.params.offset), parseInt(bodyReq.params.limit), function(resTmpData) {
                    cb(resCount, resTmpData);
                });
            }else{
                mongo.searchDataByOffsetLimit(dbName, "view_TimeBaseAnalytics", filter, parseInt(bodyReq.params.offset), parseInt(bodyReq.params.limit), function(resTmpData) {
                    cb(resCount, resTmpData);
                });
            }
        });
    }

    static async getCategoryBaseAnalytics(bodyReq, cb){
        let filter = {
            "ownerId" : bodyReq.params.userId
        };

        // if ("date" in bodyReq.params) {
        //     filter["timestamp"] = { 
        //         "$gte": moment(bodyReq.params.date).utc(true).toDate(),
        //         "$lte":  moment(bodyReq.params.date).add(23, 'hours').add(59, 'minutes').add(59, 'seconds').add(999, 'millisecond').utc(true).toDate()
        //     }
        // } else if ("dateFrom" in bodyReq.params && "dateUntil" in bodyReq.params){
        //     filter["timestamp"] = {
        //         "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
        //         "$lte": moment(bodyReq.params.dateUntil).add(23, 'hours').add(59, 'minutes').add(59, 'seconds').add(999, 'millisecond').utc(true).toDate()
        //     };
        // }

        if ("search" in bodyReq.params) {
            filter["$or"] = [
                { "caption": { $regex: new RegExp('.' + bodyReq.params.search + '.', 'i') } },
            ];
        }

        let agg = [];

        agg.push({ 
            "$match" : filter
        });

        agg.push({ 
            "$group" : { 
                "_id" : "$timestamp", 
                "id" : { 
                    "$first" : "$_id"
                }, 
                "caption" : { 
                    "$first" : "$caption"
                }, 
                "likeCount" : { 
                    "$first" : "$likeCount"
                }, 
                "userId" : { 
                    "$first" : "$ownerId"
                }, 
                "postId" : { 
                    "$first" : "$postId"
                }, 
                "targetId" : { 
                    "$first" : "$targetId"
                }, 
                "timestamp" : { 
                    "$first" : "$timestamp"
                }, 
                "type" : { 
                    "$first" : "$type"
                }
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "targetComment", 
                "let" : { 
                    "id" : "$id"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$and" : [
                                    { 
                                        "$eq" : [
                                            "$postId", 
                                            "$$id"
                                        ]
                                    }
                                ]
                            }
                        }
                    }, 
                    { 
                        "$project" : { 
                            "_id" : 1.0, 
                            "postId" : 1.0, 
                            "content" : 1.0, 
                            "timestamp" : 1.0
                        }
                    }
                ], 
                "as" : "countComment"
            }
        });

        // agg.push({ 
        //     "$lookup" : { 
        //         "from" : "targetComment", 
        //         "let" : { 
        //             "id" : "$id"
        //         }, 
        //         "pipeline" : [
        //             { 
        //                 "$match" : { 
        //                     "$expr" : { 
        //                         "$and" : [
        //                             { 
        //                                 "$eq" : [
        //                                     "$postId", 
        //                                     "$$id"
        //                                 ]
        //                             }
        //                         ]
        //                     }
        //                 }
        //             }, 
        //             { 
        //                 "$project" : { 
        //                     "_id" : 1.0, 
        //                     "postId" : 1.0, 
        //                     "content" : 1.0, 
        //                     "timestamp" : 1.0
        //                 }
        //             }
        //         ], 
        //         "as" : "targetComment"
        //     }
        // });

        // agg.push({ 
        //     "$unwind" : { 
        //         "path" : "$targetComment", 
        //         "preserveNullAndEmptyArrays" : true
        //     }
        // });

        // agg.push({ 
        //     "$lookup" : { 
        //         "from" : "targetSubComment", 
        //         "let" : { 
        //             "id" : "$id"
        //         }, 
        //         "pipeline" : [
        //             { 
        //                 "$match" : { 
        //                     "$expr" : { 
        //                         "$and" : [
        //                             { 
        //                                 "$eq" : [
        //                                     "$postId", 
        //                                     "$$id"
        //                                 ]
        //                             }
        //                         ]
        //                     }
        //                 }
        //             }, 
        //             { 
        //                 "$project" : { 
        //                     "_id" : 1.0, 
        //                     "postId" : 1.0, 
        //                     "content" : 1.0, 
        //                     "timestamp" : 1.0
        //                 }
        //             }
        //         ], 
        //         "as" : "targetSubComment"
        //     }
        // });

        // agg.push({ 
        //     "$unwind" : { 
        //         "path" : "$targetSubComment", 
        //         "preserveNullAndEmptyArrays" : true
        //     }
        // });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "localField" : "id", 
                "foreignField" : "foreignId", 
                "as" : "predict"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$predict", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        // agg.push({ 
        //     "$lookup" : { 
        //         "from" : "classificationText", 
        //         "localField" : "targetComment._id", 
        //         "foreignField" : "foreignId", 
        //         "as" : "classificationTextComment"
        //     }
        // });

        // agg.push({ 
        //     "$unwind" : { 
        //         "path" : "$classificationTextComment", 
        //         "preserveNullAndEmptyArrays" : true
        //     }
        // });

        // agg.push({ 
        //     "$lookup" : { 
        //         "from" : "classificationText", 
        //         "localField" : "targetSubComment._id", 
        //         "foreignField" : "foreignId", 
        //         "as" : "classificationTextSubComment"
        //     }
        // });

        // agg.push({ 
        //     "$unwind" : { 
        //         "path" : "$classificationTextSubComment", 
        //         "preserveNullAndEmptyArrays" : true
        //     }
        // });

        agg.push({ 
            "$lookup" : { 
                "from" : "targetPostContent", 
                "let" : { 
                    "postId" : "$postId"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$eq" : [
                                    "$postId", 
                                    "$$postId"
                                ]
                            }
                        }
                    }, 
                    { 
                        "$lookup" : { 
                            "from" : "classificationImage", 
                            "let" : { 
                                "id" : "$_id"
                            }, 
                            "pipeline" : [
                                { 
                                    "$match" : { 
                                        "$expr" : { 
                                            "$eq" : [
                                                "$foreignId", 
                                                "$$id"
                                            ]
                                        }
                                    }
                                }
                            ], 
                            "as" : "classificationImage"
                        }
                    }, 
                    { 
                        "$unwind" : { 
                            "path" : "$classificationImage", 
                            "preserveNullAndEmptyArrays" : true
                        }
                    }, 
                    { 
                        "$project" : { 
                            "mediaId" : "$_id",
                            "postId" : 1.0,  
                            "type" : 1.0, 
                            "tags" : 1.0, 
                            "content" : 1.0, 
                            "timestamp": 1.0,
                            "predict" : {
                                "hateful" : "$classificationImage.hateful", 
                                "porn" : "$classificationImage.porn", 
                                "radicalism" : "$classificationImage.radicalism", 
                                "terrorism" : "$classificationImage.terrorism",
                                "lgbt" : "$classificationImage.lgbt"
                            }
                        }
                    }
                ], 
                "as" : "media"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$media", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        // agg.push({ 
        //     "$lookup" : { 
        //         "from" : "targetStory", 
        //         "let" : { 
        //             "userId" : "$userId"
        //         }, 
        //         "pipeline" : [
        //             { 
        //                 "$match" : { 
        //                     "$expr" : { 
        //                         "$eq" : [
        //                             "$ownerId", 
        //                             "$$userId"
        //                         ]
        //                     }
        //                 }
        //             }, 
        //             { 
        //                 "$lookup" : { 
        //                     "from" : "classificationImage", 
        //                     "let" : { 
        //                         "id" : "$_id"
        //                     }, 
        //                     "pipeline" : [
        //                         { 
        //                             "$match" : { 
        //                                 "$expr" : { 
        //                                     "$eq" : [
        //                                         "$foreignId", 
        //                                         "$$id"
        //                                     ]
        //                                 }
        //                             }
        //                         }
        //                     ], 
        //                     "as" : "classificationImage"
        //                 }
        //             }, 
        //             { 
        //                 "$unwind" : { 
        //                     "path" : "$classificationImage", 
        //                     "preserveNullAndEmptyArrays" : true
        //                 }
        //             }, 
        //             { 
        //                 "$match" : { 
        //                     "classificationImage" : { 
        //                         "$exists" : true
        //                     }
        //                 }
        //             }, 
        //             { 
        //                 "$project" : { 
        //                     "mediaId" : "$_id",
        //                     "postId" : 1.0, 
        //                     "type" : 1.0, 
        //                     "taps" : 1.0, 
        //                     "content" : 1.0, 
        //                     "timestamp" : 1.0, 
        //                     "predict" : {
        //                         "hateful" : "$classificationImage.hateful", 
        //                         "porn" : "$classificationImage.porn", 
        //                         "radicalism" : "$classificationImage.radicalism", 
        //                         "terrorism" : "$classificationImage.terrorism",
        //                         "lgbt" : "$classificationImage.lgbt"
        //                     }
        //                 }
        //             }
        //         ], 
        //         "as" : "targetStory"
        //     }
        // });

        // agg.push({ 
        //     "$unwind" : { 
        //         "path" : "$targetStory", 
        //         "preserveNullAndEmptyArrays" : true
        //     }
        // });

        // agg.push({ 
        //     "$group" : { 
        //         "_id" : null, 
        //         // "targetStory" : { 
        //         //     "$addToSet" : { 
        //         //         "likeCount": 0,
        //         //         "commentCount": 0,
        //         //         "_id": "$targetStory._id",
        //         //         "postId": {"$literal": null},
        //         //         "image" : "$targetStory", 
        //         //         "text" : null, 
        //         //         "timestamp" : "$targetStory.timestamp", 
        //         //         "classification" : null
        //         //     }
        //         // }, 
        //         "targetPost" : { 
        //             "$addToSet" : { 
        //                 "likeCount": "$likeCount",
        //                 "commentCount": {"$size": "$countComment"},
        //                 "_id": "$postContent._id",
        //                 "postId": "$postContent.postId",
        //                 "image" : "$postContent", 
        //                 "text" : "$caption", 
        //                 "timestamp" : "$timestamp", 
        //                 "classification" : "$classificationTextPost"
        //             }
        //         }, 
        //         // "targetComment" : { 
        //         //     "$addToSet" : { 
        //         //         "likeCount": 0,
        //         //         "commentCount": 0,
        //         //         "_id": "$targetComment._id",
        //         //         "postId": "$targetComment.postId",
        //         //         "image" : null, 
        //         //         "text" : "$targetComment.content", 
        //         //         "timestamp" : "$targetComment.timestamp", 
        //         //         "classification" : "$classificationTextComment"
        //         //     }
        //         // }, 
        //         // "targetSubComment" : { 
        //         //     "$addToSet" : { 
        //         //         "likeCount": 0,
        //         //         "commentCount": 0,
        //         //         "_id": "$targetSubComment._id",
        //         //         "postId": "$targetSubComment.postId",
        //         //         "image" : null, 
        //         //         "text" : "$targetSubComment.content", 
        //         //         "timestamp" : "$targetSubComment.timestamp", 
        //         //         "classification" : "$classificationTextSubComment"
        //         //     }
        //         // }
        //     }
        // });

        // agg.push({ 
        //     "$project" : { 
        //         //"_id" : 0.0, 
        //         "content" : { 
        //             "$setUnion" : [
        //                 //"$targetStory", 
        //                 "$targetPost", 
        //                 //"$targetComment", 
        //                 //"$targetSubComment"
        //             ]
        //         }
        //     }
        // });

        // agg.push({ 
        //     "$unwind" : { 
        //         "path" : "$content",
        //         "preserveNullAndEmptyArrays" : true
        //     }
        // });

        agg.push({ 
            "$project" : { 
                "text" : "$caption", 
                "totalLike": {"$cond": [{"$ne":["$likeCount", null]},"$likeCount",0]}, //instagram
                "totalComment": {"$size": "$countComment"}, //instagram
                "totalInteraction": {"$add":["$likeCount",{"$size": "$countComment"}]},
                "userId" : "$userId", 
                "postId" : "$postId", 
                "dateCreate" : "$timestamp", 
                "predict" : 1.0, 
                "media" : 1.0,
                "source" : "instagram"
            }
        });

        // agg.push({
        //     "$project":{
        //         "source":"instagram",
        //         //"postId":"$content._id", 
        //         "postId":"$_id", 
        //         "dateCreate": "$content.timestamp",
        //         "text": "$content.text",
        //         "userId": bodyReq.params.userId,
        //         "totalLike": {"$cond": [{"$ne":["$content.likeCount", null]},"$content.likeCount",0]}, //instagram
        //         "totalComment": {"$cond": [{"$ne":["$content.commentCount", null]},"$content.commentCount",0]}, //instagram
        //         "totalInteraction": {"$add":["$content.likeCount","$content.commentCount"]},
        //         "predict": {
        //             "advertisement": "$content.classification.advertisement",
        //             "hateful": "$content.classification.hateful",
        //             "hoax": "$content.classification.hoax",
        //             "porn": "$content.classification.porn",
        //             "propaganda": "$content.classification.propaganda",
        //             "radicalism": "$content.classification.radicalism",
        //             "sentiment": "$content.classification.sentiment",
        //             "lgbt" : "$content.classification.lgbt"
        //         },
        //         "media": {"$cond": [{"$ne":["$content.image", null]},"$content.image",[]]}
        //     }
        // });

        if("category" in bodyReq.params){
            let category = {};

            switch(true){
                case bodyReq.params.category == "Porn":
                    category = { "$or": [{"predict.porn" : 1}, {"predict.resultClassification.porn.result" : "sexy"}, {"media.predict.porn": 1}/* { "media": {"$elemMatch": {"predict.porn": 1}}} */, {"media.predict.resultClassification.porn.result": "sexy"}/* { "media": {"$elemMatch": {"predict.resultClassification.porn.result": "sexy"}}} */]};
                    break;

                case bodyReq.params.category == "Hateful":
                    category = { "$or": [{"predict.hateful" : 1}, { "predict.sentiment" : -1.0}, {"media.predict.hateful": 1}/* { "media": {"$elemMatch": {"predict.hateful": 1}}} */]};
                    break;

                case bodyReq.params.category == "Radicalism":
                    category = { "$or": [{"predict.radicalism" : 1}, {"predict.propaganda" : 1}, {"media.predict.radicalism": 1}/* { "media": {"$elemMatch": {"predict.radicalism": 1} }} */]};
                    break;

                case bodyReq.params.category == "Terrorism":
                    category = {"media.predict.terrorism": 1};/* { "media": {"$elemMatch": { "predict.terrorism" : 1}}} */;
                    break;

                case bodyReq.params.category == "LGBT":
                    category = { "$or": [{"predict.lgbt" : 1}, {"media.predict.lgbt": 1}/* { "media": {"$elemMatch": {"predict.lgbt": 1}}} */]};
                    break;

                default :
                    break;
            }

            agg.push({ 
                "$match" : category
            });
        }

        let and = [];
        if ("categories" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.categories.length > 0){
                if(bodyReq.params.categories.length == 5){
                } else{
                    let filterMatch = {};
                    bodyReq.params.categories.forEach((element) => {
                        if (element == "lgbt"){
                            
                        } else if (element != "terrorism"){
                            filterMatch = { "$or": [{}, {}] };
                            filterMatch["$or"][0]["predict."+ element] = 1;
                            filterMatch["$or"][1]["media.predict."+ element] = 1;
                        } else {
                            filterMatch = {};
                            filterMatch["media.predict."+ element] = 1;
                        }
                        or.push(filterMatch);
                    });
                    and.push({"$or":or});
                }
            }
        }

        if ("includeKeywords" in  bodyReq.params) {
            let or = [];
            if(bodyReq.params.includeKeywords.length > 0){
                bodyReq.params.includeKeywords.forEach((element) => {
                    or.push({"text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$or":or});
            }
        }
        
        if ("excludeKeywords" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.excludeKeywords.length > 0){
                bodyReq.params.excludeKeywords.forEach((element) => {
                    or.push({ "text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$nor":or});
            }
        }

        if (and.length > 0) {
            agg.push({
                "$match" : {
                    "$and": and
                }
            });    
        }

        agg.push({ 
            "$group" : { 
                "_id" : "$_id", 
                "text" : { 
                    "$first" : "$text"
                }, 
                "totalLike" : { 
                    "$first" : "$totalLike"
                }, 
                "totalComment" : { 
                    "$first" : "$totalComment"
                }, 
                "totalInteraction" : { 
                    "$first" : "$totalInteraction"
                }, 
                "userId" : { 
                    "$first" : "$userId"
                }, 
                "postId" : { 
                    "$first" : "$postId"
                }, 
                "dateCreate" : { 
                    "$first" : "$dateCreate"
                }, 
                "predict" : { 
                    "$first" : "$predict"
                }, 
                "media" : { 
                    "$push" : "$media"
                }, 
                "source" : { 
                    "$first" : "$source"
                }
            }
        });

        mongo.getAggregateData(dbName, "targetPost", agg, function(count) {

            if ("sort" in bodyReq.params) {
                agg.push({ 
                    "$sort" : bodyReq.params.sort
                });
            }

            agg.push({ 
                "$skip" : parseInt(bodyReq.params.offset)
            });

            agg.push({ 
                "$limit" : parseInt(bodyReq.params.limit)
            });

            mongo.getAggregateData(dbName, "targetPost", agg, function(result) {
                cb(count.length, result);
            });
        });
    }

    static async getInteractionBaseAnalytics(bodyReq, cb){
        let filter = {
            "ownerId" : bodyReq.params.userId
        };

        if ("date" in bodyReq.params) {
            filter["timestamp"] = { 
                "$gte": moment(bodyReq.params.date).utc(true).toDate(),
                "$lte":  moment(bodyReq.params.date).add(23, 'hours').add(59, 'minutes').add(59, 'seconds').add(999, 'millisecond').utc(true).toDate()
            }
        } else if ("dateFrom" in bodyReq.params && "dateUntil" in bodyReq.params){
            filter["timestamp"] = {
                "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                "$lte": moment(bodyReq.params.dateUntil).add(23, 'hours').add(59, 'minutes').add(59, 'seconds').add(999, 'millisecond').utc(true).toDate()
            };
        }

        if ("search" in bodyReq.params) {
            filter["$or"] = [
                { "caption": { $regex: new RegExp('.' + bodyReq.params.search + '.', 'i') } },
            ];
        }

        let agg = [];

        agg.push({ 
            "$match" : filter
        });

        agg.push({ 
            "$project" : { 
                "_id" : 1.0, 
                "dateUpdate" : 1.0, 
                "caption" : 1.0, 
                "postId" : 1.0
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "targetPostContent", 
                "let" : { 
                    "id" : "$postId"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$and" : [
                                    { 
                                        "$eq" : [
                                            "$postId", 
                                            "$$id"
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                ], 
                "as" : "detailImages"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "let" : { 
                    "id" : "$_id", 
                    "dateUpdate" : "$dateUpdate"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$and" : [
                                    { 
                                        "$eq" : [
                                            "$foreignId", 
                                            "$$id"
                                        ]
                                    }, 
                                    { 
                                        "$eq" : [
                                            "$dateUpdate", 
                                            "$$dateUpdate"
                                        ]
                                    }, 
                                    { 
                                        "$eq" : [
                                            "$source", 
                                            "targetPost"
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                ], 
                "as" : "classificationText"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$detailImages",
                "preserveNullAndEmptyArrays": true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationImage", 
                "let" : { 
                    "id" : "$detailImages._id"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$and" : [
                                    { 
                                        "$eq" : [
                                            "$foreignId", 
                                            "$$id"
                                        ]
                                    }, 
                                    { 
                                        "$eq" : [
                                            "$source", 
                                            "targetPostContent"
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                ], 
                "as" : "classificationImage"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationImage",
                "preserveNullAndEmptyArrays": true
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationText",
                "preserveNullAndEmptyArrays": true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "targetPostContent", 
                "let" : {"postId": "$postId"}, 
                "pipeline" : [
                    {"$match": {"$expr": {"$eq": ["$postId", "$$postId"]}}},
                    {"$lookup":{"from":"classificationImage","let":{"id":"$_id"},"pipeline":[{"$match":{"$expr":{"$eq":["$foreignId","$$id"]}}}],"as":"classificationImage"}},
                    {"$unwind":{"path":"$classificationImage", "preserveNullAndEmptyArrays" : true}},
                    {"$project": {"_id": 0, "mediaId": "$_id", "content": 1, "type": {"$toLower": {"$arrayElemAt": [{"$split": ["$type", "Graph"]}, 1]}}, "predict": { "hateful": {"$ifNull": ["$classificationImage.hateful", 0]}, "porn": {"$ifNull": ["$classificationImage.porn", 0]}, "radicalism": {"$ifNull": ["$classificationImage.radicalism", 0]}, "terrorism": {"$ifNull": ["$classificationImage.terrorism", 0]}, "lgbt": {"$ifNull": ["$classificationImage.lgbt", 0]}}}}
                ], 
                "as" : "postContent"
            }
        });

        let match = [];
        if("category" in bodyReq.params){     
            if(bodyReq.params.category === "Radicalism [T]"){
                match.push({ 
                    "classificationText.radicalism" : { 
                        "$eq" : 1.0
                    }
                });
                match.push({ 
                    "classificationImage.radicalism" : { 
                        "$eq" : 1.0
                    }
                });
            } else if(bodyReq.params.category === "Hateful [T]"){
                match.push({ 
                    "classificationText.hateful" : { 
                        "$eq" : 1.0
                    }
                });
                match.push({ 
                    "classificationImage.hateful" : { 
                        "$eq" : 1.0
                    }
                });
            } else if(bodyReq.params.category === "Porn [T]"){
                match.push({ 
                    "classificationText.porn" : { 
                        "$eq" : 1.0
                    }
                });
                match.push({ 
                    "classificationImage.porn" : { 
                        "$eq" : 1.0
                    }
                });
            } else if(bodyReq.params.category === "Terrorism [T]"){
                match.push({ 
                    "classificationImage.terrorism" : { 
                        "$eq" : 1.0
                    }
                });
            } else if(bodyReq.params.category === "LGBT [T]"){
                match.push({ 
                    "classificationText.lgbt" : { 
                        "$eq" : 1.0
                    }
                });
                match.push({ 
                    "classificationImage.lgbt" : { 
                        "$eq" : 1.0
                    }
                });
            }
        }

        agg.push({
            "$match": {
                "$or": match
            }
        });

        agg.push({
            "$group": {
                "_id": "$_id",
                "postId": { "$first": "$postId" },
                "text": { "$first": "$caption" },
                "media": { "$first": "$postContent" },
                "timestamp": { "$first": "$dateUpdate" },
                "sentimentText" : {
                    "$first" : "$classificationText.sentiment"
                },
                "propagandaText" : { 
                    "$sum" : "$classificationText.propaganda"
                }, 
                "radicalismText" : { 
                    "$sum" : "$classificationText.radicalism"
                }, 
                "hateText" : { 
                    "$sum" : "$classificationText.hateful"
                }, 
                "pornText" : { 
                    "$sum" : "$classificationText.porn"
                }, 
                "lgbtText" : { 
                    "$sum" : "$classificationText.lgbt"
                }, 
                "hateImage" : { 
                    "$sum" : "$classificationImage.hateful"
                }, 
                "pornImage" : { 
                    "$sum" : "$classificationImage.porn"
                }, 
                "radicalismImage" : { 
                    "$sum" : "$classificationImage.radicalism"
                }, 
                "terrorismImage" : { 
                    "$sum" : "classificationImage.terrorism"
                },
                "lgbtImage" : { 
                    "$sum" : "classificationImage.lgbt"
                }
            }
        });

        let and = [];
        if ("categories" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.categories.length > 0){
                if(bodyReq.params.categories.length == 5){
                } else{
                    let filterMatch = {};
                    bodyReq.params.categories.forEach((element) => {
                        if (element == "lgbt"){
                            
                        } else if (element != "terrorism"){
                            filterMatch = { "$or": [{}, {}] };
                            filterMatch["$or"][0]["predict."+ element] = 1;
                            filterMatch["$or"][1]["media.predict."+ element] = 1;
                        } else {
                            filterMatch = {};
                            filterMatch["media.predict."+ element] = 1;
                        }
                        or.push(filterMatch);
                    });
                    and.push({"$or":or});
                }
            }
        }

        if ("includeKeywords" in  bodyReq.params) {
            let or = [];
            if(bodyReq.params.includeKeywords.length > 0){
                bodyReq.params.includeKeywords.forEach((element) => {
                    or.push({"text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$or":or});
            }
        }
        
        if ("excludeKeywords" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.excludeKeywords.length > 0){
                bodyReq.params.excludeKeywords.forEach((element) => {
                    or.push({ "text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$nor":or});
            }
        }

        agg.push({
            "$lookup": {
                "from": "targetLike",
                "let": { "id": "$_id"},
                "pipeline": [{"$match": {"$expr": {"$and": [{"$eq": ["$postId", "$$id"]},{"$eq": ["$username", bodyReq.params.friend]}]}}}, {"$project": {"_id": 0, "fullName": 1, "isPrivate": 1, "isVerified": 1, "profilePic": 1, "username": 1,  "like": {"$literal": 1}}}],
                "as": "targetLike"
            }
        });
        
        agg.push({
            "$lookup": {
                "from": "targetComment",
                "let": { "id": "$_id"},
                "pipeline": [{
                        "$match": {"$expr": {"$and": [{"$eq": ["$postId", "$$id"]},{"$eq": ["$owner.username", bodyReq.params.friend]}]}}
                    }, {
                        "$project": {"_id": 0, "fullName": "", "isPrivate": "", "isVerified": "$owner.isVerified", "profilePic": "$owner.profilePic", "username": "$owner.username"}
                    }, {
                        "$lookup": {"from": "contacts", "localField": "username", "foreignField": "username", "as": "contact" }
                    }, {
                        "$project": { "fullName": { "$ifNull": [{"$arrayElemAt": ["$contact.fullName", 0]}, ""]}, "isPrivate": {"$ifNull": [{"$arrayElemAt": ["$contact.isPrivate", 0]}, ""]}, "isVerified": 1, "profilePic": 1, "username": 1, "comment": {"$literal": 1}}
                    }],
                "as": "targetComment"
            }
        });

        agg.push({ 
            "$project" : { 
                "postId": 1,
                "text": 1,
                "media": 1,
                "timestamp": 1,
                "sentiment": "$sentimentText",
                "radicalism" : { 
                    "$cond" : [
                        {
                            "$or": [
                                {"$gte": ["$radicalismText", 1]},
                                {"$gte": ["$propagandaText", 1]},
                                {"$gte": ["$radicalismImage", 1]},
                            ]
                        },
                        1,
                        0
                    ]
                }, 
                "hateful" : { 
                    "$cond" : [
                        {
                            "$or": [
                                {"$gte": ["$hateText", 1]},
                                // {"$eq": ["$sentimentText", -1]},
                                {"$gte": ["$hateImage", 1]}
                            ]
                        },
                        1, 
                        0
                    ]
                }, 
                "porn" : { 
                    "$cond" : [
                        {
                            "$or": [
                                {"$gte": ["$pornText", 1]},
                                {"$gte": ["$pornImage", 1]}
                            ]
                        },
                        1, 
                        0
                    ]
                }, 
                "terrorism" : {
                    "$cond": [
                        {"$gte": ["$terrorismImage", 1]},
                        1,
                        0
                    ]
                }, 
                "lgbt" : { 
                    "$cond" : [
                        {
                            "$or": [
                                {"$gte": ["$lgbtText", 1]},
                                {"$gte": ["$lgbtImage", 1]}
                            ]
                        },
                        1, 
                        0
                    ]
                }, 
                "interactions" : { 
                    "$concatArrays" : [
                        "$targetLike", 
                        "$targetComment"
                    ]
                },
            }
        });

        agg.push({
            "$unwind": {
                "path": "$interactions"
            }
        });

        agg.push({
            "$group": {
                "_id": null,
                "posts": {
                    "$addToSet": {
                        "source": "instagram",
                        "postId": "$_id",
                        "dateCreate": "$timestamp",
                        "userId":bodyReq.params.userId,
                        "text": "$text",
                        "totalLike": {"$sum": '$interactions.like'},/* {"$sum": {"$cond": [{ '$ne': ['$interactions.like', null]}, "$interactions.like", 0]}}, */
                        "totalComment": {"$sum": '$interactions.comment'},/* {"$sum": {"$cond": [{ '$ne': ['$interactions.comment', null]}, "$interactions.comment", 0]}}, */
                        "totalInteraction": {"$add":["$totalLike","$totalComment"]},
                        "predict": {
                            "radicalism" : "$radicalism", 
                            "hateful" : "$hateful", 
                            "porn" : "$porn",
                            "terrorism" : "$terorism",
                            "lgbt" : "$lgbt",
                            "sentiment" : "$sentiment"
                        },
                        "media": "$media"
                    }
                },
                "username": {"$first": "$interactions.username"},
                "fullName": {"$first": "$interactions.fullName"},
                "isPrivate": {"$first": "$interactions.isPrivate"},
                "isVerified": {"$first": "$interactions.isVerified"},
                "profilePic": {"$first": "$interactions.profilePic"},
            }
        });

        if (and.length > 0) {
            agg.push({
                "$match" : {
                    "$and": and
                }
            });    
        }

        mongo.getAggregateData(dbName, "targetPost", agg, function(count) {
        
            if ("sort" in bodyReq.params) {
                agg.push({ 
                    "$sort" : bodyReq.params.sort
                });
            }

            agg.push({ 
                "$skip" : parseInt(bodyReq.params.offset)
            });

            agg.push({ 
                "$limit" : parseInt(bodyReq.params.limit)
            });

            mongo.getAggregateData(dbName, "targetPost", agg, function(result) {
                cb(count.length, result);
            });
        });
    }

    static async getWordBaseAnalytics(bodyReq, cb){
        let filter = {
            "userId" : bodyReq.params.userId
        };

        if ("date" in bodyReq.params) {
            filter["dateCreate"] = { 
                "$gte": moment(bodyReq.params.date).utc(true).toDate(),
                "$lte":  moment(bodyReq.params.date).add(23, 'hours').add(59, 'minutes').add(59, 'seconds').add(999, 'millisecond').utc(true).toDate()
            }
        } else if ("dateFrom" in bodyReq.params && "dateUntil" in bodyReq.params){
            filter["dateCreate"] = {
                "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                "$lte": moment(bodyReq.params.dateUntil).add(23, 'hours').add(59, 'minutes').add(59, 'seconds').add(999, 'millisecond').utc(true).toDate()
            };
        }

        if ("search" in bodyReq.params) {
            filter["$or"] = [
                { "text": { $regex: new RegExp('.' + bodyReq.params.search + '.', 'i') } },
            ];
        }

        let agg = [];

        agg.push({ 
            "$match" : filter
        });
        
        agg.push({ 
            "$unwind" : { 
                "path" : ("$" + bodyReq.params.type)
            }
        });            

        agg.push({ 
            "$group" : { 
                "_id" : {"word": ("$" + bodyReq.params.type), "id": "$postId"},
                "text" : { "$first" : "$text"},
                "totalLike" : { "$first" : "$totalLike"},
                "totalComment" : { "$first" : "$totalComment"},
                "totalInteraction" : { "$first" : "$totalInteraction"},
                "userId" : { "$first" : "$userId"},
                "postId" : { "$first" : "$postId"},
                "dateCreate" : { "$first" : "$dateCreate"},
                "predict" : { "$first" : "$predict"},
                "media" : { "$first" : "$media"},
                "source" : { "$first" : "$source"},
            }
        });

        if("word" in bodyReq.params) {
            let word = {};
            if (bodyReq.params.word.length > 1) {
                if (bodyReq.params.type == "bigram") {
                    let regex = bodyReq.params.word.join(" ");
                    word["_id.word"] = {$regex: new RegExp('^' + regex + "$",'i')};
                } else {
                    word = {
                        "$and" : [
                            {"_id.word": {$regex: new RegExp('.' + bodyReq.params.word[0] + ".", 'i')}},
                            {"_id.word": {$regex: new RegExp('.' + bodyReq.params.word[1] + ".", 'i')}}
                        ]
                    }
                }
            } else {
                word = { 
                    "_id.word": {$regex: new RegExp('^' + bodyReq.params.word[0] + "$",'i')}
                }
            }
 
            agg.push({ 
                "$match" : word
            });
        }

        agg.push({ 
            "$group" : { 
                "_id" : "$_id.id", 
                "text" : { "$first" : "$text"},
                "totalLike" : { "$first" : "$totalLike"},
                "totalComment" : { "$first" : "$totalComment"},
                "totalInteraction" : { "$first" : "$totalInteraction"},
                "userId" : { "$first" : "$userId"},
                "postId" : { "$first" : "$postId"},
                "dateCreate" : { "$first" : "$dateCreate"},
                "predict" : { "$first" : "$predict"},
                "media" : { "$first" : "$media"},
                "source" : { "$first" : "$source"},
            }
        });

        let and = [];
        if ("categories" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.categories.length > 0){
                if(bodyReq.params.categories.length == 5){
                } else{
                    let filterMatch = {};
                    bodyReq.params.categories.forEach((element) => {
                        if (element == "lgbt"){
                            
                        } else if (element != "terrorism"){
                            filterMatch = { "$or": [{}, {}] };
                            filterMatch["$or"][0]["predict."+ element] = 1;
                            filterMatch["$or"][1]["media.predict."+ element] = 1;
                        } else {
                            filterMatch = {};
                            filterMatch["media.predict."+ element] = 1;
                        }
                        or.push(filterMatch);
                    });
                    and.push({"$or":or});
                }
            }
        }

        if ("includeKeywords" in  bodyReq.params) {
            let or = [];
            if(bodyReq.params.includeKeywords.length > 0){
                bodyReq.params.includeKeywords.forEach((element) => {
                    or.push({"text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$or":or});
            }
        }
        
        if ("excludeKeywords" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.excludeKeywords.length > 0){
                bodyReq.params.excludeKeywords.forEach((element) => {
                    or.push({ "text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$nor":or});
            }
        }

        if (and.length > 0) {
            agg.push({
                "$match" : {
                    "$and": and
                }
            });    
        }

        mongo.getAggregateData(dbName, "view_WordBaseAnalytics", agg, function(count) {
            if ("sort" in bodyReq.params) {
                agg.push({ 
                    "$sort" : bodyReq.params.sort
                });
            }
            
            agg.push({ 
                "$skip" : parseInt(bodyReq.params.offset)
            });

            agg.push({ 
                "$limit" : parseInt(bodyReq.params.limit)
            });

            mongo.getAggregateData(dbName, "view_WordBaseAnalytics", agg, function(result) {
                cb(count.length, result);
            });
        });
    }
    
    static async getPost(bodyReq, cb){
        let filter = {
            "userId" : bodyReq.params.userId
        };
        let agg = [];

        if ("search" in bodyReq.params) {
            filter["$or"] = [
                { "text": { $regex: new RegExp('.*' + bodyReq.params.search + '.*', 'i') } },
            ];
        }

        mongo.countDataByFilter(dbName, "view_getPost", filter, function (resCount) {
            if ("sort" in bodyReq.params) {
                mongo.searchDataByOffsetLimitSort(dbName, "view_getPost", filter, bodyReq.params.sort, parseInt(bodyReq.params.offset), parseInt(bodyReq.params.limit), function(resTmpData) {
                    cb(resCount, resTmpData);
                });
            }else{
                mongo.searchDataByOffsetLimit(dbName, "view_getPost", filter, parseInt(bodyReq.params.offset), parseInt(bodyReq.params.limit), function(resTmpData) {
                    cb(resCount, resTmpData);
                });
            }
        });
    }

    static async getFollowing(bodyReq, cb){
        let agg = [];

        agg.push({ 
            "$match" : { 
                "targetId" : bodyReq.params.userId,
            }
        });

        if ("search" in bodyReq.params) {
            agg[0]["$match"]["$or"] = [
                { "fullName": { $regex: new RegExp('.*' + bodyReq.params.search + '.*', 'i') } },
                { "username": { $regex: new RegExp('.*' + bodyReq.params.search + '.*', 'i') } },
            ];
        }

        mongo.getAggregateData(dbName, "targetFollowing", agg, function(count) {

            if ("sort" in bodyReq.params) {
                agg.push({ 
                    "$sort" : bodyReq.params.sort
                });
            }

            agg.push({ 
                "$skip" : parseInt(bodyReq.params.offset)
            });

            agg.push({ 
                "$limit" : parseInt(bodyReq.params.limit)
            });

            mongo.getAggregateData(dbName, "targetFollowing", agg, function(result) {
                cb(count.length, result);
            });
        });

    }

    static async getFollower(bodyReq, cb){
        let agg = [];

        agg.push({ 
            "$match" : { 
                "targetId" : bodyReq.params.userId,
            }
        });

        if ("search" in bodyReq.params) {
            agg[0]["$match"]["$or"] = [
                { "fullName": { $regex: new RegExp('.*' + bodyReq.params.search + '.*', 'i') } },
                { "username": { $regex: new RegExp('.*' + bodyReq.params.search + '.*', 'i') } },
            ];
        }

        mongo.getAggregateData(dbName, "targetFollower", agg, function(count) {

            if ("sort" in bodyReq.params) {
                agg.push({ 
                    "$sort" : bodyReq.params.sort
                });
            }

            agg.push({ 
                "$skip" : parseInt(bodyReq.params.offset)
            });

            agg.push({ 
                "$limit" : parseInt(bodyReq.params.limit)
            });

            mongo.getAggregateData(dbName, "targetFollower", agg, function(result) {
                cb(count.length, result);
            });
        });

    }
}

module.exports = RawDataModel;