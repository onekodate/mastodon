/* Declaration */
var outbox_api,likes_api,account={};
var api_since="",api_until="";

Chart.plugins.register({
    beforeDraw: function(c){
        var ctx = c.chart.ctx;
        ctx.fillStyle = "#313543";
        ctx.fillRect(0, 0, c.chart.width, c.chart.height);
    }
});

/* Basic Function */
function elem(id){
    return document.getElementById(id);
}

function error(text){
    elem("error-text").innerText=text;
    elem("error-box").style.display="block";
}

function loading(mode){
    if(mode) elem("progress").className="progress";
    else elem("progress").className="progress invisible";
}

function openclose(btn){
    const targetId=btn.getAttribute("href").slice(1);
    let outbox=elem(targetId).className;
    if  (outbox==="invisible") elem(targetId).className="";
    else elem(targetId).className="invisible";
    return false;
}

function canvas2png(btn){
    const targetId=btn.getAttribute("href").slice(1);
    const canvas=elem(targetId);
    downloadLink=elem("downloadLink");
    downloadLink.href=canvas.toDataURL("image/png");
    downloadLink.download=targetId+".png";
    downloadLink.click();
    return false;
}

function set2fig(num){
    var ret=num;
    if(num<10) ret="0"+num;
    return String(ret);
}

const date2str=(date)=>{
    return date.getFullYear()+"-"+set2fig(date.getMonth()+1)+"-"+set2fig(date.getDate())+" "+set2fig(date.getHours())+":"+set2fig(date.getMinutes())+":"+set2fig(date.getSeconds());
}

function dateParser(car){
    range[car][0]=elem(car+"_since").value;
    range[car][1]=elem(car+"_until").value;
    return false;
}

/* Loading */
var fileArea = elem('dropArea');

fileArea.addEventListener('dragover', (e)=>{
    e.preventDefault();
    fileArea.classList.add('dragover');
});

fileArea.addEventListener('dragleave', (e)=>{
    e.preventDefault();
    fileArea.classList.remove('dragover');
});

fileArea.addEventListener('drop', (e)=>{
    e.preventDefault();
    fileArea.classList.remove('dragover');
    loadFile(e.dataTransfer.files);
});

elem('uploadFile').addEventListener('change', ()=>{
    loadFile(elem('uploadFile').files);
});

var outbox_json,likes_json,access;
function loadFile(files){
    loading(1);
    for(const file of files){
        if(file.type==="application/json"){
            var reader = new FileReader();
            reader.onload=(event)=>{
                elem("error-box").style.display="none"; 
                const json=JSON.parse(event.target.result);
                if(json.id==="outbox.json"){
                    outbox_json=json;
                    elem("ob_cap").className="";
                }else if(json.id==="likes.json"){
                    likes_json=json;
                    elem("lk_cap").className="";
                }else if(json.id==="account.json"){
                    account=json;
                    elem("ac_cap").className="";
                }else if(json.id==="archive.json"){
                    outbox=json.outbox;
                    likes=json.likes;
                    loadPage();
                }else error("You chose wrong file.");
                if(outbox_json&&likes_json&&account){
                    loadPage();
                    //elem("create").className="";
                }else if(outbox_json&&likes_json){
                    elem("loadButton").className="";
                }else if(access) loadAPI();
            };  
            reader.readAsText(file);
        }else error("You chose wrong file.");
    }
    loading(0);
}

function loadPage(){
    if((!outbox||!likes)&&(outbox_json&&likes_json)) json2db();
    elem("dropArea").className="invisible";
    elem("load").className="invisible";
    outbox2published();
    showSummary();
    showFigure(true,true,true);
    showRanking();
    elem("main").className="";
    loading(0);
}

var outbox, likes;
function json2db(){
    outbox={};
    likes={};
    const content=(val)=>{
        let result="";
        if(val.type==="Announce") result=val.object;
        else result=val.object.content.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'');
        return result; 
    }
    const visibility=(val)=>{
        let result="undefined";
        if(val.type==="Announce") result="boost";
        else{
            if(val.cc.length===0){
                if(val.to.length!==0){
                    if(val.to[0].indexOf("followers")===-1) result="direct";
                    else result="private";
                }else result="direct";
            }else if(val.to.includes("https://www.w3.org/ns/activitystreams#Public")) result="public";
            else result="unlisted";
        }
        return result;
    }
    const mentions=(val)=>{
        let result=[];
        if(val.object.tag){
            for(let tag of val.object.tag){
                if(tag.type==="Mention"){
                    let last=tag.name.length;
                    if(tag.name.lastIndexOf("@")!=0){
                        last=tag.name.lastIndexOf("@");
                    }
                    result.push(tag.name.substring(1,last));
                }
            }
        }
        return result;
    }
    const reblog=(val)=>{
        let result="";
        if(val.type==="Announce") result=val.cc[0].substring(val.cc[0].lastIndexOf("/")+1);
        return result;
    }
    const inReplyTo=(val)=>{
        let result="";
        if(val.object.inReplyTo) result=val.object.inReplyTo;
        return result;
    }
    outbox_json.orderedItems.forEach((val,idx)=>{
        let skip=false;
        val.published=date2str(new Date(val.published));
        if(outbox[val.published]){
            if(outbox[val.published].id!=val.id) val.published+=(":"+idx%10); 
            else skip=true;
        }
        if(!skip){
            outbox[val.published]={
                id:val.id,
                content:content(val),
                visibility:visibility(val),
                mentions:mentions(val),
                inReplyTo:inReplyTo(val),
                reblog:reblog(val),
            }
        }
    })
    const likeacct=(val)=>{
        let result="";
        if(val.indexOf("users")!==-1&&val.indexOf("statuses")!==-1){
            result=val.substring(val.indexOf("users")+6,val.indexOf("statuses")-1);
        }else if(val.indexOf("https://")!==-1&&val.indexOf("/",8)!==-1){
            result="SERVER:"+val.substring(8,val.indexOf("/",8)-1);    
        }else if(val.indexOf("tag:")!==-1&&val.indexOf(",")){
            result="SERVER:"+val.substring(4,val.indexOf(",")-1);
        }else{
            result=val;
            console.log(val);
        }
        return result;
    }
    likes_json.orderedItems.forEach((val)=>{
        if(!likes[val]){
            likes[val]={
                likeacct:likeacct(val),
            };
        }
    });
}

