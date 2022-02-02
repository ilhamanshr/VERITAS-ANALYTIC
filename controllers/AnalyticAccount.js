const path              = require('path');
const BASE_DIR          = path.dirname(require.main.filename);
const utils             = require(BASE_DIR + '/Utils');
const msg               = require(BASE_DIR + '/Messages');
const config            = require(BASE_DIR + '/Config');
const modelAnalyzer     = require(BASE_DIR + '/models/Analyzer');
const modelScoring      = require(BASE_DIR + '/models/Scoring');
const modelLeakage      = require(BASE_DIR + '/models/Leakage');
const modelFaceCluster  = require(BASE_DIR + '/models/FaceCluster');
const modelCallerName   = require(BASE_DIR + '/models/CallerNameSuggestion');
const modelBlacklist    = require(BASE_DIR + '/models/Blacklist');
const quartile          = require('arraystat');
const moment            = require('moment');
const apiAi             = require(BASE_DIR + '/middlewares/ApiAI');

class AnalyticAccountController {

    static async getProfileInfo(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getProfileInfo", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "466551933", "source": "instagram" } }'
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getProfileInfo", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "312634867", "source": "twitter" } }'
        
        let self = this;
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["userId", "source"];

        utils.checkParameter(req, res, required, function() {
            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

            const model = self.checkSource(req);
            
            model.getProfileInfo(req.body, function(result) {
                if (result && Object.keys(result).length > 0) {
                    response["message"] = "Get profile info success";
                    response["content"] = result;
                } else {
                    response["message"] = "Profile info not available";
                    response["content"] = null;
                }

                utils.setResponse(req, res, response);
            });
        });
    }

    static async getLastDataMonitoring(req, res){
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getLastDataMonitoring", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "329504750", "dateFrom":"2016-11-01 00:00:00", "dateUntil":"2021-11-09 23:59:00", "source":"instagram"} }'
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getLastDataMonitoring", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "312634867", "source": "twitter" } }'

        let self = this;
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["userId", "source"];

        utils.checkParameter(req, res, required, function() {
            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

            const model = self.checkSource(req);
            
            model.getLastDataCountMonitoring(req.body, function(result) {
                if (result && Object.keys(result).length > 0) {
                    response["message"] = "Get last data monitoring success";
                    response["content"] = result[0].posts.length;
                } else {
                    response["message"] = "Last data monitoring not available";
                    response["content"] = 0;
                }

                utils.setResponse(req, res, response);
            });
        });
    }

    static async getCurrentDataMonitoring(req, res){
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getCurrentDataMonitoring", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "329504750", "dateFrom":"2016-11-01 00:00:00", "dateUntil":"2019-11-01 23:59:00", "dateCurrent":"2021-11-09 23:59:00", "source":"instagram"} }'
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getCurrentDataMonitoring", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "312634867", "source": "twitter" } }'

        let self = this;
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["userId", "source"];

        utils.checkParameter(req, res, required, function() {
            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

            const model = self.checkSource(req);
            
            model.getLastDataCountMonitoring(req.body, function(resultLast) {
                let lastCount = 0;
                if (resultLast && Object.keys(resultLast).length > 0) {
                    lastCount = resultLast[0].posts.length;
                }
                model.getCurrentDataMonitoring(req.body, function(resultCurrent) {
                    let lastCurrent = 0;
                    let content = {
                        "increase" : 0,
                        "safePost" : 0,
                        "notSafePost" : 0,
                        "percentage" : 0,
                        "up": false
                    }

                    if (resultCurrent && Object.keys(resultCurrent).length > 0) {
                        lastCurrent = resultCurrent[0].posts.length;

                        content["increase"] += lastCurrent;
                        content["percentage"] += utils.roundTwoDecimalPlaces((lastCurrent/(lastCurrent+lastCount))*100);
                        content["safePost"] += resultCurrent[0].positive;
                        content["notSafePost"] += resultCurrent[0].negative;
                        content["up"] = true;
                       
                        response["message"] = "Get last data monitoring success";
                        response["content"] = content;
                    } else {
                        response["message"] = "Last data monitoring not available";
                        response["content"] = content;
                    }
    
                    utils.setResponse(req, res, response);
                });
            });
        });
    }

    static async getPieChartMonitoring(req, res){
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getPieChartMonitoring", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "329504750", "dateFrom":"2016-11-01 00:00:00", "dateUntil":"2019-11-01 23:59:00", "dateCurrent":"2021-11-09 23:59:00", "source":"instagram"} }'
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getPieChartMonitoring", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "312634867", "source": "twitter" } }'

        let self = this;
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["userId", "source"];

        utils.checkParameter(req, res, required, function() {
            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

            const model = self.checkSource(req);
            
            model.getAllDataPieChartMonitoring(req.body, function(resultLast) {
                let radicalism = 0;
                let hateful = 0;
                let porn = 0;
                let lgbt = 0;
                let terrorism = 0;
                
                if (resultLast && Object.keys(resultLast).length > 0) {
                    radicalism += resultLast[0].radicalism;
                    hateful += resultLast[0].hateful;
                    porn += resultLast[0].porn;
                    lgbt += resultLast[0].lgbt;
                    terrorism += resultLast[0].terrorism;
                }

                model.getAllDataPieChartIncreaseMonitoring(req.body, function(resultCurrent) {
                    let content = {
                        "series" : [{
                            name: 'Categorization',
                            colorByPoint: true,
                            data: [{
                                name: 'Radicalism',
                                y: radicalism
                            }, {
                                name: 'Hateful',
                                y: hateful
                            }, {
                                name: 'Porn',
                                y: porn
                            }, {
                                name: 'Terrorism',
                                y: terrorism 
                            }, {
                                name: 'LGBT',
                                y: lgbt
                            }]
                        }],
                        "tooltip" : {
                            "Radicalism" : 0,
                            "Hateful" : 0,
                            "Porn" : 0,
                            "Terrorism" : 0,
                            "LGBT" : 0
                        }
                    }

                    if (resultCurrent && Object.keys(resultCurrent).length > 0) {
                        radicalism += resultCurrent[0].radicalism;
                        hateful += resultCurrent[0].hateful;
                        porn += resultCurrent[0].porn;
                        lgbt += resultCurrent[0].lgbt;
                        terrorism += resultCurrent[0].terrorism;

                        content["series"] = [{
                            name: 'Categorization',
                            colorByPoint: true,
                            data: [{
                                name: 'Radicalism',
                                y: radicalism
                            }, {
                                name: 'Hateful',
                                y: hateful
                            }, {
                                name: 'Porn',
                                y: porn
                            }, {
                                name: 'Terrorism',
                                y: terrorism 
                            }, {
                                name: 'LGBT',
                                y: lgbt
                            }]
                        }];

                        content["tooltip"] = {
                            "Radicalism" : radicalism!=0 ? utils.roundTwoDecimalPlaces((resultCurrent[0].radicalism/radicalism)*100) : 0,
                            "Hateful" : hateful!=0 ? utils.roundTwoDecimalPlaces((resultCurrent[0].hateful/hateful)*100) : 0,
                            "Porn" : porn!=0 ? utils.roundTwoDecimalPlaces((resultCurrent[0].porn/porn)*100) : 0,
                            "Terrorism" : terrorism!=0 ? utils.roundTwoDecimalPlaces((resultCurrent[0].terrorism/terrorism)*100) : 0,
                            "LGBT" : lgbt!=0 ? utils.roundTwoDecimalPlaces((resultCurrent[0].lgbt/lgbt)*100) : 0
                        }  
                        response["message"] = "Get pie chart monitoring success";
                    } else{
                        response["message"] = "Pie chart monitoring not available";
                    }
                    
                    response["content"] = content;
                    utils.setResponse(req, res, response);
                });
            });
        });
    }

