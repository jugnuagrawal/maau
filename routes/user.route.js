
    const express = require('express');
    const router = express.Router();
    const controller = require('../controllers/user.controller');
    router.get('/user/count',controller.count);
    router.get('/user',controller.read);
    router.post('/user',controller.create);
    router.get('/user/:id',controller.read);
    router.put('/user/:id',controller.update);
    router.delete('/user/:id',controller.delete);
    router.get('/validate',controller.validate);
    router.get('/activate/:token',controller.activate);
    router.post('/login',controller.login);
    router.post('/logout',controller.logout);
    router.post('/register',controller.register);
    router.post('/forgot',controller.forgot);
    module.exports = router;
    