/* API */
function api2db(){
    outbox_api.forEach((val,idx)=>{
        if(outbox[val.created_at]){
            if(outbox[val.created_at].id!=val.id) val.created_at+=idx%10;
        }
        outbox[val.created_at]={
            id:val.id,
            content:val.content,
            visibility:val.visibility,
            mentions:val.mentions,
            reblog:val.reblog.name,
            app:val.app,
            liked:val.favourites_count,
            reblogged:val.reblogs_count,
        }
    })
    likes_api.forEach((val)=>{
        likes[val.url]={
            likeacct:val.account.username,
            content:val.content,
            created_at:val.created_at,
        }
    })
}

/* Data Arrangement */
var published={
    app:{},
    visibility:{},
    mentions:{},
    reblogged:{},
    liked:{},
    posts:[],
    reblog:{},
    likeacct:{},
    replies:[],
};
var db_since="",db_until="";
function outbox2published(){
    for(const outbox_key in outbox){
        const val=outbox[outbox_key];
        if(val.reblog==="") published.posts.push(outbox_key);
        if(val.mentions.length>0) published.replies.push(outbox_key);
        for(const published_key in published){
            if(published_key==="mentions"){
                for(const key of val[published_key]){
                    if(!published[published_key][key]) published[published_key][key]=[];
                    published[published_key][key].push(outbox_key);
                }
            }else if(published_key!=="posts"){ 
                if(val[published_key]){
                    if(!published[published_key][val[published_key]]) published[published_key][val[published_key]]=[];
                    published[published_key][val[published_key]].push(outbox_key);
                }
            }
        }
    }
    for(const likes_key in likes){
        if(likes[likes_key].created_at){
            if(!published.likeacct[likes[likes_key].likeacct]) published.likeacct[likes[likes_key].likeacct]=[];
            published.likeacct[likes[likes_key].likeacct].push(likes[likes_key].created_at);
        }
    }
    published.posts.sort();
    db_since=published.posts[0].substring(0,10);
    db_until=published.posts[published.posts.length-1].substring(0,10);
    let sin=new Date(db_since),unt=new Date(db_until);
    for(const key in slider){
        slider[key].noUiSlider.updateOptions({
            range:{
                min:0,
                max:(unt.getYear()-sin.getYear())*12+(unt.getMonth()-sin.getMonth())+1,
            },
        })
    }
}

function published2date(since,until,datetick){
    const dateFormatter=(str,tick)=>{
        let newstr=str.substring(0,tick);
        if(newstr.length===9){
            newstr=newstr+"1";
        }
        return newstr;
    }
    let dateCount={posts:{},replies:{}};
    for(const outbox_key of published.posts){
        let date=outbox_key.substring(0,10);
        if(since<=date&&date<=until){
            date=dateFormatter(date.substring(0,datetick),datetick);
            if(!dateCount.posts[date]) dateCount.posts[date]=[];
            dateCount.posts[date].push(outbox_key);
        }
    }    
    for(const outbox_key of published.replies){
        let date=outbox_key.substring(0,10);
        if(since<=date&&date<=until){
            date=dateFormatter(date.substring(0,datetick),datetick);
            if(!dateCount.replies[date]) dateCount.replies[date]=[];
            dateCount.replies[date].push(outbox_key);
        }
    }    
    for(const published_key in published){
        if(published_key!=="posts"&&published_key!=="replies"){
            dateCount[published_key]={};
            for(const key in published[published_key]){
                if(!dateCount[published_key][key]) dateCount[published_key][key]={};
                for(const outbox_key of published[published_key][key]){
                    let date=outbox_key.substring(0,10);
                    if(since<=date&&date<=until){
                        date=dateFormatter(date.substring(0,datetick),datetick);
                        if(!dateCount[published_key][key][date]) dateCount[published_key][key][date]=[];
                        dateCount[published_key][key][date].push(outbox_key);
                    }
                }
            }
        }
    }
    return dateCount;
}