    static async getDataLeakage(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getDataLeakage", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "683866614", "source": "instagram" } }'
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getDataLeakage", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "184192810", "source": "twitter" } }'
        
        let self = this;
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["userId", "source"];

        utils.checkParameter(req, res, required, function() {
            const model = self.checkSource(req);
            
            model.getProfileInfo(req.body, function(resultProfile) {
                if (resultProfile && Object.keys(resultProfile).length > 0) {
                    let bodyReq = {
                        "params": {
                            "source": resultProfile.source,
                            "username": resultProfile.username,
                            "name": resultProfile.fullName
                        }
                    }
                    
                    modelLeakage.getDataLeakage(bodyReq, function(result) {
                        response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                        
                        if (result && Object.keys(result).length > 0) {
                            response["message"] = "Get data leakage success";
                            response["content"] = result;
                        } else {
                            response["message"] = "Data leakage not available";
                            response["content"] = null;
                        }
                        
                        utils.setResponse(req, res, response);
                    });
                } else {
                    response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                    response["message"] = "Profile info not available";
                    response["content"] = null;

                    utils.setResponse(req, res, response);
                }
            });
        });
    }
    
    static async getTendenciesAnalytic(req, res) {
        //curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getTendenciesAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "331620842", "dateFrom":"2021-11-01", "dateUntil":"2021-11-09", "source":"instagram"} }'
        //curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getTendenciesAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "71537099", "dateFrom":"2015-11-01", "dateUntil":"2021-11-17", "source":"twitter"} }'
        
        let self = this;
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["userId", "source"];

        utils.checkParameter(req, res, required, function() {
            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

            const model = self.checkSource(req);

            model.getAllPredictCount(req.body, function(result) {
                if(result){
                    response["message"] = "Get tendencies analytic success";
                    response["content"] = result;
                } else{
                    response["message"] = "Tendencies analytic not available";
                    response["content"] = [];
                }

                utils.setResponse(req, res, response);
            });
        });
    }

    static async getTimeFrameAnalytic(req, res) {
        //curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getTimeFrameAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "329504750", "dateFrom":"2016-11-01", "dateUntil":"2021-11-09", "source":"instagram"} }'
        //curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getTimeFrameAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "146337238", "dateFrom":"2009-01-01", "dateUntil":"2021-11-17", "source":"twitter"} }'
        
        let self = this;
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["userId", "source"];

        utils.checkParameter(req, res, required, function() {
            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

            const model = self.checkSource(req);

            model.getPostCountByDate(req.body, function(result) {
                let labels = [];

                let dateObjPost = {};
                let dateObjInteraction = {};
                let options = {};
                let dataPost = [];
                let dataInteraction = [];
                let dataEngagement = [];
                let series = [];

                if(result && result.length){
                    Array.from(result).forEach(function(v, i) {
                        labels.push(v._id);
                        dateObjPost[v._id] = v.count;
                    });

                    for (var key in dateObjPost) {
                        if (dateObjPost.hasOwnProperty(key)) dataPost.push(dateObjPost[key]);
                    }

                    let obj = {
                        "name" : "Post Count",
                        "data" : dataPost
                    };

                    series.push(obj);
                } else{
                    
                    for (var key in dateObjPost) {
                       dataPost.push(dateObjPost[key]);
                    }

                    let obj = {
                        "name" : "Post Count",
                        "data" : dataPost
                    };

                    series.push(obj);
                }

                model.getInteractionCountByDate(req.body, function(result){
                    if(result && result.length){
                        Array.from(result).forEach(function(v, i) {
                            if (!labels.includes(v.timestamp)) labels.push(v.timestamp);
                            if(req.body.params.source === "instagram"){
                                dateObjInteraction[v.timestamp] = v.countLike+v.countComment;
                            } else{
                                dateObjInteraction[v.timestamp] = v.countReply + v.countRetweet + v.countQuote + v.countFavorite;
                            }
                            
                        });
    
                        for (var key in dateObjInteraction) {
                            if (dateObjInteraction.hasOwnProperty(key)) dataInteraction.push(dateObjInteraction[key]);
                        }
    
                        let obj = {
                            "name" : "Interaction Count",
                            "data" : dataInteraction
                        };
    
                        series.push(obj);

                        //engagement rate
                        dataEngagement = utils.getEngagementRate(dataPost, dataInteraction);

                        obj = {
                            "name" : "Engagement Rate Count",
                            "data" : dataEngagement
                        };

                        series.push(obj);
                        response["message"] = "Get timeframe analytic success";
                    } else{
                        
                        for (var key in dateObjInteraction) {
                            dataInteraction.push(dateObjInteraction[key]);
                        }

                        let obj = {
                            "name" : "Interaction Count",
                            "data" : dataInteraction
                        }
    
                        series.push(obj);

                        //engagement rate
                        dataEngagement = utils.getEngagementRate(dataPost, dataInteraction);
    
                        obj = {
                            "name" : "Engagement Rate Count",
                            "data" : dataEngagement
                        }

                        series.push(obj);
                        response["message"] = "Timeframe analytic not available";
                    }

                    options["series"] = series;
                    options["categories"] = labels;

                    response["content"] = options;
                    response["content"]["forecast"] = false;
                    
                    if (labels[labels.length - 1] === moment().utcOffset(7).format("YYYY-MM-DD")) {
                        let params = {
                            "Post": [],
                            "Impression": [],
                            "Reach": [],
                        }
                        
                        for (let index = 0; index < labels.length; index++) {
                            params["Post"].push({"date": labels[index], "Total Post": series[0]["data"][index]})
                            params["Impression"].push({"date": labels[index], "Total Impression": series[1]["data"][index]})
                            params["Reach"].push({"date": labels[index], "Total Reach": series[2]["data"][index]})
                        }

                        apiAi.getForecasting(req, params, function(resultForcasting) {
                            if (typeof resultForcasting === "object" && resultForcasting.code === 0 && typeof resultForcasting.content === "object" && typeof resultForcasting.content.Impression === "object" && typeof resultForcasting.content.Post === "object" && typeof resultForcasting.content.Reach === "object") {
                                resultForcasting.content.Post.forEach(element => {
                                    response["content"]["categories"].push(element.date);
                                    response["content"]["series"][0]["data"].push(parseInt(element.predPost));
                                });
                                
                                resultForcasting.content.Impression.forEach(element => {
                                    response["content"]["series"][1]["data"].push(parseInt(element.predImpression));
                                });
                                
                                resultForcasting.content.Reach.forEach(element => {
                                    response["content"]["series"][2]["data"].push(parseInt(element.predReach));
                                });

                                response["content"]["forecast"] = true;

                                utils.setResponse(req, res, response);
                            } else {
                                utils.setResponse(req, res, response);
                            }
                        });
                    } else {
                        utils.setResponse(req, res, response);
                    }
                });
            });
        });
    }

