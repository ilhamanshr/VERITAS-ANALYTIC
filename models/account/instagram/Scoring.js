const moment        = require('moment');
const path          = require('path');
const BASE_DIR      = path.dirname(require.main.filename);
const mongo 	    = require(BASE_DIR + '/libraries/MongoDriver');
const utils         = require(BASE_DIR + '/Utils');
const dbName        = process.env.DB_NAME_IG;

class ScoringModel {
    static async getTextScoring(userId, cb){
        let agg = [];
        
        agg.push({ 
            "$match" : { 
                "ownerId" : userId
            }
        });

        agg.push({ 
            "$project" : { 
                "ownerId" : 1.0, 
                "source" : "targetPost"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "targetComment", 
                "let" : { 
                    "id" : "$_id", 
                    "ownerId" : "$ownerId"
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
                                    }, 
                                    { 
                                        "$eq" : [
                                            "$owner.id", 
                                            "$$ownerId"
                                        ]
                                    }
                                ]
                            }
                        }
                    }, 
                    { 
                        "$project" : { 
                            "_id" : 1.0, 
                            "source" : "targetComment"
                        }
                    }
                ], 
                "as" : "targetComment"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "targetSubComment", 
                "let" : { 
                    "id" : "$_id", 
                    "ownerId" : "$ownerId"
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
                                    }, 
                                    { 
                                        "$eq" : [
                                            "$owner.id", 
                                            "$$ownerId"
                                        ]
                                    }
                                ]
                            }
                        }
                    }, 
                    { 
                        "$project" : { 
                            "_id" : 1.0, 
                            "source" : "targetSubComment"
                        }
                    }
                ], 
                "as" : "targetSubComment"
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : "$_id", 
                "targetPost" : { 
                    "$push" : { 
                        "_id" : "$_id", 
                        "source" : "$source"
                    }
                }, 
                "targetComment" : { 
                    "$first" : "$targetComment"
                }, 
                "targetSubComment" : { 
                    "$first" : "$targetSubComment"
                }
            }
        });

        agg.push({ 
            "$project" : { 
                "target" : { 
                    "$concatArrays" : [
                        "$targetPost", 
                        "$targetComment", 
                        "$targetSubComment"
                    ]
                }
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$target",
                "preserveNullAndEmptyArrays": true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "let" : { 
                    "id" : "$target._id", 
                    "source" : "$target.source"
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
                                            "$$source"
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
                "path" : "$classificationText",
                "preserveNullAndEmptyArrays": true
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
        
        mongo.getAggregateData(dbName, "targetPost", agg, function(result) {
            cb(result[0]);
        });
    }

    static async getImageScoring(userId, cb){
        let agg = [];
        
        agg.push({ 
            "$match" : { 
                "ownerId" : userId
            }
        });

        agg.push({ 
            "$project" : { 
                "ownerId" : 1.0, 
                "postId" : 1.0, 
                "source" : "targetPost"
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
                    }, 
                    { 
                        "$project" : { 
                            "_id" : 1.0, 
                            "source" : "targetPostContent"
                        }
                    }
                ], 
                "as" : "targetPostContent"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "targetStory", 
                "let" : { 
                    "ownerId" : "$ownerId"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$and" : [
                                    { 
                                        "$eq" : [
                                            "$ownerId", 
                                            "$$ownerId"
                                        ]
                                    }
                                ]
                            }
                        }
                    }, 
                    { 
                        "$project" : { 
                            "_id" : 1.0, 
                            "source" : "targetStory"
                        }
                    }
                ], 
                "as" : "targetStory"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "contacts", 
                "let" : { 
                    "ownerId" : "$ownerId"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$and" : [
                                    { 
                                        "$eq" : [
                                            "$_id", 
                                            "$$ownerId"
                                        ]
                                    }
                                ]
                            }
                        }
                    }, 
                    { 
                        "$project" : { 
                            "_id" : 1.0, 
                            "source" : "contacts"
                        }
                    }
                ], 
                "as" : "contacts"
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : "$_id", 
                "targetPostContent" : { 
                    "$first" : "$targetPostContent"
                }, 
                "targetStory" : { 
                    "$first" : "$targetStory"
                }, 
                "contacts" : { 
                    "$first" : "$contacts"
                }
            }
        });

        agg.push({ 
            "$project" : { 
                "target" : { 
                    "$setUnion" : [
                        "$targetPostContent", 
                        "$targetStory", 
                        "$contacts"
                    ]
                }
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$target",
                "preserveNullAndEmptyArrays": true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationImage", 
                "let" : { 
                    "id" : "$target._id", 
                    "source" : "$target.source"
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
                                            "$$source"
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

        mongo.getAggregateData(dbName, "targetPost", agg, function(result) {
            cb(result[0]);
        });
    }

    static async getTextDailyPost(userId, cb){
        let agg = [];
        
        agg.push({ 
            "$match" : { 
                "ownerId" : userId
            }
        });

        agg.push({ 
            "$project" : { 
                "ownerId" : 1.0, 
                "source" : "targetPost", 
                "timestamp" : 1.0
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "targetComment", 
                "let" : { 
                    "id" : "$_id", 
                    "ownerId" : "$ownerId"
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
                                    }, 
                                    { 
                                        "$eq" : [
                                            "$owner.id", 
                                            "$$ownerId"
                                        ]
                                    }
                                ]
                            }
                        }
                    }, 
                    { 
                        "$project" : { 
                            "_id" : 1.0, 
                            "source" : "targetComment"
                        }
                    }
                ], 
                "as" : "targetComment"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "targetSubComment", 
                "let" : { 
                    "id" : "$_id", 
                    "ownerId" : "$ownerId"
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
                                    }, 
                                    { 
                                        "$eq" : [
                                            "$owner.id", 
                                            "$$ownerId"
                                        ]
                                    }
                                ]
                            }
                        }
                    }, 
                    { 
                        "$project" : { 
                            "_id" : 1.0, 
                            "source" : "targetSubComment"
                        }
                    }
                ], 
                "as" : "targetSubComment"
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : { 
                    "timestamp" : { 
                        "$dateToString" : { 
                            "format" : "%Y-%m-%d", 
                            "date" : "$timestamp"
                        }
                    }, 
                    "hour" : { 
                        "$hour" : "$timestamp"
                    }, 
                    "minutes" : { 
                        "$minute" : "$timestamp"
                    }, 
                    "_id" : "$_id"
                }, 
                "targetPost" : { 
                    "$push" : { 
                        "_id" : "$_id", 
                        "source" : "$source"
                    }
                }, 
                "targetComment" : { 
                    "$first" : "$targetComment"
                }, 
                "targetSubComment" : { 
                    "$first" : "$targetSubComment"
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
            "$project" : { 
                "target" : { 
                    "$concatArrays" : [
                        "$targetPost", 
                        "$targetComment", 
                        "$targetSubComment"
                    ]
                }
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$target",
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "let" : { 
                    "id" : "$target._id", 
                    "source" : "$target.source"
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
                                            "$$source"
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
                "path" : "$classificationText",
                "preserveNullAndEmptyArrays": true
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

        agg.push({ 
            "$sort" : { 
                "timestamp" : 1.0
            }
        });

        mongo.getAggregateData(dbName, "targetPost", agg, function(result) {
            cb(result);
        });
    }

    static async getImageDailyPost(userId, cb){
        let agg = [];

        agg.push({ 
            "$match" : { 
                "ownerId" : userId
            }
        });

        agg.push({ 
            "$project" : { 
                "ownerId" : 1.0, 
                "postId" : 1.0, 
                "source" : "targetPost", 
                "timestamp" : 1.0
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
                    }, 
                    { 
                        "$project" : { 
                            "_id" : 1.0, 
                            "source" : "targetPostContent"
                        }
                    }
                ], 
                "as" : "targetPostContent"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "targetStory", 
                "let" : { 
                    "ownerId" : "$ownerId"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$and" : [
                                    { 
                                        "$eq" : [
                                            "$ownerId", 
                                            "$$ownerId"
                                        ]
                                    }
                                ]
                            }
                        }
                    }, 
                    { 
                        "$project" : { 
                            "_id" : 1.0, 
                            "source" : "targetStory"
                        }
                    }
                ], 
                "as" : "targetStory"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "contacts", 
                "let" : { 
                    "ownerId" : "$ownerId"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$and" : [
                                    { 
                                        "$eq" : [
                                            "$_id", 
                                            "$$ownerId"
                                        ]
                                    }
                                ]
                            }
                        }
                    }, 
                    { 
                        "$project" : { 
                            "_id" : 1.0, 
                            "source" : "contacts"
                        }
                    }
                ], 
                "as" : "contacts"
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : { 
                    "timestamp" : { 
                        "$dateToString" : { 
                            "format" : "%Y-%m-%d", 
                            "date" : "$timestamp"
                        }
                    }, 
                    "hour" : { 
                        "$hour" : "$timestamp"
                    }, 
                    "minutes" : { 
                        "$minute" : "$timestamp"
                    }, 
                    "_id" : "$_id"
                }, 
                "targetPostContent" : { 
                    "$first" : "$targetPostContent"
                }, 
                "targetStory" : { 
                    "$first" : "$targetStory"
                }, 
                "contacts" : { 
                    "$first" : "$contacts"
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
            "$project" : { 
                "target" : { 
                    "$setUnion" : [
                        "$targetPostContent", 
                        "$targetStory", 
                        "$contacts"
                    ]
                }
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$target",
                "preserveNullAndEmptyArrays": true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationImage", 
                "let" : { 
                    "id" : "$target._id", 
                    "source" : "$target.source"
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
                                            "$$source"
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
        //         "countTerorist" : { 
        //             "$sum" : "$countTerorist"
        //         }, 
        //         "countData" : { 
        //             "$sum" : "$countData"
        //         }
        //     }
        // });

        agg.push({ 
            "$sort" : { 
                "timestamp" : 1.0
            }
        });

        mongo.getAggregateData(dbName, "targetPost", agg, function(result) {
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
                "followerCount" : 1
            }
        });

        mongo.getAggregateData(dbName, "contacts", agg, function(result) {
            cb(result[0]);
        });
    }

    static async getInteraction(userId, cb){
        let agg = [];

        agg.push({ 
            "$match" : { 
                "ownerId" : userId
            }
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
                "path" : "$detailImages"
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
                "path" : "$classificationImage"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationText"
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
                    "hatefulImage" : "$classificationImage.hateful", 
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
                    "radicalImage" : "$classificationImage.radicalism", 
                    "teroristImage" : "$classificationImage.terrorism"
                }, 
                "postId" : { 
                    "$first" : "$postId"
                }
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "targetLike", 
                "let" : { 
                    "id" : "$_id.id"
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
                            "_id" : 0.0, 
                            "fullName" : 1.0, 
                            "isPrivate" : 1.0, 
                            "isVerified" : 1.0, 
                            "profilePic" : 1.0, 
                            "username" : 1.0, 
                            "like" : { 
                                "$literal" : 1.0
                            }
                        }
                    }
                ], 
                "as" : "targetLike"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "targetComment", 
                "let" : { 
                    "id" : "$_id.id"
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
                            "_id" : 0.0, 
                            "fullName" : "", 
                            "isPrivate" : "", 
                            "isVerified" : "$owner.isVerified", 
                            "profilePic" : "$owner.profilePic", 
                            "username" : "$owner.username"
                        }
                    }, 
                    { 
                        "$lookup" : { 
                            "from" : "contacts", 
                            "localField" : "username", 
                            "foreignField" : "username", 
                            "as" : "contact"
                        }
                    }, 
                    { 
                        "$project" : { 
                            "fullName" : { 
                                "$ifNull" : [
                                    { 
                                        "$arrayElemAt" : [
                                            "$contact.fullName", 
                                            0.0
                                        ]
                                    }, 
                                    ""
                                ]
                            }, 
                            "isPrivate" : { 
                                "$ifNull" : [
                                    { 
                                        "$arrayElemAt" : [
                                            "$contact.isPrivate", 
                                            0.0
                                        ]
                                    }, 
                                    ""
                                ]
                            }, 
                            "isVerified" : 1.0, 
                            "profilePic" : 1.0, 
                            "username" : 1.0, 
                            "comment" : { 
                                "$literal" : 1.0
                            }
                        }
                    }
                ], 
                "as" : "targetComment"
            }
        });

        agg.push({ 
            "$project" : { 
                "postId" : 1.0, 
                "interactions" : { 
                    "$concatArrays" : [
                        "$targetLike", 
                        "$targetComment"
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
                "like" : { 
                    "$sum" : { 
                        "$cond" : [
                            { 
                                "$ne" : [
                                    "$interactions.like", 
                                    null
                                ]
                            }, 
                            "$interactions.like", 
                            0.0
                        ]
                    }
                }, 
                "comment" : { 
                    "$sum" : { 
                        "$cond" : [
                            { 
                                "$ne" : [
                                    "$interactions.comment", 
                                    null
                                ]
                            }, 
                            "$interactions.comment", 
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
                "hatefulLike" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.hatefulText", 
                                0.0
                            ]
                        }, 
                        "then" : "$like", 
                        "else" : { 
                            "$cond" : { 
                                "if" : { 
                                    "$gt" : [
                                        "$_id.hatefulImage", 
                                        0.0
                                    ]
                                }, 
                                "then" : "$like", 
                                "else" : 0.0
                            }
                        }
                    }
                }, 
                "hatefulComment" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.hatefulText", 
                                0.0
                            ]
                        }, 
                        "then" : "$comment", 
                        "else" : { 
                            "$cond" : { 
                                "if" : { 
                                    "$gt" : [
                                        "$_id.hatefulImage", 
                                        0.0
                                    ]
                                }, 
                                "then" : "$comment", 
                                "else" : 0.0
                            }
                        }
                    }
                }, 
                "pornLike" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.pornText", 
                                0.0
                            ]
                        }, 
                        "then" : "$like", 
                        "else" : { 
                            "$cond" : { 
                                "if" : { 
                                    "$gt" : [
                                        "$_id.pornImage", 
                                        0.0
                                    ]
                                }, 
                                "then" : "$like", 
                                "else" : 0.0
                            }
                        }
                    }
                }, 
                "pornComment" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.pornText", 
                                0.0
                            ]
                        }, 
                        "then" : "$comment", 
                        "else" : { 
                            "$cond" : { 
                                "if" : { 
                                    "$gt" : [
                                        "$_id.pornImage", 
                                        0.0
                                    ]
                                }, 
                                "then" : "$comment", 
                                "else" : 0.0
                            }
                        }
                    }
                }, 
                "radicalLike" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.radicalText", 
                                0.0
                            ]
                        }, 
                        "then" : "$like", 
                        "else" : { 
                            "$cond" : { 
                                "if" : { 
                                    "$gt" : [
                                        "$_id.radicalImage", 
                                        0.0
                                    ]
                                }, 
                                "then" : "$like", 
                                "else" : 0.0
                            }
                        }
                    }
                }, 
                "radicalComment" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.radicalText", 
                                0.0
                            ]
                        }, 
                        "then" : "$comment", 
                        "else" : { 
                            "$cond" : { 
                                "if" : { 
                                    "$gt" : [
                                        "$_id.radicalImage", 
                                        0.0
                                    ]
                                }, 
                                "then" : "$comment", 
                                "else" : 0.0
                            }
                        }
                    }
                }, 
                "teroristLike" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.teroristImage", 
                                0.0
                            ]
                        }, 
                        "then" : "$like", 
                        "else" : 0.0
                    }
                }, 
                "teroristComment" : { 
                    "$cond" : { 
                        "if" : { 
                            "$gt" : [
                                "$_id.teroristImage", 
                                0.0
                            ]
                        }, 
                        "then" : "$comment", 
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
                        "$hatefulLike", 
                        "$hatefulComment"
                    ]
                }, 
                "interactionPorn" : { 
                    "$add" : [
                        "$pornLike", 
                        "$pornComment"
                    ]
                }, 
                "interactionRadical" : { 
                    "$add" : [
                        "$radicalLike", 
                        "$radicalComment"
                    ]
                }, 
                "interactionTerorist" : { 
                    "$add" : [
                        "$teroristLike", 
                        "$teroristComment"
                    ]
                }
            }
        });

        mongo.getAggregateData(dbName, "targetPost", agg, function(result) {
            cb(result);
        });
    }
    
}

module.exports = ScoringModel;