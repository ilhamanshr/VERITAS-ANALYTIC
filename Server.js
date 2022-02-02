const express    = require('express');
const session    = require('express-session');
const path       = require('path');
const http       = require('http');
const https      = require('https');
const fs         = require('fs');
const parser     = require('body-parser');
const requestId  = require('express-request-id')();
const BASE_DIR   = path.dirname(require.main.filename);
const logger     = require(BASE_DIR + '/Logger');
const config     = require(BASE_DIR + '/Config');
const routes     = require(BASE_DIR + '/Routes');
const app        = express();

app.set('views', BASE_DIR + '/views');
app.set('view engine', 'ejs');

app.use(session({
    secret: config.APP_ID,
    saveUninitialized: true,
    resave: false
}));

app.use(parser.json({
    extended: false,
    limit: '50mb'
}));

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

app.use(requestId);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/public", express.static(__dirname + "/public"));
app.use("/", routes);

exports.start = function() {
    var server = null;
    if (config.APP_SSL) {
        server = https.createServer({
            key: fs.readFileSync(BASE_DIR + "/security/key.pem"),
            cert: fs.readFileSync(BASE_DIR + "/security/cert.pem"),
        }, app);
    } else {
        server = http.createServer(app);
    }

    server.listen(config.APP_PORT, function() {
        logger.debug(__filename, config.APP_NAME + " listening at port " + config.APP_PORT, "", "", "");
    });
}