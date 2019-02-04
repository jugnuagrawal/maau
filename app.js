const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const log4js = require('log4js');
const mongoose = require('mongoose');
const utils = require('./utils/utils');
const config = require('./config');
const messages = require('./messages/common.messages');
const routes = require('./routes/index');
const logger = log4js.getLogger('Server');
const app = express();
const host = process.env.HOST || '127.0.0.1';
const port = process.env.PORT || config.port || 4000;
const mongo_url = process.env.MONGO_URL || 'mongodb://localhost:27017/' + (config.database || 'maau');
const secret = config.secret;
const userModel = mongoose.model('users');
const tokenModel = mongoose.model('tokens');
//log4js configuration
log4js.configure({
    appenders: { 'out': { type: 'stdout' }, server: { type: 'file', filename: 'logs/server.log', maxLogSize: 52428800 } },
    categories: { default: { appenders: ['out', 'server'], level: 'info' } }
});

//body parser middleware
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

//logging each request
app.use((req, res, next) => {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    logger.info(req.method, ip, req.path, req.params, req.query, req.body);
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', '*');
    res.set('Access-Control-Allow-Headers', 'content-type,authorization');
    if (req.method == 'OPTIONS') {
        res.status(204).end();
    } else {
        next();
    }
});

mongoose.connect(mongo_url, (err) => {
    if (err) {
        logger.error(err);
        throw err;
    } else {
        let defaultUser = require('./users.json');
        defaultUser.password = utils.encrypt(secret, defaultUser.password);
        defaultUser.createdAt = new Date();
        defaultUser.lastUpdated = new Date();
        defaultUser.deleted = false;
        userModel.create(defaultUser).then(data => {
            logger.info(data);
        }).catch(err => {
            if (err.code !== 11000) {
                logger.error(err.code);
            }
        });
    }
});

//checking mongodb is available
app.use((req, res, next) => {
    if (mongoose.connections.length == 0 || mongoose.connections[0].readyState != 1) {
        mongoose.connect(mongo_url, (err) => {
            if (err) {
                logger.error(err);
                res.status(500).json({ message: messages['500'] });
            } else {
                next();
            }
        });
    } else {
        next();
    }
});

// Uncomment and right your own business logic to do Authentication check
app.use((req, res, next) => {
    if (!utils.isDefaultPath(req.path)) {
        if (req.headers.authorization) {
            tokenModel.findById(req.headers.authorization).then(d => {
                if (!d) {
                    res.status(401).json({ message: messages['401'] });
                    return;
                }
                userModel.findById(d.userId, (err, data) => {
                    if (err || !data || data.type != 0) {
                        res.status(404).json({ message: messages['401'] });
                        return;
                    }
                    next();
                });
            }).catch(e => {
                res.status(401).json({ message: messages['500'] });
            });
        } else {
            res.status(401).json({ message: messages['401'] });
        }
    } else {
        next();
    }
});

//Initializing CRUD routes
for (var route of routes) {
    app.use(route);
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'apidoc'));
app.get('/apidoc', (req, res) => {
    if (req.headers["content-type"] === 'application/json') {
        res.sendFile(path.join(__dirname, 'apis.json'));
    } else {
        res.render('index', {
            host: host,
            port: port,
            schema: require('./schemas/user.schema')
        });
    }
});

//Invalid routes handle
app.use('*', (req, res) => {
    res.status(404).json({ message: messages['404'] });
});


//Starting server
app.listen(port, host, () => {
    logger.info('Server is listening at ', 'http://' + host + ':' + port + '/');
    logger.info('API documentation at ', 'http://' + host + ':' + port + '/apidoc');
});