/** @typedef {{name: string, short: string, down?: () => {}, up?: () => {}, norepeat: boolean}} Action */
class KeyboardManager {
    constructor(){
        this.default_shortcuts = new Map();
        this.initialisation = false;
        this.shortcuts = new Map();
        this.shortcuts_with_invalid_action = new Map();
        /** @type {Set<string>} */
        this.active_scopes = new Set();
        /** @type {Set<string>} */
        this.scopes = new Map();
        /** @type {Map<string,Action>} */
        this.actions = new Map();
        this.listen=this.listen.bind(this);
        this.active=true;
        this.__visible=false;
        this.makeUI();
    }

    /**
     * 
     * @param {any} list
     * @returns 0 if there are no shortcuts, -1 if there are but are invalid, 1 if both present and valid.
     */
    load_shortcuts(list){
        if(list === null){
            return 0;
        }
        if(!KeyboardManager.check_list_of_shortcuts(list)) return -1;
        for(const shortcut of list){
             this.add_shortcut(...shortcut);
        }
        return 1;
    }

    serialize_shortcuts(){
        const list = [];
        for(const [shortcut,scopes] of this.shortcuts){
            for(const [scope,action] of Object.entries(scopes)){
                list.push([shortcut,action,scope]);
            }
        }
        return list;
    }

    store_shortcuts(){
        if(this.flag_ready()){
            window.hc.flags._.km_shortcuts = this.serialize_shortcuts();
        }
    }

    static check_list_of_shortcuts(list){
        if(!Array.isArray(list)) return false;
        for(const shortcut of list){
            if(!Array.isArray(shortcut)) return false;
            if(shortcut.length !== 3) return false;
            for(const entry of shortcut){
                if(typeof entry !== "string") return false;
            }
        }
        return true;
    }
    
    makeUI(){
        this.ui = {
            container: document.createElement('dialog'),
            wrapper: document.createElement('div'),
            main: document.createElement('table'),
            body: document.createElement('tbody'),
            shortcutinput: document.createElement('input'),            
            actioninput: document.createElement('select'),
            scopeinput: document.createElement('select'),
            savebutton: document.createElement('button'),
            resetbutton: document.createElement('button'),
        }
        const header = this.ui.main.appendChild(document.createElement('thead')).insertRow();
        header.appendChild(document.createElement('th')).innerText = "Shortcut";
        header.appendChild(document.createElement('th')).innerText = "Scope";
        header.appendChild(document.createElement('th')).innerText = "Action";
        this.ui.main.appendChild(this.ui.body);
        const footer = this.ui.main.appendChild(document.createElement('tfoot'));
        const input_cell = footer.insertRow().insertCell();
        input_cell.colSpan = 2;
        const input_form = input_cell.appendChild(document.createElement('form'));
        input_cell.appendChild(input_form);
        input_form.appendChild(this.ui.shortcutinput);
        input_form.appendChild(this.ui.scopeinput);
        input_form.appendChild(this.ui.actioninput);
        this.ui.shortcutinput.addEventListener('keydown',e => {
            if(e.code === 'Escape') return;
            const shortcut = Shortcut.from_event(e);
            e.preventDefault();
            this.ui.shortcutinput.value=shortcut.serialize();
        });
        const submit = document.createElement('input');
        submit.type = "submit";
        submit.value = "Add";
        submit.addEventListener('click',(e) => {
            e.preventDefault();
            this.add_shortcut(this.ui.shortcutinput.value,this.ui.actioninput.value,this.ui.scopeinput.value);
            
        })
        input_form.appendChild(submit);
        this.ui.container.classList.add('hc-km-container','hc-menu-container');
        this.ui.wrapper.classList.add('hc-km-wrapper');
        this.ui.main.classList.add('hc-km-main');
        this.ui.shortcutinput.classList.add('hc-km-input');
        this.ui.actioninput.classList.add('hc-km-input');
        this.ui.resetbutton.classList.add('hc-km-reset');
        this.ui.resetbutton.textContent = "Reset all shortcuts";
        this.ui.resetbutton.title = "Reset";
        this.ui.resetbutton.addEventListener('click', _ => {
            let ok = confirm("Are you sure you want to reset your shortcuts ?\nIn case you want to back them up copy paste the Keyboard Manager Shortcuts flags in some file.");
            if(ok){
                this.reset_to_defaults();
                this.store_shortcuts();
            }
        });
        this.ui.wrapper.appendChild(this.ui.resetbutton);
        this.ui.wrapper.appendChild(this.ui.main);
        this.ui.container.appendChild(this.ui.wrapper)
        this.ui.container.addEventListener('close', ()=>{
            this.hideUI(true);
        });
        this.ui.container.addEventListener('click', event =>{
            const rect = this.ui.container.getBoundingClientRect();
            if(event.target === this.ui.container && (rect.left > event.clientX || event.clientX > rect.right || rect.top > event.clientY || event.clientY > rect.bottom)){
                // Clicked outside of the menu
                this.hideUI();
                this.enable();
            }
        });
        colorBox(this.ui.container,'grey','black');
        this.hideUI();
    }