const timeFormatter=(str)=>{
    let newstr=str;
    if(str.length===2){
        newstr=str+":00-"+str+":59";
    }else if(str.length===4){
        newstr=str+"0-"+str+"9";
    }
    return newstr;
}

const timeCountSetter=(dict,tick)=>{
    dict={};
    for(let i=0;i<24;i++){
        i=set2fig(i);
        if(tick>14){
            for(let j=0;j<6;j++){
                if(tick>15){
                    for(let k=0;k<10;k++){
                        dict[i+":"+j+k]=[];
                    }
                }else{
                    dict[timeFormatter(i+":"+j)]=[];
                }
            }
        }else{
            dict[timeFormatter(i)]=[];
        }
    }
    return dict;
}

function published2time(since,until,timetick){
    let timeCount={};
    for(const published_key in published){
        timeCount[published_key]={};
        if(published_key==="posts"||published_key==="replies"){
            timeCount[published_key]=timeCountSetter(timeCount[published_key],timetick);
        }else{
            for(const key in published[published_key]){
                timeCount[published_key][key]={};
                timeCount[published_key][key]=timeCountSetter(timeCount[published_key][key],timetick);
            }
        }
    }
    for(const outbox_key of published.posts){
        const date=outbox_key.substring(0,10);
        const time=timeFormatter(outbox_key.substring(11,timetick));
        if(since<=date&&date<=until){
            timeCount.posts[time].push(outbox_key);
        }
    }    
    for(const outbox_key of published.replies){
        const date=outbox_key.substring(0,10);
        const time=timeFormatter(outbox_key.substring(11,timetick));
        if(since<=date&&date<=until){
            timeCount.replies[time].push(outbox_key);
        }
    }   
    for(const published_key in published){
        if(published_key!=="posts"&&published_key!=="replies"){ 
            for(const key in published[published_key]){
                if(!timeCount[published_key][key]) timeCount[published_key][key]={};
                for(const outbox_key of published[published_key][key]){
                    const date=outbox_key.substring(0,10);
                    const time=timeFormatter(outbox_key.substring(11,timetick));
                    if(since<=date&&date<=until){
                        timeCount[published_key][key][time].push(outbox_key);
                    }
                }
            }
        }
    }
    return timeCount;
}

/* Slider */
var slider={
    summary:elem("summary-slider"), 
    figure:elem("figure-slider"), 
    ranking:elem("ranking-slider"), 
};

const slider_setting={
    start: [ 0, 100 ], // ハンドルの初期位置を指定。数を増やせばハンドルの数も増える。
    step: 1, // スライダを動かす最小範囲を指定。
    margin: 1, // ハンドル間の最低距離を指定。
    connect: true, // ハンドル間を色塗りするかどうか
    direction: 'ltr', // どちらを始点にするか。ltr(Left To Right) or rtl(Right To Left)。
    orientation: 'horizontal', // スライダーの方向。横向きか縦か。縦の場合は、cssでrangeのheightを適当に設定しないとつぶれてしまう。
    behaviour: 'tap-drag', // ハンドルの動かし方。
    range: {
        'min': 0,
        'max': 100
    }, // スライダーの始点と終点 今回は100の範囲に対して、10がステップ、かつdensity 5なので、10毎に大きな目盛り、5毎に小さな目盛り。
};

for(const key in slider){
    noUiSlider.create(slider[key], slider_setting);
}

slider.summary.noUiSlider.on("update",(values)=>{
    if(outbox_json){
        let date=new Date(db_since);
        date.setDate(1);
        date.setMonth(date.getMonth()+Number(values[0]));
        range.summary[0]=date2str(date).substring(0,10);
        date.setMonth(date.getMonth()+Number(values[1])-Number(values[0]));
        date.setDate(0);
        range.summary[1]=date2str(date).substring(0,10);
        if(range.summary[0]<db_since) range.summary[0]=db_since;
        if(range.summary[1]>db_until) range.summary[1]=db_until;
        elem("summary_since").value=range.summary[0];
        elem("summary_until").value=range.summary[1];
        showSummary();
    }
});

slider.figure.noUiSlider.on("update",(values)=>{
    if(plot_date&&plot_time&&plot_scatter){
        let date=new Date(db_since);
        date.setDate(1);
        date.setMonth(date.getMonth()+Number(values[0]));
        range.figure[0]=date2str(date).substring(0,10);
        date.setMonth(date.getMonth()+Number(values[1])-Number(values[0]));
        date.setDate(0);
        range.figure[1]=date2str(date).substring(0,10);
        if(range.figure[0]<db_since) range.figure[0]=db_since;
        if(range.figure[1]>db_until) range.figure[1]=db_until;
        elem("figure_since").value=range.figure[0];
        elem("figure_until").value=range.figure[1];
        showFigure(true,false,false);
    }
});

