const moment        = require('moment');
const path          = require('path');
const BASE_DIR      = path.dirname(require.main.filename);
const mongo 	    = require(BASE_DIR + '/libraries/MongoDriver');
const utils         = require(BASE_DIR + '/Utils');
const dbName        = process.env.DB_NAME_TW;

class ScoringModel {
    static async getTextScoring(userId, cb){
        let agg = [];
        
        agg.push({ 
            "$match" : { 
                "user_id" : userId
            }
        });

        agg.push({ 
            "$project" : { 
                "user_id" : 1.0
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
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
                "as" : "classificationText"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationText"
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : null, 
                "countData" : { 
                    "$sum" : 1.0
                }, 
                "countAdvertising" : { 
                    "$sum" : "$classificationText.advertisement"
                }, 
                "countHoax" : { 
                    "$sum" : "$classificationText.hoax"
                }, 
                "countHateful" : { 
                    "$sum" : "$classificationText.hateful"
                }, 
                "countPorn" : { 
                    "$sum" : "$classificationText.porn"
                }, 
                "countSexy" : { 
                    "$sum" : { 
                        "$cond" : { 
                            "if" : { 
                                "$eq" : [
                                    "$classificationText.resultClassification.porn.result", 
                                    "sexy"
                                ]
                            }, 
                            "then" : 0.5, 
                            "else" : 0.0
                        }
                    }
                }, 
                "countPropaganda" : { 
                    "$sum" : { 
                        "$cond" : { 
                            "if" : { 
                                "$eq" : [
                                    "$classificationText.propaganda", 
                                    1.0
                                ]
                            }, 
                            "then" : 0.5, 
                            "else" : 0.0
                        }
                    }
                }, 
                "countRadicalism" : { 
                    "$sum" : "$classificationText.radicalism"
                }, 
                "countSentiment" : { 
                    "$sum" : { 
                        "$cond" : { 
                            "if" : { 
                                "$lt" : [
                                    "$classificationText.sentiment", 
                                    0.0
                                ]
                            }, 
                            "then" : 0.5, 
                            "else" : 0.0
                        }
                    }
                }
            }
        });
        
        mongo.getAggregateData(dbName, "tweet", agg, function(result) {
            cb(result[0]);
        });
    }