    /**
     * 
     * @param {string} shortcut
     * @param {string} action_name
     * @param {*} up 
     */
    add_shortcut(shortcut,action_name,scope){
        const action = this.actions.get(action_name);
        if(!action){
            console.error(`Keyboard Manager: action ${action_name} does not exist. Ignoring shortcut ${shortcut} with scopes ${scope}.`);
            return;
        };
        let scope_map;
        if(this.shortcuts.has(shortcut)){
            scope_map = this.shortcuts.get(shortcut);
        } else {
            scope_map = {};
        }
        scope_map[scope] = action_name;
        this.shortcuts.set(shortcut,scope_map);
        let the_row = undefined;
        for(const row of this.ui.body.rows){
            if(row.dataset.shortcut === shortcut && row.dataset.scope === scope) {the_row = row; break;};
        }
        if(the_row === undefined){
            the_row = this.ui.body.insertRow();
            the_row.dataset.shortcut = shortcut;
            the_row.dataset.scope = scope;
            the_row.insertCell();
            the_row.insertCell();
            the_row.insertCell();
            the_row.insertCell();
        }
        the_row.cells.item(0).innerText = shortcut;
        the_row.cells.item(1).innerText = scope;
        the_row.cells.item(2).innerText = action.short;
        const delete_button = document.createElement("button");
        delete_button.title = "Delete the shortcut";
        delete_button.appendChild(document.createTextNode('❌'));
        delete_button.classList.add('hc-km-deleteshorcut');
        delete_button.addEventListener('click', evt => {
            this.remove_shortcut(shortcut,scope);
            this.store_shortcuts();
        });
        the_row.cells.item(3).replaceChildren(delete_button);
        this.store_shortcuts();
    }

    add_default_shortcut(shortcut,action_name,scope){
        let scope_map;
        if(this.default_shortcuts.has(shortcut)){
            scope_map = this.default_shortcuts.get(shortcut);
        } else {
            scope_map = {};
        }
        if(scope in scope_map){
            console.warn(`Keyboard Shortcuts Manager: the default shortcut ${shortcut} in scope ${scope} is defined multiple times. Overwriting ${scope_map[scope]} with ${action_name}`);
        }
        scope_map[scope] = action_name;
        this.default_shortcuts.set(shortcut,scope_map);
    }

    reset_to_defaults(){
        this.shortcuts = new Map();
        this.ui.body.replaceChildren();
        this.load_defaults();
    }

    load_defaults(){
        for(const [shortcut,scope_map] of this.default_shortcuts){
            for(const [scope,action] of Object.entries(scope_map)){
                this.add_shortcut(shortcut,action,scope);
            }
        }
    }

    flag_ready(){
        return window.hc.flags !== undefined && 'km_shortcuts' in window.hc.flags._
    }

    remove_shortcut(shortcut,scope){
        if(!this.shortcuts.has(shortcut)){ console.error(`Cannot delete non-existent shortcut ${shortcut}.`); return; };
        const scope_map = this.shortcuts.get(shortcut);
        if(!scope_map[scope]){ console.error(`Cannot delete non-existent scope ${scope} from shortcut ${shortcut}.`); return; };
        delete scope_map[scope];
        let the_row = undefined;
        for(const row of this.ui.body.rows){
            if(row.dataset.shortcut === shortcut && row.dataset.scope === scope) {the_row = row; break;};
        }
        if(the_row === undefined){
            console.error(`Expected the row to be present (shortcut ${shortcut}, scope ${scope}).`);
            return;
        };
        the_row.remove();
    }

