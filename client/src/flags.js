class Flag  extends EventTarget {
    ui;
    id;
    input;
    defaultValue;
    label;
    context;
    options;
    keywords;
    __visible = false;
    constructor(container,id,input,init,label,context,keywords, options){
        super();
        this.ui = {};
        this.ui.container = container;
        this.id=id;
        this.input=input;
        this.defaultValue=init;
        this.label=label;
        this.context=context||null;
        this.keywords=keywords;
        this.options=options;
        this.store=options.store || (x=>({"v":x, ok: true}));
        this.restore=options.restore;
        if(this.restore === undefined){
            if(input === "number"){
                this.restore = v => {
                    let x = options.decimal ? Number.parseFloat(v) : Number.parseInt(v);
                    return Number.isNaN(x) ? {"v": undefined, "ok": false}:{"v":x, "ok":true};
                }
            } else if(input === "checkbox"){
                this.restore = v => ({"ok":true, "v": v==="true"});
            }
        }
        this.interpret=options.interpret || (x=>({"v":x, ok: true}));
        this.present=options.present || (x=>({"v":x, ok: true}));
        this.makeUI();
        this.value=this.getLocalStorage();
        if(this.input === 'checkbox'){
            window.hc.km.add_action({
                    name: 'flags_toggleFlag_'+this.id,
                    short: 'toggle flag: ' + this.label,
                    down:()=>{this.value=!this.value;},
                    norepeat: false,
                });
            window.hc.km.add_action({
                name: 'flags_peekFlag_'+this.id,
                short: 'peek flag: ' + this.label,
                down:()=>{this.value=!this.value;},
                up:()=>{this.value=!this.value;},
                norepeat: true,
            });
        } else if(input === 'number'){
            if(this.options.min !== undefined) this.ui.input.min = this.options.min;
            if(this.options.max !== undefined) this.ui.input.max = this.options.max;
            if(this.options.step !== undefined) this.ui.input.step = this.options.step;
        }
    }

    setLocalStorage(val){
        let {v,ok} = this.store(val);
        localStorage.setItem(this.id,ok?v:this.store(this.defaultValue).v);
    }

    setUI(val){
        let {v,ok} = this.present(val);
        v=ok?v:this.present(this.defaultValue).v;
        if(this.ui.input.type === 'checkbox'){
            this.ui.input.checked = v;
        } else {
            this.ui.input.value = v;
        }
    }

    getLocalStorage(){
        let s = localStorage.getItem(this.id);
        let value;
        if(s === null) {
            value = this.defaultValue;
            this.value = this.defaultValue;
        } else {
            let {v, ok} =this.restore(s);
            value = ok ? v : (this.value = this.defaultValue);
        }
        return value;
    }

    getUI(){
        let v;
        if(this.ui.input.type === 'checkbox'){
            v = this.ui.input.checked;
        } else if(this.ui.input.type === 'number') {
            v = !Number.isNaN(this.ui.input.valueAsNumber) ? this.ui.input.valueAsNumber : (this.value=this.defaultValue);
        } else {
            v = this.input.value;
        }
        v=this.interpret(v);
        return v.ok ? v.v:(this.value=this.defaultValue);
    }

    makeUI(){
        this.ui.input=document.createElement('input');
        this.ui.input.type=this.input;
        this.ui.input.name='hcFlag'+this.id;
        this.ui.input.dataset.id=this.id;
        this.ui.input.addEventListener('change', ()=>{
            this.value=this.getUI();
        });
        this.ui.label=document.createElement('label');
        this.ui.label.htmlFor=this.ui.input.name;
        this.ui.label.textContent=this.label;
        this.ui.container.append(this.ui.label,this.ui.input);
        if(this.context !== null){
            this.ui.context = document.createElement('p');
            this.ui.context.innerHTML = this.context;
            this.ui.container.append(this.ui.context);
        }
    }

    set value(v){
        this.setLocalStorage(v);
        this.setUI(v);
        this.dispatchEvent(new CustomEvent('change', {detail: v}));
    }

    get value(){
        return this.getLocalStorage();
    }
}

