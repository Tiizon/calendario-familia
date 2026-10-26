(function(root){
const KEY='calendario-familia:data:v1',BACKUP=KEY+':previous';
root.FamilyRepository={
 load(){const raw=localStorage.getItem(KEY);return FamilyModel.withAnnual(raw?FamilyModel.validate(JSON.parse(raw)):FamilyModel.initial());},
 save(s){FamilyModel.validate(s);localStorage.setItem(KEY,JSON.stringify(s));},
 replace(s){FamilyModel.validate(s);const previous=localStorage.getItem(KEY);if(previous)localStorage.setItem(BACKUP,previous);localStorage.setItem(KEY,JSON.stringify(s));},
 previous(){const raw=localStorage.getItem(BACKUP);return raw?FamilyModel.validate(JSON.parse(raw)):null;},
 subscribe(callback){const handler=e=>{if(e.key===KEY)callback();};window.addEventListener('storage',handler);return()=>window.removeEventListener('storage',handler);}
};
})(globalThis);
