
var fs=require('fs');
var router = function catch404(req,res){
    console.log("req ",req.query);
    console.log("url=",req.url);

    var URL = require('url');
    var p = URL.parse(req.url);
    console.log("url pathname=",p.pathname);

    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type,X-Requested-With');
    if(p.pathname=='/source.json'){
        console.log("in source.json");
        fs.readFile('/home/sin/wk/shareLbs/routes/test/source.json',function(e,d){
            if(e){
                console.log("err=",e);
                res.send('[{ "firstName": "Tommy", "lastName": "Maintz" }]');
            }else{
                //console.log("data="+d);
                res.send(""+d);
            }
        })
        //console.log("returen=",ret);
    }
    else
    res.send('[{ "firstName": "Tommy", "lastName": "Maintz" }]');
}

module.exports = router;