const flagTalkers = {
    JSON: {
        from: x => {
            let ok = true;
            let v = undefined;
            try {
                v = JSON.stringify(x);
            } catch (e) {
                ok = false;
            }
            return {v, ok};
        },
        into: x => {
            let ok = true;
            let v = undefined;
            try {
                v = JSON.parse(x);
            } catch (e) {
                ok = false;
            }
            return {v, ok};
        }
    }
}

class FlagEditor {
    constructor(){
        this.flags= new Map();
        this.ui = {
            container: document.createElement('dialog'),
            searchbar: document.createElement('input'),
            list: document.createElement('ul'),
        }
        this.ui.container.append(this.ui.searchbar,this.ui.list);
        this.ui.container.addEventListener('click', event =>{
            const rect = this.ui.container.getBoundingClientRect();
            if(rect.left > event.clientX || event.clientX > rect.right || rect.top > event.clientY || event.clientY > rect.bottom){
                // Clicked outside of the menu
                this.hideUI();
            }
        });
        this.searchbox = new SearchBox(this.ui.searchbar,this.ui.list);
        this.ui.searchbar.classList.add('hc-flags-searchbar');
        this.ui.searchbar.placeholder = "Search a flag";
        this.ui.container.classList.add('hc-flags-container','hc-menu-container');
        this.ui.container.addEventListener('close', ()=>{
            this.hideUI(true);
        });
        this.ui.list.classList.add('hc-flags-list');
        this.hideUI();
        let that=this;
        this._ = new Proxy({}, {
            get(target,name){
                if(!that.flags.has(name)){throw new Error(`The flag ${name} does not exist.`);}
                let f= that.flags.get(name);
                let v =f.value;
                return v;
            },
            set(target,name,value){
                that.flags.get(name).value=value;
                return(true);
            },
            has(target,name){
                return that.flags.has(name);
            }
        });
    }

    addFlag({
        "name": id,
        "caption": label,
        "description": context,
        "type": input,
        "keywords" : keywords,
        "default": init,
        ...options
    } = params){
        const li = document.createElement('li');
        li.classList.add('hc-flags-flag');
        const flag = new Flag(li,id,input,init,label,context,keywords,options);
        this.flags.set(id,flag);
        this.searchbox.store.push(new SearchResult(flag.ui.container,flag.keywords));
        this.ui.list.append(li);
    }

    toggleUI(){
        if(this.__visible) this.hideUI()
        else this.showUI();
    }
    
    showUI(){
        this.__visible = true;
        window.hc.km.hideUI();
        if(window.hc.km?.active_scopes.has("playing")){
            window.hc.km.active_scopes.add("menuplaying");
            window.hc.km.active_scopes.delete("playing");
        }
        this.ui.container.showModal();
    }

    hideUI(no_close){
        if(!no_close) this.ui.container.close();
        this.__visible=false;
        if(window.hc.km?.active_scopes.has("menuplaying")){
            window.hc.km.active_scopes.add("playing");
            window.hc.km.active_scopes.delete("menuplaying");
        }
    }

    on_change(flag_name, callback){
        this.flags.get(flag_name).addEventListener('change', ({detail: value}) => callback(value))
    }

    toggle(flag_name){
        const flag = this.flags.get(flag_name);
        if(flag.input.type == "checkbox"){
            flag.value = !flag.value;
        }
    }
}


window.hc.flags = new FlagEditor();
window.hc.hooks.fire('hc.flags',[]);