    add_action(action){
        this.actions.set(action.name,action);
        const o = document.createElement('option');
        o.text=action.short;
        o.value=action.name;
        this.ui.actioninput.add(o);
    }

    add_scope(scope,desc){
        if(this.scopes.has(scope)) return;
        this.scopes.set(scope,desc);
        const o = document.createElement('option');
        o.text=desc;
        o.value=scope;
        this.ui.scopeinput.add(o);
    }

    /**
     * 
     * @param {KeyboardEvent} e
     */
    listen(e) {
        if(!this.active) return;
        if(["input","select","button","textarea"].includes(e.target.tagName.toLowerCase())) return;
        let scope_map = this.shortcuts.get(Shortcut.from_event(e).serialize());
        if(scope_map === undefined) return;
        let actions = new Set();
        for(const [scope,action_name] of Object.entries(scope_map)){
            if(this.active_scopes.has(scope) && !actions.has(action_name)){    
                actions.add(action_name);
                let action = this.actions.get(action_name);
                if(action === undefined) continue;
                if(e.type === 'keyup'){
                    action = action.up;
                } else if(e.type === 'keydown') {
                    if(e.repeat && action.norepeat) continue;
                    action = action.down;
                } else {
                    console.error('The keyboard manager is supposed to listen to "keyup" and "keydown" events, nothing else.', (new Error().stack));
                    return;
                }
                if(action === undefined) return;
                e.preventDefault();
                action();
            }
        }
    }

    enable(){
        this.active = true;
    }

    disable(){
        this.active = false;
    }

    enable_scope(...scopes){
        for(const scope of scopes){
            this.active_scopes.add(scope);
        }
    }

    disable_scopes(...scopes){
        for(const scope of scopes){
            this.active_scopes.add(scope);
        }
    }

    showUI(){
        this.__visible=true;
        window.hc.flags.hideUI(); // TODO global multi menu handling
        this.ui.container.showModal();
        this.ui.resetbutton.blur();
        if(window.hc.km.active_scopes.has("playing")){
            window.hc.km.active_scopes.add("menuplaying");
            window.hc.km.active_scopes.delete("playing");
        }
    }

    hideUI(no_close){
        if(!no_close) this.ui.container.close();
        this.__visible=false;
        if(this.active_scopes.has("menuplaying")){
            window.hc.km.active_scopes.add("playing");
            window.hc.km.active_scopes.delete("menuplaying");
        }
    }

    toggleUI(){
        if(this.__visible) this.hideUI();
        else this.showUI();
    }
}

class Shortcut {
    constructor(code,alt,ctrl,shift,meta){
        this.code = code;
        this.alt = alt;
        this.ctrl = ctrl;
        this.shift = shift;
        this.meta = meta;
    }

    /**
     * 
     * @param {string} s 
     */
    static deserialize(s){
        const list = s.split('+');
        const code = list.pop();
        const alt = list.includes('Alt');
        const ctrl = list.includes('Ctrl');
        const shift = list.includes('Shift');
        const meta = list.includes('Meta');
        return new Shortcut(code,alt,ctrl,shift,meta);
    }

    /**
     * @param {KeyboardEvent} e
     */
    static from_event(e){
        return new Shortcut(e.code, e.altKey, e.ctrlKey, e.shiftKey, e.metaKey);
    }

    serialize(){
        let s="";
        if(this.alt) s+='Alt+';
        if(this.ctrl) s+='Ctrl+';
        if(this.shift) s+='Shift+';
        if(this.meta) s+='Meta+';
        s+=this.code;
        return s;
    }
}

