const path = require('path');
    const express = require('express');
    const bodyParser = require('body-parser');
    const log4js = require('log4js');
    const mongoose = require('mongoose');
    const jwt = require('jsonwebtoken');    
    const messages = require('./messages/common.messages');
    const routes = require('./routes/index');
    const logger = log4js.getLogger('Server');
    const app = express();
    const host = process.env.HOST || 'localhost';
    const port = process.env.PORT || 4000;
    const mongo_url = process.env.MONGO_URL || 'mongodb://localhost:27017/pmb';
    const secret = '$58468@16031950$';
    const _model = mongoose.model('user');
    //log4js configuration
    log4js.configure({
        appenders: { 'out': { type: 'stdout' },server: { type: 'file', filename: 'logs/server.log' ,maxLogSize:52428800} },
        categories: { default: { appenders: ['out','server'], level: 'info' } }
    });
    
    //body parser middleware
    app.use(bodyParser.json());
    
    //logging each request
    app.use(function(_req,_res,_next){
        var ip = _req.headers['x-forwarded-for'] || _req.connection.remoteAddress;
        logger.info(_req.method,ip,_req.path,_req.params,_req.query,_req.body);
        _next();
    });
    
    //checking mongodb is available
    app.use(function(_req,_res,_next){
        if (mongoose.connections.length == 0 || mongoose.connections[0].readyState != 1) {
            mongoose.connect(mongo_url, function (_err) {
                if (_err) {
                    logger.error(_err);
                    _res.status(500).json({message:messages['500']});
                } else {
                    _next();
                }
            });
        }else{
            _next();
        }
    });
    
    // Uncomment and right your own business logic to do Authentication check
    app.use(function(_req,_res,_next){
        if(_req.path !='/login' && _req.path !='/register'){
            if(_req.headers.authorization){
                jwt.verify(_req.headers.authorization, secret, (err, decoded) => {
                    if (err || !decoded) {
                        _res.status(401).json({message:messages['401']});
                        return;
                    }
                    _model.findOne({ email: decoded.email }, (_err, _data) => {
                        if(_err || !_data){
                            _res.status(404).json({message:messages['401']});
                            return;
                        }
                        next();
                    });
                });
            }else{
                _res.status(401).json({message:messages['401']});
            }
        }else{
            _next();
        }
    });
    
    //Initializing CRUD routes
    for(var route of routes){
        app.use(route);
    }

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname,'apidoc'));

    //Invalid routes handle
    app.use('*',function(_req,_res){
        _res.status(404).json({message:messages['404']});
    });
    
    
    //Starting server
    app.listen(port,host,function(){
        logger.info('Server is listening at ','http://'+host+':'+port+'/');
    });