    static async getBoxPlotAnalytic(req, res) {
        //curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getBoxPlotAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "329504750", "dateFrom":"2015-01-01", "dateUntil":"2021-11-17", "source":"instagram"} }'
        //curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getBoxPlotAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "146337238", "dateFrom":"2009-01-01", "dateUntil":"2021-11-17", "source":"twitter"} }'

        let self = this;
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["userId", "source"];

        utils.checkParameter(req, res, required, function() {
            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
            let datelist = utils.enumerateDaysBetweenDates(req.body.params.dateFrom, req.body.params.dateUntil);
            let objDate = {};
            let objDateInt = {};

            let series = [];
            let dataSeries = [];
            let dataPost = [];
            let dataInteraction = [];
            let dataEngagement = [];

            const model = self.checkSource(req);

            if(req.body.params.zero){
                Array.from(datelist).forEach(function(v, i) {
                    objDate[v] = 0;
                    objDateInt[v] = 0;
                });
            }

            model.getPostCountByDate(req.body, function(result) {
                if(result && result.length > 0){

                    if(req.body.params.zero){
                        //with value 0 post
                        Array.from(result).forEach(function(v, i) {
                            objDate[v._id] = v.count;
                        });

                        for (var key in objDate) {
                            if (objDate.hasOwnProperty(key)) dataPost.push(objDate[key]);
                        }
                    } else{
                        //without value 0 post
                        Array.from(result).forEach(function(v, i) {
                            if(v.count > 0){
                                dataPost.push(v.count);
                            }
                        });
                    }

                    let mathQuartile = quartile(dataPost);
                    let quartileData = [utils.roundTwoDecimalPlaces(mathQuartile.min), utils.roundTwoDecimalPlaces(mathQuartile.q1), utils.roundTwoDecimalPlaces(mathQuartile.median), utils.roundTwoDecimalPlaces(mathQuartile.q3), utils.roundTwoDecimalPlaces(mathQuartile.max)];

                    let obj = {
                        "x" : "Post",
                        "y" : quartileData
                    };

                    dataSeries.push(obj);
                } else{
                    dataPost = [0,0,0,0,0];

                    let obj = {
                        "x" : "Post",
                        "y" : dataPost
                    };

                    dataSeries.push(obj);
                }

                model.getInteractionCountByDate(req.body, function(result){
                    if(result && result.length > 0){
                        if(req.body.params.zero){
                            //with value 0
                            Array.from(result).forEach(function(v, i) {
                                if(req.body.params.source === "instagram"){
                                    objDateInt[v.timestamp] = v.countLike+v.countComment;
                                } else{
                                    objDateInt[v.timestamp] = v.countReply+v.countRetweet+v.countQuote+v.countFavorite;
                                }
                            });
        
                            for (var key in objDateInt) {
                                if (objDateInt.hasOwnProperty(key)) dataInteraction.push(objDateInt[key]);
                            }
                        } else{
                            //without value 0
                            Array.from(result).forEach(function(v, i) {
                            if(req.body.params.source === "instagram"){
                                let sum = v.countLike+v.countComment;
                                if(sum>0){
                                    dataInteraction.push(sum);
                                }
                            } else{
                                let sum = v.countReply+v.countRetweet+v.countQuote+v.countFavorite;
                                if(sum>0){
                                    dataInteraction.push(sum);
                                }
                            }
                            });
                        }

                        let mathQuartile = quartile(dataInteraction);
                        let quartileData = [utils.roundTwoDecimalPlaces(mathQuartile.min), utils.roundTwoDecimalPlaces(mathQuartile.q1), utils.roundTwoDecimalPlaces(mathQuartile.median), utils.roundTwoDecimalPlaces(mathQuartile.q3), utils.roundTwoDecimalPlaces(mathQuartile.max)];

                        let obj = {
                            "x" : "Interaction",
                            "y" : quartileData
                        };

                        dataSeries.push(obj);

                        //engagement rate
                        dataEngagement = utils.getEngagementRate(dataPost, dataInteraction);
                        mathQuartile = quartile(dataEngagement);
                        quartileData = [utils.roundTwoDecimalPlaces(mathQuartile.min), utils.roundTwoDecimalPlaces(mathQuartile.q1), utils.roundTwoDecimalPlaces(mathQuartile.median), utils.roundTwoDecimalPlaces(mathQuartile.q3), utils.roundTwoDecimalPlaces(mathQuartile.max)];

                        obj = {
                            "x" : "Engagement Rate",
                            "y" : quartileData
                        };

                        dataSeries.push(obj);
                    } else{
                        dataInteraction = [0,0,0,0,0];

                        let obj = {
                            "x" : "Interaction",
                            "y" : dataInteraction
                        };

                        dataSeries.push(obj);

                        //engagement rate
                        dataEngagement = utils.getEngagementRate(dataPost, dataInteraction);
                        let mathQuartile = quartile(dataEngagement);
                        let quartileData = [utils.roundTwoDecimalPlaces(mathQuartile.min), utils.roundTwoDecimalPlaces(mathQuartile.q1), utils.roundTwoDecimalPlaces(mathQuartile.median), utils.roundTwoDecimalPlaces(mathQuartile.q3), utils.roundTwoDecimalPlaces(mathQuartile.max)];

                        obj = {
                            "x" : "Engagement Rate",
                            "y" : quartileData
                        };

                        dataSeries.push(obj);
                    }
    
                    let objSeries = {
                        "type": "boxPlot",
                        "data": dataSeries
                    }

                    series.push(objSeries);
                    response["message"] = "Get box plot analytic success";
                    response["content"] = series;
                    utils.setResponse(req, res, response);
                });
            });
        });
    }

    static async getFriendsAnalytic(req, res) {
        //curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getFriendsAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "329504750", "dateFrom":"2016-01-01", "dateUntil":"2021-11-11", "source":"instagram"} }'
        //curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getFriendsAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "146337238", "dateFrom":"2013-01-01", "dateUntil":"2021-11-18", "source":"twitter"} }'
        
        let self = this;
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["userId", "source"];

        utils.checkParameter(req, res, required, function() {
            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

            const model = self.checkSource(req);

            model.getProfileInfo(req.body, function(profile) {

                model.getUsernameCountByClassification(req.body, profile.username, function(result) {

                    var series = [];
                    let data = [];
                    let obj = {
                        data: data,
                        type: 'sankey',
                        name: 'Friends Analytic Count',
                        nodes: [{
                            id: 'Radicalism [T]',
                            colorIndex: 0
                        }, {
                            id: 'Hateful [T]',
                            colorIndex: 1
                        }, {
                            id: 'Porn [T]',
                            colorIndex: 2
                        }, {
                            id: 'Terrorism [T]',
                            colorIndex: 3
                        }]
                    };
    
                    if(result && result.length){
                        Array.from(result).forEach(function(v, i) {
                            data.push({"from":"Radicalism [T]", "to":v.username, "weight":v.radicalCount});
                            data.push({"from":"Hateful [T]", "to":v.username, "weight":v.hatefulCount});
                            data.push({"from":"Porn [T]", "to":v.username, "weight":v.pornCount});
                            data.push({"from":"Terrorism [T]", "to":v.username, "weight":v.terrorismCount});
                            data.push({"from":"LGBT [T]", "to":v.username, "weight":v.lgbtCount});
                        });
                        series.push(obj);
    
                        response["message"] = "Get friends analytic success";
                        response["content"] = series;
                    } else{
                        series.push(obj);
                        
                        response["message"] = "Friends analytic not available";
                        response["content"] = series;
                    }
    
                    utils.setResponse(req, res, response);
                });
            });
        });
    }