window.hc.km = new KeyboardManager();
window.hc.km.add_scope('playing','When playing')
window.hc.km.add_scope('always','Always')
window.hc.hooks.fire('hc.km',[]);
window.hc.km.add_action({
    name: "menu_shortcuts_toggle",
    short: "Open/Close shortcuts menu.",
    down: ()=>{window.hc.km.toggleUI()},
});
window.hc.km.add_action({
    name: "none",
    short: "Do nothing",
});
let core_actions = [
    {
        name: "ui_honk",
        short: "Honk/Flash",
        down: ()=>{input_handler.honkStart()},
        up: ()=>{input_handler.honkEnd()},
        norepeat: true
    },
    {
        name: "ui_up",
        short: "Go up",
        down: ()=>{activateDir(Direction.UP)},
        up: ()=>{deactivateDir(Direction.UP)},
        norepeat: true
    },
    {
        name: "ui_down",
        short: "Go down",
        down: ()=>{activateDir(Direction.DOWN)},
        up: ()=>{deactivateDir(Direction.DOWN)},
        norepeat: true
    },
    {
        name: "ui_right",
        short: "Go right",
        down: ()=>{activateDir(Direction.RIGHT)},
        up: ()=>{deactivateDir(Direction.RIGHT)},
        norepeat: true
    },
    {
        name: "ui_left",
        short: "Go left",
        down: ()=>{activateDir(Direction.LEFT)},
        up: ()=>{deactivateDir(Direction.LEFT)},
        norepeat: true
    },
    {
        name: "ui_pause",
        short: "Pause",
        down: ()=>{activateDir(Direction.PAUSE)},
        up: ()=>{deactivateDir(Direction.PAUSE)},
        norepeat: true
    },
];
for(const a of core_actions){
    window.hc.km.add_action(a);
}
let core_shortcuts = [
    ["ArrowUp","ui_up"],
    ["ArrowDown","ui_down"],
    ["ArrowRight","ui_right"],
    ["ArrowLeft","ui_left"],
    ["KeyP","ui_pause"],
    ["Space","ui_honk"],
];
for(const a of core_shortcuts){
    window.hc.km.add_default_shortcut(...a,"playing");
}
window.hc.km.add_default_shortcut("Digit1","menu_shortcuts_toggle","always");



window.hc.hooks.after('hc.flags',() => {
    window.hc.flags.addFlag({
        "name": "km_shortcuts",
        "caption": "Keyboard Manager Shortcuts",
        "description": "You should not edit this. You can save/share your shortcuts by copy/pasting the text into/from a file.",
        "keywords": ["keyboard","manager","shortcuts"],
        "type": "text",
        "default": null,
        "store": flagTalkers.JSON.from,
        "restore": flagTalkers.JSON.into,
        "interpret": flagTalkers.JSON.into,
        "present": flagTalkers.JSON.from,
    });
});

document.addEventListener('DOMContentLoaded', ()=>{
    const style = document.createElement('style');
    style.textContent=`
    .hc-km-container {
        padding: 0;
    }

    .hc-km-wrapper {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 1ex;
        padding: 1ex;
    }

    .hc-km-main {
        width: calc(100% - 2em);
        padding: 1em;
        border-collapse: collapse;
    }
    .hc-km-main > thead {
        font-weight: bold;
    }

    .hc-km-main > tbody > tr:nth-child(3n) {
        background-color: rgba(0,0,0,0.1);
    }
    
    .hc-km-main > tbody > tr:nth-child(3n+1) {
        background-color: rgba(255,255,255,0.1);
    }

    .hc-km-main td,.hc-km-main th{
        border-bottom: 1px dashed black;
    }
    
    .hc-km-main > * > tr > *+* {
        border-left: 3px solid black;
        padding-left: 3px;
    }

    .hc-km-input {
        width: 100%;
        box-sizing: border-box;
    }
    
    .hc-km-reset {
        width: max-content;
    }
    .hc-km-deleteshorcut {
    
    }
    `;
    document.head.append(style);
    const present = window.hc.km.load_shortcuts(window.hc.flags._.km_shortcuts);
    window.hc.km.initialisation = true;
    if(present === 0){
        console.debug('Shortcuts created !');
        window.hc.km.load_defaults();
        window.hc.km.store_shortcuts();
    } else if(present === -1){
        console.warn('Shortcuts were saved, but are invalid. Ignoring them.');
        window.hc.km.load_defaults();
    } else {
        console.debug('Loading shortcuts');
        // Shortcuts were saved, do not overwrite with defaults
    }
    window.hc.km.initialisation = true;
    window.hc.km.enable_scope("always");
    document.body.append(window.hc.km.ui.container);
    document.body.addEventListener('keydown',window.hc.km.listen);
    document.body.addEventListener('keyup',window.hc.km.listen);
})