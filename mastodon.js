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
    }else error("No files selected");
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

function loadPage(){
    //変数割り当て
    var posts=[], boosts=[], datetimelist=[], datecount={}, datelabel=[], datelist=[], timelist=[];
    var timecount=new Array(24*60), timelabel=new Array(24*60);
    for(let i=0;i<timecount.length;i++){
        timecount[i]=0;
        let k = null;
        if(i%60<10) k='0'+i%60;
        else k=i%60; 
        timelabel[i]=(i-i%60)/60+":"+k;
    }
    timelabel.push('24:00');
    var boost_counter=0, private_counter=0, unlisted_counter=0, direct_counter=0, public_counter=0, reply_counter=0;
    //outbox読み取り
    for (const cont of outbox_json["orderedItems"]){
        let date=new Date(cont['published']);
        date.setDate(date.getHours()+9);
        const time = date.getHours()*60+date.getMinutes();
        timelist.push(date.getHours()+"Hours");
        date = date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate();
        datelist.push(date);
        date+="T00:00:00";
        timecount[time]++;
        if(!datecount[date]) datecount[date]=0;
        datecount[date]++;
        let datetime={};
        datetime.X=date;
        datetime.Y=time; 
        datetimelist.push(datetime);

        if(cont['type']==='Announce'){
            boost_counter++;
            boosts.push(cont['object']);
        }else{
            posts.push(cont['object']['content'].replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,''));
            if(cont['object']['inReplyTo']) reply_counter++;
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
    elemid("sumpostcounter").innerText=posts.length;    
    elemid("publiccounter").innerText=public_counter;
    elemid("unlistedcounter").innerText=unlisted_counter;
    elemid("privatecounter").innerText=private_counter;
    elemid("directcounter").innerText=direct_counter;
    elemid("boostcounter").innerText=boost_counter;
    elemid("replycounter").innerText=reply_counter;
    elemid("favcounter").innerText=likes_json['totalItems'];
    var ctx=elemid("circle");
    var myChart = new Chart(ctx,{
        type:'doughnut',
        data:{
            datasets:[{
                data:[public_counter, unlisted_counter, private_counter, direct_counter, boost_counter],
                backgroundColor:["rgb(255,0,255)","rgb(0,255,0)","rgb(0,0,255)","rgb(255,0,0)","rgb(0,128,0)"]
            }],
            labels:["Public", "Unlisted", "Private", "Direct", "Boost"],
        }
    });
    //ranking
    var replyto=[];
    for (let obj of posts){
        while(obj.indexOf('@')!==-1&&obj.indexOf(' ')!==-1){
            replyto.push(obj.substring(obj.indexOf('@')+1,obj.indexOf(' ')));
            obj=obj.substr(obj.indexOf(' ')+1);
        }
    }
    document.getElementById('replyrank').innerHTML = ranksort(replyto,30);
    
    var boostuser=[]
    for(const boost of boosts){
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
                borderColor: "#607d8b",
                data:timecount,
                lineTension:0,
                pointRadius:0,
                borderWidth:1,
            }]
        },
        options:{
            scales:{
                xAxes:[{
                    ticks: {
                        maxTicksLimit:24,
                        maxRotation:0,
                    }
                }]
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
    elemid("aver").innerText=Math.round(posts.length/dcs.length);
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
/*
        if(i===10){
            replyrank.push('</table>'+
            '<div class="" id="#readmore5">'+
            '    <a href="#readmore5" onclick="openclose(this);">Open</a>'+
            '</div>'+
            '<div id="readmore5" class="invisible">'+
            '<table>');
        }
*/
        let t=counterlist.indexOf(Math.max.apply(null,counterlist));
        replyrank.push('<tr><th>');
        replyrank.push(i+1+".");
        replyrank.push('</th><th>');
        replyrank.push(namelist[t]);
        replyrank.push('</th><th>');
        replyrank.push(counterlist[t]);
        replyrank.push('times');
        replyrank.push('</th></tr>');
        counterlist[t]=0;           
    }
    replyrank.push('</table>');
/*
    if(replyrank.length>80){
        replyrank.push('<p class="readlessbutton">'+
            '<a href="#readmore5" onclick="openclose(this);">Close</a>'+
        '</p>'+        
        '</div>');
    }
*/
    return replyrank.join('');
}

function loadsearch(){
    }