    static async getHeatMapHighChart(req, res) {
        //curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getHeatMapHighChart", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "329504750", "dateFrom":"2016-01-01", "dateUntil":"2021-11-16", "source": "instagram"} }'
        //curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getHeatMapHighChart", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "146337238", "dateFrom":"2016-01-01", "dateUntil":"2021-11-16", "source": "twitter"} }'
        
        let self = this;
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["userId", "source"];

        utils.checkParameter(req, res, required, function() {
            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

            const model = self.checkSource(req);

            model.getPostCountByDayHourHeatMap(req.body, function(result) {
                var format = {};
	
                var catX = [];
                for (var i=0; i <= 23; i++) {
                    var h = "0" + i;
                    h = h.substr(h.length - 2);
                    catX.push(h);
                };
                format["xCat"] = catX;
                
                var dayNames = config.APP_DAYOFWEEK_MONGO;
                var catY = [];
                for(var key in dayNames){
                    catY.push(dayNames[key]);
                }
                format["yCat"] = catY;
                
                var tmpResult = [];
                if(result){
                    for (var i=0; i <= 23; i++) {
                        var z=0;
                        for(var key in dayNames){
                            var valData = 0;
                            for (var j=0; j < result.length; j++) {
                                var data = result[j];
                                
                                if((data._id.day + "") === key && data._id.hour === i){
                                    valData = data.cnt;
                                }
                            };
                            tmpResult.push([i, z, valData]);
                            z++;
                        }		
                    }	

                    format["series"] = tmpResult;
                    response["message"] = "Get heatmap analytic success";
                    response["content"] = format;
                } else{
                    response["message"] = "Heatmap analytic not available";
                    response["content"] = format;
                }

                utils.setResponse(req, res, response);
            });
        });
    }

    static async getHeatMapAnalytic(req, res) {
        //curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getHeatMapAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "329504750", "dateFrom":"2016-01-01", "dateUntil":"2021-11-16", "source": "instagram"} }'
        //curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getHeatMapAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "71537099", "dateFrom":"2016-01-01", "dateUntil":"2021-11-16", "source": "twitter"} }'
        
        let self = this;
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["userId", "source"];

        utils.checkParameter(req, res, required, function() {
            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

            const model = self.checkSource(req);

            model.getPostCountByDayHour(req.body, function(result) {
            
                var series = [];
                var dayNames = config.APP_DAYOFWEEK_MONGO;

                for (var key in dayNames) {
                    if (dayNames.hasOwnProperty(key)) {
                        series.push({
                            "name": dayNames[key],
                            "data": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                        });
                    }
                }

                if(result && result.length){
                    Array.from(result).forEach(function(v, i) {
                        let indexDay = v.day - 1;
                        series[indexDay]["data"][v.hour] = v.count;
                    });
                    response["message"] = "Get heatmap analytic success";
                    response["content"] = series;
                } else{
                    response["message"] = "Heatmap analytic not available";
                    response["content"] = series;
                }

                utils.setResponse(req, res, response);
            });
        });
    }

    static async getContentDistributionAnalytic(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getContentDistributionAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params":  { "userId" : "466551933", "dateFrom":"2016-01-01", "dateUntil":"2021-11-11", "source": "instagram"} }'
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getContentDistributionAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params":  { "userId" : "71537099", "dateFrom":"2015-01-01", "dateUntil":"2021-11-11", "source": "twitter"} }'
        
        let self = this;
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["userId", "source"];

        utils.checkParameter(req, res, required, function() {
            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

            const model = self.checkSource(req);

            model.getPostCountByClassification(req.body, function(result) {
                let labels = [];
                let series = [
                    {
                        "name": "Safe Count",
                        "data": []
                    },
                    {
                        "name": "Negative Count",
                        "data": []
                    }
                ];

                result.forEach(element => {
                    if ((element.positive !== 0 && element.negative !== 0) || (element.positive === 0 || element.negative === 0)) {
                        series[0]["data"].push(element.positive);
                        series[1]["data"].push(element.negative);
                        labels.push(element.timestamp);
                    }
                });

                response["content"] = {
                    "series": series,
                    "categories": labels
                };

                utils.setResponse(req, res, response);
            });
        });
    }
    
    static async getBetweennessAnalytic(req, res) {
        //curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getBetweennessAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId": "329504750", "dateFrom": "2015-01-01 00:00:00", "dateUntil": "2021-11-13 00:00:00", "source": "instagram" } }'
        //curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getBetweennessAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId": "146337238", "dateFrom": "2015-01-01 00:00:00", "dateUntil": "2021-11-13 00:00:00", "source": "twitter" } }'
        
        let self = this;
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["userId", "dateFrom", "dateUntil", "source"];

        utils.checkParameter(req, res, required, function() {
            let resultFinal = [];

            const model = self.checkSource(req);

            model.getProfileInfo(req.body, function(profile) {
                let profileInfo = {
                    "username" : profile.username,
                    "fullName" : profile.fullName,
                    "profilePic" : profile.profilePic,
                    "isPrivate" : profile.isPrivate,
                    "isVerified" : profile.isVerified,
                }
                
                model.getBetweennessAnalytic(req.body, profile.username, function(result) {
                    response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                    
                    if (result && result.length) {
                        Array.from(result).forEach(function(v, i) {
                            let val = v;
                            val["destination"] = profileInfo;
                            resultFinal.push(val);
                        });

                        response["message"] = "Get betweenness analysis success";
                        response["content"] = {
                            "target": profileInfo,
                            "relation": resultFinal
                        }
                    } else {
                        response["message"] = "Betweenness analysis not available";
                        response["content"] = {
                            "target": profileInfo,
                            "relation": []
                        }
                    }

                    utils.setResponse(req, res, response);
                });
            });
        });
    }

    static async getScoringAnalytic(req, res) {
        //curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getScoringAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "329504750", "source":"instagram" } }'
        //curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getScoringAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "146337238", "source":"twitter" } }'
        
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["userId", "source"];

        utils.checkParameter(req, res, required, function() {
            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
            
            modelAnalyzer.getProfileInfo(req.body, function(account) {
                modelScoring.getScoring(req.body, function(result) {
                    response["message"] = (result && Object.keys(result).length > 0) ? "Check social media account success" : "Categorization scoring is still in progress";
                    response["content"]["profiled"] = (account && Object.keys(account).length > 0) ? true : false;
                    response["content"]["scoring"] = (result && Object.keys(result).length > 0) ? result.content : {};
                    response["content"]["tooltip"] = (result && Object.keys(result).length > 0) ? result.tooltip : {};
                    response["content"]["reason"] = (result && Object.keys(result).length > 0) ? result.reason : {};

                    utils.setResponse(req, res, response);
                });
            });
        });
    }

    static async recalculateScoring(req, res) {
        //curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "recalculateScoring", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "status": 1 } }'
        
        let self = this;
        let response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
        let required = ["status"];

        utils.checkParameter(req, res, required, function() {
            modelScoring.getProfileListForScoring(req.body, function(profileList) {
                //yang belum pernah di scoring
                if (profileList && profileList.length > 0) {
                    
                    if(req.body.params.status === 1){
                        self.loopUpdateStatusScoring(profileList, 0, function(){
                            self.loopScoring(profileList, 0, function(){});
                        });
                    }

                    response["content"] = false;
                } else{
                    response["content"] = true;
                }

                utils.setResponse(req, res, response);
            });
        });
    }

    static async loopUpdateStatusScoring(arr, ind, cb){
        let self = this;

        if (ind < arr.length) {
            let data = arr[ind];
            let params = {
                "_id": data._id,
                "status": 0
            };
            modelScoring.updateScoring(params, function(resLoop){
                self.loopUpdateStatusScoring(arr, (ind + 1), function() {
                    cb();
                });
            })
        } else {
            cb();
        }
    }