slider.ranking.noUiSlider.on("update",(values)=>{
    if(plot_mentions&&plot_reblog&&plot_likeacct){
        let date=new Date(db_since);
        date.setDate(1);
        date.setMonth(date.getMonth()+Number(values[0]));
        range.ranking[0]=date2str(date).substring(0,10);
        date.setMonth(date.getMonth()+Number(values[1])-Number(values[0]));
        date.setDate(0);
        range.ranking[1]=date2str(date).substring(0,10);
        if(range.ranking[0]<db_since) range.ranking[0]=db_since;
        if(range.ranking[1]>db_until) range.ranking[1]=db_until;
        elem("ranking_since").value=range.ranking[0];
        elem("ranking_until").value=range.ranking[1];
        showRanking();
    }
});

var rankingTickSlider=elem("ranking-tick-slider");
noUiSlider.create(rankingTickSlider, {
    start: 0, // ハンドルの初期位置を指定。数を増やせばハンドルの数も増える。
    step: 1, // スライダを動かす最小範囲を指定。
    direction: 'ltr', // どちらを始点にするか。ltr(Left To Right) or rtl(Right To Left)。
    orientation: 'horizontal', // スライダーの方向。横向きか縦か。縦の場合は、cssでrangeのheightを適当に設定しないとつぶれてしまう。
    behaviour: 'tap', // ハンドルの動かし方。
    range: {
        'min': 0,
        'max': 1
    }, // スライダーの始点と終点 今回は100の範囲に対して、10がステップ、かつdensity 5なので、10毎に大きな目盛り、5毎に小さな目盛り。
});

var ranking_tick=1;
rankingTickSlider.noUiSlider.on("update",(values)=>{
    if(plot_mentions&&plot_reblog){
        if(values[0]==="1.00") ranking_tick=7;
        else ranking_tick=1;
        showRanking();
    }
})

/* showData */
var metroColors=["#f39700","#e60012","#9caeb7","#00a7db","#009944","#d7c447","#9b7cb6","#00ada9","#bb641d"];
var summary_datetick=10, figure_tick=[8,15];
var range={
    summary:[0,0],
    figure:[0,0],
    ranking:[0,0],
};
function showAccount(){
    elem("avatar").innerHTML='<img height="50px" src='+account.avatar+">";
    elem("display").innerText=account.display_name;
    elem("acct").innerText="@"+account.account;
    elem("note").innerText=account.note.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'');
    elem("created").innerText=time2str(account.created_at);
    elem("last").innerText=account.last_status_at;
    elem("numstatuses").innerText=account.statuses_count;
    elem("numfollowing").innerText=account.following_count;
    elem("numfollower").innerText=account.followers_count;
}

