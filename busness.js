
module.exports = function BusBus(){
    var WebSocket = require('faye-websocket');
    var users={};
    var appAuthMongOpr=require('tools/authdbOpr');
    var busLineMongOpr=require("tools/linesDbOpr");
    var hashopr=require("tools/hashdbOpr");

    this.processNewWebCient=function(request, socket, body){
        console.log("socket conneted");
        var ws = new WebSocket(request, socket, body);
        var me="";
        ws.on('message', function(event) {
            var msg=JSON.parse(event.data);
            if(msg.type=="report"){
                users[msg.user]={'ws':ws};
                me=msg.user;
            }else if(msg.type=="send"){
               if(msg.to in users){
                   var res=users[msg.to].ws.send(JSON.stringify(msg));
                   console.log("msg send to "+msg.to+" finished,res="+res);
               }else{
                   console.log("user "+msg.to+" not exist");
               }
            }else if(msg.type=="querryid"){
                var js=JSON.parse(msg.devid);
                console.log("querryid js.APP=",js.APP);
                appAuthMongOpr.getOne({mobinfo:msg.devid},function(err,doc){
                    if(doc){
                        ws.send(JSON.stringify(
                            {"type":"re-querryid","userid":doc.userid,"nickname":doc.nickname}));
                    }else{
                        hashopr.getRandomOne(function(e,doc){
                            console.log("getRandomOne e=",e,",doc=",doc);
                            appAuthMongOpr.add({mobinfo:msg.devid,mobStuctinfo:js,
                                userid:doc.hashval,verifycode:doc.hashverify,
                                addate:new Date()},null);
                            ws.send(JSON.stringify(
                             {"type":"re-querryid","userid":doc.userid,"nickname":doc.nickname}));
                        });                  
                    }
                });
                //ws.send("you are "+js.APP);
            }else if(msg.type=="uploadLine"){
                console.log("uploadLine line=",msg.name);
                busLineMongOpr.add({ownerid:msg.ownerid,name:msg.name,stations:msg.stations},null);
            }else{
                console.log("not supported msg.type="+msg.type);
            }
            //ws.send(event.data);
        });

        ws.on('close', function(event) {
            console.log('close', event.code, event.reason);
            console.log(me+" closed");
            delete users[me];
            ws = null;
        });

    };

    this.onReport=function(msg){
    };

}