    static async getScoringNew(userId, source, cb){
        let self = this;

        var objScore = {
            "Radicalism" : 0,
            "Hateful" : 0,
            "Porn" : 0,
            "Terrorism" : 0,
            "LGBT" : 0
        };

        var objDetailScore = {
            "Radicalism" : {},
            "Hateful" : {},
            "Porn" : {},
            "Terrorism" : {},
            "LGBT" : {}
        }

        const modelScoring = self.checkSource(source);

        modelScoring.getTextScoring(userId, function(result){ 
            
            let scoreTextTotalPostTerrorism = 0;
            let scoretextTotalPostRadicalism = 0;
            let scoretextTotalPostHateful = 0;
            let scoretextTotalPostPorn = 0;
            let scoretextTotalPostLGBT = 0;

            if(result){
                scoreTextTotalPostTerrorism = 0;
                scoretextTotalPostRadicalism = ((result.countRadicalism + result.countPropaganda)/result.countData) * 25;
                scoretextTotalPostHateful = ((result.countHateful + result.countSentiment)/result.countData) * 25;
                scoretextTotalPostPorn = ((result.countPorn + result.countSexy)/result.countData) * 25;
                scoretextTotalPostLGBT = (result.countLgbt/result.countData) * 25;
            }

            objScore["Radicalism"] += scoretextTotalPostRadicalism;
            objScore["Hateful"] += scoretextTotalPostHateful;
            objScore["Porn"] += scoretextTotalPostPorn;
            objScore["Terrorism"] += scoreTextTotalPostTerrorism;
            objScore["LGBT"] += scoretextTotalPostLGBT;

            objDetailScore["Radicalism"]["textScoring"] = scoretextTotalPostRadicalism;
            objDetailScore["Hateful"]["textScoring"] = scoretextTotalPostHateful;
            objDetailScore["Porn"]["textScoring"] = scoretextTotalPostPorn;
            objDetailScore["Terrorism"]["textScoring"] = scoreTextTotalPostTerrorism;
            objDetailScore["LGBT"]["textScoring"] = scoretextTotalPostLGBT;
            
            
            modelScoring.getImageScoring(userId, function(result){ 
                
                let scoreimageTotalPostTerrorism = 0;
                let scoreimageTotalPostRadicalism = 0;
                let scoreimageTotalPostHateful = 0;
                let scoreimageTotalPostPorn= 0;
                let scoreimageTotalPostLGBT = 0;

                if(result){
                    scoreimageTotalPostTerrorism = (result.countTerorist/result.countData) * 50;
                    scoreimageTotalPostRadicalism = (result.countRadicalism/result.countData) * 25;
                    scoreimageTotalPostHateful = (result.countHateful/result.countData) * 25;
                    scoreimageTotalPostPorn= (result.countPorn/result.countData) * 25;
                    scoreimageTotalPostLGBT = (result.countLgbt/result.countData) * 25;
                }

                objScore["Radicalism"] += scoreimageTotalPostRadicalism;
                objScore["Hateful"] += scoreimageTotalPostHateful;
                objScore["Porn"] += scoreimageTotalPostPorn;
                objScore["Terrorism"] += scoreimageTotalPostTerrorism;
                objScore["LGBT"] += scoreimageTotalPostLGBT;

                objDetailScore["Radicalism"]["imgScoring"] = scoreimageTotalPostRadicalism;
                objDetailScore["Hateful"]["imgScoring"] = scoreimageTotalPostHateful;
                objDetailScore["Porn"]["imgScoring"] = scoreimageTotalPostPorn;
                objDetailScore["Terrorism"]["imgScoring"] = scoreimageTotalPostTerrorism;
                objDetailScore["LGBT"]["imgScoring"] = scoreimageTotalPostLGBT;

                
                
                let late = [0,1,2,3,4,5];
                let morning = [6,7,8,9,10,11];
                let afternoon = [12,13,14,15,16,17];
                let night = [18,19,20,21,22,23];

                let previousTimestamp = null;
                let currentTimestamp = null;

                let arrTextDailyRad = [];
                let arrTextDailyHate = [];
                let arrTextDailyPorn = [];
                let arrTextDailyLgbt = [];

                modelScoring.getTextDailyPost(userId, function(result){ 
                    
                    if(result && result.length>0){
                        Array.from(result).forEach(function(v, i) {
                            let arrTextRad = [0,0,0,0];
                            let arrTextHate = [0,0,0,0];
                            let arrTextPorn = [0,0,0,0];
                            let arrTextLgbt = [0,0,0,0];
                            currentTimestamp = v.timestamp;
    
                            if(late.indexOf(v.hour)> 0){
                                if(v.countRadicalism > 0){
                                    arrTextRad[0] = 1;
                                } 
    
                                if(v.countHateful > 0){
                                    arrTextHate[0] = 1;
                                }
    
                                if(v.countPorn > 0){
                                    arrTextPorn[0] = 1;
                                }
    
                                if(v.countLgbt > 0){
                                    arrTextLgbt[0] = 1;
                                }
                            } else if(morning.indexOf(v.hour)> 0){
                                if(v.countRadicalism > 0){
                                    arrTextRad[1] = 1;
                                } 
    
                                if(v.countHateful > 0){
                                    arrTextHate[1] = 1;
                                }
    
                                if(v.countPorn > 0){
                                    arrTextPorn[1] = 1;
                                }
    
                                if(v.countLgbt > 0){
                                    arrTextLgbt[1] = 1;
                                }
                            } else if(afternoon.indexOf(v.hour)> 0){
                                if(v.countRadicalism > 0){
                                    arrTextRad[2] = 1;
                                } 
    
                                if(v.countHateful > 0){
                                    arrTextHate[2] = 1;
                                }
    
                                if(v.countPorn > 0){
                                    arrTextPorn[2] = 1;
                                }
    
                                if(v.countLgbt > 0){
                                    arrTextLgbt[2] = 1;
                                }
                            } else if(night.indexOf(v.hour)> 0){
                                if(v.countRadicalism > 0){
                                    arrTextRad[3] = 1;
                                } 
    
                                if(v.countHateful > 0){
                                    arrTextHate[3] = 1;
                                }
    
                                if(v.countPorn > 0){
                                    arrTextPorn[3] = 1;
                                }
    
                                if(v.countLgbt > 0){
                                    arrTextLgbt[3] = 1;
                                }
                            }
    
                            if(previousTimestamp != currentTimestamp){
                                arrTextDailyRad.push((arrTextRad.reduce((a, b) => a + b, 0) / 4) * 20);
                                arrTextDailyHate.push((arrTextHate.reduce((a, b) => a + b, 0) / 4) * 20);
                                arrTextDailyPorn.push((arrTextPorn.reduce((a, b) => a + b, 0) / 4) * 20);
                                arrTextDailyLgbt.push((arrTextLgbt.reduce((a, b) => a + b, 0) / 4) * 20);
                            }
    
                            previousTimestamp = currentTimestamp;
                        });
                    }
                    
                    let arrImgDailyRad = [];
                    let arrImgDailyHate = [];
                    let arrImgDailyPorn = [];
                    let arrImgDailyTerrorist = [];
                    let arrImgDailyLgbt = [];

                    modelScoring.getImageDailyPost(userId, function(result){ 
                        
                        if(result && result.length>0){
                            Array.from(result).forEach(function(v, i) {
                                let arrImgRad = [0,0,0,0];
                                let arrImgHate = [0,0,0,0];
                                let arrImgPorn = [0,0,0,0];
                                let arrImgTerrorist = [0,0,0,0];
                                let arrImgLgbt = [0,0,0,0];
    
                                currentTimestamp = v.timestamp;
        
                                if(late.indexOf(v.hour)> 0){
                                    if(v.countRadicalism > 0){
                                        arrImgRad[0] = 1;
                                    } 
        
                                    if(v.countHateful > 0){
                                        arrImgHate[0] = 1;
                                    }
        
                                    if(v.countPorn > 0){
                                        arrImgPorn[0] = 1;
                                    }
    
                                    if(v.countTerorist > 0){
                                        arrImgTerrorist[0] = 1;
                                    }
    
                                    if(v.countLgbt > 0){
                                        arrImgLgbt[0] = 1;
                                    }
                                } else if(morning.indexOf(v.hour)> 0){
                                    if(v.countRadicalism > 0){
                                        arrImgRad[1] = 1;
                                    } 
        
                                    if(v.countHateful > 0){
                                        arrImgHate[1] = 1;
                                    }
        
                                    if(v.countPorn > 0){
                                        arrImgPorn[1] = 1;
                                    }
    
                                    if(v.countTerorist > 0){
                                        arrImgTerrorist[1] = 1;
                                    }
    
                                    if(v.countLgbt > 0){
                                        arrImgLgbt[1] = 1;
                                    }
                                } else if(afternoon.indexOf(v.hour)> 0){
                                    if(v.countRadicalism > 0){
                                        arrImgRad[2] = 1;
                                    } 
        
                                    if(v.countHateful > 0){
                                        arrImgHate[2] = 1;
                                    }
        
                                    if(v.countPorn > 0){
                                        arrImgPorn[2] = 1;
                                    }
    
                                    if(v.countTerorist > 0){
                                        arrImgTerrorist[2] = 1;
                                    }
    
                                    if(v.countLgbt > 0){
                                        arrImgLgbt[2] = 1;
                                    }
                                } else if(night.indexOf(v.hour)> 0){
                                    if(v.countRadicalism > 0){
                                        arrImgRad[3] = 1;
                                    } 
        
                                    if(v.countHateful > 0){
                                        arrImgHate[3] = 1;
                                    }
        
                                    if(v.countPorn > 0){
                                        arrImgPorn[3] = 1;
                                    }
    
                                    if(v.countTerorist > 0){
                                        arrImgTerrorist[3] = 1;
                                    }
    
                                    if(v.countLgbt > 0){
                                        arrImgLgbt[3] = 1;
                                    }
                                }
        
                                if(previousTimestamp != currentTimestamp){
                                    arrImgDailyRad.push((arrImgRad.reduce((a, b) => a + b, 0) / 4) * 20);
                                    arrImgDailyHate.push((arrImgHate.reduce((a, b) => a + b, 0) / 4) * 20);
                                    arrImgDailyPorn.push((arrImgPorn.reduce((a, b) => a + b, 0) / 4) * 20);
                                    arrImgDailyTerrorist.push((arrImgTerrorist.reduce((a, b) => a + b, 0) / 4) * 20);
                                    arrImgDailyLgbt.push((arrImgLgbt.reduce((a, b) => a + b, 0) / 4) * 20);
                                }
        
                                previousTimestamp = currentTimestamp;
                            });
                        }

                        if(arrTextDailyRad.length > 0 && arrImgDailyRad.length > 0){
                            objScore["Radicalism"] += Math.max(Math.max.apply(null, arrTextDailyRad), Math.max.apply(null, arrImgDailyRad)); 
                            objDetailScore["Radicalism"]["daily"] = Math.max(Math.max.apply(null, arrTextDailyRad), Math.max.apply(null, arrImgDailyRad));
                        } else{
                            objDetailScore["Radicalism"]["daily"] = 0;
                        }
                        
                        if(arrTextDailyHate.length > 0 && arrImgDailyHate.length > 0){
                            objScore["Hateful"] += Math.max(Math.max.apply(null, arrTextDailyHate), Math.max.apply(null, arrImgDailyHate));
                            objDetailScore["Hateful"]["daily"] = Math.max(Math.max.apply(null, arrTextDailyHate), Math.max.apply(null, arrImgDailyHate));
                        } else{
                            objDetailScore["Hateful"]["daily"] = 0;
                        }

                        if(arrTextDailyPorn.length > 0 && arrImgDailyPorn.length > 0){
                            objScore["Porn"] += Math.max(Math.max.apply(null, arrTextDailyPorn), Math.max.apply(null, arrImgDailyPorn));
                            objDetailScore["Porn"]["daily"] = Math.max(Math.max.apply(null, arrTextDailyPorn), Math.max.apply(null, arrImgDailyPorn));
                        } else{
                            objDetailScore["Porn"]["daily"] = 0;
                        }

                        if(arrImgDailyTerrorist.length > 0){
                            objScore["Terrorism"] += Math.max.apply(null, arrImgDailyTerrorist);
                            objDetailScore["Terrorism"]["daily"] = Math.max.apply(null, arrImgDailyTerrorist);
                        } else{
                            objDetailScore["Terrorism"]["daily"] = 0;
                        }

                        if(arrTextDailyLgbt.length > 0 && arrImgDailyLgbt.length > 0){
                            objScore["LGBT"] += Math.max(Math.max.apply(null, arrTextDailyLgbt), Math.max.apply(null, arrImgDailyLgbt));
                            objDetailScore["LGBT"]["daily"] = Math.max(Math.max.apply(null, arrTextDailyLgbt), Math.max.apply(null, arrImgDailyLgbt));
                        } else{
                            objDetailScore["LGBT"]["daily"] = 0;
                        }

                        modelScoring.getInteraction(userId, function(result){
                            let arrRad = [];
                            let arrHateful = [];
                            let arrPorn = [];
                            let arrTerorist = [];
                            let arrLgbt = [];
                            
                            let scoreRadInteraction = 0;
                            let scoreHatefulInteraction = 0;
                            let scorePornInteraction = 0;
                            let scoreTerrorismInteraction = 0;
                            let scoreLgbtInteraction = 0;

                            if(result && result.length>0){
                                Array.from(result).forEach(function(v, i) {
                                    arrRad.push(v.interactionRadical);
                                    arrHateful.push(v.interactionHateful);    
                                    arrPorn.push(v.interactionPorn);    
                                    arrTerorist.push(v.interactionTerorist);
                                    arrLgbt.push(v.interactionLgbt);
                                });

                                let mathRad = quartile(arrRad);
                                
                                let mathHateful = quartile(arrHateful);
                                
                                let mathPorn = quartile(arrPorn);
                                
                                let mathTerrorism = quartile(arrTerorist);
                                
                                let mathLgbt = quartile(arrLgbt);
                                

                                var nanCek = NaN;
                                if((mathRad.max && typeof mathRad.max !== 'undefined' && mathRad.max !== nanCek) || mathRad.max != 0){
                                    if((mathRad.q3 && typeof mathRad.q3 !== 'undefined' && mathRad.q3 !== nanCek)){
                                        scoreRadInteraction = (mathRad.q3 / mathRad.max) * 30;
                                    }
                                }
                                
                                if((mathHateful.max && typeof mathHateful.max !== 'undefined' && mathHateful.max !== nanCek) || mathHateful.max != 0){
                                    if((mathHateful.q3 && typeof mathHateful.q3 !== 'undefined' && mathHateful.q3 !== nanCek)){
                                        scoreHatefulInteraction = (mathHateful.q3 / mathHateful.max) * 30;
                                    }
                                } 
                                
                                if((mathPorn.max && typeof mathPorn.max !== 'undefined' && mathPorn.max !== nanCek) || mathPorn.max != 0){
                                    if((mathPorn.q3 && typeof mathPorn.q3 !== 'undefined' && mathPorn.q3 !== nanCek)){
                                        scorePornInteraction = (mathPorn.q3 / mathPorn.max) * 30;
                                    }
                                }

                                if((mathTerrorism.max && typeof mathTerrorism.max !== 'undefined' && mathTerrorism.max !== nanCek) || mathTerrorism.max != 0){
                                    if((mathTerrorism.q3 && typeof mathTerrorism.q3 !== 'undefined' && mathTerrorism.q3 !== nanCek)){
                                        scoreTerrorismInteraction = (mathTerrorism.q3 / mathTerrorism.max) * 30;
                                    }
                                }

                                if((mathLgbt.max && typeof mathLgbt.max !== 'undefined' && mathLgbt.max !== nanCek) || mathLgbt.max != 0){
                                    if((mathLgbt.q3 && typeof mathLgbt.q3 !== 'undefined' && mathLgbt.q3 !== nanCek)){
                                        scoreLgbtInteraction = (mathLgbt.q3 / mathLgbt.max) * 30;
                                    }
                                }
                            }

                            if(scoreRadInteraction != null){
                                objScore["Radicalism"] += scoreRadInteraction;
                                objDetailScore["Radicalism"]["interaction"] = scoreRadInteraction;
                            }

                            if(scoreHatefulInteraction != null){
                                objScore["Hateful"] += scoreHatefulInteraction;
                                objDetailScore["Hateful"]["interaction"] = scoreHatefulInteraction;
                            }

                            if(scorePornInteraction != null){
                                objScore["Porn"] += scorePornInteraction;
                                objDetailScore["Porn"]["interaction"] = scorePornInteraction;
                            }

                            if(scoreTerrorismInteraction != null){
                                objScore["Terrorism"] += scoreTerrorismInteraction;
                                objDetailScore["Terrorism"]["interaction"] = scoreTerrorismInteraction;
                            }

                            if(scoreLgbtInteraction != null){
                                objScore["LGBT"] += scoreLgbtInteraction;
                                objDetailScore["LGBT"]["interaction"] = scoreLgbtInteraction; 
                            }
                            
                            
                            let response = {
                                "content": objScore,
                                "tooltip": objDetailScore
                            }

                            cb(response);
                        });
                    });
                });
            });
        });
    }