const flags = [
    {
        "name": "drawDebug",
        "caption": "Display ping",
        "description": "Displays a tiny red number in the bottom right corner while playing.<br>This is your ping (amount of ms delay with the server)<br>Anything below 100 should be good",
        "keywords" : ["display", "ping", "red", "number" ,"delay", "latency"],
        "type": "checkbox",
        "default": "false"
    },
    {
        "name": "dontCapFps",
        "caption": "Dont cap fps",
        "description": "To keep the frame rate stable, it is automatically locked to 144, 60, 30, 20 or 10fps, depending on how fast your computer is. If you check this box it doesn't lock the framerate.<br>This causes a higher framerate but it feels more like the game is stuttering.",
        "keywords": ["cap","fps","frame","frames","per","second","framerate","rate","stuttering"],
        "type": "checkbox",
        "default": "false"
    },
    {
        "name": "drawActualPlayerPos",
        "caption": "Show actual player pos",
        "description": "To make the game feel less laggy, the place where your player is drawn is not its actual position. If you check this checkbox the game will draw a second dot on the position where the server thinks you actually are.",
        "keywords": ["draw","show", "actual", "player", "lag", "real", "dot", "server","position"],
        "type": "checkbox",
        "default": "false"
    },
    {
        "name": "drawWhiteDot",
        "caption": "Draw a white dot on my player",
        "description": "Useful for tracking the player position when making youtube videos.",
        "keywords": ["draw","white","dot","player","tracking","position","video"],
        "type": "checkbox",
        "default": "false"
    },
    {
        "name": "dontSlowPlayersDown",
        "caption": "Don't slow down the player with high ping",
        "description": "When you're running too far ahead according to the server, it starts slowing you down to make up for it. This makes sure that your land gets filled once you reach it, instead of a couple of blocks later. The downside is that your player is slower compared to the other players. To prevent this, check this box. But be warned: Your blocks will be filled with a short delay and players are able to kill you in that short time.",
        "type": "checkbox",
        "keywords": ["dont","slow","down","player","high","ping","server","slowing"],
        "default": "false"
    },
    {
        "name": "hidePlayerNames",
        "caption": "Hide player names",
        "description": "Hides the name above players.",
        "keywords": ["hide","name","player","nickname","show"],
        "type": "checkbox",
        "default": "false"
    },
    {
        "name": "uglyMode",
        "caption": "Ugly mode",
        "description": "In case your fps is too low. Warning! Makes the game ugly. (This is subjective).",
        "keywords": ["ugly","mode","fps","frame","per","second"],
        "type": "checkbox",
        "default": "false"
    },
    {
        "name": "leaderboardHidden",
        "caption": "Hide the leaderboard",
        "description": "Hides the leaderboard when playing.",
        "keywords": ["hide","show","leaderboard"],
        "type": "checkbox",
        "default": "false"
    },
    {
        "name": "simulatedLatency",
        "caption": "Simulate latency",
        "description": "This increases the lag, there's absolutely no reason why you would want to enable this unless you're debugging stuff. This is also makes things very unstable so you might want to avoid using it.<br>Set this to 0 to disable it.",
        "keywords": ["simulate","latency","lag","debugging"],
        "type": "number",
        "default": "0"
    },
    {
        "name": "menuOpacity",
        "caption": "Menu opacity while playing",
        "description": "To not miss anything in the game while you open a menu, you can make it translucent.",
        "keywords": ["menu","opacity","translucent","transparent"],
        "type": "number",
        "default": "0.7",
        "min": "0",
        "max": "1",
        "step": "0.1",
        "decimal": true,
    },
]

for(const flag of flags){
    window.hc.flags.addFlag(flag);
};

window.hc.hooks.after('hc.km',()=>{
    window.hc.km.add_action({
        name: "menu_flags_toggle",
        short: "Open/Close flags menu",
        down: ()=>{ window.hc.flags.toggleUI()},
    });
    window.hc.km.add_default_shortcut('Digit2','menu_flags_toggle','always');
    window.hc.km.add_default_shortcut('KeyO','flags_toggleFlag_leaderboardHidden','playing');
})


document.addEventListener('DOMContentLoaded',()=>{
    document.body.append(window.hc.flags.ui.container);
    colorBox(window.hc.flags.ui.container,'grey','black');
    addStyle(`
        .hc-flags-container {
            width:50%;
            height: 75%;
            overflow: auto;
            scrollbar-color: white black;
          }
        
        .hc-flags-container label {
            padding-right: 1rem;   
        }

        .hc-flags-searchbar {
            width: 50%;
            padding: 0 1em;
            margin: 0 25%;
            box-sizing: border-box;
            border-radius: 100vh;
        }
    `)
    window.hc.flags.on_change("uglyMode", value => {
        window.uglyMode=value;
        window.uglyText.innerHTML = "Ugly mode: " + (value ? "on" : "off");
    });
    window.hc.flags.on_change("leaderboardHidden", value => {
        leaderboard_ui.set_visibility(value);
    });
    window.hc.flags.on_change("menuOpacity", value => {
        document.body.style.setProperty('--menu-opacity',value);
    })
})
