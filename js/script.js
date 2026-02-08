
/* ===================== DB ===================== */
const DB_NAME = "ZavodyPAS7";
let db;
let loggedUser = null;
let mode = "zavody";
let editId = null;

/* ===== INIT DB ===== */
const req = indexedDB.open(DB_NAME, 1);

req.onupgradeneeded = e => {
    db = e.target.result;

    const zavody = db.createObjectStore("zavody",{keyPath:"id",autoIncrement:true});
    zavody.add({nazev:"Jarní závody PAS",misto:"Praha",datum:"10.04.2026",cas_zahajeni:"09:00",cas_konec:"17:00"});
    zavody.add({nazev:"Letní pohár PAS",misto:"Brno",datum:"15.06.2026",cas_zahajeni:"10:00",cas_konec:"18:00"});
    zavody.add({nazev:"Podzimní finále PAS",misto:"Ostrava",datum:"20.09.2026",cas_zahajeni:"09:30",cas_konec:"16:30"});

    const users = db.createObjectStore("User",{keyPath:"id",autoIncrement:true});
    users.createIndex("email","email",{unique:true});
    users.add({name:"Jan Novák",email:"jan@pas.cz",password_hash:"1234",role:"rozhodčí"});
    users.add({name:"Eva Černá",email:"eva@pas.cz",password_hash:"1234",role:"hlavní_rozhodčí"});
    users.add({name:"Martin Král",email:"martin@pas.cz",password_hash:"1234",role:"administrator"});
};

req.onsuccess = e => {
    db = e.target.result;
    renderZavody();
};




/* ===================== LOGIN ===================== */
function login(){
    const idx=db.transaction("User").objectStore("User").index("email");
    idx.get(loginEmail.value).onsuccess=e=>{
        const u=e.target.result;
        if(u && u.password_hash===loginPass.value){
            loggedUser=u;
            loginBtn.innerText="Odhlásit";
            userInfo.innerText=`Přihlášen: ${u.name}`;
            closeLogin();
            showRoleButtons();
        } else alert("Neplatné přihlašovací údaje");
    };
}

function logout(){
    loggedUser=null;
    loginBtn.innerText="Přihlásit";
    userInfo.innerText="";
    rolePanel.style.display="none";
    adminPanel.style.display="none";
    renderZavody();
    alert("Byl/a jste úspěšně odhlášena");
}

function loginBtnClick(){
    loggedUser ? logout() : openLogin();
}

/* ===================== ROLE ===================== */
function showRoleButtons(){
    rolePanel.innerHTML="";
    rolePanel.style.display="block";
    if(loggedUser.role==="administrator"){
        rolePanel.innerHTML=`
            <button onclick="showUsers()">Správa uživatelů</button>
            <button onclick="showZavody()">Správa závodů</button>`;
    }
}

/* ===================== ADMIN ===================== */
function showUsers(){
    mode="users";
    thead.innerHTML=`
        <tr><th></th><th>Jméno</th><th>Email</th><th>Role</th></tr>`;
    tbody.innerHTML="";
    db.transaction("User").objectStore("User")
        .openCursor().onsuccess=e=>{
            const c=e.target.result;
            if(!c) return;
            const u=c.value;
            tbody.innerHTML+=`
                <tr>
                    <td><input type="radio" name="sel" value="${c.key}"></td>
                    <td>${u.name}</td>
                    <td>${u.email}</td>
                    <td>${u.role}</td>
                </tr>`;
            c.continue();
        };
    adminPanel.innerHTML=`
        <button onclick="openAdd()">Přidat uživatele</button>
        <button onclick="openEdit()">Editovat uživatele</button>
        <button onclick="deleteItem()">Smazat uživatele</button>
        <button onclick="showZavody()">Správa závodů</button>`;
    adminPanel.style.display="block";
}

function showZavody(){
    adminPanel.innerHTML=`
        <button onclick="openAdd()">Přidat závod</button>
        <button onclick="openEdit()">Editovat závod</button>
        <button onclick="deleteItem()">Smazat závod</button>
        <button onclick="showUsers()">Správa uživatelů</button>`;
    adminPanel.style.display="block";
    renderZavody();
}

function renderZavody(){
    mode="zavody";
    thead.innerHTML=`
        <tr>
            <th></th><th>Název</th><th>Místo</th><th>Datum</th><th>Začátek</th><th>Konec</th>
        </tr>`;
    tbody.innerHTML="";
    db.transaction("zavody").objectStore("zavody")
        .openCursor().onsuccess=e=>{
            const c=e.target.result;
            if(!c) return;
            const z=c.value;
            tbody.innerHTML+=`
                <tr>
                    <td><input type="radio" name="sel" value="${c.key}"></td>
                    <td>${z.nazev}</td>
                    <td>${z.misto}</td>
                    <td>${z.datum}</td>
                    <td>${z.cas_zahajeni}</td>
                    <td>${z.cas_konec}</td>
                </tr>`;
            c.continue();
        };
}





/* ===================== CRUD ===================== */
function getSelected(){
    const r=document.querySelector("input[name=sel]:checked");
    return r?Number(r.value):null;
}

function openAdd(){
    editId=null;
    editTitle.innerText=mode==="users"?"Nový uživatel":"Nový závod";
    userFields.style.display=mode==="users"?"block":"none";
    raceFields.style.display=mode==="zavody"?"block":"none";
    editModal.style.display="block";
}

function openEdit(){
    editId=getSelected();
    if(!editId) return alert("Vyberte položku");
    editTitle.innerText="Editace";
    userFields.style.display=mode==="users"?"block":"none";
    raceFields.style.display=mode==="zavody"?"block":"none";
    editModal.style.display="block";
}

function saveEdit(){
    if(mode==="users"){
        const store=db.transaction("User","readwrite").objectStore("User");
        const data={name:uName.value,email:uEmail.value,password_hash:uPass.value,role:uRole.value};
        editId?store.put({...data,id:editId}):store.add(data);
        showUsers();
    } else {
        const store=db.transaction("zavody","readwrite").objectStore("zavody");
        const data={nazev:zNazev.value,misto:zMisto.value,datum:zDatum.value,cas_zahajeni:zStart.value,cas_konec:zKonec.value};
        editId?store.put({...data,id:editId}):store.add(data);
        renderZavody();
    }
    closeEdit();
}

function deleteItem(){
    const id=getSelected();
    if(!id) return alert("Vyberte položku");
    db.transaction(mode==="users"?"User":"zavody","readwrite")
      .objectStore(mode==="users"?"User":"zavody").delete(id);
    mode==="users"?showUsers():renderZavody();
}

/* ===================== MODALS ===================== */
function openLogin(){ loginModal.style.display="block"; }
function closeLogin(){ loginModal.style.display="none"; }
function closeEdit(){ editModal.style.display="none"; }
