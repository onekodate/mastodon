/* Declaration */
const metroColors=["#f39700","#e60012","#9caeb7","#00a7db","#009944","#d7c447","#9b7cb6","#00ada9","#bb641d"];
/* Basic Function */
const elem		= (id)=>document.getElementById(id);
const date2str	= (date)=>date.toISOString().slice(0, 10);
const time2str	= (date)=>`${date2str(date)} ${date.toISOString().slice(11, 19)}`;
/* Loading */
const fileArea	= elem("dropArea");
    fileArea.addEventListener("dragover",(e)=>{
        e.preventDefault();
        fileArea.classList.add("dragover");
    });
    fileArea.addEventListener("dragleave",(e)=>{
        e.preventDefault();
        fileArea.classList.remove("dragover");
    });
    fileArea.addEventListener("drop",(e)=>{
        e.preventDefault();
        fileArea.classList.remove("dragover");
        loadFile(e.dataTransfer.files);
    });
    // Cardの表示に関する関数
const display_card = (pressed_button) => {
    if (pressed_button == "result") {
        element = elem("search_result")
        if (element.style.display == "none") element.style.display = "block";
        else element.style.display = "none";
    } else {
        ["search", "database", "credit"].forEach(val=>{
            element = elem(val)
            if (pressed_button == val && element.style.display == "none") element.style.display = "block";
            else element.style.display = "none";
        })
    }
};

// ロード後のオブジェクト
class Archive {
    data = undefined;
    data_search = undefined;
    data_plot = undefined;
    date_minmax = [undefined, undefined];

    id = undefined;
    value = undefined;

    date_selected = [undefined, undefined];
    plot_type = undefined;
    visibility = ["public", "unlisted", "private", "direct", "boost", "like"];
    resolution = undefined;
    stack = undefined;
    only_show_searched = false;

    constructor (data) {
        this.data = data;
        this.date_minmax = [data[0],data[data.length-1]].map(val=>date2str(val.publishedDate));
    };

    search (input) {
        const id = input.getAttribute("id");
        const value = elem(id).value;
        const result = (id==="word")
            ?this.data.filter(val=>val.content.includes(value))
            :(id==="date")
                ?this.data.filter(val=>val.published.includes(value))
                :(id==="account")
                    ?this.data.filter(val=>(val.mentions&&val.mentions.length>0
                        ?val.mentions.some(v=>v.includes(value))
                        :(val.reblog
                            ?val.reblog.includes(value)
                            :(val.account
                                ?val.account.includes(value)
                                :false))))
                    :[];
        this.id = id;
        this.value = value;
        this.data_searched = result;
    };

    update_summary(){
        const data = (
            this.only_show_searched
                ?this.data_search
                :this.data
            ).filter(val=>[
                val.publishedDate!==false,
                this.date_selected[0].getTime()<=val.publishedDate.getTime(),
                val.publishedDate.getTime()<=this.date_selected[1].getTime(),
            ].every(v=>v));
        const days_active = Array.from(
            new Set(data.range
                .filter(val=>val.visibility!=="like")
                .map(val=>date2str(val.publishedDate)))
        ).length;
        const days_past = (this.date_selected[1] - this.date_selected[0])/24/60/60/1000+1;
        const count = {
            public:0,
            unlisted:0,
            private:0,
            direct:0,
            boost:0,
            post:0,
            mention:0,
            like:0,
        };
        data.forEach(val=>{
            count[val.visibility]+=1;
            if(val.visibility!="like") count.post+=1;
            if(val.mentions&&val.mentions.length>0) count.mention+=1;
        });
        elem("summary").innerHTML = `You used Mastodon <b>${days_active}</b>/<b>${days_past}</b> days (<b>${(days_active/days_past*100).toFixed(1)}</b>) since <b>${date2str(this.date_selected[0])}</b> until <b>${date2str(this.date_selected[1])}</b>, posted <b>${count.post}</b> times in total, <b>${(count.post/days_active).toFixed()}</b> times as average per day; <b>${count.public}</b> as public, <b>${count.unlisted}</b> as unlisted, <b>${count.private}</b> as private, <b>${count.direct}</b> as direct. You mentioned <b>${count.mention}</b> times, boosted <b>${count.boost}</b> posts, and liked <b>${count.like}</b> posts.`
    };

