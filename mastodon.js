var outbox_json, likes_json;
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
    if(now==="invisible") elemid(targetId).className="";
    else elemid(targetId).className="invisible";        
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
    for(cont of outbox_json["orderedItems"]){
        let date=new Date(cont['published']);
        const timenum = date.getHours()*60+date.getMinutes();
        timecount[timenum]++;
        var datetime={};
        datetime.x=date;
        datetime.y=timenum; 
        datetimelist.push(datetime);
        timelist.push(set2fig(date.getHours())+":00-"+set2fig(date.getHours()+1)+":00");
        const time = set2fig(date.getHours())+":"+set2fig(date.getMinutes())+":"+set2fig(date.getSeconds())+":"+date.getMilliseconds();
        date = date.getFullYear()+"-"+set2fig(date.getMonth()+1)+"-"+set2fig(date.getDate());
        datelist.push(date);
        if(!datecount[date]){
            datecount[date]=0;
            console.log(date);
        }
        datecount[date]++;

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
    for(key in posts){
        var obj=posts[key];
        while(obj.indexOf('@')!==-1&&obj.indexOf(' ')!==-1){
            replyto.push(obj.substring(obj.indexOf('@')+1,obj.indexOf(' ')));
            obj=obj.substr(obj.indexOf(' ')+1);
        }
    }
    document.getElementById('replyrank').innerHTML = ranksort(replyto,30);
    
    var boostuser=[]
    for(key in boosts){
        var boost=boosts[key];
        if(boost.indexOf('users')!==-1&&boost.indexOf('statuses')!==-1){
            boostuser.push(boost.substring(boost.indexOf('users')+6,boost.indexOf('statuses')-1));
        }
    }
    elemid("boostrank").innerHTML=ranksort(boostuser,30);
    
    var favuser=[];
    for(like of likes_json['orderedItems']){
        if(like.indexOf('users')!==-1&&like.indexOf('statuses')!==-1){
            favuser.push(like.substring(like.indexOf('users')+6,like.indexOf('statuses')-1));
        }
    }
    elemid("favrank").innerHTML = ranksort(favuser,30);
    //figure
    var ctx = elemid("timeplot");

    var myChart = new Chart(ctx,{
        type:'bar',
        data: {
            labels: timelabel,
            datasets: [{
                label:'post',
                data:timecount,
                backgroundColor:"#b0c4de",
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
                        fontColor:"#ffffff",
                    },
                }],
            },
        }
    });
    
    var dcs=[];
    var keys=Object.keys(datecount).sort();
    for(key of keys){
        let dc = {};
        dc.x=new Date(key);
        dc.y=datecount[key];
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
                <div class="figure">
                    <p><canvas id="timerank" height="70px"></canvas></p>
                </div>
    const ans=timerank(timelist);    
    var ctx=elemid("timerank");
    var myChart = new Chart(ctx,{
        type:'doughnut',
        data:{
            datasets:[{
                data:ans.num,
                backgroundColor:["#E60012","#EB6100","#F39800","#FCC800","#FFF100","#CFDB00",
                                 "#8FC31F","#22AC38","#009944","#009B6B","#009E96","#00A0C1",
                                 "#00A0E9","#0086D1","#0068B7","#00479D","#1D2088","#601986",
                                 "#920783","#BE0081","#E4007F","#E5006A","#E5004F","#E60033"],
                borderWidth:1,
            }],
            labels:ans.time,
        },
        options:{legend:{display:false,},},
    });
    */
    
    var ctx = elemid("datetimescatter");
    var myChart = new Chart(ctx,{
        type:'scatter',
        data: {
            datasets: [{
                label:'post',
                borderColor: "#607d8b",
                data:datetimelist,
                pointRadius:1.5;
            }]
        },
        options:{
            scales:{
                xAxes:[{
                    type:'time',
                    gridLines:{color:"#9baec8",},
                    ticks: {
                        fontColor:"#ffffff",
                    },
                }],
                yAxes:[{
                    gridLines:{color:"#9baec8",},
                    ticks: {
                        fontColor:"#ffffff",
                    },
                }],
            },
        }
    });  
    
    var ctx=elemid("dateplot");
    var myChart = new Chart(ctx,{
        type:'bar',
        data: {
            datasets: [{
                label:'post',
                data:dcs,
                backgroundColor:"#f0fff0",            
            }]
        },
        options:{
            scales:{
                xAxes:[{
                    type:'time',
                    gridLines:{color:"#9baec8",},
                    ticks: {
                        fontColor:"#ffffff",
                    },
                }],
                yAxes:[{
                    gridLines:{color:"#9baec8",},
                    ticks: {
                        fontColor:"#ffffff",
                    },
                }],
            },
        }
    });    

    elemid("dropArea").className="invisible";
    elemid("load").className="invisible";
    elemid("main").className="";
    loading(0)
}

function ranksort(replyto,n){
    replyto.sort();
    replyto.reverse();
    var namelist=[], counterlist=[], replyrank=['<table>'];
    for(name of replyto){
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
        replyrank.push(' times');
        replyrank.push('</th></tr>');
        counterlist[t]=0;           
    }
    replyrank.push('</table>');
    return replyrank.join('');
}

function timerank(timelist){
    var timerank={};
    for(const time of timelist){
        if(!timerank[time]) timerank[time]=0;
        timerank[time]++;
    }
    var keylist=[], numlist=[];
    for(key in timerank){
        keylist.push(key);
        numlist.push(timerank[key]);    
    }
    var ans={};
    ans.time=[];
    ans.num=[];
    for(let i=0;i<24;i++){
        const index=numlist.indexOf(Math.max.apply(null,numlist));
        ans.time.push(keylist[index]);
        ans.num.push(numlist[index]);
        numlist[index]=-1;
    }
    return ans;
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
        for(key in boosts){
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
        for(key in replylist){
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

var fileArea = elemid('dropArea');
var fileInput = elemid('uploadFile');

fileArea.addEventListener('dragover', function(e){
    e.preventDefault();
    fileArea.classList.add('dragover');
});

fileArea.addEventListener('dragleave', function(e){
    e.preventDefault();
    fileArea.classList.remove('dragover');
});

fileArea.addEventListener('drop', function(e){
    e.preventDefault();
    fileArea.classList.remove('dragover');
    loadFile(e.dataTransfer.files);
});

fileInput.addEventListener('change', ()=>{
    loadFile(fileInput.files);
});

function loadFile(files){
    loading(1);
    for(file of files){
        if(file.type==="application/json"){
            var reader = new FileReader();
            reader.onload=function(event){
                const json=JSON.parse(event.target.result);
                if(json["id"]==="outbox.json") outbox_json=json;
                else if(json["id"]==="likes.json") likes_json=json;
                if(!outbox_json&&!likes_json) error("You chose wrong file.");
                else if(!outbox_json) error("Choose outbox.json");
                else if(!likes_json) error("Choose likes.json");
                else{
                    elemid("error-box").style.display="none";
                    loadPage();
                }
            };  
            reader.readAsText(file);
        }
    }
    loading(0);
}