var plot_visibility,plot_app;
function showSummary(){
    if(plot_visibility) plot_visibility.destroy();
    if(elem("summary_since").value&&elem("summary_until").value){
        range.summary[0]=elem("summary_since").value;
        range.summary[1]=elem("summary_until").value;
    }else if(!range.summary[0]||!range.summary[1]){
        range.summary[0]=db_since;
        range.summary[1]=db_until;
    }
    elem("summary_since").value=range.summary[0];
    elem("summary_until").value=range.summary[1];
    const dateCount=published2date(range.summary[0],range.summary[1],10);
    const up_count=Object.keys(dateCount.posts).length;
    const days_count=(new Date(range.summary[1])-new Date(range.summary[0]))/24/60/60/1000+1;
/*
    const daysCount=(range,tick)=>{
        let result="";
        if(tick===10){
            result=(new Date(range[1])-new Date(range[0]))/24/60/60/1000+1+" days";
        }else if(tick===7){
            const since=new Date(range[0]), until=new Date(range[1]);
            result=(until.getYear()-since.getYear())*12+until.getMonth()-since.getMonth()+1+" months";
        }else if(tick===4){
            const since=new Date(range[0]), until=new Date(range[1]);
            result=until.getYear-since.getYear+1+" years";
        }
        return result;
    }
    const days_count=daysCount(range.summary,summary_datetick);
*/
    const counter=(dictionary)=>{
        let sum=0;
        for(const key in dictionary){
            if(Array.isArray(dictionary[key])) sum+=dictionary[key].length;
            else{
                for(const key2 in dictionary[key]){
                    sum+=dictionary[key][key2].length;
                }
            }
        }
        return sum;
    }
    let count={};
    for(const key of ["posts","replies","likeacct"]){
        count[key]=counter(dateCount[key]);
    }
    for(const key in dateCount.visibility){
        count[key]=counter(dateCount.visibility[key]);
    }
/*
    const ranking=(data,n)=>{
        let list=[],result=["<table>"];
        for(const date in data){
            let sum=0;
            if(Array.isArray(data[date])) sum=data[date].length; 
            else{
                for(const key in data[date]){
                    sum+=data[date][key].length;
                }
            }
            list.push({
                date:date,
                sum:sum,
            })
        }
        list=list.sort((a,b)=>(b.sum-a.sum));
        for(let i=0; i<n;i++){
            result=result.concat(["<tr><td>",i+1+".","</td><td>",list[i].date,"</td><td>",list[i].sum," times </td></tr>"]);
        }
        result.push("</table");
        return result.join("");
    }
 */ 
    count.pobo=count.posts+count.boost;
    elem("db_count").innerText=Object.keys(outbox).length;
    elem("db_since").innerText=db_since;
    elem("db_until").innerText=db_until;
    elem("up_count").innerText=up_count;
    elem("days_count").innerText=days_count;
    elem("up_ratio").innerText=(up_count/days_count*100).toFixed(1);
    elem("tpd").innerText=(count.posts/up_count).toFixed();
    elem("public_ratio").innerText=(count.public/count.pobo*100).toFixed(2);
    elem("unlisted_ratio").innerText=(count.unlisted/count.pobo*100).toFixed(2);
    elem("private_ratio").innerText=(count.private/count.pobo*100).toFixed(2);
    elem("direct_ratio").innerText=(count.direct/count.pobo*100).toFixed(2);
    elem("boost_ratio").innerText=(count.boost/count.pobo*100).toFixed(2);
    elem("posts_count").innerText=count.posts;
    elem("reply_count").innerText=count.replies;
    elem("boost_count").innerText=count.boost;
    elem("like_count").innerText=Object.keys(likes).length+" times through whole term**";
/*
    elem("post_date_rank").innerHTML=ranking(dateCount.posts,5);
    elem("boost_date_rank").innerHTML=ranking(dateCount.visibility.boost,5);
    elem("reply_date_rank").innerHTML=ranking(dateCount.replies,5);
*/
    plot_visibility = new Chart(elem("visibility_pie"),{
        type:'doughnut',
        data:{
            datasets:[{
                data:[count.public,count.unlisted,count.private,count.direct,count.boost],
                backgroundColor:metroColors.slice(0,5),
                borderWidth:1,
            }],
            labels:["Public", "Unlisted", "Private", "Direct", "Boost"],
        },
        options:{
            legend:{
                display:false,
            },
            animation:false,
        },
    });
/*
    if(Object.keys(dateCount.app).length!==0){
        const app_ratio=(data)=>{
            let numlist=[],keylist=[],result={str:[],key:[],num:[]};
            for(const key in data){
                numlist.push(data[key].length);
                keylist.push(key);
            }
            const sum=numlist.reduce((acc,cur)=>{return acc+cur});
            for(let i=0; i<numlist.length;i++){
                const idx=numlist.indexOf(Math.max(...numlist));
                result.str.concat([keylist[idx],":",(numlist[idx]/sum*100).toFixed(1),"%"]);
                result.key.push(keylist[idx]);
                result.num.push(numlist[idx]);
                numlist[idx]=0;
            }
            result.str=result.str.join("");
            return result;
        }

        const edRanking=(data,n)=>{
            let numlist=[],datelist=[],result=["<table>"];
            for(const date in data){
                let sum=0;
                for(const key in data[date]){
                    sum+=data[date][key].length*key;
                }
                numlist.push(sum);
                datelist.push(date);
            }
            for(let i=0; i<n;i++){
                const idx=numlist.indexOf(Math.max(...numlist));
                result=result.concat(["<tr><td>",i+1+".","</td><td>",datelist[idx],"</td><td>",numlist[idx]," times </td></tr>"]);
                numlist[idx]=0;
            }
            result.push("</table");
            return result.join("");
        }
        const app_keys=Object.keys(published.app);
        const app_result=app_ratio(dateCount.app);
        elem("api_count").innerText=counter(dateCount.app);
        elem("api_since").innerText=app_keys[0].substring(0,10);
        elem("api_until").innerText=app_keys[app_keys.length-1].substring(0,10);
        elem("api_info").className="";
        elem("app_ratio").innerHTML=app_result.str;
        elem("app_ratio").className="";
        elem("like_count").innerText=count.likeacct;
        elem("boosted_count").innerText=counter(dateCount.reblogged);
        elem("liked_count").innerText=counter(dateCount.liked);
        elem("api_ed").className="";

        elem("like_date_rank").innerHTML=ranking(dateCount.likeacct,5);
        elem("boosted_date_rank").innerHTML=edRanking(dateCount.reblogged,5);
        elem("liked_date_rank").innerHTML=edRanking(dateCount.liked,5);

        elem("summaryLowerRow").className="";
        plot_app = new Chart(elem("app_pie"),{
            type:'doughnut',
            data:{
                datasets:[{
                    data:app_result.num,
                    backgroundColor:["#ffffff","#d9e1e8","#9baec8","#191b22","#000000"],
                    borderWidth:1,
                }],
                labels:app_result.key,
            },
            options:{legend:{display:false,},},
        });
    }
*/
}

