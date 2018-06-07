const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const log4js = require('log4js');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const utils = require('./utils/utils');
const config = require('./config');
const messages = require('./messages/common.messages');
const routes = require('./routes/index');
const logger = log4js.getLogger('Server');
const app = express();
const host = process.env.HOST || '127.0.0.1';
const port = process.env.PORT || config.port || 3000;
const mongo_url = process.env.MONGO_URL || 'mongodb://localhost:27017/' + (config.database || 'maau');
const secret = config.secret;
const model = mongoose.model('user');

//log4js configuration
log4js.configure({
    appenders: { 'out': { type: 'stdout' }, server: { type: 'file', filename: 'logs/server.log', maxLogSize: 52428800 } },
    categories: { default: { appenders: ['out', 'server'], level: 'info' } }
});

//body parser middleware
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

//logging each request
app.use(function (req, res, next) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    logger.info(req.method, ip, req.path, req.params, req.query, req.body);
    res.set('Access-Control-Allow-Origin','*');
    res.set('Access-Control-Allow-Methods','*');
    res.set('Access-Control-Allow-Headers','content-type,authorization');
    if(req.method == 'OPTIONS'){
        res.status(204).end();
    }else{
        next();
    }
});

//checking mongodb is available
app.use(function (req, res, next) {
    if (mongoose.connections.length == 0 || mongoose.connections[0].readyState != 1) {
        mongoose.connect(mongo_url, function (_err) {
            if (_err) {
                logger.error(_err);
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
app.use(function (req, res, next) {
    if (req.path.indexOf('/activate')==-1 && req.path != '/apidoc' && req.path != '/login' && req.path != '/register' && req.path != '/forgot') {
        if (req.headers.authorization) {
            jwt.verify(req.headers.authorization, secret, (err, decoded) => {
                if (err || !decoded) {
                    res.status(401).json({ message: messages['401'] });
                    return;
                }
                model.findOne({ email: decoded.email }, (_err, _data) => {
                    if (_err || !_data) {
                        res.status(404).json({ message: messages['401'] });
                        return;
                    }
                    next();
                });
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
    res.render('index', {
        host: host,
        port: port,
        schema: require('./schemas/user.schema')
    });
});

//Invalid routes handle
app.use('*', function (req, res) {
    res.status(404).json({ message: messages['404'] });
});


//Starting server
app.listen(port, host, function () {
    logger.info('Server is listening at ', 'http://' + host + ':' + port + '/');
    logger.info('API documentation at ', 'http://' + host + ':' + port + '/apidoc');
    let defaultUser = require('./users.json');
    defaultUser.password = utils.encrypt(secret,defaultUser.password);
    defaultUser.createdAt = new Date();
    defaultUser.lastUpdated = new Date();
    defaultUser.deleted = false;
    model.create(defaultUser).then(data => {
        logger.info(data);
    }).catch(err => {
        logger.error(err);
    });
});