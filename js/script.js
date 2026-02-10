
/*============ Vytvoření třídy zavod =============*/
/* Vložit závod: */
/* */

class Zavod {
    constructor(nazev, misto, datum, casZahajeni, casKonec) {
        this.nazev = nazev;
        this.misto = misto;
        this.datum = datum;
        this.cas_zahajeni = casZahajeni;
        this.cas_konec = casKonec;
    }
    /* =============Vložit závod do DB pomocí třídy (již nepoužíváno) ==================*/    
    ulozDoDB(db) {
        const tx = db.transaction("zavody", "readwrite");
        const store = tx.objectStore("zavody");
        store.add(this);
    }
    /* =============Vložit závod do DB pomocí statické metody třídy ==================*/
    static ulozDoDBStatic(db, data) {
        const tx = db.transaction("zavody", "readwrite");
        const store = tx.objectStore("zavody");

        const zavod = new Zavod(
            data.nazev,
            data.misto,
            data.datum,
            data.cas_zahajeni,
            data.cas_konec
        );
    // add = vložení nového záznamu
        store.add(zavod);
    }

    static upravZavodStatic(db, id, data) {
        const tx = db.transaction("zavody", "readwrite");
        const store = tx.objectStore("zavody");

        const zavod = new Zavod(
            data.nazev,
            data.misto,
            data.datum,
            data.cas_zahajeni,
            data.cas_konec
        );

        // put = aktualizace existujícího záznamu
        store.put({ ...zavod, id: id });
    }
    static smazZavodStatic(db, id) {
        const tx = db.transaction("zavody", "readwrite");
        const store = tx.objectStore("zavody");
        store.delete(id);
    }

}


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
    /*  ======================= Předvyplnění závodů ===================== */
    /*
    zavody.add({nazev:"Jarní závody PAS",misto:"Praha",datum:"10.04.2026",cas_zahajeni:"09:00",cas_konec:"17:00"});
    zavody.add({nazev:"Letní pohár PAS",misto:"Brno",datum:"15.06.2026",cas_zahajeni:"10:00",cas_konec:"18:00"});
    zavody.add({nazev:"Podzimní finále PAS",misto:"Ostrava",datum:"20.09.2026",cas_zahajeni:"09:30",cas_konec:"16:30"});
    */
    /* ======================= Předvyplnění závodů pomocí třídy ===================== */
    zavody.add(new Zavod("Jarní závody PAS","Praha","10.04.2026","09:00","17:00"));
    zavody.add(new Zavod("Letní pohár PAS","Brno","15.06.2026","10:00","18:00"));
    zavody.add(new Zavod("Podzimní finále PAS","Ostrava","20.09.2026","09:30","16:30"));

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

/* ============== Uložení závodů do tabulky ============== */

function showZavody(){
    adminPanel.innerHTML=`
        <button onclick="openAdd()">Přidat závod</button>
        <button onclick="openEdit()">Editovat závod</button>
        <button onclick="deleteItem()">Smazat závod</button>
        <button onclick="showUsers()">Správa uživatelů</button>`;
    adminPanel.style.display="block";
    renderZavody();
}
/* ================ Zobrazí závody v tabulce ================ */
/* Původní verze bez třídy:
function renderZavody(){
    mode="zavody";
    thead.innerHTML=`
        <tr>
            <th></th>
            <th>Název</th>
            <th>Místo</th>
            <th>Datum</th>
            <th>Začátek</th>
            <th>Konec</th>
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
*/

