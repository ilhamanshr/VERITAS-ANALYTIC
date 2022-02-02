const path              = require('path');
const BASE_DIR          = path.dirname(require.main.filename);
const utils             = require(BASE_DIR + '/Utils');
const msg               = require(BASE_DIR + '/Messages');
const model             = require(BASE_DIR + '/models/CompareAccount');

class CompareAccountController {
    static async getManyAccountInfo(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "CompareAccount", "subAction": "getManyAccountInfo", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "dateFrom": "2010-01-01", "dateUntil": "2021-12-31", "source": "instagram", "userIds":[["5869719328", "1151163581", "1396487755"], ["626726697", "51658541"]]} }'

        let self = this;
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["dateFrom", "dateUntil", "source", "userIds"];
        let content = {
            "dateFrom": "",
            "dateUntil": "",
            "source": req.body.params.source,
            "accounts": []
        }
        
        utils.checkParameter(req, res, required, function() {
        
            const modelCompare = self.checkSource(req.body.params.source);
            
            self.loopProfile(req.body.params.userIds, modelCompare, 0, 0, req.body.params.userIds, function(resInfo) {
                if (resInfo && resInfo.length > 0) {
                    response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

                    let datePost = [];
    
                    resInfo.forEach(element => {
                        element.forEach(item => {
                            datePost.push(item.dateFrom);
                            datePost.push(item.dateUntil);
                        });
                    });
    
                    datePost.sort(function(a,b){
                        return b - a;
                    });

                    content["dateFrom"] = datePost[datePost.length - 1];
                    content["dateUntil"] = datePost[0];
                    content["accounts"] = resInfo;

                    response["message"] = "Get Account info success";
                } else {
                    response["message"] = "Account info not available";
                }

                response["content"] = content;
                        
                utils.setResponse(req, res, response);
            });
        });
    }

    static async getTimeFrame(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "CompareAccount", "subAction": "getTimeFrame", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "dateFrom": "2014-02-18", "dateUntil": "2021-12-22", "source": "instagram", "userIds":[["5869719328", "1151163581", "1396487755"], ["626726697", "51658541"]]} }'

        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["dateFrom", "dateUntil", "source", "userIds"];
        let content = {
            "categories": [],
            "forecast": false,
            "series": [
                {"name": "Group 1", "data": []},
                {"name": "Group 2", "data": []},
            ]
        };

        utils.checkParameter(req, res, required, function() {
            model.getTimeFrame(req.body, function(resCompare) {
                
                if (resCompare && resCompare.length > 0) {
                    response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                    let userIds = req.body.params.userIds;

                    content["categories"] = resCompare[0].date.sort();
                    content["series"][0]["data"] = new Array(resCompare[0].date.length).fill(0);
                    content["series"][1]["data"] = new Array(resCompare[0].date.length).fill(0);

                    resCompare[0]["postCount"].forEach(element => {
                       for (let index = 0; index < userIds.length; index++) {
                            if(userIds[index].indexOf(element.userId) > -1) {
                                let indexGroup = index;
                                let indexDate = content["categories"].indexOf(element.date);
                                
                                content["series"][indexGroup]["data"][indexDate] += element.postCount;
                            } 
                       } 
                    });
                    
                    response["message"] = "Get time frame success";
                } else {
                    response["message"] = "Time frame not available";
                }

                response["content"] = content;
                        
                utils.setResponse(req, res, response);
            });
        });
    }

    static async getWordCloud(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "CompareAccount", "subAction": "getWordCloud", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "dateFrom": "2010-01-01", "dateUntil": "2021-12-31", "source": "instagram", "type": 1, "limit": 100, "userIds":[["5869719328", "1151163581", "1396487755"], ["626726697", "51658541"]]} }'

        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["dateFrom", "dateUntil", "source", "userIds", "type", "limit"];
        let content = [];

        utils.checkParameter(req, res, required, function() {
            model.getWordBase(req.body, function(resCompare) {
                
                if (resCompare && resCompare.length > 0) {
                    response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                    let userIds = req.body.params.userIds;
                    
                    response["message"] = "Get word cloud success";

                    resCompare.forEach(element => {
                        let indexGroup = [];
                        element.userId.forEach(item => {
                            for (let index = 0; index < userIds.length; index++) {
                                if(userIds[index].indexOf(item) > -1) {
                                    indexGroup.push(index);
                                    indexGroup = [...new Set(indexGroup)];
                                } 
                            }
                        });
                        let word = {
                            "name": element.name,
                            "weight": element.weight,
                            "group": indexGroup.length === 1 ? `${indexGroup[0] + 1}` : (indexGroup.length > 1 ? "all" : "all"),
                        }

                        content.push(word);
                    });
                } else {
                    response["message"] = "Word cloud not available";
                }

                response["content"] = content;
                        
                utils.setResponse(req, res, response);
            });
        });
    }

    static async getFriendsAnalysis(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "CompareAccount", "subAction": "getFriendsAnalysis", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "dateFrom": "2010-01-01", "dateUntil": "2021-12-31", "source": "instagram", "limit": 3, "userIds":[["5869719328", "1151163581", "1396487755"], ["626726697", "51658541"]]} }'

        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["dateFrom", "dateUntil", "source", "userIds", "limit"];
        let limitDocs = [];
        let userClassification = [];
        let content = [{
            "data": [],
            "name": "Friends Analytic Count",
            "series": [
                { "id": "Radicalism", "colorIndex": 0},
                { "id": "Hateful", "colorIndex": 1},
                { "id": "Porn", "colorIndex": 2},
                { "id": "Terrorism", "colorIndex": 3},
                { "id": "LGBT", "colorIndex": 4},
            ],
            "type": "sankey"
        }];

        utils.checkParameter(req, res, required, function() {

            model.getFriendBase(req.body, function(resCompare) {
                    
                if (resCompare && resCompare.length > 0) {
                    response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                    
                    resCompare.forEach(element => {

                        let targetUser = userClassification.find(o => (o.username === `${element.username} [T]`));
                        let limit = limitDocs.filter(i => (i.username === element.username && i.source === element.source)).length;

                        if (!targetUser) {
                            userClassification.push({
                                "username": `${element.username} [T]`,
                                "Radicalism": element["Radicalism"],
                                "Hateful": element["Hateful"],
                                "Porn": element["Porn"],
                                "Terrorism": element["Terrorism"],
                                "LGBT": element["LGBT"],
                            });
                        } else {
                            if (limit < req.body.params.limit){
                                let index = userClassification.map(function(e) { return e.username; }).indexOf(`${element.username} [T]`);
                                userClassification[index]["Radicalism"] += element["Radicalism"];
                                userClassification[index]["Hateful"] += element["Hateful"];
                                userClassification[index]["Porn"] += element["Porn"];
                                userClassification[index]["Terrorism"] += element["Terrorism"];
                                userClassification[index]["LGBT"] += element["LGBT"];
                            }
                        }
                        
                        if (limit < req.body.params.limit){
                            if(req.body.params.categories.includes("radicalism")) content[0]["data"].push({ "from": "Radicalism", "to": element.friendUsername, "weight": element["Radicalism"]});
                            if(req.body.params.categories.includes("hateful")) content[0]["data"].push({ "from": "Hateful", "to": element.friendUsername, "weight": element["Hateful"]});
                            if(req.body.params.categories.includes("porn")) content[0]["data"].push({ "from": "Porn", "to": element.friendUsername, "weight": element["Porn"]});
                            if(req.body.params.categories.includes("terrorism")) content[0]["data"].push({ "from": "Terrorism", "to": element.friendUsername, "weight": element["Terrorism"]});
                            if(req.body.params.categories.includes("lgbt")) content[0]["data"].push({ "from": "LGBT", "to": element.friendUsername, "weight": element["LGBT"]});

                            limitDocs.push({"username": element.username, "source": element.source});
                        }
                        
                    });

                    userClassification.forEach(element => {
                        if(req.body.params.categories.includes("radicalism")) content[0]["data"].push({ "from": element.username, "to": "Radicalism", "weight": element["Radicalism"]});
                        if(req.body.params.categories.includes("hateful")) content[0]["data"].push({ "from": element.username, "to": "Hateful", "weight": element["Hateful"]});
                        if(req.body.params.categories.includes("porn")) content[0]["data"].push({ "from": element.username, "to": "Porn", "weight": element["Porn"]});
                        if(req.body.params.categories.includes("terrorism")) content[0]["data"].push({ "from": element.username, "to": "Terrorism", "weight": element["Terrorism"]});
                        if(req.body.params.categories.includes("lgbt")) content[0]["data"].push({ "from": element.username, "to": "LGBT", "weight": element["LGBT"]});
                    });
                    

                    response["message"] = "Get friend analysis success";
                } else {
                    response["message"] = "Friend analysis not available";
                }

                response["content"] = content;
                        
                utils.setResponse(req, res, response);
            });
        });
    }

    static async getBetweennessAnalysis(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "CompareAccount", "subAction": "getBetweennessAnalysis", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "dateFrom": "2010-01-01", "dateUntil": "2021-12-31", "source": "instagram", "limit": 5, "userIds":[["5869719328", "1151163581", "1396487755"], ["626726697", "51658541"]]} }'

        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["dateFrom", "dateUntil", "source", "userIds", "limit"];
        let content = {
            "targets": [],
            "relation": []
        }

        utils.checkParameter(req, res, required, function() {
            model.getFriendBase(req.body, function(resCompare) {
                
                if (resCompare && resCompare.length > 0) {
                    response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                    let userIds = req.body.params.userIds;
                    
                    resCompare.forEach(element => {
                        let targetUser = content["targets"].find(o => (o.username === element.username && o.source === element.source));

                        if (!targetUser) {
                            let group = ''
                            for (let index = 0; index < userIds.length; index++) {
                                if(userIds[index].indexOf(element.userId) > -1) {
                                    group = index + 1;
                                } 
                            } 

                            content["targets"].push({
                                "source": element.source,
                                "userId": element.userId,
                                "username": element.username,
                                "fullName": element.name,
                                "profilePic": element.profilePic,
                                "isPrivate": element.isPrivate,
                                "isVerified": ("isVerified" in element && element.isVerified ? element.isVerified : null),
                                "group": group + ''
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
                    response["message"] = "Betweeness not available";
                }

                response["content"] = content;
                        
                utils.setResponse(req, res, response);
            });
        });
    }
    
    static async loopProfile(data, model, index, indexGroup, result, cb) {
        let self = this;
        if (index < data.length) {
            if (indexGroup < data[index].length) {
                let params = {
                    "params": {
                        "userId": data[index][indexGroup]
                    }
                }
                
                model.getProfileInfo(params, function(resInfo) {
                    result[index][indexGroup] = resInfo;
                    self.loopProfile(data, model, index, indexGroup + 1, result, function(resLoop) {
                        cb(resLoop);
                    });
                });
            } else {
                self.loopProfile(data, model, index + 1, 0, result, function(resLoop) {
                    cb(resLoop);
                });
            }
        } else {
            cb(result);
        }
    }

    static checkSource(source) {
        if (source === "twitter") return require(BASE_DIR + '/models/account/twitter/Analytic');
        if (source === "instagram") return require(BASE_DIR + '/models/account/instagram/Analytic'); 
        return false;
    }
}

module.exports = CompareAccountController;