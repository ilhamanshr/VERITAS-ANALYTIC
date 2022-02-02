const path              = require('path');
const BASE_DIR          = path.dirname(require.main.filename);
const utils             = require(BASE_DIR + '/Utils');
const msg               = require(BASE_DIR + '/Messages');
const modelLeakage      = require(BASE_DIR + '/models/Leakage');
const modelInfo         = require(BASE_DIR + '/models/target/Info');
const modelAnalytic     = require(BASE_DIR + '/models/target/Analytic');
const modelIdentity     = require(BASE_DIR + '/models/target/Identity');
const modelGeofence     = require(BASE_DIR + '/models/target/Geofence');
const modelScoring      = require(BASE_DIR + '/models/Scoring');

class AnalyticTargetController {

    static async getTendenciesTargetAnalytic(req, res){
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticTarget", "subAction": "getTendenciesTargetAnalytic", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "targetId": "0ZqwKQwwZ06YZzQvfLYMDTBoOnsQJSuv"} }'

        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["targetId"];

        utils.checkParameter(req, res, required, function() {

            modelInfo.targetSocmedDetail(req.body, function(resInfo) {
                if (resInfo && resInfo.length > 0) {
                    modelAnalytic.getTendenciesAnalysis(req.body, resInfo[0].socmed, function(resAnalytic) {
                        response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

                        if(resAnalytic && resAnalytic.length > 0){
                            let countRad = 0;
                            let countHateful = 0;
                            let countPorn = 0;
                            let countTerrorism = 0;
                            let countLgbt = 0;

                            //post count
                            resAnalytic.forEach(element => {
                                countRad += element.predict.radicalism
                                countHateful += element.predict.hateful
                                countPorn += element.predict.porn
                                countLgbt += element.predict.lgbt
                                
                                //comment count
                                element.rawdata_comment.forEach(element => {
                                    countRad += element.radicalism
                                    countHateful += element.hateful
                                    countPorn += element.porn
                                    countLgbt += element.lgbt
                                });

                                //sub comment count
                                element.rawdata_subComment.forEach(element => {
                                    countRad += element.radicalism
                                    countHateful += element.hateful
                                    countPorn += element.porn
                                    countLgbt += element.lgbt
                                });

                                //story count
                                element.rawdata_story.forEach(element => {
                                    countRad += element.radicalism
                                    countHateful += element.hateful
                                    countPorn += element.porn
                                    countTerrorism += element.terrorism
                                    countLgbt += element.lgbt
                                });

                                //quote count
                                element.rawdata_quote.forEach(element => {
                                    countRad += element.radicalism
                                    countRad += element.imgRadicalism
                                    countHateful += element.hateful
                                    countHateful += element.imgHateful
                                    countPorn += element.porn
                                    countPorn += element.imgPorn
                                    countTerrorism += element.imgTerrorism
                                    countLgbt += element.lgbt
                                    countLgbt += element.imgLgbt
                                });

                                //reply count
                                element.rawdata_reply.forEach(element => {
                                    countRad += element.radicalism
                                    countRad += element.imgRadicalism
                                    countHateful += element.hateful
                                    countHateful += element.imgHateful
                                    countPorn += element.porn
                                    countPorn += element.imgPorn
                                    countTerrorism += element.imgTerrorism
                                    countLgbt += element.lgbt
                                    countLgbt += element.imgLgbt
                                });
                            });

                            let content = {
                                "series" : [{"name":"Predict Count", "data":[countRad,countHateful,countPorn,countTerrorism,countLgbt]}],
                                "categories": ["Radicalism","Hateful","Porn","Terorism","LGBT"]
                            };

                            response["message"] = "Get data tendencies analytic success";
                            response["content"] = content;
                            
                            utils.setResponse(req, res, response);
                        } else{
                            response["message"] = "Target tendencies analytic not valid";
                            utils.setResponse(req, res, response);
                        }
                    });
                } else {
                    response["message"] = "Target tendencies analytic not valid";
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static async getScoringTargetAnalytic(req, res) {
        //curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticTarget", "subAction": "getScoringTargetAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "targetId":"0ZqwKQwwZ06YZzQvfLYMDTBoOnsQJSuv" } }'
        
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["targetId"];

        utils.checkParameter(req, res, required, function() {
            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
            
            modelInfo.targetSocmedDetail(req.body, function(resTarget){
                if(resTarget && resTarget.length > 0){
                    let userId = [];
                    if(resTarget[0].socmed.length && resTarget[0].socmed.length > 0){
                        resTarget[0].socmed.forEach(element => {
                            userId.push(element.id);
                        })
                    }
                    req.body.params["userId"] = userId;
                    
                    modelScoring.getScoringTarget(req.body, function(result) {
                        response["message"] = (result && Object.keys(result).length > 0) ? "Categorization scoring success" : "Categorization scoring is still in progress";
        
                        if(result){
                            response["content"]["scoring"] = {
                                "Radicalism":result.Radicalism,
                                "Hateful":result.Hateful,
                                "Porn":result.Porn,
                                "Terrorism":result.Terrorism,
                                "LGBT":result.LGBT,
                            };
        
                            response["content"]["tooltip"] = {
                                "Radicalism" : {
                                    "textScoring" : result.RadicalismtextScoring, 
                                    "imgScoring" : result.RadicalismimgScoring, 
                                    "daily" : result.RadicalismdailyPostScoring,
                                    "interaction" : result.RadicalisminteractionScoring
                                }, 
                                "Hateful" : {
                                    "textScoring" : result.HatefultextScoring, 
                                    "imgScoring" : result.HatefulimgScoring, 
                                    "daily" : result.HatefuldailyPostScoring,
                                    "interaction" : result.HatefulinteractionScoring
                                }, 
                                "Porn" : {
                                    "textScoring" : result.PorntextScoring, 
                                    "imgScoring" : result.PornimgScoring, 
                                    "daily" : result.PorndailyPostScoring,
                                    "interaction" : result.PorninteractionScoring
                                }, 
                                "Terrorism" : {
                                    "textScoring" : result.TerrorismtextScoring, 
                                    "imgScoring" : result.TerrorismimgScoring, 
                                    "daily" : result.TerrorismdailyPostScoring,
                                    "interaction" : result.TerrorisminteractionScoring
                                }, 
                                "LGBT" : {
                                    "textScoring" : result.LGBTtextScoring,
                                    "imgScoring" : result.LGBTimgScoring,
                                    "daily" : result.LGBTdailyPostScoring,
                                    "interaction" : result.LGBTinteractionScoring
                                }
                            }

                            response["content"]["reason"] = result.Reason;
                        } else{
                            response["content"] = null;
                        }
                        utils.setResponse(req, res, response);
                    });
                } else{
                    response["content"] = null;
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static async getIdentityList(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticTarget", "subAction": "getIdentityList", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": {"targetId":"0ZqwKQwwZ06YZzQvfLYMDTBoOnsQJSuv"}}'

        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["targetId"];

        utils.checkParameter(req, res, required, function() {
            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
            response["message"] = "Get identity list success";
            modelIdentity.getNikList(req.body, function(resList) {
                if (resList && resList.length > 0) {
                    if (resList[0]._id = null) {
                        response["content"] = [];
                    } else{
                        response["content"] = resList;
                    }
                        
                    utils.setResponse(req, res, response);
                } else {
                    
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static async getIdentityDetail(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticTarget", "subAction": "getIdentityDetail", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "targetId": "0ZqwKQwwZ06YZzQvfLYMDTBoOnsQJSuv", "nik":"3276070704990004" } }'

        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["targetId", "nik"];

        utils.checkParameter(req, res, required, function() {

            modelIdentity.getIdentityDetail(req.body, function(resList) {
                if (resList && resList.length > 0) {
                    response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                    response["message"] = "Get identity detail success";
                    response["content"] = utils.formatKtp(resList[0]);
                        
                    utils.setResponse(req, res, response);
                } else {
                    response["message"] = "Failed get identity detail";
                    response["content"] = null;
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static async getDataLeakage(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticTarget", "subAction": "getDataLeakage", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "accounts": [{ "username": "farizstuff", "source": "instagram" }, { "username": "farizstuff", "source": "twitter" }, { "username": "irvanseptiar", "source": "instagram" }] } }'
        
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["accounts", "targetId"];

        utils.checkParameter(req, res, required, function() {
            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
            
            if (req.body.params.accounts.length) {
                modelLeakage.getDataLeakageMulti(req.body, function(result) {
                    let content = {
                        "accounts": [],
                        "educations": [],
                        "emails": [],
                        "jobs": [],
                        "phones": [],
                        "socialMedia": []
                    }
                    
                    if (result && result.length) {
                        Array.from(result).forEach(function(val, ind) {
                            Array.from(val.accounts).forEach(function(v, i) {
                                if (! content.accounts.some(acc => acc.source + acc.username === v.source + v.username)) content.accounts.push(v);
                            });
                            Array.from(val.educations).forEach(function(v, i) {
                                if (! content.educations.includes(v)) content.educations.push(v);
                            });
                            Array.from(val.emails).forEach(function(v, i) {
                                if (! content.emails.includes(v)) content.emails.push(v);
                            });
                            Array.from(val.jobs).forEach(function(v, i) {
                                if (! content.jobs.includes(v)) content.jobs.push(v);
                            });
                            Array.from(val.phones).forEach(function(v, i) {
                                if (! content.phones.includes(v)) content.phones.push(v);
                            });
                            Array.from(val.socialMedia).forEach(function(v, i) {
                                if (! content.socialMedia.some(socmed => socmed.msisdn === v.msisdn)) content.socialMedia.push(v);
                            });
                        });

                        response["message"] = "Get data leakage success";
                    } else {
                        response["message"] = "Data leakage not available";
                    }
                    
                    response["content"] = content;
                    
                    utils.setResponse(req, res, response);
                });
            } else {
                response["message"] = "Invalid request parameter";
                utils.setResponse(req, res, response);
            }
        });
    }
    
    static async getTimeFrame(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticTarget", "subAction": "getTimeFrame", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "targetId": "0ZqwKQwwZ06YZzQvfLYMDTBoOnsQJSuv",  "dateFrom": "2010-01-01", "dateUntil": "2021-12-31"} }'

        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["targetId", "dateFrom", "dateUntil"];

        utils.checkParameter(req, res, required, function() {

            modelInfo.targetSocmedDetail(req.body, function(resInfo) {
                if (resInfo && resInfo.length > 0) {
                    modelAnalytic.getTimeFrame(req.body, resInfo[0].socmed, function(resAnalytic) {
                        response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                        
                        let content = {
                            "categories": [],
                            "forecast": false,
                            "series": [
                                {"name": "Post Count", "data": []},
                                {"name": "Interaction Count", "data": []},
                                {"name": "Engagement Rate Count", "data": []},
                            ]
                        };

                        if (resAnalytic && resAnalytic.length > 0) {
                            content["categories"] = resAnalytic[0].date;
                            content["series"][0]["data"] = resAnalytic[0].postCount;
                            content["series"][1]["data"] = resAnalytic[0].interaction;
                            content["series"][2]["data"] = resAnalytic[0].engagement;
                            response["message"] = "Get data time frame success";
                        } else {
                            response["message"] = "Data time frame not available";
                        }

                        response["content"] = content;
                        
                        utils.setResponse(req, res, response);
                    });
                } else {
                    response["message"] = "Target social media not valid";
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static async getContentDistribution(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticTarget", "subAction": "getContentDistribution", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "targetId": "0ZqwKQwwZ06YZzQvfLYMDTBoOnsQJSuv",  "dateFrom": "2010-01-01", "dateUntil": "2021-12-31"} }'

        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["targetId", "dateFrom", "dateUntil"];

        utils.checkParameter(req, res, required, function() {
            modelInfo.targetSocmedDetail(req.body, function(resInfo) {
                if (resInfo && resInfo.length > 0) { 
                    modelAnalytic.getContentDistribution(req.body, resInfo[0].socmed, function(resAnalytic) {
                        response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                        let content = {
                            "categories": [],
                            "series": [
                                {"name": "Safe Count", "data": []},
                                {"name": "Negative Count", "data": []},
                            ]
                        };

                        if (resAnalytic && resAnalytic.length > 0) {
                            content["categories"] = resAnalytic[0].date;
                            content["series"][0]["data"] = resAnalytic[0].positive;
                            content["series"][1]["data"] = resAnalytic[0].negative;
                            response["message"] = "Get data content distribution success";
                        } else {
                            response["message"] = "Data content distribution not available";
                        }

                        response["content"] = content;
                        
                        utils.setResponse(req, res, response);
                    });
                } else {
                    response["message"] = "Target social media not valid";
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static async getFriendsAnalysis(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticTarget", "subAction": "getFriendsAnalysis", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "targetId": "0ZqwKQwwZ06YZzQvfLYMDTBoOnsQJSuv",  "dateFrom": "2010-01-01", "dateUntil": "2021-12-31", "limit": 10} }'

        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["targetId", "dateFrom", "dateUntil", "limit"];

        utils.checkParameter(req, res, required, function() {
            modelInfo.targetSocmedDetail(req.body, function(resInfo) {
                if (resInfo && resInfo.length > 0) { 
                    modelAnalytic.getFriendBaseAnalysis(req.body, resInfo[0].socmed, function(resAnalytic) {
                        response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                        let limitDocs = [];
                        let userClassification = [];
                        let content = {
                            "data": [],
                            "name": "Friends Analytic Count",
                            "series": [
                                { "id": "Radicalism [T]", "colorIndex": 0},
                                { "id": "Hateful [T]", "colorIndex": 1},
                                { "id": "Porn [T]", "colorIndex": 2},
                                { "id": "Terrorism [T]", "colorIndex": 3},
                                { "id": "LGBT [T]", "colorIndex": 4},
                            ],
                            "type": "sankey"
                        };

                        if (resAnalytic && resAnalytic.length > 0) {
                            resAnalytic.forEach(element => {

                                let targetUser = userClassification.find(o => (o.username === `${element.username} [${element.source}]`));
                                let limit = limitDocs.filter(i => (i.username === element.username && i.source === element.source)).length;

                                if (!targetUser) {
                                    userClassification.push({
                                        "username": `${element.username} [${element.source}]`,
                                        "Radicalism": element["Radicalism"],
                                        "Hateful": element["Hateful"],
                                        "Porn": element["Porn"],
                                        "Terrorism": element["Terrorism"],
                                        "LGBT": element["LGBT"],
                                    });
                                } else {
                                    if (limit < req.body.params.limit){
                                        let index = userClassification.map(function(e) { return e.username; }).indexOf(`${element.username} [${element.source}]`);
                                        userClassification[index]["Radicalism"] += element["Radicalism"];
                                        userClassification[index]["Hateful"] += element["Hateful"];
                                        userClassification[index]["Porn"] += element["Porn"];
                                        userClassification[index]["Terrorism"] += element["Terrorism"];
                                        userClassification[index]["LGBT"] += element["LGBT"];
                                    }
                                }
                                
                                if (limit < req.body.params.limit){
                                    content["data"].push({ "from": "Radicalism", "to": element.friendUsername, "weight": element["Radicalism"]});
                                    content["data"].push({ "from": "Hateful", "to": element.friendUsername, "weight": element["Hateful"]});
                                    content["data"].push({ "from": "Porn", "to": element.friendUsername, "weight": element["Porn"]});
                                    content["data"].push({ "from": "Terrorism", "to": element.friendUsername, "weight": element["Terrorism"]});
                                    content["data"].push({ "from": "LGBT", "to": element.friendUsername, "weight": element["LGBT"]});

                                    limitDocs.push({"username": element.username, "source": element.source});
                                }
                                
                            });

                            userClassification.forEach(element => {
                                content["data"].push({ "from": element.username, "to": "Radicalism", "weight": element["Radicalism"]});
                                content["data"].push({ "from": element.username, "to": "Hateful", "weight": element["Hateful"]});
                                content["data"].push({ "from": element.username, "to": "Porn", "weight": element["Porn"]});
                                content["data"].push({ "from": element.username, "to": "Terrorism", "weight": element["Terrorism"]});
                                content["data"].push({ "from": element.username, "to": "LGBT", "weight": element["LGBT"]});
                            });
                        
                            response["message"] = "Get data friend analysis success";
                        } else {
                            response["message"] = "Data friend analysis not available";
                        }

                        response["content"] = [content];
                        
                        utils.setResponse(req, res, response);
                    });
                } else {
                    response["message"] = "Target social media not valid";
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static async getBetweennessAnalysis(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticTarget", "subAction": "getBetweennessAnalysis", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "targetId": "0ZqwKQwwZ06YZzQvfLYMDTBoOnsQJSuv",  "dateFrom": "2010-01-01", "dateUntil": "2021-12-31", "limit": 5} }'

        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["targetId", "dateFrom", "dateUntil", "limit"];

        utils.checkParameter(req, res, required, function() {
            modelInfo.targetSocmedDetail(req.body, function(resInfo) {
                if (resInfo && resInfo.length > 0) { 
                    modelAnalytic.getFriendBaseAnalysis(req.body, resInfo[0].socmed, function(resAnalytic) {
                        response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

                        let content = {
                            "targets": [],
                            "relation": []
                        }

                        if (resAnalytic && resAnalytic.length > 0) {
                            resAnalytic.forEach(element => {
                                let targetUser = content["targets"].find(o => (o.username === element.username && o.source === element.source));

                                if (!targetUser) {
                                    content["targets"].push({
                                        "source": element.source,
                                        "userId": element.userId,
                                        "username": element.username,
                                        "fullName": element.name,
                                        "profilePic": element.profilePic,
                                        "isPrivate": element.isPrivate,
                                        "isVerified": ("isVerified" in element && element.isVerified ? element.isVerified : null),
                                    });
                                }  

                                if (content["relation"].filter(i => (i.destination.username === element.username && i.destination.source === element.source)).length < req.body.params.limit) {
                                    content["relation"].push({
                                        "source": element.source,
                                        "userId": element.friendUserId,
                                        "username": element.friendUsername,
                                        "fullName": element.friendName,
                                        "isPrivate": element.friendIsPrivate,
                                        "isVerified": element.friendIsVerified,
                                        "profilePic": element.friendProfilePic,
                                        "like": element.like,
                                        "comment": element.comment,
                                        "favorite": element.favorite,
                                        "retweet": element.retweet,
                                        "quote": element.quote,
                                        "reply": element.reply,
                                        "total": element.total,
                                        "destination": {
                                            "source": element.source,
                                            "userId": element.userId,
                                            "username": element.username,
                                            "fullName": element.name,
                                            "profilePic": element.profilePic,
                                            "isPrivate": element.isPrivate,
                                            "isVerified": ("isVerified" in element && element.isVerified ? element.isVerified : null)
                                        }
                                    });
                                }
                            });
                            response["message"] = "Get data betweenness success";
                        } else {
                            response["message"] = "Data betweenness analysis not available";
                        }

                        response["content"] = content;
                        
                        utils.setResponse(req, res, response);
                    });
                } else {
                    response["message"] = "Target social media not valid";
                    utils.setResponse(req, res, response);
                }    
            });
        });
    }

    static async getWordCloud(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticTarget", "subAction": "getWordCloud", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "targetId": "0ZqwKQwwZ06YZzQvfLYMDTBoOnsQJSuv",  "dateFrom": "2010-01-01", "dateUntil": "2021-12-31", "type": 1, "limit": 200, "filter": {"postag": ["verb"]}} }'

        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["targetId", "dateFrom", "dateUntil", "type", "limit"];

        utils.checkParameter(req, res, required, function() {
            modelInfo.targetSocmedDetail(req.body, function(resInfo) {
                if (resInfo && resInfo.length > 0) { 
                    modelAnalytic.getWordBase(req.body, resInfo[0].socmed, function(resAnalytic) {
                        response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

                        let content = []

                        if (resAnalytic && resAnalytic.length > 0) {
                            response["message"] = "Get data word cloud success";
                            content = resAnalytic;
                        } else {
                            response["message"] = "Data word cloud not available";
                        }

                        response["content"] = content;
                        
                        utils.setResponse(req, res, response);
                    });
                } else {
                    response["message"] = "Target social media not valid";
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static async getWordLink(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticTarget", "subAction": "getWordLink", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "targetId": "0ZqwKQwwZ06YZzQvfLYMDTBoOnsQJSuv",  "dateFrom": "2010-01-01", "dateUntil": "2021-12-31", "type": 1, "limit": 15, "filter": {"postag": ["verb"]}} }'

        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["targetId", "dateFrom", "dateUntil", "type", "limit"];

        utils.checkParameter(req, res, required, function() {
            modelInfo.targetSocmedDetail(req.body, function(resInfo) {
                if (resInfo && resInfo.length > 0) { 
                    modelAnalytic.getWordBase(req.body, resInfo[0].socmed, function(resAnalytic) {
                        response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

                        let content = [
                            {
                                "data": [],
                                "type": 'dependencywheel',
                                "name": 'Total Words'
                            }
                        ];
                        
                        if (resAnalytic && resAnalytic.length > 0) {
                            resAnalytic.forEach(element => {
                                let word = element.name.split(" ");
                                
                                if (req.body.params.type === 2) {
                                    content[0]["data"].push({
                                        "from": word[0],
                                        "to": word[1],
                                        "weight": element.weight,
                                    });
                                } 

                                if (req.body.params.type === 3) {
                                    if (content[0]["data"].length < req.body.params.limit) content[0]["data"].push({"from": word[0], "to": word[1], "weight": element.weight});
                                    if (content[0]["data"].length < req.body.params.limit) content[0]["data"].push({"from": word[0], "to": word[2], "weight": element.weight});
                                }

                            });
                            
                            response["message"] = "Get data word link success";
                        } else {
                            response["message"] = "Data word link not available";
                        }

                        response["content"] = content;
                        
                        utils.setResponse(req, res, response);
                    });
                } else {
                    response["message"] = "Target social media not valid";
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static async getFaceCluster(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticTarget", "subAction": "getFaceCluster", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "targetId": "0ZqwKQwwZ06YZzQvfLYMDTBoOnsQJSuv"} }'

        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["targetId"];

        utils.checkParameter(req, res, required, function() {
            modelInfo.targetSocmedDetail(req.body, function(resInfo) {
                if (resInfo && resInfo.length > 0) { 
                    modelAnalytic.getFaceCluster(req.body, resInfo[0].socmed, function(resAnalytic) {
                        response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

                        let content = []

                        if (resAnalytic && resAnalytic.length > 0) {
                            response["message"] = "Get data face cluster success";
                            content = resAnalytic;
                        } else {
                            response["message"] = "Data face cluster not available";
                        }

                        response["content"] = content;
                        
                        utils.setResponse(req, res, response);
                    });
                } else {
                    response["message"] = "Target social media not valid";
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static async getFaceAnalytic(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticTarget", "subAction": "getFaceAnalytic", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "targetId": "0ZqwKQwwZ06YZzQvfLYMDTBoOnsQJSuv"} }'

        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["targetId"];

        utils.checkParameter(req, res, required, function() {
            modelInfo.targetSocmedDetail(req.body, function(resInfo) {
                if (resInfo && resInfo.length > 0) { 
                    modelAnalytic.getFaceAnalytic(req.body, resInfo[0].socmed, function(resAnalytic) {
                        response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

                        let content = {
                            "count": 0,
                            "results": []
                        }

                        if (resAnalytic && resAnalytic.result.length > 0) {
                            response["message"] = "Get data face analytic success";
                            content["count"] = resAnalytic.count;
                            content["results"] = resAnalytic.result;
                        } else {
                            response["message"] = "Data face analytic not available";
                        }

                        response["content"] = content;
                        
                        utils.setResponse(req, res, response);
                    });
                } else {
                    response["message"] = "Target social media not valid";
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    //Analytic geofence
    static async insertGeofence(req, res) {
        // curl -vk http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticTarget", "subAction": "insertGeofence", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "permission": "default", "params": { "targetId": "0ZqwKQwwZ06YZzQvfLYMDTBoOnsQJSuv", "name": "Schedule Test Single", "desc":"", "areas": [{ "type" : "polygon", "coordinates" : [ [ -6.265735445160634, 106.81669252364374 ], [ -6.268614343303724, 106.8155016948731 ], [ -6.26946048246126, 106.81869037056461 ], [ -6.268074529143421, 106.82567505631597 ], [ -6.264875144284381, 106.82132824978909 ], [ -6.265735445160634, 106.81669252364374 ] ], "name" : "kems dals ix" }], "members": [{"msisdn":"628111719692", "type":1, "interval":60}] } }'
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["name", "areas", "members"];

        utils.checkParameter(req, res, required, function() {
            modelGeofence.insertGeofence(req.body, function(result) {
                if (result) {
                    response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                    response["message"] = "Geofence track success";
                    response["content"] = result;
                } else {
                    response["message"] = "Geofence track failed, please contact admin";
                    response["content"] = {};
                }

                utils.setResponse(req, res, response);
            });
        });
    }

    static async updateGeofenceData(req, res) {
        // curl -vk http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticTarget", "subAction": "updateGeofenceData", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "permission": "default", "params": { "_id": "hi5yhk7mCYIX9Mo3MuiMcTpC77gl2vGh", "name": "Geofence Single Tes"} }'
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["targetId"];

        utils.checkParameter(req, res, required, function() {
            modelGeofence.updateData(req.body, function(result) {
                if (result) {
                    response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                    response["message"] = `Update geofence success`;
                    delete response["content"]
                } else {
                    response["message"] = `Update geofence failed, please contact admin`;
                }

                utils.setResponse(req, res, response);
            });
        });
    }

    static async getGeofenceData(req, res) {
        // curl -vk http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticTarget", "subAction": "getGeofenceData", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "permission": "default", "params": { "targetId": "0ZqwKQwwZ06YZzQvfLYMDTBoOnsQJSuv"} }'
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["targetId"];

        utils.checkParameter(req, res, required, function() {
            modelGeofence.getGeofenceData(req.body, function(result) {
                response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                response["message"] = `Get geofence data success`;
                if (result && result.length > 0) {
                    response["content"] = result[0];
                } else {
                    response["content"] = {
                        "_id":req.body.params.targetId,
                        "targetId":req.body.params.targetId,
                        "areas":[],
                        "members":[],
                        "dateCreate":null,
                        "userCreate":null,
                        "dateUpdate":null,
                        "userUpdate":null,
                        "alerts":[]
                    }
                }

                utils.setResponse(req, res, response);
            });
        });
    }

    static async changeGeofenceStatus(req, res) {
        // curl -vk http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticTarget", "subAction": "changeGeofenceStatus", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "permission": "default", "params": { "_id": "hi5yhk7mCYIX9Mo3MuiMcTpC77gl2vGh", "status": 0} }'
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["status", "_id"];

        utils.checkParameter(req, res, required, function() {
            if(req.body.params.status === 1) var status = "Activated"
            if(req.body.params.status === -1) var status = "Deleted"
            if(req.body.params.status === 0) var status = "Deactivated"

            modelGeofence.changeStatus(req.body, function(result) {
                if (result) {
                    response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                    response["message"] = `${status} geofence success`;
                    delete response["content"]
                } else {
                    response["message"] = `${status} geofence failed, please contact admin`;
                    logMsg = "Failed " + logMsg;
                }

                utils.setResponse(req, res, response);
            });
        });
    }

    static async getGeofenceHistory(req, res) {
        // curl -vk http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticTarget", "subAction": "getGeofenceHistory", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "permission": "default", "params": {"targetId": "0ZqwKQwwZ06YZzQvfLYMDTBoOnsQJSuv", "msisdn": "628111719692"} }'
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["targetId"];

        utils.checkParameter(req, res, required, function() {
            modelGeofence.getGeofenceTrackHistory(req.body, function(result) {
                if (result) {
                    response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                    response["content"] = {
                        "count": result.count,
                        "results": result.results,
                    };
                    if(result.count>0){
                        response["message"] = `Get geofence track history success`;
                    } else{
                        response["message"] = `Get geofence track history not found`;
                    }
                } else {
                    response["message"] = `Get geofence track history failed, please contact admin`;
                    response["content"] = {
                        "count": 0,
                        "results": [],
                    }
                }

                utils.setResponse(req, res, response);
            });
        });
    }
}

module.exports = AnalyticTargetController;