function renderZavody() {
    mode = "zavody";
        if (loggedUser) {
            thead.innerHTML = 
            `<tr>
                <th></th><th>Název</th><th>Místo</th><th>Datum</th><th>Začátek</th><th>Konec</th>
            </tr>`;
            }else{
                thead.innerHTML = 
                `<tr>
                    <th>Název</th><th>Místo</th><th>Datum</th><th>Začátek</th><th>Konec</th>
                </tr>`;
            }

    tbody.innerHTML = "";

    db.transaction("zavody")
      .objectStore("zavody")
      .openCursor().onsuccess = e => {

        const c = e.target.result;
        if (!c) return;
        /* ======================== Zobrazí závod pomocí třídy (c.value->zavod)===================== */
        const data = c.value;
        const zavod = new Zavod(
            data.nazev,
            data.misto,
            data.datum,
            data.cas_zahajeni,
            data.cas_konec
        );
        /* ======================== Vytvoření a naplnění tabulky z třídy ===================== */
        /* ======================== Pokud je uživatel přihlášen, zobrazí se i možnost výběru závodu (input) ===================== */
        if (loggedUser) {
            tbody.innerHTML += `
                <tr>
                    <td><input type="radio" name="sel" value="${c.key}"></td>
                    <td>${zavod.nazev}</td>
                    <td>${zavod.misto}</td>
                    <td>${zavod.datum}</td>
                    <td>${zavod.cas_zahajeni}</td>
                    <td>${zavod.cas_konec}</td>
                </tr>`;
        } else {
            tbody.innerHTML += `
                <tr>
                    <td>${zavod.nazev}</td>
                    <td>${zavod.misto}</td>
                    <td>${zavod.datum}</td>
                    <td>${zavod.cas_zahajeni}</td>
                    <td>${zavod.cas_konec}</td>
                </tr>`;
        }
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
/*
function openEdit(){
    editId=getSelected();
    if(!editId) return alert("Vyberte položku");
    editTitle.innerText="Editace";
    userFields.style.display=mode==="users"?"block":"none";
    raceFields.style.display=mode==="zavody"?"block":"none";
    editModal.style.display="block";
}
*/
/* ===================== Otevře modální okno pro editaci a předvyplní data z DB ===================== */
function openEdit(){
    editId = getSelected();
    if(!editId) return alert("Vyberte položku");

    editTitle.innerText = "Editace";
    userFields.style.display = mode === "users" ? "block" : "none";
    raceFields.style.display = mode === "zavody" ? "block" : "none";
    editModal.style.display = "block";

    /* ======= NAČTENÍ PŮVODNÍCH DAT Z DB ======= */
    if (mode === "zavody") {
        const tx = db.transaction("zavody");
        const store = tx.objectStore("zavody");

        store.get(editId).onsuccess = e => {
            const z = e.target.result;
            if (!z) return;

            // předvyplnění formuláře
            zNazev.value  = z.nazev;
            zMisto.value  = z.misto;
            zDatum.value  = z.datum;
            zStart.value  = z.cas_zahajeni;
            zKonec.value  = z.cas_konec;
        };
    }
}

function saveEdit(){
    if(mode==="users"){
        const store=db.transaction("User","readwrite").objectStore("User");
        const data={name:uName.value,email:uEmail.value,password_hash:uPass.value,role:uRole.value};
        editId?store.put({...data,id:editId}):store.add(data);
        showUsers();
    } else {
        /* ========================= Uložení závodu bez třídy (data) ====================== */
        //const store=db.transaction("zavody","readwrite").objectStore("zavody");
        /*const data={nazev:zNazev.value,misto:zMisto.value,datum:zDatum.value,cas_zahajeni:zStart.value,cas_konec:zKonec.value};
        editId?store.put({...data,id:editId}):store.add(data);*/
        /*======================== Uložení závodu pomocí třídy (data->zavod)===================== */
        //const zavod = new Zavod(zNazev.value,zMisto.value,zDatum.value,zStart.value,zKonec.value);
        /* ======================== Uložení závodu  ===================== 
        editId?store.put({...zavod,id:editId}):store.add(zavod);*/
        /* ======================== Uložení závodu pomocí metody (zavod.ulozDoDB) ===================== */
        //zavod.ulozDoDB(db, editId);
        
        /* ======================== Uložení závodu pomocí statické metody třídy (Zavod.ulozDoDBStatic) ====================== */
        /*Zavod.ulozDoDBStatic(db, {
            nazev: zNazev.value,
            misto: zMisto.value,
            datum: zDatum.value,
            cas_zahajeni: zStart.value,
            cas_konec: zKonec.value
        });*/
        /* ======================== Uložení/editace závodu pomocí statické metody ====================== */
        const data = {
            nazev: zNazev.value,
            misto: zMisto.value,
            datum: zDatum.value,
            cas_zahajeni: zStart.value,
            cas_konec: zKonec.value
        };
        /* ======================== Pokud editujeme, použijeme upravZavodStatic, jinak ulozDoDBStatic ===================== */
        if (editId) {
            Zavod.upravZavodStatic(db, editId, data);
        } else {
        Zavod.ulozDoDBStatic(db, data);
        }

    renderZavody();





        renderZavody();
    }
    closeEdit();
}
/* ===================== Smazání položky stará verze, nahrazeno mazáním pomocí statické metody ===================== */
/*
function deleteItem(){
    const id=getSelected();
    if(!id) return alert("Vyberte položku");
    db.transaction(mode==="users"?"User":"zavody","readwrite")
      .objectStore(mode==="users"?"User":"zavody").delete(id);
    mode==="users"?showUsers():renderZavody();
}
*/  
function deleteItem() {
    const id = getSelected();
    if (!id) return alert("Vyberte položku"); // kontrola, zda je něco vybráno

    if (mode === "users") {
        db.transaction("User", "readwrite")
          .objectStore("User")
          .delete(id);
        showUsers();
    } else {
        /* ========= Mazání závodu pomocí statické metody třídy ========= */
        Zavod.smazZavodStatic(db, id);
        renderZavody();
    }
}
/* ===================== MODALS ===================== */
function openLogin(){ loginModal.style.display="block"; }
function closeLogin(){ loginModal.style.display="none"; }
function closeEdit(){ editModal.style.display="none"; }