var plot_date,plot_time,plot_scatter;
function showFigure(date_term,date_tick,time_tick){
    if(elem("figure_since").value&&elem("figure_until").value){
        range.figure[0]=elem("figure_since").value;
        range.figure[1]=elem("figure_until").value;
    }else if(!range.figure[0]||!range.figure[1]){
        range.figure[0]=db_since;
        range.figure[1]=db_until;
    }
    elem("figure_since").value=range.figure[0];
    elem("figure_until").value=range.figure[1];
    if(date_tick){
        if(plot_date) plot_date.destroy();
        const dateCount=published2date(range.figure[0],range.figure[1],figure_tick[0]);
        const date_datasets=["public","unlisted","private","direct","boost"].map((key,idx)=>{
            const date_data=Object.keys(dateCount.posts).map((date)=>{
                let y=0;
                if(dateCount.visibility[key][date]) y=dateCount.visibility[key][date].length;
                return {
                    x:new Date(date),
                    y:y,
                }
            });
            return {
                label:key,
                fontColor:"#ffffff",
                data:date_data,
                backgroundColor:metroColors[idx],
            }
        });
        plot_date = new Chart(elem("datebar"),{
            type:'bar',
            data: {
                datasets:date_datasets,
            },
            options:{
                legend:{
                    labels:{
                        fontColor:
                        '#ffffff'
                    }
                },
                scales:{
                    xAxes:[{
                        ticks:{
                            fontColor:"#ffffff",
                        },
                        stacked:true,
                        type:'time',
                        time:{
                            unit:"month",
                            unitStepSize:1,
                        },
                        gridLines:{
                            color:"#9baec8"
                        },
                    }],
                    yAxes:[{
                        stacked:true,
                        gridLines:{
                            color:"#9baec8",
                        },
                        ticks:{
                            fontColor:"#ffffff",
                        },
                    }],
                },
            }
        });
    }else if(date_term){
        plot_date.options.scales.xAxes[0].ticks={
            min:new Date(range.figure[0]),
            max:new Date(range.figure[1]),
        }
        plot_date.update();
    }
    if(date_term||time_tick){
        const timeCount=published2time(range.figure[0],range.figure[1],figure_tick[1]);
        const labels=Object.keys(timeCount.posts);
        const time_datasets=["public","unlisted","private","direct","boost"].map((key,idx)=>{
            const time_data=Object.keys(timeCount.visibility[key]).map((time)=>{
                return timeCount.visibility[key][time].length;
            });
            return {
                label:key,
                fontColor:"#ffffff",
                data:time_data,
                backgroundColor:metroColors[idx],
            }
        }); 
        if(plot_time) plot_time.destroy();
        plot_time = new Chart(elem("timebar"),{
            type:'bar',
            data: {
                labels:labels,
                datasets:time_datasets,
            },
            options:{
                legend:{labels:{fontColor:'#ffffff'}},
                scales:{
                    xAxes:[{
                        stacked:true,
                        gridLines:{color:"#9baec8",},
                        ticks: {
                            maxTicksLimit:24,
                            min:0,
                            max:labels.length+1,
                            fontColor:"#ffffff",
                        },
                    }],
                    yAxes:[{
                        stacked:true,
                        gridLines:{color:"#9baec8",},
                        ticks: {
                            fontColor:"#ffffff",
                        },
                    }],
                },
            }
        });
    }

    if(!plot_scatter){
        const timelabels=Object.keys(timeCountSetter({},16));
        const scatter_datasets=["public","unlisted","private","direct","boost"].map((key,idx)=>{
            const scatter_data=published.visibility[key].map((val)=>{
                const datetime=new Date(val);
                return {
                    x:new Date(datetime),
                    y:datetime.getHours()*60+datetime.getMinutes(),
                }
            })
            return {
                label:key,
                borderColor:metroColors[idx],
                data:scatter_data,
                pointRadius:1.5,
            }
        }); 
        plot_scatter = new Chart(elem("scatter"),{
            type:'scatter',
            data: {
                datasets:scatter_datasets,
            },
            options:{
                legend:{labels:{fontColor:'#ffffff'}},
                scales:{
                    xAxes:[{
                        ticks: {
                            fontColor:"#ffffff",
                            min:new Date(range.figure[0]),
                            max:new Date(range.figure[1]),
                        },
                        type:'time',
                        gridLines:{color:"#9baec8",},
                    }],
                    yAxes:[{
                        gridLines:{color:"#9baec8",},
                        ticks: {
                            fontColor:"#ffffff",
                            min:0,
                            max:1441,
                            stepSize:60,
                            callback:(value)=>{return timelabels[value]},
                        },
                    }],
                },
            }
        }); 
    }else if(date_term){
        plot_scatter.options.scales.xAxes[0].ticks={
            min:new Date(range.figure[0]),
            max:new Date(range.figure[1]),
        }
        plot_scatter.update();
    }
}

