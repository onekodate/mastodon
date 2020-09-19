var outbox_json, likes_json;
function loadfile(){
    loading(1);
    outbox_json=null;
     likes_json=null;
    var outbox_json_file=elemid("outbox").files[0];
    var  likes_json_file=elemid("likes").files[0];
    if(outbox_json_file && likes_json_file){
        try{
            var file_reader = new FileReader();
            file_reader.onload = function(event){
                var json=JSON.parse(event.target.result);
                if(json["id"]==="outbox.json"){
                    outbox_json = json;
                    file_reader.readAsText(likes_json_file);
                }else if(json["id"]==="likes.json"){
                    likes_json = json;
                    if(!outbox_json) error("You assigned each file to wrong place");
                }else error("You got a wrong files");
                if(outbox_json && likes_json) loadPage();
            };
            file_reader.readAsText(outbox_json_file);
        }catch(e){
            error("We got an error in loading files"+e);
        }
    }else{
        error("No files selected");
        loading(0);
    }
}
                
function error(text){
    elemid("error-text").innerText=text;
    elemid("error-box").style.display="block";
}

function elemid(id){
    return document.getElementById(id);
}

function loading(mode){
    var progress=elemid("progress");
    if(mode) progress.className="progress";
    else progress.className="progress invisible";
}

function openclose(btn){
    const btnId =  btn.getAttribute("href");  
    const targetId = btnId.slice(1);
    let now=elemid(targetId).className;
    if(now==="invisible"){
        elemid(targetId).className="";
//        if(targetId==="readmore5") elemid(btnId).className="invisible";
    }else{
        elemid(targetId).className="invisible";
//        if(targetId==="readmore5") elemid(btnId).className="";
    }        
    return false;
}

var posts={}, boosts={}, replies={};
function loadPage(){
    loading(1)
    //変数割り当て
    var datetimelist=[], datecount={}, datelabel=[], datelist=[], timelist=[];
    var timecount=new Array(24*60), timelabel=new Array(24*60);
    for(let i=0;i<timecount.length;i++){
        timecount[i]=0;
        timelabel[i]=(i-i%60)/60+":"+set2fig(i%60);
    }
    timelabel.push('24:00');
    var boost_counter=0, private_counter=0, unlisted_counter=0, direct_counter=0, public_counter=0;
    //outbox読み取り
    for (const cont of outbox_json["orderedItems"]){
        let date=new Date(cont['published']);
        date.setDate(date.getHours()+9);
        const timenum = date.getHours()*60+date.getMinutes();
        timecount[timenum]++;
        timelist.push(set2fig(date.getHours())+":00-"+set2fig(date.getHours()+1)+":00");
        const time = set2fig(date.getHours())+":"+set2fig(date.getMinutes())+":"+set2fig(date.getSeconds())+":"+date.getMilliseconds();
        date = date.getFullYear()+"-"+set2fig(date.getMonth()+1)+"-"+set2fig(date.getDate());
        datelist.push(date);
        if(!datecount[date]) datecount[date]=0;
        datecount[date]++;
        let datetime={};
        datetime.X=date;
        datetime.Y=timenum; 
        datetimelist.push(datetime);

        if(cont['type']==='Announce'){
            boosts[date+" "+time]=cont['object'];
            boost_counter++;
        }else{
            posts[date+" "+time]=cont['object']['content'].replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'');
            if(cont['object']['inReplyTo']) replies[date+" "+time]=cont['object']['inReplyTo'];;
            if(cont['cc'].length===0){
                if(cont['to'].length!==0){
                if(cont['to'][0].indexOf('followers')===-1) direct_counter++;
                else private_counter++;
                }
            }else if(cont['to'].includes("https://www.w3.org/ns/activitystreams#Public")) public_counter++;
            else unlisted_counter++;
        }
    }
    //summary
    elemid("sumpostcounter").innerText=public_counter+unlisted_counter+private_counter+direct_counter;    
    elemid("publiccounter").innerText=public_counter;
    elemid("unlistedcounter").innerText=unlisted_counter;
    elemid("privatecounter").innerText=private_counter;
    elemid("directcounter").innerText=direct_counter;
    elemid("boostcounter").innerText=boost_counter;
    elemid("replycounter").innerText=Object.keys(replies).length;
    elemid("favcounter").innerText=likes_json['totalItems'];
    var ctx=elemid("circle");
    var myChart = new Chart(ctx,{
        type:'doughnut',
        data:{
            datasets:[{
                data:[public_counter, unlisted_counter, private_counter, direct_counter, boost_counter],
                backgroundColor:["#ffffff","#d9e1e8","#9baec8","#191b22","#000000"],
                borderWidth:1,
            }],
            labels:["Public", "Unlisted", "Private", "Direct", "Boost"],
        },
        options:{legend:{display:false,},},
    });
    //ranking
    var replyto=[];
    for (var key in posts){
        var obj=posts[key];
        while(obj.indexOf('@')!==-1&&obj.indexOf(' ')!==-1){
            replyto.push(obj.substring(obj.indexOf('@')+1,obj.indexOf(' ')));
            obj=obj.substr(obj.indexOf(' ')+1);
        }
    }
    document.getElementById('replyrank').innerHTML = ranksort(replyto,30);
    
    var boostuser=[]
    for(var key in boosts){
        var boost=boosts[key];
        if(boost.indexOf('users')!==-1&&boost.indexOf('statuses')!==-1){
            boostuser.push(boost.substring(boost.indexOf('users')+6,boost.indexOf('statuses')-1));
        }
    }
    elemid("boostrank").innerHTML=ranksort(boostuser,30);
    
    var favuser=[];
    for(const like of likes_json['orderedItems']){
        if(like.indexOf('users')!==-1&&like.indexOf('statuses')!==-1){
            favuser.push(like.substring(like.indexOf('users')+6,like.indexOf('statuses')-1));
        }
    }
    elemid("favrank").innerHTML = ranksort(favuser,30);
    //figure
    var ctx = elemid("timeplot");
    var myChart = new Chart(ctx,{
        type:'line',
        data: {
            labels: timelabel,
            datasets: [{
                label:'post',
                borderColor: "#b0c4de",
                data:timecount,
                lineTension:0,
                pointRadius:0,
                borderWidth:1,
                backgroundColor:"#4682b4",
            }]
        },
        options:{
            scales:{
                xAxes:[{
                    gridLines:{color:"#9baec8",},
                    ticks: {
                        maxTicksLimit:24,
                        maxRotation:0,
                        fontColor:"#ffffff",
                    },
                }],
                yAxes:[{
                    gridLines:{color:"#9baec8",},
                    ticks: {
                        maxTicksLimit:24,
                        maxRotation:0,
                        fontColor:"#ffffff",
                    },
                }],
            },
        }
    });
    
    var dcs=[];
    for(const key in datecount){
        let dc = {};
        dc.X=key;
        dc.Y=datecount[key];
        dcs.push(dc);
    }
    const dateinit = new Date(datelist[0]);
    const datelast = new Date(datelist[datelist.length-1]);
    const wholedays = Math.ceil((datelast-dateinit)/60/60/24/1000);
    elemid("wholedays").innerText=wholedays;
    elemid("daten").innerText=dcs.length;
    elemid("uprate").innerText=Math.round(dcs.length/wholedays*1000)/10;
    elemid("aver").innerText=Math.round(Object.keys(posts).length/dcs.length);
    elemid("daterank").innerHTML = ranksort(datelist,5);
    elemid("timerank").innerHTML = ranksort(timelist,5);
    /*
    var ctx = document.getElementById("dateplot");
    var myChart = new Chart(ctx,{
        type:'line',
        data: {
            datasets: [{
                label:'post',
                borderColor: "#607d8b",
                data:dcs,
                lineTension:0,
                pointRadius:0,
                borderWidth:1,
            }]
        },
        options:{
            scales:{
                xAxes:[{
                    type:'time',
                    time:{
                        unit:'day'
                    }
                }]
            },
        }
    });    
    */
    elemid("load").className="invisible";
    elemid("main").className="";
    loading(0)
}

