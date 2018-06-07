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
const _model = mongoose.model('user');

//log4js configuration
log4js.configure({
    appenders: { 'out': { type: 'stdout' }, server: { type: 'file', filename: 'logs/server.log', maxLogSize: 52428800 } },
    categories: { default: { appenders: ['out', 'server'], level: 'info' } }
});

//body parser middleware
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

//logging each request
app.use(function (_req, _res, _next) {
    var ip = _req.headers['x-forwarded-for'] || _req.connection.remoteAddress;
    logger.info(_req.method, ip, _req.path, _req.params, _req.query, _req.body);
    _res.set('Access-Control-Allow-Origin','*');
    _res.set('Access-Control-Allow-Methods','*');
    _res.set('Access-Control-Allow-Headers','content-type,authorization');
    if(_req.method == 'OPTIONS'){
        _res.status(204).end();
    }else{
        _next();
    }
});

//checking mongodb is available
app.use(function (_req, _res, _next) {
    if (mongoose.connections.length == 0 || mongoose.connections[0].readyState != 1) {
        mongoose.connect(mongo_url, function (_err) {
            if (_err) {
                logger.error(_err);
                _res.status(500).json({ message: messages['500'] });
            } else {
                _next();
            }
        });
    } else {
        _next();
    }
});

// Uncomment and right your own business logic to do Authentication check
app.use(function (_req, _res, _next) {
    if (_req.path != '/apidoc' && _req.path != '/activate' && _req.path != '/login' && _req.path != '/register' && _req.path != '/forgot') {
        if (_req.headers.authorization) {
            jwt.verify(_req.headers.authorization, secret, (err, decoded) => {
                if (err || !decoded) {
                    _res.status(401).json({ message: messages['401'] });
                    return;
                }
                _model.findOne({ email: decoded.email }, (_err, _data) => {
                    if (_err || !_data) {
                        _res.status(404).json({ message: messages['401'] });
                        return;
                    }
                    _next();
                });
            });
        } else {
            _res.status(401).json({ message: messages['401'] });
        }
    } else {
        _next();
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
app.use('*', function (_req, _res) {
    _res.status(404).json({ message: messages['404'] });
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
    _model.create(defaultUser).then(data => {
        logger.info(data);
    }).catch(err => {
        logger.error(err);
    });
});