    static async getImageScoring(userId, cb){
        let agg = [];
        
        agg.push({ 
            "$match" : { 
                "user_id" : userId,
                "entities.media" : { 
                    "$exists" : true
                }
            }
        });

        agg.push({ 
            "$project" : { 
                "user_id" : 1.0, 
                "media" : "$entities.media"
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
                "from" : "profile", 
                "let" : { 
                    "userId" : "$user_id"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$and" : [
                                    { 
                                        "$eq" : [
                                            "$_id", 
                                            "$$userId"
                                        ]
                                    }
                                ]
                            }
                        }
                    }, 
                    { 
                        "$project" : { 
                            "profile_image_url" : 1.0, 
                            "profile_banner_url" : 1.0
                        }
                    }
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
            "$project" : { 
                "user_id" : 1.0, 
                "media" : 1.0, 
                "profileBanner" : "$profile.profile_banner_url", 
                "profilePic" : "$profile.profile_image_url"
            }
        });

        agg.push({ 
            "$project" : { 
                "media" : [
                    "$media", 
                    "$profileBanner", 
                    "$profilePic"
                ]
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$media"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationImage", 
                "let" : { 
                    "id" : "$media"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$eq" : [
                                    "$_id", 
                                    "$$id"
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
                "path" : "$classificationImage"
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : null, 
                "countData" : { 
                    "$sum" : 1.0
                }, 
                "countHateful" : { 
                    "$sum" : "$classificationImage.hateful"
                }, 
                "countPorn" : { 
                    "$sum" : "$classificationImage.porn"
                }, 
                "countSexy" : { 
                    "$sum" : { 
                        "$cond" : { 
                            "if" : { 
                                "$eq" : [
                                    "$classificationImage.resultClassification.porn.result", 
                                    "sexy"
                                ]
                            }, 
                            "then" : 0.5, 
                            "else" : 0.0
                        }
                    }
                }, 
                "countRadicalism" : { 
                    "$sum" : "$classificationImage.radicalism"
                }, 
                "countTerorist" : { 
                    "$sum" : "$classificationImage.terrorism"
                }
            }
        });

        mongo.getAggregateData(dbName, "tweet", agg, function(result) {
            cb(result[0]);
        });
    }

    static async getTextDailyPost(userId, cb){
        let agg = [];
        
        agg.push({ 
            "$match" : { 
                "user_id" : userId
            }
        });

        agg.push({ 
            "$project" : { 
                "user_id" : 1.0, 
                "created_at" : 1.0
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : { 
                    "timestamp" : { 
                        "$dateToString" : { 
                            "format" : "%Y-%m-%d", 
                            "date" : "$created_at"
                        }
                    }, 
                    "hour" : { 
                        "$hour" : "$created_at"
                    }, 
                    "minutes" : { 
                        "$minute" : "$created_at"
                    }, 
                    "_id" : "$_id"
                }
            }
        });

        agg.push({
            "$match":{
                "_id.hour":{
                    "$gte":6,
                    "$lte":23,
                },
                "_id.minutes":{
                    "$gte":0,
                    "$lte":59,
                }
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "let" : { 
                    "id" : "$_id._id"
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
                "as" : "classificationText"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationText"
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : { 
                    "timestamp" : "$_id.timestamp", 
                    "hour" : "$_id.hour", 
                    "minutes" : "$_id.minutes"
                }, 
                "countData" : { 
                    "$sum" : 1.0
                }, 
                "countAdvertising" : { 
                    "$sum" : "$classificationText.advertisement"
                }, 
                "countHoax" : { 
                    "$sum" : "$classificationText.hoax"
                }, 
                "countHateful" : { 
                    "$sum" : "$classificationText.hateful"
                }, 
                "countPorn" : { 
                    "$sum" : "$classificationText.porn"
                }, 
                "countSexy" : { 
                    "$sum" : { 
                        "$cond" : { 
                            "if" : { 
                                "$eq" : [
                                    "$classificationText.resultClassification.porn.result", 
                                    "sexy"
                                ]
                            }, 
                            "then" : 0.5, 
                            "else" : 0.0
                        }
                    }
                }, 
                "countPropaganda" : { 
                    "$sum" : { 
                        "$cond" : { 
                            "if" : { 
                                "$eq" : [
                                    "$classificationText.propaganda", 
                                    1.0
                                ]
                            }, 
                            "then" : 0.5, 
                            "else" : 0.0
                        }
                    }
                }, 
                "countRadicalism" : { 
                    "$sum" : "$classificationText.radicalism"
                }, 
                "countSentiment" : { 
                    "$sum" : { 
                        "$cond" : { 
                            "if" : { 
                                "$lt" : [
                                    "$classificationText.sentiment", 
                                    0.0
                                ]
                            }, 
                            "then" : 0.5, 
                            "else" : 0.0
                        }
                    }
                }
            }
        });

        agg.push({ 
            "$project" : { 
                "timestamp" : "$_id.timestamp", 
                "hour" : "$_id.hour", 
                "minutes" : "$_id.minutes", 
                "countRadicalism" : { 
                    "$cond" : [
                        { 
                            "$or" : [
                                { 
                                    "$gt" : [
                                        "$countRadicalism", 
                                        0.0
                                    ]
                                }, 
                                { 
                                    "$gt" : [
                                        "$countPropaganda", 
                                        0.0
                                    ]
                                }
                            ]
                        }, 
                        1.0, 
                        0.0
                    ]
                }, 
                "countHateful" : { 
                    "$cond" : [
                        { 
                            "$or" : [
                                { 
                                    "$gt" : [
                                        "$countHateful", 
                                        0.0
                                    ]
                                }, 
                                { 
                                    "$gt" : [
                                        "$countSentiment", 
                                        0.0
                                    ]
                                }
                            ]
                        }, 
                        1.0, 
                        0.0
                    ]
                }, 
                "countPorn" : { 
                    "$cond" : [
                        { 
                            "$or" : [
                                { 
                                    "$gt" : [
                                        "$countPorn", 
                                        0.0
                                    ]
                                }, 
                                { 
                                    "$gt" : [
                                        "$countSexy", 
                                        0.0
                                    ]
                                }
                            ]
                        }, 
                        1.0, 
                        0.0
                    ]
                }, 
                "countData" : 1.0, 
                "_id" : 0.0
            }
        });

        // agg.push({ 
        //     "$group" : { 
        //         "_id" : "$timestamp", 
        //         "countRadicalism" : { 
        //             "$sum" : "$countRadicalism"
        //         }, 
        //         "countHate" : { 
        //             "$sum" : "$countHate"
        //         }, 
        //         "countPorn" : { 
        //             "$sum" : "$countPorn"
        //         }, 
        //         "countData" : { 
        //             "$sum" : "$countData"
        //         }
        //     }
        // });

        mongo.getAggregateData(dbName, "tweet", agg, function(result) {
            cb(result);
        });
    }

    static async getImageDailyPost(userId, cb){
        let agg = [];

        agg.push({ 
            "$match" : { 
                "user_id" : userId,
                "entities.media" : { 
                    "$exists" : true
                }
            }
        });

        agg.push({ 
            "$project" : { 
                "user_id" : 1.0, 
                "created_at" : 1.0, 
                "media" : "$entities.media"
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
                "from" : "profile", 
                "let" : { 
                    "userId" : "$user_id"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$and" : [
                                    { 
                                        "$eq" : [
                                            "$_id", 
                                            "$$userId"
                                        ]
                                    }
                                ]
                            }
                        }
                    }, 
                    { 
                        "$project" : { 
                            "profile_image_url" : 1.0, 
                            "profile_banner_url" : 1.0
                        }
                    }
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
            "$project" : { 
                "user_id" : 1.0, 
                "created_at" : 1.0, 
                "media" : 1.0, 
                "profileBanner" : "$profile.profile_banner_url", 
                "profilePic" : "$profile.profile_image_url"
            }
        });

        agg.push({ 
            "$project" : { 
                "created_at" : 1.0, 
                "media" : [
                    "$media", 
                    "$profileBanner", 
                    "$profilePic"
                ]
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : { 
                    "timestamp" : { 
                        "$dateToString" : { 
                            "format" : "%Y-%m-%d", 
                            "date" : "$created_at"
                        }
                    }, 
                    "hour" : { 
                        "$hour" : "$created_at"
                    }, 
                    "minutes" : { 
                        "$minute" : "$created_at"
                    }, 
                    "_id" : "$_id"
                }, 
                "media" : { 
                    "$first" : "$media"
                }
            }
        });

        agg.push({
            "$match":{
                "_id.hour":{
                    "$gte":6,
                    "$lte":23,
                },
                "_id.minutes":{
                    "$gte":0,
                    "$lte":59,
                }
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$media"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationImage", 
                "let" : { 
                    "id" : "$media"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$eq" : [
                                    "$_id", 
                                    "$$id"
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
                "path" : "$classificationImage"
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : { 
                    "timestamp" : "$_id.timestamp", 
                    "hour" : "$_id.hour", 
                    "minutes" : "$_id.minutes"
                }, 
                "countData" : { 
                    "$sum" : 1.0
                }, 
                "countHateful" : { 
                    "$sum" : "$classificationImage.hateful"
                }, 
                "countPorn" : { 
                    "$sum" : "$classificationImage.porn"
                }, 
                "countSexy" : { 
                    "$sum" : { 
                        "$cond" : { 
                            "if" : { 
                                "$eq" : [
                                    "$classificationImage.resultClassification.porn.result", 
                                    "sexy"
                                ]
                            }, 
                            "then" : 0.5, 
                            "else" : 0.0
                        }
                    }
                }, 
                "countRadicalism" : { 
                    "$sum" : "$classificationImage.radicalism"
                }, 
                "countTerorist" : { 
                    "$sum" : "$classificationImage.terrorism"
                }
            }
        });

        agg.push({ 
            "$project" : { 
                "timestamp" : "$_id.timestamp", 
                "hour" : "$_id.hour", 
                "minutes" : "$_id.minutes", 
                "countRadicalism" : { 
                    "$cond" : [
                        { 
                            "$or" : [
                                { 
                                    "$gt" : [
                                        "$countRadicalism", 
                                        0.0
                                    ]
                                }
                            ]
                        }, 
                        1.0, 
                        0.0
                    ]
                }, 
                "countHateful" : { 
                    "$cond" : [
                        { 
                            "$or" : [
                                { 
                                    "$gt" : [
                                        "$countHateful", 
                                        0.0
                                    ]
                                }
                            ]
                        }, 
                        1.0, 
                        0.0
                    ]
                }, 
                "countTerorist" : { 
                    "$cond" : [
                        { 
                            "$or" : [
                                { 
                                    "$gt" : [
                                        "$countTerorist", 
                                        0.0
                                    ]
                                }
                            ]
                        }, 
                        1.0, 
                        0.0
                    ]
                }, 
                "countPorn" : { 
                    "$cond" : [
                        { 
                            "$or" : [
                                { 
                                    "$gt" : [
                                        "$countPorn", 
                                        0.0
                                    ]
                                }, 
                                { 
                                    "$gt" : [
                                        "$countSexy", 
                                        0.0
                                    ]
                                }
                            ]
                        }, 
                        1.0, 
                        0.0
                    ]
                }, 
                "countData" : 1.0, 
                "_id" : 0.0
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : "$timestamp", 
                "countRadicalism" : { 
                    "$sum" : "$countRadicalism"
                }, 
                "countHateful" : { 
                    "$sum" : "$countHateful"
                }, 
                "countPorn" : { 
                    "$sum" : "$countPorn"
                }, 
                "countTerorist" : { 
                    "$sum" : "$countTerorist"
                }, 
                "countData" : { 
                    "$sum" : "$countData"
                }
            }
        });

        agg.push({ 
            "$sort" : { 
                "timestamp" : 1.0
            }
        });

        mongo.getAggregateData(dbName, "tweet", agg, function(result) {
            cb(result);
        });
    }

    static async getFollowerCount(userId, cb){
        let agg = [];

        agg.push({ 
            "$match" : { 
                "_id" : userId
            }
        });

        agg.push({
            "$project" : {
                "_id" : 0,
                "followers_count" : 1
            }
        });

        mongo.getAggregateData(dbName, "profile", agg, function(result) {
            cb(result[0]);
        });
    }

    static async getInteraction(userId, cb){
        let agg = [];

        agg.push({ 
            "$match" : { 
                "user_id" : userId
            }
        });

        agg.push({ 
            "$project" : { 
                "_id" : 1.0, 
                "created_at" : 1.0, 
                "last_updated" : 1.0, 
                "in_reply_to_status_id" : 1.0, 
                "quoted_status_id" : 1.0, 
                "retweeted_status_id" : 1.0, 
                "media" : { 
                    "$cond" : [
                        { 
                            "$gt" : [
                                "$entities.media", 
                                null
                            ]
                        }, 
                        "$entities.media", 
                        [

                        ]
                    ]
                }
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
                "localField" : "media", 
                "foreignField" : "_id", 
                "as" : "classificationImage"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "let" : { 
                    "id" : "$_id", 
                    "last_updated" : "$last_updated"
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
                                            "$$last_updated"
                                        ]
                                    }, 
                                    { 
                                        "$eq" : [
                                            "$source", 
                                            "tweet"
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
                "path" : "$classificationImage", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationText", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$match" : { 
                "$or" : [
                    { 
                        "classificationText.advertisement" : { 
                            "$eq" : 1.0
                        }
                    }, 
                    { 
                        "classificationText.hoax" : { 
                            "$eq" : 1.0
                        }
                    }, 
                    { 
                        "classificationText.hateful" : { 
                            "$eq" : 1.0
                        }
                    }, 
                    { 
                        "classificationText.porn" : { 
                            "$eq" : 1.0
                        }
                    }, 
                    { 
                        "classificationText.propaganda" : { 
                            "$eq" : 1.0
                        }
                    }, 
                    { 
                        "classificationText.radicalism" : { 
                            "$eq" : 1.0
                        }
                    }, 
                    { 
                        "classificationText.sentiment" : { 
                            "$eq" : -1.0
                        }
                    }, 
                    { 
                        "classificationImage.hateful" : { 
                            "$eq" : 1.0
                        }
                    }, 
                    { 
                        "classificationImage.porn" : { 
                            "$eq" : 1.0
                        }
                    }, 
                    { 
                        "classificationImage.radicalism" : { 
                            "$eq" : 1.0
                        }
                    }, 
                    { 
                        "classificationImage.terrorism" : { 
                            "$eq" : 1.0
                        }
                    }
                ]
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : { 
                    "id" : "$_id", 
                    "hatefulText" : { 
                        "$cond" : { 
                            "if" : { 
                                "$eq" : [
                                    "$classificationText.hateful", 
                                    1.0
                                ]
                            }, 
                            "then" : "$classificationText.hateful", 
                            "else" : { 
                                "$cond" : { 
                                    "if" : { 
                                        "$eq" : [
                                            "classificationText.sentiment", 
                                            -1.0
                                        ]
                                    }, 
                                    "then" : 1.0, 
                                    "else" : 0.0
                                }
                            }
                        }
                    }, 
                    "pornText" : { 
                        "$cond" : { 
                            "if" : { 
                                "$eq" : [
                                    "$classificationText.porn", 
                                    1.0
                                ]
                            }, 
                            "then" : "$classificationText.porn", 
                            "else" : { 
                                "$cond" : { 
                                    "if" : { 
                                        "$eq" : [
                                            "classificationText.resultClassification.porn.result", 
                                            "sexy"
                                        ]
                                    }, 
                                    "then" : 1.0, 
                                    "else" : 0.0
                                }
                            }
                        }
                    }, 
                    "radicalismText" : { 
                        "$cond" : { 
                            "if" : { 
                                "$eq" : [
                                    "$classificationText.radicalism", 
                                    1.0
                                ]
                            }, 
                            "then" : "$classificationText.radicalism", 
                            "else" : { 
                                "$cond" : { 
                                    "if" : { 
                                        "$eq" : [
                                            "$classificationText.propaganda", 
                                            1.0
                                        ]
                                    }, 
                                    "then" : 1.0, 
                                    "else" : 0.0
                                }
                            }
                        }
                    }, 
                    "hatefulImage" : { 
                        "$cond" : [
                            { 
                                "$eq" : [
                                    "$classificationImage.hateful", 
                                    1.0
                                ]
                            }, 
                            "$classificationImage.hateful", 
                            0.0
                        ]
                    }, 
                    "pornImage" : { 
                        "$cond" : { 
                            "if" : { 
                                "$eq" : [
                                    "$classificationImage.porn", 
                                    1.0
                                ]
                            }, 
                            "then" : "$classificationImage.porn", 
                            "else" : { 
                                "$cond" : { 
                                    "if" : { 
                                        "$eq" : [
                                            "$classificationImage.resultClassification.porn.result", 
                                            "sexy"
                                        ]
                                    }, 
                                    "then" : 1.0, 
                                    "else" : 0.0
                                }
                            }
                        }
                    }, 
                    "radicalImage" : { 
                        "$cond" : [
                            { 
                                "$eq" : [
                                    "$classificationImage.radicalism", 
                                    1.0
                                ]
                            }, 
                            "$classificationImage.radicalism", 
                            0.0
                        ]
                    }, 
                    "teroristImage" : { 
                        "$cond" : [
                            { 
                                "$eq" : [
                                    "$classificationImage.terrorism", 
                                    1.0
                                ]
                            }, 
                            "$classificationImage.terrorism", 
                            0.0
                        ]
                    }
                }
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "tweet", 
                "let" : { 
                    "id" : "$_id.id"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$eq" : [
                                    "$in_reply_to_status_id", 
                                    "$$id"
                                ]
                            }
                        }
                    }, 
                    { 
                        "$lookup" : { 
                            "from" : "profile", 
                            "localField" : "user_id", 
                            "foreignField" : "_id", 
                            "as" : "detailProfile"
                        }
                    }, 
                    { 
                        "$unwind" : { 
                            "path" : "$detailProfile", 
                            "preserveNullAndEmptyArrays" : true
                        }
                    }, 
                    { 
                        "$project" : { 
                            "_id" : 0.0, 
                            "fullName" : "$detailProfile.name", 
                            "isPrivate" : "$detailProfile.protected", 
                            "isVerified" : "$detailProfile.verified", 
                            "profilePic" : "$detailProfile.profile_image_url", 
                            "username" : "$detailProfile.username", 
                            "reply" : { 
                                "$literal" : 1.0
                            }
                        }
                    }
                ], 
                "as" : "tweetReply"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "tweet", 
                "let" : { 
                    "id" : "$_id.id"
                }, 
                "pipeline" : [
                    { "$match": {"$expr": {"$eq": ["$tweet_id", "$$id"]}} },
			        {
			            "$lookup": {    
			                "from": "profile",
			                "localField": "user_id",
			                "foreignField": "_id",
			                "as": "detailProfile"
			            }
			        },
			        {
			            "$unwind": {
			                "path": "$detailProfile",
			                "preserveNullAndEmptyArrays": true
			            }
			        },
			        {
			            "$project": {
			                "_id": 0, "fullName": "$detailProfile.name", "isPrivate": "$detailProfile.protected", "isVerified": "$detailProfile.verified", "profilePic": "$detailProfile.profile_image_url", "username": "$detailProfile.username", "retweet": { "$literal": 1 }
			            }
			        }
                ], 
                "as" : "tweetRetweet"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "tweet", 
                "let" : { 
                    "id" : "$_id.id"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$eq" : [
                                    "$quoted_status_id", 
                                    "$$id"
                                ]
                            }
                        }
                    }, 
                    { 
                        "$lookup" : { 
                            "from" : "profile", 
                            "localField" : "user_id", 
                            "foreignField" : "_id", 
                            "as" : "detailProfile"
                        }
                    }, 
                    { 
                        "$unwind" : { 
                            "path" : "$detailProfile", 
                            "preserveNullAndEmptyArrays" : true
                        }
                    }, 
                    { 
                        "$project" : { 
                            "_id" : 0.0, 
                            "fullName" : "$detailProfile.name", 
                            "isPrivate" : "$detailProfile.protected", 
                            "isVerified" : "$detailProfile.verified", 
                            "profilePic" : "$detailProfile.profile_image_url", 
                            "username" : "$detailProfile.username", 
                            "quote" : { 
                                "$literal" : 1.0
                            }
                        }
                    }
                ], 
                "as" : "tweetQuote"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "favorites", 
                "let" : { 
                    "id" : "$_id"
                }, 
                "pipeline" : [
                    { "$match": {"$expr": {"$eq": ["$tweet_id", "$$id"]}} },
                    {
                        "$lookup": {    
                            "from": "profile",
                            "localField": "user_id",
                            "foreignField": "_id",
                            "as": "detailProfile"
                        }
                    },
                    {
                        "$unwind": {
                            "path": "$detailProfile",
                            "preserveNullAndEmptyArrays": true
                        }
                    },
                    {
                        "$project": {
                            "_id": 0, "fullName": "$detailProfile.name", "isPrivate": "$detailProfile.protected", "isVerified": "$detailProfile.verified", "profilePic": "$detailProfile.profile_image_url", "username": "$detailProfile.username", "retweet": { "$literal": 1 }
                        }
                    }
                ], 
                "as" : "tweetFavorite"
            }
        });

        agg.push({ 
            "$project" : { 
                "countReply" : "$tweetReply", 
                "countRetweet" : "$tweetRetweet", 
                "countQuote" : "$tweetQuote", 
                "countFavorite" : "$tweetFavorite"
            }
        });

        agg.push({ 
            "$project" : { 
                "_id" : "$_id", 
                "interactions" : { 
                    "$concatArrays" : [
                        "$countReply", 
                        "$countRetweet", 
                        "$countQuote", 
                        "$countFavorite"
                    ]
                }
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$interactions", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : "$_id", 
                "reply" : { 
                    "$sum" : { 
                        "$cond" : [
                            { 
                                "$ne" : [
                                    "$interactions.reply", 
                                    null
                                ]
                            }, 
                            "$interactions.reply", 
                            0.0
                        ]
                    }
                }, 
                "retweet" : { 
                    "$sum" : { 
                        "$cond" : [
                            { 
                                "$ne" : [
                                    "$interactions.retweet", 
                                    null
                                ]
                            }, 
                            "$interactions.retweet", 
                            0.0
                        ]
                    }
                }, 
                "quote" : { 
                    "$sum" : { 
                        "$cond" : [
                            { 
                                "$ne" : [
                                    "$interactions.quote", 
                                    null
                                ]
                            }, 
                            "$interactions.quote", 
                            0.0
                        ]
                    }
                }, 
                "favorite" : { 
                    "$sum" : { 
                        "$cond" : [
                            { 
                                "$ne" : [
                                    "$interactions.favorite", 
                                    null
                                ]
                            }, 
                            "$interactions.favorite", 
                            0.0
                        ]
                    }
                }, 
                "total" : { 
                    "$sum" : 1.0
                }
            }
        });

        agg.push({ 
            "$project" : { 
                "hatefulReply" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.hatefulText", 
                                0.0
                            ]
                        }, 
                        "then" : "$reply", 
                        "else" : { 
                            "$cond" : { 
                                "if" : { 
                                    "$gt" : [
                                        "$_id.hatefulImage", 
                                        0.0
                                    ]
                                }, 
                                "then" : "$reply", 
                                "else" : 0.0
                            }
                        }
                    }
                }, 
                "hatefulRetweet" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.hatefulText", 
                                0.0
                            ]
                        }, 
                        "then" : "$retweet", 
                        "else" : { 
                            "$cond" : { 
                                "if" : { 
                                    "$gt" : [
                                        "$_id.hatefulImage", 
                                        0.0
                                    ]
                                }, 
                                "then" : "$retweet", 
                                "else" : 0.0
                            }
                        }
                    }
                }, 
                "hatefulQuote" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.hatefulText", 
                                0.0
                            ]
                        }, 
                        "then" : "$quote", 
                        "else" : { 
                            "$cond" : { 
                                "if" : { 
                                    "$gt" : [
                                        "$_id.hatefulImage", 
                                        0.0
                                    ]
                                }, 
                                "then" : "$quote", 
                                "else" : 0.0
                            }
                        }
                    }
                }, 
                "hatefulFavorite" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.hatefulText", 
                                0.0
                            ]
                        }, 
                        "then" : "$favorite", 
                        "else" : { 
                            "$cond" : { 
                                "if" : { 
                                    "$gt" : [
                                        "$_id.hatefulImage", 
                                        0.0
                                    ]
                                }, 
                                "then" : "$favorite", 
                                "else" : 0.0
                            }
                        }
                    }
                }, 
                "pornReply" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.pornText", 
                                0.0
                            ]
                        }, 
                        "then" : "$reply", 
                        "else" : { 
                            "$cond" : { 
                                "if" : { 
                                    "$gt" : [
                                        "$_id.pornImage", 
                                        0.0
                                    ]
                                }, 
                                "then" : "$reply", 
                                "else" : 0.0
                            }
                        }
                    }
                }, 
                "pornRetweet" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.pornText", 
                                0.0
                            ]
                        }, 
                        "then" : "$retweet", 
                        "else" : { 
                            "$cond" : { 
                                "if" : { 
                                    "$gt" : [
                                        "$_id.pornImage", 
                                        0.0
                                    ]
                                }, 
                                "then" : "$retweet", 
                                "else" : 0.0
                            }
                        }
                    }
                }, 
                "pornQuote" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.pornText", 
                                0.0
                            ]
                        }, 
                        "then" : "$quote", 
                        "else" : { 
                            "$cond" : { 
                                "if" : { 
                                    "$gt" : [
                                        "$_id.pornImage", 
                                        0.0
                                    ]
                                }, 
                                "then" : "$quote", 
                                "else" : 0.0
                            }
                        }
                    }
                }, 
                "pornFavorite" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.pornText", 
                                0.0
                            ]
                        }, 
                        "then" : "$favorite", 
                        "else" : { 
                            "$cond" : { 
                                "if" : { 
                                    "$gt" : [
                                        "$_id.pornImage", 
                                        0.0
                                    ]
                                }, 
                                "then" : "$favorite", 
                                "else" : 0.0
                            }
                        }
                    }
                }, 
                "radicalReply" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.radicalismText", 
                                0.0
                            ]
                        }, 
                        "then" : "$reply", 
                        "else" : { 
                            "$cond" : { 
                                "if" : { 
                                    "$gt" : [
                                        "$_id.radicalImage", 
                                        0.0
                                    ]
                                }, 
                                "then" : "$reply", 
                                "else" : 0.0
                            }
                        }
                    }
                }, 
                "radicalRetweet" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.radicalismText", 
                                0.0
                            ]
                        }, 
                        "then" : "$retweet", 
                        "else" : { 
                            "$cond" : { 
                                "if" : { 
                                    "$gt" : [
                                        "$_id.radicalImage", 
                                        0.0
                                    ]
                                }, 
                                "then" : "$retweet", 
                                "else" : 0.0
                            }
                        }
                    }
                }, 
                "radicalQuote" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.radicalismText", 
                                0.0
                            ]
                        }, 
                        "then" : "$quote", 
                        "else" : { 
                            "$cond" : { 
                                "if" : { 
                                    "$gt" : [
                                        "$_id.radicalImage", 
                                        0.0
                                    ]
                                }, 
                                "then" : "$quote", 
                                "else" : 0.0
                            }
                        }
                    }
                }, 
                "radicalFavorite" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.radicalismText", 
                                0.0
                            ]
                        }, 
                        "then" : "$favorite", 
                        "else" : { 
                            "$cond" : { 
                                "if" : { 
                                    "$gt" : [
                                        "$_id.radicalImage", 
                                        0.0
                                    ]
                                }, 
                                "then" : "$favorite", 
                                "else" : 0.0
                            }
                        }
                    }
                }, 
                "teroristReply" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.teroristImage", 
                                0.0
                            ]
                        }, 
                        "then" : "$reply", 
                        "else" : 0.0
                    }
                }, 
                "teroristQuote" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.teroristImage", 
                                0.0
                            ]
                        }, 
                        "then" : "$quote", 
                        "else" : 0.0
                    }
                }, 
                "teroristFavorite" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.teroristImage", 
                                0.0
                            ]
                        }, 
                        "then" : "$favorite", 
                        "else" : 0.0
                    }
                }, 
                "teroristRetweet" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.teroristImage", 
                                0.0
                            ]
                        }, 
                        "then" : "$retweet", 
                        "else" : 0.0
                    }
                }
            }
        });

        agg.push({ 
            "$project" : { 
                "_id" : "$_id.id", 
                "interactionHateful" : { 
                    "$add" : [
                        "$hatefulReply", 
                        "$hatefulRetweet", 
                        "$hatefulQuote", 
                        "$hatefulFavorite"
                    ]
                }, 
                "interactionPorn" : { 
                    "$add" : [
                        "$pornReply", 
                        "$pornRetweet", 
                        "$pornQuote", 
                        "$pornFavorite"
                    ]
                }, 
                "interactionRadical" : { 
                    "$add" : [
                        "$radicalReply", 
                        "$radicalRetweet", 
                        "$radicalQuote", 
                        "$radicalFavorite"
                    ]
                }, 
                "interactionTerorist" : { 
                    "$add" : [
                        "$teroristReply", 
                        "$teroristQuote", 
                        "$teroristFavorite", 
                        "$teroristRetweet"
                    ]
                }
            }
        });

        mongo.getAggregateData(dbName, "tweet", agg, function(result) {
            cb(result);
        });
    }
    
}

module.exports = ScoringModel;