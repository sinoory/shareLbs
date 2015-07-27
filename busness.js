
module.exports = function BusBus(){
    var WebSocket = require('faye-websocket');
    var users={};
    var appAuthMongOpr=require('tools/authdbOpr');
    var busLineMongOpr=require("tools/linesDbOpr");
    var busOnLineOpr=require("tools/onlinesDbOpr");
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
                appAuthMongOpr.getOne({mobinfo:msg.devid},function(err,doc){
                    if(doc){
                        var res={"type":"re-querryid","userid":doc.userid,"nickname":doc.nickname};
                        console.log(JSON.stringify(res));
                        ws.send(JSON.stringify(res));
                    }else{
                        hashopr.getRandomOne(function(e,doc){
                            console.log("getRandomOne e=",e,",doc=",doc);
                            appAuthMongOpr.add({mobinfo:msg.devid,mobStuctinfo:js,
                                userid:doc.hashval,verifycode:doc.hashverify,
                                addate:new Date()},null);
                            var res={"type":"re-querryid","userid":doc.userid,"nickname":doc.nickname};
                            console.log(JSON.stringify(res));
                            ws.send(JSON.stringify(res));
                        });                  
                    }
                });
                //ws.send("you are "+js.APP);
            }else if(msg.type=="uploadLine"){
                console.log("uploadLine line=",msg.name,",ownerid=",msg.ownerid,"stations=",msg.stations);
                busLineMongOpr.add({ownerid:msg.ownerid,name:msg.name,stations:msg.stations},null);
                ws.send(JSON.stringify({"type":"re-uploadLine","res":"success"}))
            }else if(msg.type=="getlines"){
                console.log("client getlines");
                busLineMongOpr.getAll({},'',function(err,docs){
                    var resp={"type":"re-getlines"};
                    var res=new Array();
                    resp.res=res;
                    var d;
                    console.log("getlines cnt=",docs.length);
                    for(var i=0;i<docs.length;i++){
                        d=docs[i];
                        res.push({"name":d.name,"ownerid":d.ownerid,"stations":d.stations,"lineid":d._id})
                    }
                    ws.send(JSON.stringify(resp));
                });
            }else if(msg.type=="delline"){
                busLineMongOpr.del({_id:msg.lineid},function(err,cnt){
                    console.log("delline id="+msg.lineid+",cnt="+cnt+",err="+err);
                });
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

