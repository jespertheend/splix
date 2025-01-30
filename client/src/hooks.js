if(!window.hc){ window.hc = {}; }

class Hook {
    #once = [];
    whens = [];
    fired = false;
    conditions = new Set();
    args = undefined;
    constructor(){
    }

    after(cb){
        if(this.fired){
            cb(this.args)
        } else {
            this.#once.push(cb);
        }
    }

    when(cb){
        this.whens.push(cb);
    }
    
    condition(name){
        this.conditions.add(name);
    }

    approve(name){
        this.conditions.delete(name);
        if(this.args){
            this.fire(this.args);
        }
    }

    fire(...args){
        if(this.conditions.size > 0) return;
        this.args = args;
        const onces = this.#once;
        this.fired = true;
        this.#once = [];
        for(const cb of onces){
            cb(...args);
        }
        for(const cb of this.whens){
            cb(...args)
        }
    }
}

class HookManager {
    hooks = new Map();
    create(name){
        if(!this.hooks.has(name)){
            this.hooks.set(name,new Hook());
        }
        return this.hooks.get(name)
    }
    after(name,cb){
        const hook = this.create(name);
        hook.after(cb);
    }
    when(name,cb){
        const hook = this.create(name);
        hook.after(cb);
    }
    fire(name,args){
        const hook = this.create(name);
        hook.fire(...args);
    }
    condition(name,condition){
        const hook = this.create(name);
        hook.condition(condition);
    }
    approve(name,condition){
        const hook = this.create(name);
        hook.approve(condition);
    }
}

window.hc.hooks = new HookManager();