/* Ranking */
var plot_mentions, plot_reblog, plot_likeacct;
function showRanking(){
    if(elem("ranking_since").value&&elem("ranking_until").value){
        range.ranking[0]=elem("ranking_since").value;
        range.ranking[1]=elem("ranking_until").value;
    }else if(!range.ranking[0]||!range.ranking[1]){
        range.ranking[0]=db_since;
        range.ranking[1]=db_until;
    }
    elem("ranking_since").value=range.ranking[0];
    elem("ranking_until").value=range.ranking[1];
    const dateCount=published2date(range.ranking[0],range.ranking[1],ranking_tick);
    const showRank=(val)=>{
        let datasets=[];
        for(const account_key in dateCount[val]){
            let data=[],num=0;
            for(const date_key in dateCount.posts){
                let y=0;
                if(dateCount[val][account_key][date_key]) y=dateCount[val][account_key][date_key].length;
                data.push({
                    x:new Date(date_key),
                    y:y,
                });
                num+=y;
            }
            datasets.push({
                label:account_key, //"onekodate".repeat(Math.ceil(account_key.length/"onekodate".length)).substring(0,account_key.length),
                fontColor:"#ffffff",
                data:data,
                num:num,
                fill:false,
                lineTension:0,
                backgroundColor:metroColors[account_key.length%metroColors.length],
            });
        }
        datasets.sort((a,b)=>(a.num-b.num));
        datasets.reverse();
        const showBar=(plot,labels,data)=>{
            return new Chart(elem(plot),{
                type:"bar",
                data:{
                    labels:labels,
                    datasets:[{
                        label:plot,
                        data:data,
                        fontColor:"#ffffff",
                        backgroundColor:labels.map((val)=>metroColors[val.length%metroColors.length]),
                    }]
                },
                options:{
                    legend:{
                        display:false,
                        labels:{
                            display:false,
                        },
                    },
                    scales:{
                        xAxes:[{
                            gridLines:{
                                color:"#9baec8",
                            },
                            ticks:{
                                fontColor:"#ffffff",
                            },
                        }],
                        yAxes:[{
                            gridLines:{
                                color:"#9baec8",
                            },
                            ticks:{
                                fontColor:"#ffffff",
                            },
                        }],
                    },
                }
            });
        };
        if(val==="likeacct"&&datasets.length===0){
            let like={},data=[];
            for(const likes_key in likes){
                if(!like[likes[likes_key].likeacct]) like[likes[likes_key].likeacct]=[];
                like[likes[likes_key].likeacct].push(likes_key);
            }
            for(const like_key in like){
                data.push({
                    account:like_key,
                    num:like[like_key].length,
                });
            }
            data.sort((a,b)=>(a.num-b.num));
            data.reverse();
            labels=data.map(val=>val.account);
            data=data.map(val=>val.num);
            if(plot_likeacct) plot_likeacct.destroy();
            result=showBar("likeacct",labels.slice(0,30),data.slice(0,30));
        }else if(datasets.every((val)=>{return (val.data.length===1)})){
            const labels=datasets.map(val=>val.label);
            const data=datasets.map(val=>val.num);
            result=showBar(val,labels.slice(0,30),data.slice(0,30));
        }else{
            let datasets1=datasets.slice(0,10);
            const data=datasets.slice(10,).reduce((acc,cur)=>{
                if(!Array.isArray(acc)) acc=cur.data;
                else{
                    acc=acc.map((val,idx)=>{
                        val.y+=cur.data[idx].y;
                        return val;
                    });
                }
                return acc;
            });
            datasets1.push({
                label:"Others",
                fontColor:"#ffffff",
                data:data,
                backgroundColor:"#ffffff",
            });
            result=new Chart(elem(val),{
                type:"bar",
                data:{
                    datasets:datasets1,
                },
                options:{
                    legend:{
                        labels:{
                            fontColor:"#ffffff",
                        },
                    },
                    scales:{
                        xAxes:[{
                            stacked:true,
                            type:"time",
                            time:{
                                unit:"month",
                                unitStepSize:1,
                            },
                            gridLines:{
                                color:"#9baec8",
                            },
                            ticks:{
                                fontColor:"#ffffff",
                            },
                        }],
                        yAxes:[{
                            stacked:true,
                            gridLines:{
                                color:"#9baec8",
                            },
                            ticks:{
                                fontColor:"#ffffff",
                            },
                        }],
                    },
                },
            })
        }
        return result;
    }
    if(plot_mentions) plot_mentions.destroy();
    plot_mentions=showRank("mentions");
    if(plot_reblog) plot_reblog.destroy();
    plot_reblog=showRank("reblog");
    if(plot_likeacct) plot_likeacct.destroy();
    plot_likeacct=showRank("likeacct");
}

