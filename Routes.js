const express   = require('express');
const router    = express.Router();
const path      = require('path');
const BASE_DIR  = path.dirname(require.main.filename);

/*
|--------------------------------------------------------------------------
| Below is example for API use
|--------------------------------------------------------------------------
*/

const logger    = require(BASE_DIR + '/Logger');
const utils     = require(BASE_DIR + '/Utils');
const msg       = require(BASE_DIR + '/Messages');
const fs        = require('fs');

router.post('/api', function(req, res) {
    req.body["clientIp"] = (req.body.hasOwnProperty("clientIp") && req.body.clientIp) ? req.body.clientIp : "";

    let response = utils.duplicateObject(msg.ERR_RESPONSE);
    let bodyReq  = req.body;

    if (bodyReq.hasOwnProperty("username") && bodyReq.username) {
        let file = './controllers/'+ bodyReq.action +'.js';
        
        try {
            if (fs.existsSync(file)) {
                let ctrl = require(BASE_DIR + '/controllers/' + bodyReq.action);

                if (ctrl.hasOwnProperty(bodyReq.subAction) && typeof ctrl[bodyReq.subAction] === "function") {
                    ctrl[bodyReq.subAction](req, res);
                } else {
                    response = utils.duplicateObject(msg.ERR_INVALID_SUBACTION);
                    logger.debug(__filename, "Function "+ bodyReq.subAction +" in controller "+ bodyReq.action +".js doesn't exist", req.id, bodyReq.clientIp, "");
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(response));
                }
            } else {
                response = utils.duplicateObject(msg.ERR_INVALID_ACTION);
                logger.debug(__filename, "Controller "+ bodyReq.action +".js doesn't exist", req.id, bodyReq.clientIp, "");
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(response));
            }
        } catch(err) {
            response['message'] = JSON.stringify(err.message);
            logger.error(__filename, JSON.stringify(err.message));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));
        }
    } else {
        response = utils.duplicateObject(msg.ERR_UNAUTHORIZED);
        logger.debug(__filename, response.message, req.id, bodyReq.clientIp, "Token and permission is required");
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
    }
});


/*
|--------------------------------------------------------------------------
| Below is example for GUI use
|--------------------------------------------------------------------------

const PagesCtrl = require('./controllers/pages');
const Telemon   = require(BASE_DIR + '/middleware/ApiTelemon');

router.get('/', PagesCtrl.index);
router.get('/account', PagesCtrl.account);

router.all('/http-telemon', Telemon.index);

*/

module.exports = router;