    static async loopScoring(arr, ind, cb){
        let self = this;

        if (ind < arr.length) {
            let data = arr[ind];

            self.getScoringNew(data.userId, data.source, function(result){  
                let id = data.source+"_"+data.userId;
                let filterProfile = {
                    "source": data.source,
                    "userId": data.userId,
                    "tooltip": result.tooltip,
                    "content": result.content,
                    "reason": [],
                    "status": 1
                }
                
                let updateProfile = {
                    "params": {
                        "_id": data._id,
                        "dateScoring": moment().utcOffset(7).utc(true).toDate()
                    }
                }

                modelBlacklist.checkBlacklistByValue(data.username, function(resBlacklist){
                    if(resBlacklist && resBlacklist.length > 0){
                        resBlacklist.forEach(element => {
                            
                            element.categories.forEach(val => {
                                
                                if (element.note) {
                                    filterProfile["reason"].push("("+val+") "+element.note);

                                    if (val === "Radicalism") {
                                        filterProfile["content"]["Radicalism"] = 100;
                                    } else if (val === "Hateful") {
                                        filterProfile["content"]["Hateful"] = 100;
                                    } else if (val === "Porn") {
                                        filterProfile["content"]["Porn"] = 100;
                                    } else if (val === "Terrorism") {
                                        filterProfile["content"]["Terrorism"] = 100;
                                    } else if (val === "LGBT") {
                                        filterProfile["content"]["LGBT"] = 100;
                                    } 
                                }
                            });
                        });

                        
                        modelAnalyzer.updateScoring(id, filterProfile, function(){
                            modelAnalyzer.updateProfile(updateProfile, function(){
                                self.loopScoring(arr, (ind + 1), function() {
                                    cb();
                                });
                            });
                        });
                    } else{
                        modelAnalyzer.updateScoring(id, filterProfile, function(){
                            modelAnalyzer.updateProfile(updateProfile, function(){
                                self.loopScoring(arr, (ind + 1), function() {
                                    cb();
                                });
                            });
                        });
                    }
                }); 
            });
        } else {
            cb();
        }
    }

