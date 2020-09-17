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



function loadPage(){
    elemid("favcounter").innerText=likes_json['totalItems'];
    var posts=[], datetimelist=[], datecount=[];
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
    for (const cont of outbox_json["orderedItems"]){
        let date=new Date(cont['published']);
        date.setDate(date.getHours()+9);
        const time = date.getHours()*60+date.getMinutes();
        date = date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate();
        if(!datecount[date]) datecount[date]=0;
        datecount[date]++;
        timecount[time]++;
        let datetime={};
        datetime.X=date;
        datetime.Y=time; 
        datetimelist.push(datetime);
        if(cont['type']==='Announce'){
            boost_counter++;
            posts.push(cont['object']);
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
    delete outbox_json;
    elemid("sumpostcounter").innerText=posts.length;    
    elemid("publiccounter").innerText=public_counter;
    elemid("unlistedcounter").innerText=unlisted_counter;
    elemid("privatecounter").innerText=private_counter;
    elemid("directcounter").innerText=direct_counter;
    elemid("boostcounter").innerText=boost_counter;
    elemid("replycounter").innerText=reply_counter;
    var replyto=[];
    for (let obj of posts){
        while(obj.indexOf('@')!==-1&&obj.indexOf(' ')!==-1){
            replyto.push(obj.substring(obj.indexOf('@')+1,obj.indexOf(' ')));
            obj=obj.substr(obj.indexOf(' ')+1);
        }
    }
    elemid("mentioncounter").innerText=replyto.length;
    document.getElementById('replyrank').innerHTML = ranksort(replyto);
    var favuser=[];
    for(const like of likes_json['orderedItems']){
        if(like.indexOf('users')!==-1&&like.indexOf('statuses')!==-1){
            favuser.push(like.substring(like.indexOf('users')+6,like.indexOf('statuses')-1));
        }
    }
    document.getElementById("favrank").innerHTML = ranksort(favuser); 
/*
    var ctx = document.getElementById("Chart");
    var myChart = new Chart(ctx, { 
        type: 'scatter',
        data: {
            datasets: [{
                label: "Date Time Scatter",
                borderColor: "#607d8b",
                data: datetimelist
            }]
        },
        options: {
            title: {
                display: true,
                text: 'Date Time Scatter'
            },
            scales: {
                xAxes: [{
                    type: 'time',
                    time:{
                        parser:"YYYY-MM-DD"
                    }
                }]
            },
            tooltips:{mode:'label'}
        }
    });
*/
    var ctx = document.getElementById("Chart");
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
    loading(0)
}

function ranksort(replyto){
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

    for(let i=0;i<30;i++){
        let t=counterlist.indexOf(Math.max.apply(null,counterlist));
        replyrank.push('<tr><th>');
        replyrank.push(i+1);
        replyrank.push('</th><th>');
        replyrank.push(namelist[t]);
        replyrank.push('</th><th>');
        replyrank.push(counterlist[t]);
        replyrank.push('times');
        replyrank.push('</th></tr>');
        counterlist[t]=0;
    }

    replyrank.push('</table>');
    return replyrank.join('');
}
function loadsearch(){
    }
