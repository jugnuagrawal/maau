# maau
A microservice developed with express js and moongoose js to manage, authenticate and authorize users over REST API.

MAAU - Manage Authenticate and Authorize Users

### Setup

MAAU requires [Node.js](https://nodejs.org/), [Express.js](https://expressjs.com/), [Mongoose.js](http://mongoosejs.com/) and [MongoDB](https://www.mongodb.com/).


### Install

```sh
git clone https://github.com/jugnuagrawal/maau.git
cd maau
npm install
npm start

#[2018-03-18T21:27:55.596] [INFO] Server - Server is listening at  http://localhost:3000/
#[2018-03-18T21:27:55.600] [INFO] Server - API documentation at  http://localhost:3000/apidoc
```


### Configuration

- config.json
```javascript
{
    "secret": "1234567890",
    "permanentDelete": true,
    "enableMail":false,
    "mail":{
        "from":"\"Account\" <account@yourdomain.com>"
    },
    "smtp": {
        "host": "smtp.ethereal.email",
        "port": 587,
        "secure": false,
        "auth": {
            "user": "",
            "pass": ""
        }
    }
}
```
### Messages

- user.messages.json
```javascript
{
    "get":{
        "validate":{
            "200":"Valid token",
            "401":"Invalid token"
        }
    },
    "post":{
        "login":{
            "400":"Invalid Email ID or Password",
            "401":"Your account was deleted, please contact support"
        },
        "register":{
            "200":"Account created successfully, please login to continue",
            "400":"Email and password is mandatory",
            "401":"User already registered with this email ID",
            "500":"Unable to register please try again later"
        }
    },
    "put":{

    },
    "delete":{
        
    }
}
```

<!--[API Documentation](https://github.com/jugnuagrawal/maau/wiki)-->

License
----

MIT