    static async getWordCloudAnalytic(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getWordCloudAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId": "329504750", "dateFrom": "2015-01-01 00:00:00", "dateUntil": "2021-11-13 00:00:00", "source": "instagram", "type":"unigram", "filter":{"ner":{"person":1},"postag":{"verb":1}}} }'
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getWordCloudAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId": "146337238", "dateFrom": "2015-01-01 00:00:00", "dateUntil": "2021-11-13 00:00:00", "source": "twitter", "type":"unigram", "filter":{"ner":{"person":1},"postag":{"verb":1}}} }'
        
        let self = this;
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["userId", "source"];

        utils.checkParameter(req, res, required, function() {
            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

            const model = self.checkSource(req);
            
            model.getNgramWord(req.body, function(result) {
                let data = [];
                let obj = {};

                if (result && result.length) {
                    Array.from(result).forEach(function(v, i){
                        obj = {
                            "name": v._id,
                            "weight": v.weight,
                            "posTagging": v.posTagging,
                            "namedEntityRecognition": v.namedEntityRecognition
                        }

                        data.push(obj);
                    });

                    response["message"] = "Get word cloud success";
                    response["content"] = data;
                } else{
                    response["message"] = "Word cloud not available";
                    response["content"] = data;
                }

                utils.setResponse(req, res, response);
            });
        });
    }

