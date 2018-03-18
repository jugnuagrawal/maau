const fs = require('fs');

var routes = [];

var files = fs.readdirSync(__dirname);
files.splice(files.indexOf('index.js'),1);
files =files.map(f=>{
    return './'+f.replace('.js','');
})
for(var file of files){
    routes.push(require(file));
}

module.exports = routes;