    update_search(){
        const result = this.data_search.filter(val=>[
            val.publishedDate!==false,
            this.date_selected[0].getTime()<=val.publishedDate.getTime(),
            val.publishedDate.getTime()<=this.date_selected[1].getTime(),
            this.visibility.includes(val.visibility),
        ].every(v=>v));
        elem("request").innerText = result.length===0
            ?`No data was found for ${this.value} in ${this.id}`
            :`There are ${result.length} results for ${this.value} in ${this.id}`;
        elem("result").innerHTML = result.length===0
            ?""
            :`<tbody>${result.sort((a,b)=>(a.publishedDate&&b.publishedDate)
                    ?(b.publishedDate-a.publishedDate)
                    :(a.publishedDate
                        ?-1:
                        (b.publishedDate
                            ?1
                            :0))
                ).map(val=>`<tr><th class=date><a target="_blank" onclick="searchDate(this)" value=${
                    val.published.slice(0,10)}>${
                    val.published}</a></th><th class=content><a target="_blank" href=${
                    val.id}>${
                    val.content}</a></th></tr>`
            ).join("")}</tbody>`;
    };

    update_visibility_and_range(){
        this.visibility = Array.from(document.getElementsByName("visi")).filter(val=>val.checked).map(val=>val.id.slice(2,));
        if(!elem("range_since").value) elem("range_since").value = this.date_minmax[0];
        if(!elem("range_until").value) elem("range_until").value = this.date_minmax[1];
        this.date_selected = ["since","until"].map(val=>new Date(elem(`range_${val}`).value));
    };

    get_checked_radio(name){
        return Array.from(document.getElementsByName(name)).filter(val=>val.checked)[0].id.slice(2,);
    };

    update_stack_and_resolution(){
        this.stack = this.get_checked_radio("stack");
        const candidate = this.get_checked_radio("resolution");
        const dict = {
            day:["minute","minutes"],
            week:["minutes","hour","hours"],
            month:["hour","hours"],
            year:["day","week"],
            none:["day","week"],
        };
        this.resolution = (candidate in dict[this.stack])
            ?candidate
            :dict[this.stack][0];
        ["minute", "minutes", "hour", "hours", "day", "week", "month"].forEach(val=>{
            elem(`r_${val}`).disabled = (val in dict[this.stack])
                ?false
                :true;
            elem(`r_${val}`).checked = (val == this.resolution)
                ?true
                :false;
        });
    };

    reset_data_plot(){};
    update_plot_type(){
        this.plot_type = this.get_checked_radio("type");
    };
    show_plot(){};
    update_plot(){};

    save(){Database().create(this.data)};
    delete(){Database().delete()};
}
// ロード前のオブジェクト

var archive = undefined;
class Loading{
    outbox = null;
    likes = null;
    data = null;

    display(){
        if (this.outbox && this.likes) {
            this.data = this.outbox
                .concat(this.likes)
                .sort((a,b)=>(a.publishedDate&&b.publishedDate)?(b.publishedDate-a.publishedDate):0);
        }
        if (this.data) {
            archive = Archive(this.data);
        }
        if (!this.outbox) window.alert('Drop "outbox.json"');
        if (!this.likes) window.alert('Drop "likes.json"');
    };

    load_database(){
        this.data = Database().get();
        this.display();
    };

