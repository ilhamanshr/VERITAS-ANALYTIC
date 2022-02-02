const path             = require('path');
const BASE_DIR         = path.dirname(require.main.filename);

class Scoring{
    static async getScoring(userId, source, cb) {
        var objScore = {
            "Radicalism" : 0,
            "Hateful" : 0,
            "Porn" : 0,
            "Terrorism" : 0
        };

        var objDetailScore = {
            "Radicalism" : {},
            "Hateful" : {},
            "Porn" : {},
            "Terrorism" : {}
        }

        const modelScoring = self.checkSourceScoring(req);
        
        // text score = total text negatif / total text * 20%
        modelScoring.getTextScoring(req.body, function(result){ 
                          
            let scoreRadicalText = 0;
            let scoreHateText = 0;
            let scorePornText = 0;
            let scoreTerorismText = 0;
            let totalDataText = 0;

            if(result){
                totalDataText = result.countData;
                scoreRadicalText = (result.countRadicalism + result.countPropaganda) * 20 / totalDataText ;
                scoreHateText = (result.countOffensive + result.countSentiment) * 20 / totalDataText ;
                scorePornText = (result.countPorn + result.countSexy) * 20 / totalDataText ;

                objScore["Radicalism"] += scoreRadicalText;
                objScore["Hateful"] += scoreHateText;
                objScore["Porn"] += scorePornText;
                objScore["Terrorism"] += scoreTerorismText;

                objDetailScore["Radicalism"]["textScoring"] = scoreRadicalText;
                objDetailScore["Hateful"]["textScoring"] = scoreHateText;
                objDetailScore["Porn"]["textScoring"] = scorePornText;
                objDetailScore["Terrorism"]["textScoring"] = scoreTerorismText;
            } else{
                objScore["Radicalism"] += 0;
                objScore["Hateful"] += 0;
                objScore["Porn"] += 0;
                objScore["Terrorism"] += 0;

                objDetailScore["Radicalism"]["textScoring"] = 0;
                objDetailScore["Hateful"]["textScoring"] = 0;
                objDetailScore["Porn"]["textScoring"] = 0;
                objDetailScore["Terrorism"]["textScoring"] = 0;
            }

            // image score = total image negatif / total image * 20%
            modelScoring.getImageScoring(req.body, function(result){
                
                let scoreRadicalImg = 0;
                let scoreHateImg = 0;
                let scorePornImg = 0;
                let scoreTerorismImg = 0;
                let totalDataImg = 0;

                if(result){
                    totalDataImg = result.countData;
                    scoreRadicalImg = result.countRadicalism * 20 / totalDataImg ;
                    scoreHateImg = result.countHate * 20 / totalDataImg ;
                    scorePornImg = (result.countPorn + result.countSexy) * 20 / totalDataImg ;
                    scoreTerorismImg = result.countTerorist * 40 / totalDataImg ;

                    objScore["Radicalism"] += scoreRadicalImg;
                    objScore["Hateful"] += scoreHateImg;
                    objScore["Porn"] += scorePornImg;
                    objScore["Terrorism"] += scoreTerorismImg;
                    
                    objDetailScore["Radicalism"]["imgScoring"] = scoreRadicalImg;
                    objDetailScore["Hateful"]["imgScoring"] = scoreHateImg;
                    objDetailScore["Porn"]["imgScoring"] = scorePornImg;
                    objDetailScore["Terrorism"]["imgScoring"] = scoreTerorismImg;
                } else{
                    objScore["Radicalism"] += 0;
                    objScore["Hateful"] += 0;
                    objScore["Porn"] += 0;
                    objScore["Terrorism"] += 0;
                    
                    objDetailScore["Radicalism"]["imgScoring"] = 0;
                    objDetailScore["Hateful"]["imgScoring"] = 0;
                    objDetailScore["Porn"]["imgScoring"] = 0;
                    objDetailScore["Terrorism"]["imgScoring"] = 0;
                }

                let morning = [6,7,8,9,10,11];
                let afternoon = [12,13,14,15,16,17];
                let night = [18,19,20,21,22,23];

                let dataArrQuartileRad = [];
                let dataArrQuartileHate = [];
                let dataArrQuartilePorn = [];
                let dataArrQuartileTerorism = [];

                let previousTimestamp = null;
                let currentTimestamp = null;

                let countRad = 0;
                let countHate = 0;
                let countPorn = 0;
                let countTerorist = 0;
                // daily activirty = max post daily  / 3 * 20%
                modelScoring.getTextDailyPost(req.body, function(result){

                    if(result){
                        Array.from(result).forEach(function(v, i) {
                            currentTimestamp = v.timestamp;

                            //radical
                            if(morning.indexOf(v.hour)>= 0){
                                if(v.countRadicalism > 0){
                                    if(countRad<=3){
                                        countRad += 1;
                                    }
                                } 
                            } else if(afternoon.indexOf(v.hour)>= 0){
                                if(v.countRadicalism > 0){
                                    if(countRad<=3){
                                        countRad += 1;
                                    }
                                }
                            } else if(night.indexOf(v.hour)>= 0){
                                if(v.countRadicalism > 0){
                                    if(countRad<=3){
                                        countRad += 1;
                                    }
                                }
                            }

                            //hate
                            if(morning.indexOf(v.hour)>= 0){
                                if(v.countHate > 0){
                                    if(countHate<=3){
                                        countHate += 1;
                                    }
                                } 
                            } else if(afternoon.indexOf(v.hour)>= 0){
                                if(v.countHate > 0){
                                    if(countHate<=3){
                                        countHate += 1;
                                    }
                                }
                            } else if(night.indexOf(v.hour)>= 0){
                                if(v.countHate > 0){
                                    if(countHate<=3){
                                        countHate += 1;
                                    }
                                }
                            }

                            //porn
                            if(morning.indexOf(v.hour)>= 0){
                                if(v.countPorn > 0){
                                    if(countPorn<=3){
                                        countPorn += 1;
                                    }
                                } 
                            } else if(afternoon.indexOf(v.hour)>= 0){
                                if(v.countPorn > 0){
                                    if(countPorn<=3){
                                        countPorn += 1;
                                    }
                                }
                            } else if(night.indexOf(v.hour)>= 0){
                                if(v.countPorn > 0){
                                    if(countPorn<=3){
                                        countPorn += 1;
                                    }
                                }
                            }

                            if(previousTimestamp != currentTimestamp){
                                if(countRad>0){
                                    dataArrQuartileRad.push(countRad);
                                } else if(countHate>0){
                                    dataArrQuartileHate.push(countHate);
                                } else if(countPorn>0){
                                    dataArrQuartilePorn.push(countPorn);
                                }
                               
                                countRad = 0;
                                countHate = 0;
                                countPorn = 0;
                            }

                            previousTimestamp = currentTimestamp;
                        });
                    }

                    modelScoring.getImageDailyPost(req.body, function(result){
                        previousTimestamp = null;
                        currentTimestamp = null;

                        if(result){
                            Array.from(result).forEach(function(v, i) {
                                currentTimestamp = v.timestamp;
                                
                                //radical
                                if(morning.indexOf(v.hour)>= 0){
                                    if(v.countRadicalism > 0){
                                        if(countRad<=3){
                                            countRad += 1;
                                        }
                                    } 
                                } else if(afternoon.indexOf(v.hour)>= 0){
                                    if(v.countRadicalism > 0){
                                        if(countRad<=3){
                                            countRad += 1;
                                        }
                                    }
                                } else if(night.indexOf(v.hour)>= 0){
                                    if(v.countRadicalism > 0){
                                        if(countRad<=3){
                                            countRad += 1;
                                        }
                                    }
                                }

                                //hate
                                if(morning.indexOf(v.hour)>= 0){
                                    if(v.countHate > 0){
                                        if(countHate<=3){
                                            countHate += 1;
                                        }
                                    } 
                                } else if(afternoon.indexOf(v.hour)>= 0){
                                    if(v.countHate > 0){
                                        if(countHate<=3){
                                            countHate += 1;
                                        }
                                    }
                                } else if(night.indexOf(v.hour)>= 0){
                                    if(v.countHate > 0){
                                        if(countHate<=3){
                                            countHate += 1;
                                        }
                                    }
                                }

                                //porn
                                if(morning.indexOf(v.hour)>= 0){
                                    if(v.countPorn > 0){
                                        if(countPorn<=3){
                                            countPorn += 1;
                                        }
                                    } 
                                } else if(afternoon.indexOf(v.hour)>= 0){
                                    if(v.countPorn > 0){
                                        if(countPorn<=3){
                                            countPorn += 1;
                                        }
                                    }
                                } else if(night.indexOf(v.hour)>= 0){
                                    if(v.countPorn > 0){
                                        if(countPorn<=3){
                                            countPorn += 1;
                                        }
                                    }
                                }

                                //terrorist
                                if(morning.indexOf(v.hour)>= 0){
                                    if(v.countTerorist > 0){
                                        if(countTerorist<=3){
                                            countTerorist += 1;
                                        }
                                    } 
                                } else if(afternoon.indexOf(v.hour)>= 0){
                                    if(v.countTerorist > 0){
                                        if(countTerorist<=3){
                                            countTerorist += 1;
                                        }
                                    }
                                } else if(night.indexOf(v.hour)>= 0){
                                    if(v.countTerorist > 0){
                                        if(countTerorist<=3){
                                            countTerorist += 1;
                                        }
                                    }
                                }

                                if(previousTimestamp != currentTimestamp){
                                    if(countRad>0){
                                        dataArrQuartileRad.push(countRad);
                                    } else if(countHate>0){
                                        dataArrQuartileHate.push(countHate);
                                    } else if(countPorn>0){
                                        dataArrQuartilePorn.push(countPorn);
                                    } else if(countTerorist>0){
                                        dataArrQuartileTerorism.push(countTerorist);
                                    } 
                                
                                    countRad = 0;
                                    countHate = 0;
                                    countPorn = 0;
                                    countTerorist = 0;
                                }

                                previousTimestamp = currentTimestamp;
                            });

                            let mathQuartileRad = null;
                            let scoreRadDaily = 0;
                            if(dataArrQuartileRad.length > 0){
                                mathQuartileRad = quartile(dataArrQuartileRad);
                                scoreRadDaily = mathQuartileRad.max * 20 / 3 ;
                            }
                            
                            let mathQuartileHate = null;
                            let scoreHateDaily = 0;
                            if(dataArrQuartileHate.length > 0){
                                mathQuartileHate = quartile(dataArrQuartileHate);
                                scoreHateDaily = mathQuartileHate.max * 20 / 3 ;
                            }

                            let mathQuartilePorn = null;
                            let scorePornDaily = 0;
                            if(dataArrQuartilePorn.length > 0){
                                mathQuartilePorn = quartile(dataArrQuartilePorn);
                                scorePornDaily = mathQuartilePorn.max * 20 / 3 ;
                            }

                            let mathQuartileTerorism = null;
                            let scoreTerorismDaily = 0;
                            if(dataArrQuartileTerorism.length > 0){
                                mathQuartileTerorism = quartile(dataArrQuartileTerorism);
                                scoreTerorismDaily = mathQuartileTerorism.max * 20 / 3 ;
                            }

                            objScore["Radicalism"] += scoreRadDaily;
                            objScore["Hateful"] += scoreHateDaily;
                            objScore["Porn"] += scorePornDaily;
                            objScore["Terrorism"] += scoreTerorismDaily;

                            objDetailScore["Radicalism"]["dailyPostScoring"] = scoreRadDaily;
                            objDetailScore["Hateful"]["dailyPostScoring"] = scoreHateDaily;
                            objDetailScore["Porn"]["dailyPostScoring"] = scorePornDaily;
                            objDetailScore["Terrorism"]["dailyPostScoring"] = scoreTerorismDaily;
                        } else{
                            objScore["Radicalism"] += 0;
                            objScore["Hateful"] += 0;
                            objScore["Porn"] += 0;
                            objScore["Terrorism"] += 0;

                            objDetailScore["Radicalism"]["dailyPostScoring"] = 0;
                            objDetailScore["Hateful"]["dailyPostScoring"] = 0;
                            objDetailScore["Porn"]["dailyPostScoring"] = 0;
                            objDetailScore["Terrorism"]["dailyPostScoring"] = 0;
                        }

                        // follower = if < 5000 then totalfollower / 5000 * 10% else 10%
                        modelScoring.getFollowerCount(req.body, function(result){
                            
                        let scoreFollower = 10;

                            if(result){
                                if(result.followerCount < 5000){
                                    scoreFollower = result.followerCount * 10 / 5000 ; 
                                }

                                objScore["Radicalism"] += scoreFollower;
                                objScore["Hateful"] += scoreFollower;
                                objScore["Porn"] += scoreFollower;
                                objScore["Terrorism"] += scoreFollower;

                                objDetailScore["Radicalism"]["followerScoring"] = scoreFollower;
                                objDetailScore["Hateful"]["followerScoring"] = scoreFollower;
                                objDetailScore["Porn"]["followerScoring"] = scoreFollower;
                                objDetailScore["Terrorism"]["followerScoring"] = scoreFollower;
                            } else{
                                objScore["Radicalism"] += 0;
                                objScore["Hateful"] += 0;
                                objScore["Porn"] += 0;
                                objScore["Terrorism"] += 0;

                                objDetailScore["Radicalism"]["followerScoring"] = 0;
                                objDetailScore["Hateful"]["followerScoring"] = 0;
                                objDetailScore["Porn"]["followerScoring"] = 0;
                                objDetailScore["Terrorism"]["followerScoring"] = 0;
                            }

                            // intercation = q3 interaction  / max interaction * 30%
                            modelScoring.getInteraction(req.body, function(result){
                                
                                let arrRad = [];
                                let arrHate = [];
                                let arrPorn = [];
                                let arrTerorist = [];
                                
                                if(result && result.length){
                                    Array.from(result).forEach(function(v, i) {
                                        arrRad.push(v.interactionRadical);
                                        arrHate.push(v.interactionHate);
                                        arrPorn.push(v.interactionPorn);
                                        arrTerorist.push(v.interactionTerorist);
                                    });

                                    let mathRad = quartile(arrRad);
                                    let mathHate = quartile(arrHate);
                                    let mathPorn = quartile(arrPorn);
                                    let mathTerorism = quartile(arrTerorist);

                                    let scoreRadInteraction = 0;
                                    if(mathRad.max != 0){
                                        scoreRadInteraction = mathRad.q3 * 30 / mathRad.max ;
                                    }
                                    
                                    let scoreHateInteraction = 0;
                                    if(mathHate.max != 0){
                                        scoreHateInteraction = mathHate.q3 * 30 / mathHate.max ;
                                    } 
                                    
                                    let scorePornInteraction = 0;
                                    if(mathPorn.max != 0){
                                        scorePornInteraction = mathPorn.q3 * 30 / mathPorn.max ;
                                    }

                                    let scoreTerorismInteraction = 0;
                                    if(mathTerorism.max != 0){
                                        scoreTerorismInteraction = mathTerorism.q3 * 30 / mathTerorism.max ;
                                    }

                                    objScore["Radicalism"] += scoreRadInteraction;
                                    objScore["Hateful"] += scoreHateInteraction;
                                    objScore["Porn"] += scorePornInteraction;
                                    objScore["Terrorism"] += scoreTerorismInteraction;

                                    objDetailScore["Radicalism"]["interactionScoring"] = scoreRadInteraction;
                                    objDetailScore["Hateful"]["interactionScoring"] = scoreHateInteraction;
                                    objDetailScore["Porn"]["interactionScoring"] = scorePornInteraction;
                                    objDetailScore["Terrorism"]["interactionScoring"] = scoreTerorismInteraction;
                                } else{
                                    objScore["Radicalism"] += 0;
                                    objScore["Hateful"] += 0;
                                    objScore["Porn"] += 0;
                                    objScore["Terrorism"] += 0;

                                    objDetailScore["Radicalism"]["interactionScoring"] = 0;
                                    objDetailScore["Hateful"]["interactionScoring"] = 0;
                                    objDetailScore["Porn"]["interactionScoring"] = 0;
                                    objDetailScore["Terrorism"]["interactionScoring"] = 0;
                                }

                                let result = {
                                    "content": objScore,
                                    "tooltip": objDetailScore
                                }

                                cb(result);
                            });
                        });
                    });
                });
            });
        });
    }

    static checkSource(source) {
        let modelSource = null;

        if (source.toLowerCase() === "instagram") {
            modelSource = require(BASE_DIR + '/models/instagram/Analytic');
        } else if (source.toLowerCase() === "twitter") {
            modelSource = require(BASE_DIR + '/models/twitter/Analytic');
        }

        return modelSource;
    }
}

module.exports = Scoring;