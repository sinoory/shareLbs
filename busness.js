
module.exports = function BusBus(){
    var WebSocket = require('faye-websocket');
    var users={};
    var appAuthMongOpr=require('tools/authdbOpr');
    var busLineMongOpr=require("tools/linesDbOpr");

    this.processNewWebCient=function(request, socket, body){
        console.log("socket conneted");
        var ws = new WebSocket(request, socket, body);
        var me="";
        ws.on('message', function(event) {
            console.log("get msg="+event.data);
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