/* Search */
function loadSearch(){
    loading(1);
    var list={}, request=null,data=[],labels=[];
    if(elem("word").value){
        for(const key of published.posts){
            if(outbox[key].content.indexOf(elem("word").value)!==-1){
                list[key]=outbox[key].content;

            }
        }
        request=elem("word").value+" from toot content.";
        elem("word").value="";
    }else if(elem("boost").value){
        if(published.reblog[elem("boost").value]){
            for(const key of published.reblog[elem("boost").value]){
                list[key]='<a target="_blank" href='+outbox[key].content+">"+outbox[key].content+"</a>";
            }
        }
        request=elem("boost").value+" from boosted user.";
        elem("boost").value="";
    }else if(elem("reply").value){
        var replylist={};
        if(published.mentions[elem("reply").value]){
            for(const key of published.mentions[elem("reply").value]){
                replylist[outbox[key].inReplyTo.substr(outbox[key].inReplyTo.lastIndexOf("/"),4)]=key;
            }
        }
        for(const key in replylist){
            list[replylist[key]]='<a target="_blank" href='+outbox[replylist[key]].inReplyTo+">"+outbox[replylist[key]].content+"</a>";
        }
        request=elem("reply").value+" from reply user.";
        elem("reply").value="";
    }else if(elem("date").value){
        for(const key in outbox){
            if(key.indexOf(elem("date").value)!==-1){
                if(outbox[key].reblog==="")  list[key]=outbox[key].content;
                else list[key]='<a target="_blank" href='+outbox[key].content+">"+outbox[key].content+"</a>";
            }
        }
        request="toots in "+elem("date").value;
        elem("date").value="";
    }else error("You don't input a word.");

    if(request&&Object.keys(list).length===0){
        elem("request").innerText="No toot was found for your request: "+request;
        elem("result").innerText="";
    }else if(request){
        var resulttable=['<table>'];
        var keys=Object.keys(list).sort().reverse()
        for(key of keys){
            resulttable.push('<tr><th class="searchleft">');
            resulttable.push(key.substr(0,19));
            resulttable.push('</th><th class="searchright">');
            resulttable.push(list[key]);
            resulttable.push('</th></tr>');   
        }
        resulttable.push('</table>');
        elem("request").innerText="You are searching for "+request+" There are "+Object.keys(list).length+" results.";
        elem("result").innerHTML=resulttable.join('');
    }    
    loading(0);
}

/* Database */
var ver = 1, dbName="mastodon", storeName="archive", key_id=1;
var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB;
var IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.mozIDBTransaction;
var db = null;

function createSample(){
    let openRequest = indexedDB.open(dbName, ver);
    openRequest.onupgradeneeded = function(e){
        console.log("create-upgradeneeded");
        db = openRequest.result;
        db.createObjectStore(storeName, { "keyPath": "id" });
        console.log(db.objectStoreNames);
    }
    openRequest.onsuccess = function(e) {
        db = openRequest.result;
        let addRequest = db.transaction(storeName, "readwrite").objectStore(storeName).put({
            id:key_id,
            outbox:outbox,
            likes:likes,
            access:access,
        });
        addRequest.onsuccess=function(){
            console.log("Success");
            elem("createSample").className="invisible";
            elem("deleteSample").className="datacontent";
        }
        addRequest.onerror = function(err){
            console.log(err.message);
        }
    }           
    openRequest.onerror = function(err){console.log(err.message)}
    openRequest.onblocked=function(err){console.log("blocked")}
}
/*
function addSample() {
    var openRequest=indexedDB.open(dbName,ver);
    openRequest.onsuccess=function(e){
        db=event.target.result;
        var transaction = db.transaction([storeName], "readwrite");
        var store = transaction.objectStore(storeName);
        var data = {"id":key_id,"outbox":"outbox_json","likes":"likes_json"};
        var addRequest = store.put(data);
        addRequest.onsuccess=function(e){console.log("success")}
        addRequest.onerror = function(e){console.log(e)}
    }
}
*/
function getSample() {
    loading(1);
    let openRequest=indexedDB.open(dbName,ver);
    db=null;
    openRequest.onsuccess=function(e){
        db=openRequest.result;
        if(db.objectStoreNames.length>0){
            const transaction = db.transaction([storeName], IDBTransaction.READ_ONLY);
            let getRequest = transaction.objectStore(storeName).get(key_id);
            getRequest.onsuccess = function(e){
                outbox=getRequest.result.outbox;
                likes=getRequest.result.likes;
                if(outbox&&likes){
                    loadPage();
                    elem("createSample").className="invisible";
                    elem("deleteSample").className="datacontent";
                }
                else console.log("Not Found");
            }
            getRequest.onerror=function(e){console.log(e)}
        }else{
            console.log("db none");
            db.close();
            deleteSample();
        }   
    }
    openRequest.onerror=function(e){console.log(e)}
    loading(0);
}

function deleteSample() {
    if(db) db.close();
    var deleteRequest = indexedDB.deleteDatabase(dbName);
    deleteRequest.onsuccess=function(e){
        console.log("Deleted in Successful");
        elem("createSample").className="datacontent";
        elem("deleteSample").className="invisible";
    }
    deleteRequest.onerror = function(err){
        console.log(err.message);
    }
    deleteRequest.onblocked=function(e){
        console.log("There is a severe error, I hope you don't get this message.");
    }
}

function downloadJson(){
    if(outbox&&likes){
        let downloadLink=elem("downloadLink");
        const blob=new Blob([JSON.stringify({
            id:"archive.json",
            outbox:outbox,
            likes:likes,
        })],{type:"application/json"});
        downloadLink.href=URL.createObjectURL(blob);
        downloadLink.download="mastodonArchiveViewer.json";
        downloadLink.click();
    }
}