function ranksort(replyto,n){
    replyto.sort();
    replyto.reverse();
    var namelist=[], counterlist=[], replyrank=['<table>'];
    for (const name of replyto){
        if(namelist.indexOf(name)===-1){
            namelist.push(name);
            counterlist.push(1);
        }else{
            counterlist[namelist.indexOf(name)]++;
        }
    }
    for(let i=0;i<n;i++){
        let t=counterlist.indexOf(Math.max.apply(null,counterlist));
        replyrank.push('<tr><th>');
        replyrank.push(i+1+".");
        replyrank.push('</th><th>');
        replyrank.push(namelist[t]);
        replyrank.push('</th><th class="right">');
        replyrank.push(counterlist[t]);
        replyrank.push('times');
        replyrank.push('</th></tr>');
        counterlist[t]=0;           
    }
    replyrank.push('</table>');
    return replyrank.join('');
}

function loadSearch(){
    loading(1);
    var list={}, request=null;
    if(elemid("word").value){
        for(var key in posts){
            if(posts[key].indexOf(elemid("word").value)!==-1){
                list[key]=posts[key];
            }
        }
        request=elemid("word").value+" from toot content.";
        elemid("word").value="";
    }else if(elemid("boost").value){
        for(var key in boosts){
            if(boosts[key].indexOf(elemid("boost").value)!==-1){
                list[key]='<a target="_blank" href='+boosts[key]+">"+boosts[key]+"</a>";
            }
        }
        request=elemid("boost").value+" from boosted user.";
        elemid("boost").value="";
    }else if(elemid("reply").value){
        var replylist={};
        for(key in replies){
            if(replies[key].indexOf(elemid("reply").value)!==-1){
                replylist[replies[key].substr(replies[key].indexOf('statuses')+9,5)]=key;
            }
        }
        for(var key in replylist){
            list[replylist[key]]='<a target="_blank" href='+replies[replylist[key]]+">"+posts[replylist[key]]+"</a>";
        }
        request=elemid("reply").value+" from reply user.";
        elemid("reply").value="";
    }else error("You don't input a word.");
    
    if(request&&Object.keys(list).length===0){
        elemid("searchcontent").innerText="No toot was found for your request: "+request;
        elemid("searchresult").innerText="";
    }else if(request){
        var resulttable=['<table>'];
        for(key in list){
            resulttable.push('<tr><th class="short">');
            resulttable.push(key.substr(0,19));
            resulttable.push('</th><th>');
            resulttable.push(list[key]);
            resulttable.push('</th></tr>');   
        }
        resulttable.push('</table>');
        elemid("searchcontent").innerText="You are searching for "+request+" There are "+Object.keys(list).length+" results.";
        elemid("searchresult").innerHTML=resulttable.join('');
    }
    
    loading(0);
}

function set2fig(num){
    var ret=num;
    if(num<10) ret="0"+num;
    return ret
}