    static async getFaceAnalytic(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getFaceAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "1370440485", "dateFrom": "2014-06-05 00:00:00", "dateUntil": "2021-10-08 23:59:59", "source": "instagram", "offset": 0, "limit": 5 } }'
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getFaceAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId": "146337238", "dateFrom": "2014-06-05 00:00:00", "dateUntil": "2021-10-08 23:59:59", "source": "twitter", "offset": 0, "limit": 5 } }'
        
        let self = this;
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["userId", "dateFrom", "dateUntil", "source"];

        utils.checkParameter(req, res, required, function() {
            const model = self.checkSource(req);
            
            model.getFaceAnalytic(req.body, function(resultCount, result) {
                if (result && result.length) {
                    response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                    response["message"] = "Get face analytic success";
                    response["content"] = {
                        "count": resultCount,
                        "results": result
                    };
                } else{
                    response = utils.duplicateObject(msg.SUCCESS_DATA_NOT_FOUND);
                    response["message"] = "Face not available";
                    response["content"] = {
                        "count": 0,
                        "results": []
                    };
                }

                utils.setResponse(req, res, response);
            });
        });
    }

    static async getFaceCluster(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getFaceCluster", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "source": "instagram", "userId" : "329504750" } }'
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getFaceCluster", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "source": "twitter", "userId": "146337238" } }'
        
        let self = this;
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["source", "userId"];

        utils.checkParameter(req, res, required, function() {
            const model = self.checkSource(req);

            model.getProfileInfo(req.body, function(resultProfile) {
                if (resultProfile && Object.keys(resultProfile).length > 0) {
                    modelFaceCluster.getFaceCluster(req.body, function(result) {
                        response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                        
                        if (result && Object.keys(result).length > 0) {
                            response["message"] = "Get face cluster success";
                            response["content"] = result;
                        } else {
                            response["message"] = "Face cluster not available";
                            response["content"] = [];
                        }
                        
                        utils.setResponse(req, res, response);
                    });
                } else {
                    response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                    response["message"] = "Profile info not available";
                    response["content"] = [];

                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static async getWordLinkAnalytic(req, res) {
        //curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getWordLinkAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId": "329504750", "dateFrom": "2016-01-01", "dateUntil": "2021-11-11", "source": "instagram", "limit":100, "type":"bigram"} }'
        //curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getWordLinkAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId": "146337238", "dateFrom": "2016-01-01", "dateUntil": "2021-11-11", "source": "twitter", "limit":100, "type":"trigram"} }'
        
        let self = this;
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["userId", "source"];

        utils.checkParameter(req, res, required, function() {
            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

            const model = self.checkSource(req);

            // req.body.params["type"] = "bigram";
            model.getNgramWord(req.body, function(result) {

                let data = [];

                if(result && result.length){
                    if(req.body.params.type = "bigram"){
                        Array.from(result).forEach(function(v, i) {
                            let splitWord = v._id.split(" ");
                            data.push({"from":splitWord[0], "to":splitWord[1], "weight":v.weight});
                        });
                    } else{
                        Array.from(result).forEach(function(v, i) {
                            let splitWord = v._id.split(" ");
                            data.push({"from":splitWord[0], "to":splitWord[1], "weight":v.weight});
                            data.push({"from":splitWord[0], "to":splitWord[2], "weight":v.weight});
                        });
                    }

                    response["message"] = "Get word link success";
                    response["content"] = [{data: data,type: 'dependencywheel',name: 'Total Words'}];
                } else{
                    
                    response["message"] = "Word link not available";
                    response["content"] = [{data: [],type: 'dependencywheel',name: 'Total Words'}];
                }

                utils.setResponse(req, res, response);
            });
        });
    }

    static async getPeopleKnowThisAccount(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getPeopleKnowThisAccount", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "msisdns" : ["6285716355399","6281286879898"]} }'

        let self = this;
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["msisdns"];

        utils.checkParameter(req, res, required, function() {
            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

            modelCallerName.getPeopleKnowThisAccount(req.body, function(result) {
                // var series = [];
                // let data = [];
                // let obj = {
                //     keys: ['from', 'to', 'weight'],
                //     data: data,
                //     type: 'sankey',
                //     name: 'People Know This Account'
                // };

                if(result && result.length){
                    // Array.from(result).forEach(function(v, i) {
                    //     let splitWord = v._id.split(" ");
                    //     if(splitWord.length > 1){
                    //         data.push([splitWord[0], splitWord[1], v.count]);
                    //     } else{
                    //         data.push([splitWord[0], null, v.count]);
                    //     }
                    // });
                    // series.push(obj);

                    response["message"] = "Get people know this account success";
                    response["content"] = result;
                } else{
                    // series.push(obj);
                    
                    response["message"] = "People know this account not available";
                    response["content"] = [];
                }

                utils.setResponse(req, res, response);
            });
        });
    }

    static async getRawData(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getRawData", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "683866614", "date":"2021-09-26", "source":"instagram", "chart": "getTimeBaseAnalytics", "offset": 0, "limit": 25} }'
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getRawData", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "658987023", "date":"2018-06-14", "source":"instagram", "chart": "getTimeBaseAnalytics", "offset": 0, "limit": 25, "type": 0} }'
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getRawData", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "683866614", "dateFrom":"2013-11-12", "dateUntil":"2021-11-07", "source":"instagram", "chart": "getTimeBaseAnalytics", "offset": 0, "limit": 25, "dayOfWeek": 7, "hour": 0, "categories":["Radicalism","Porn"],"includes":["ipeng"],"excludes":["fariz"]} }'
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getRawData", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "658987023", "dateFrom":"2013-11-12", "dateUntil":"2021-11-07", "source":"instagram", "chart": "getCategoryBaseAnalytics", "offset": 0, "limit": 25, "category":"porn"} }'
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getRawData", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "329504750", "dateFrom":"2013-11-12", "dateUntil":"2021-11-07", "source":"instagram", "chart": "getInteractionBaseAnalytics", "offset": 0, "limit": 25, "friend":"jejeadvisar", "type": "Radicalism [T]"} }'
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getRawData", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "329504750", "dateFrom":"2013-11-12", "dateUntil":"2021-11-07", "source":"instagram", "chart": "getWordBaseAnalytics", "offset": 0, "limit": 25, "type":"unigram", "word":["senyum"]} }'
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getRawData", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "329504750", "dateFrom":"2013-11-12", "dateUntil":"2021-11-07", "source":"instagram", "chart": "getWordBaseAnalytics", "offset": 0, "limit": 25, "type":"bigram", "word":["friends", "lecturers"]} }'
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getRawData", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "329504750", "source":"instagram", "chart": "getPost", "offset": 0, "limit": 25} }'
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getRawData", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "329504750", "source":"instagram", "chart": "getFollowing", "offset": 0, "limit": 25} }'
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticAccount", "subAction": "getRawData", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "userId" : "329504750", "source":"instagram", "chart": "getFollower", "offset": 0, "limit": 25} }'

        let self = this;
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["userId", "source", "chart", "offset", "limit"];
        
        utils.checkParameter(req, res, required, function() {

            const model = self.checkRawDataSource(req);
            
            model[req.body.params.chart](req.body, function(count, result) {
                let friend = {};

                if (result && result.length > 0){
                    response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                    response["message"] = "Get raw data success";
                    
                    if(req.body.params.chart === "getInteractionBaseAnalytics"){
                        friend = {
                            "username" : result[0].username,
                            "fullName": result[0].fullName,
                            "isPrivate": result[0].isPrivate,
                            "isVerified": result[0].isVerified,
                            "profilePic": result[0].profilePic
                        }
                        response["content"] = {
                            "count": result[0].posts.length,
                            "results": result[0].posts,
                            "friend": friend
                        };
                    } else{
                        response["content"] = {
                            "count": count,
                            "results": result
                        };
                    }
                } else{
                    response["message"] = "Cannot retrieve raw data right now";
                    response["content"] = {
                        "count": 0,
                        "results": []
                    };
                }

                utils.setResponse(req, res, response);
            });
        });
    }

    static checkRawDataSource(req) {
        let modelSource = null;

        if (req.body.params.source.toLowerCase() === "instagram") {
            modelSource = require(BASE_DIR + '/models/account/instagram/RawData');
        } else if (req.body.params.source.toLowerCase() === "twitter") {
            modelSource = require(BASE_DIR + '/models/account/twitter/RawData');
        }

        return modelSource;
    }

    static checkSource(req) {
        let modelSource = null;

        if (req.body.params.source.toLowerCase() === "instagram") {
            modelSource = require(BASE_DIR + '/models/account/instagram/Analytic');
        } else if (req.body.params.source.toLowerCase() === "twitter") {
            modelSource = require(BASE_DIR + '/models/account/twitter/Analytic');
        }

        return modelSource;
    }

    static checkScoringSource(source) {
        let modelSource = null;

        if (source.toLowerCase() === "instagram") {
            modelSource = require(BASE_DIR + '/models/account/instagram/Scoring');
        } else if (source.toLowerCase() === "twitter") {
            modelSource = require(BASE_DIR + '/models/account/twitter/Scoring');
        }

        return modelSource;
    }
    
}

module.exports = AnalyticAccountController;