    load_input_files(files){
        for(const file of files){
            elem("progress").style.display="block";
            if(file.type==="application/json"){
                const reader = new FileReader();
                reader.onload = (event)=>{
                    json = JSON.parse(event.target.result);
                    if(json.id==="outbox.json"){
                        this.outbox = json.orderedItems.map(val=>{
                            const publishedDate	= new Date(val.published);
                            return {
                                id:val.id.replace(/users\/.*\/statuses/,"web/statuses").replace("/activity",""),
                                publishedDate:publishedDate,
                                published:time2str(publishedDate),
                                content:val.type==="Announce"
                                    ?"REBLOG: "+val.object
                                    :val.object.content.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,''),
                                visibility:val.type==="Announce"
                                    ?"boost"
                                    :val.cc.length===0
                                        ?val.to.length!==0
                                            ?val.to[0].includes("followers")?"direct"
                                            :"private"
                                        :"direct"
                                    :val.to.includes("https://www.w3.org/ns/activitystreams#Public")
                                        ?"public"
                                        :"unlisted",
                                mentions:val.object.tag
                                    ?val.object.tag.filter(tag=>tag.type==="Mention").map(tag=>tag.name.lastIndexOf("@")!==0
                                        ?tag.name.slice(1,tag.name.lastIndexOf("@"))
                                        :tag.name.slice(1)
                                    ):false,
                                inReplyTo:val.object.inReplyTo
                                    ?val.object.inReplyTo
                                    :false,
                                reblog:val.type==="Announce"
                                    ?val.cc[0].slice(val.cc[0].lastIndexOf("/")+1)
                                    :false,
                            };
                        });
                    }else if(json.id==="likes.json"){
                        this.likes	= json.orderedItems.map(val=>{
                            const publishedDate=(val.includes("statuses/"))
                                ?(new Date(Number(val.slice(val.lastIndexOf("/")+1))/65536))
                                :false;
                            const id	= val.replace(/users\/.*\/statuses/,"web/statuses");
                            return {
                                id:id,
                                publishedDate:publishedDate,
                                published:time2str(publishedDate),
                                content:"LIKE: "+val,
                                visibility:"like",
                                account:(val.includes("users")&&val.includes("statuses")
                                    ?val.slice(val.indexOf("users")+6,val.indexOf("statuses")-1)
                                    :(val.includes("https://")&&val.indexOf("/",8)!==-1
                                        ?"SERVER:"+val.slice(8,val.indexOf("/",8)-1)
                                        :(val.includes("tag:")&&val.includes(",")
                                            ?"SERVER:"+val.slice(4,val.indexOf(",")-1)
                                            :val))),
                            };
                        });
                    } else window.alert("You chose wrong file.");
                };
                reader.readAsText(file);
            } else window.alert("You chose wrong file.");
        }
        this.display();
    };
};

class Database {
    ver = 1;
    id = 1;
    name = "mastodon";
    store = "archive";
    database = null;
    indexedDB = (window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB);
    transaction = (window.IDBTransaction || window.webkitIDBTransaction || window.mozIDBTransaction);
    create(data){
        const open_request = this.indexedDB.open(this.name, this.ver);
        open_request.onupgradeneeded = (e) => {
            console.log("create-upgradeneeded")
            this.database = open_request.result;
            this.database.createObjectStore(this.store, {"keyPath":"id"});
            console.log(this.database.objectStoreNames);
        }
        open_request.onsuccess = (e) => {
            this.database = open_request.result;
            const add_request = this.database.transaction(this.store, "readwrite").objectStore(this.store).put({
                id: this.id,
                data: data,
            });
            add_request.onsuccess = (e) => {
                console.log("Database Successfully Saved")
            }
        }
    };

    get(){
        const open_request = this.indexedDB.open(this.name, this.ver);
        this.database = null;
        let data = null;
        open_request.onsuccess = (e) => {
            this.database = open_request.result;
            if (this.database.objectStoreNames.length > 0) {
                const transaction = this.database.transaction([this.store], this.transaction.READ_ONLY);
                const get_request = transaction.objectStore(this.store).get(this.id);
                get_request.onsuccess = (e) => {
                    data = get_request.result.data;
                }
                get_request.onerror = (e) => {console.log(e)};
            } else {
                console.log("database was none");
                this.delete();
            }
        }
        return data;
    };

    delete(){
        if (this.database) this.database.close();
        const delete_request = this.indexedDB.deleteDatabase(this.name);
        delete_request.onsuccess = (e) => {console.log("Database Deleted Successfully")};
        delete_request.onerror = (e) => {console.log(e.message)};
        delete_request.onblocked = (e) => {console.log("Severe Error Occurred")};
    };
};

var loading = Loading();
