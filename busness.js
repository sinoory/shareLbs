
module.exports = function BusBus(){
    var WebSocket = require('faye-websocket');
    var onlineUsers={};//{userid:{'ws':ws,...} ...}
    var appAuthMongOpr=require('tools/authdbOpr');
    var busLineMongOpr=require("tools/linesDbOpr");
    var busOnLineOpr=require("tools/onlinesDbOpr");
    var hashopr=require("tools/hashdbOpr");

    this.processNewWebCient=function(request, socket, body){
        console.log("socket conneted");
        var ws = new WebSocket(request, socket, body);
        var me="";
        ws.on('message', function(event) {
            console.log("c msg="+event.data);
            var msg=JSON.parse(event.data);
            if(msg.type=="online"){//user report online status
                onlineUsers[msg.userid]={'ws':ws};
                me=msg.userid;
                console.log(me+" is online");
            }else if(msg.type=="send"){
               if(msg.to in onlineUsers){
                   var res=onlineUsers[msg.to].ws.send(JSON.stringify(msg));
                   console.log("msg send to "+msg.to+" finished,res="+res);
               }else{
                   console.log("user "+msg.to+" not exist");
               }
            }else if(msg.type=="querryid"){
                var js=JSON.parse(msg.devid);
                appAuthMongOpr.getOne({mobinfo:msg.devid},function(err,doc){
                    if(doc){
                        var res={"type":"re-querryid","userid":doc.userid,"nickname":doc.nickname};
                        console.log('re-querryid old '+JSON.stringify(res)+",id="+doc.userid);
                        ws.send(JSON.stringify(res));
                    }else{
                        hashopr.getRandomOne(function(e,doc){
                            console.log("getRandomOne e=",e,",doc=",doc);
                            appAuthMongOpr.add({mobinfo:msg.devid,mobStuctinfo:js,
                                userid:doc.hashval,verifycode:doc.hashverify,
                                addate:new Date()},null);
                            var res={"type":"re-querryid","userid":doc.hashval,"nickname":doc.nickname};
                            console.log('re-querryid new '+JSON.stringify(res)+',id='+doc.hashval);
                            ws.send(JSON.stringify(res));
                        });                  
                    }
                });
                //ws.send("you are "+js.APP);
            }else if(msg.type=="uploadLine"){
                console.log("uploadLine line=",msg.name,",ownerid=",msg.ownerid,",exist="+msg.exist);
                if(msg.lineid && msg.lineid!='undefined'){
                    busLineMongOpr.getOne({_id:msg.lineid},function(e,l){
                        if(l){
                            console.log("updateLine added line.ownerid=",l.ownerid,",e="+e);
                            l.lver=msg.lver;
                            l.name=msg.name;
                            l.stations=msg.stations;
                            l.save();
                            ws.send(JSON.stringify({"type":"re-uploadLine","err":e,"subtype":"update","index":msg.index}));
                            return;
                        }
                    });
                }
                busLineMongOpr.add({ownerid:msg.ownerid,name:msg.name,stations:msg.stations,lver:msg.lver,local:busLineMongOpr.getLocal(msg.area)},function(){
                    busLineMongOpr.getOne({ownerid:msg.ownerid,name:msg.name,lver:msg.lver},function(e,l){
                        console.log("uploadLine added line=",l,",e="+e);
                        if(l){
                            ws.send(JSON.stringify({"type":"re-uploadLine","err":e,"lineid":l._id,"index":msg.index,"subtype":"upload","area":l.local.adesc}));
                        }
                    });
                });
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
                        console.log("getlines["+i+"]=",d);
                        res.push({"name":d.name,"ownerid":d.ownerid,"stations":d.stations,"lineid":d._id,"area":d.local.adesc})
                    }
                    ws.send(JSON.stringify(resp));
                });
            }else if(msg.type=="delline"){
                busLineMongOpr.del({_id:msg.lineid},function(err,cnt){
                    console.log("delline id="+msg.lineid+",cnt="+cnt+",err="+err);
                });
            }else if(msg.type=='runbus'){
                if(msg.action=='start'){
                    busOnLineOpr.getOne({lineid:msg.lineid},function(err,line){
                        if(line){
                            busOnLineOpr.start(line,msg.startInd);//start Index
                            busOnLineOpr.notifyStart(onlineUsers,line);
                        }else{
                            busOnLineOpr.addnew(msg);
                        }
                    });
                }else if(msg.action=='stUpdate'){
                    busOnLineOpr.stationUpdate(msg,onlineUsers);
                }else if(msg.action=='stop'){
                    busOnLineOpr.stop();
                }
            }else if(msg.type=='watchline'){
                busOnLineOpr.getOne({lineid:msg.lineid},function(err,line){
                    if(!line) return;
                    line.watchers.push(msg.watcher);
                    onlineUsers[me].watchline=msg.lineid;
                    line.save();
                });
            }else if(msg.type=='unwatchline'){
                busOnLineOpr.rmWatcher(me,onlineUsers);
            }else if(msg.type=='linechat'){
                busOnLineOpr.onLineChat(msg,onlineUsers);
            }else{
                console.log("not supported msg.type="+msg.type);
            }
            //ws.send(event.data);
        });

        ws.on('close', function(event) {
            console.log('close', event.code, event.reason);
            console.log(me+" closed");
            busOnLineOpr.rmWatcher(me,onlineUsers);
            delete onlineUsers[me];
            ws = null;
        });

    };

    this.onReport=function(msg){
    };

}

