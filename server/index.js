const express=require("express"),cors=require("cors"),Database=require("better-sqlite3"),QR=require("qrcode"),path=require("path");
const app=express(); app.use(cors()); app.use(express.json());
const db=new Database("krishi.db");
db.exec(`CREATE TABLE IF NOT EXISTS farmers(id INTEGER PRIMARY KEY,kisan_id TEXT UNIQUE,name TEXT,phone TEXT,crop TEXT,eligible_qty REAL,kyc TEXT);
CREATE TABLE IF NOT EXISTS centres(id INTEGER PRIMARY KEY,name TEXT,location TEXT,capacity REAL,queue INTEGER,quota REAL,weather INTEGER,processing REAL);
CREATE TABLE IF NOT EXISTS allocations(id INTEGER PRIMARY KEY,farmer_id INTEGER,centre_id INTEGER,qty REAL,status TEXT,slot TEXT,qr TEXT);
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,allocation_id INTEGER,event TEXT,ts TEXT);
CREATE TABLE IF NOT EXISTS alerts(id INTEGER PRIMARY KEY,type TEXT,message TEXT,status TEXT,ts TEXT);`);
if(!db.prepare("SELECT count(*) c FROM centres").get().c) {
 [["Centre B","Indore North",100,18,75,22,82],["Centre C","Indore East",120,11,88,18,76],["Centre D","Indore South",150,7,96,12,91],["Centre A","Indore West",90,24,61,35,69]]
 .forEach(x=>db.prepare("INSERT INTO centres(name,location,capacity,queue,quota,weather,processing) VALUES(?,?,?,?,?,?,?)").run(...x));
}
if(!db.prepare("SELECT count(*) c FROM farmers").get().c) db.prepare("INSERT INTO farmers(kisan_id,name,phone,crop,eligible_qty,kyc) VALUES(?,?,?,?,?,?)").run("KS-2026-001","Ramesh Kumar","9876543210","Wheat",10,"VERIFIED");

const score=c=>Math.round(.22*(100-c.queue*2)+.18*c.quota+.20*(100-c.weather)+.20*c.processing+.20*Math.max(0,100-c.capacity/2));
app.get("/api/farmer",(q,r)=>r.json(db.prepare("SELECT * FROM farmers LIMIT 1").get()));
app.get("/api/centres",(q,r)=>r.json(db.prepare("SELECT *,round(quota,0) quota FROM centres").all().map(c=>({...c,score:Math.max(1,Math.min(99,score(c)))})).sort((a,b)=>b.score-a.score)));
app.get("/api/allocations",(q,r)=>r.json(db.prepare(`SELECT a.*,c.name centre FROM allocations a JOIN centres c ON c.id=a.centre_id ORDER BY a.id DESC`).all()));
app.get("/api/events/:id",(q,r)=>r.json(db.prepare("SELECT * FROM events WHERE allocation_id=? ORDER BY id").all(q.params.id)));
app.get("/api/dashboard",(q,r)=>r.json({
 farmers:db.prepare("SELECT count(*) n FROM farmers").get().n, allocations:db.prepare("SELECT count(*) n FROM allocations").get().n,
 tonnes:db.prepare("SELECT coalesce(sum(qty),0) n FROM allocations").get().n,
 queue:db.prepare("SELECT coalesce(sum(queue),0) n FROM centres").get().n,
 alerts:db.prepare("SELECT * FROM alerts WHERE status='OPEN' ORDER BY id DESC").all(),
 centres:db.prepare("SELECT * FROM centres").all()
}));
app.post("/api/register",(q,r)=>{let {name,phone,crop,eligible_qty}=q.body; let kid="KS-"+Date.now(); let x=db.prepare("INSERT INTO farmers(kisan_id,name,phone,crop,eligible_qty,kyc) VALUES(?,?,?,?,?,?)").run(kid,name,phone,crop,eligible_qty,"VERIFIED"); r.json({id:x.lastInsertRowid,kisan_id:kid})});
app.post("/api/allocate",async(q,r)=>{
 const {farmer_id=1,items}=q.body; const tx=db.transaction(()=>{let out=[]; for(const it of items){let c=db.prepare("SELECT * FROM centres WHERE id=?").get(it.centre_id); if(!c||it.qty<=0||it.qty>c.quota) throw Error("Invalid centre/quota"); db.prepare("UPDATE centres SET quota=quota-?,queue=queue+1 WHERE id=?").run(it.qty,it.centre_id); let slot=new Date(Date.now()+86400000).toISOString(); let a=db.prepare("INSERT INTO allocations(farmer_id,centre_id,qty,status,slot) VALUES(?,?,?,?,?)").run(farmer_id,it.centre_id,it.qty,"SLOT_BOOKED",slot); let qr="KS-"+a.lastInsertRowid+"-"+Date.now(); db.prepare("UPDATE allocations SET qr=? WHERE id=?").run(qr,a.lastInsertRowid); db.prepare("INSERT INTO events(allocation_id,event,ts) VALUES(?,?,?)").run(a.lastInsertRowid,"Slot Booked",new Date().toISOString()); out.push({...it,id:a.lastInsertRowid,qr,slot});} return out;}); try{r.json(tx())}catch(e){r.status(400).json({error:e.message})}
});
app.post("/api/weather-event",(q,r)=>{
 const c=db.prepare("SELECT * FROM centres WHERE id=1").get(); db.prepare("UPDATE centres SET weather=89 WHERE id=1").run();
 let alloc=db.prepare("SELECT * FROM allocations WHERE centre_id=1 AND status='SLOT_BOOKED' LIMIT 1").get();
 if(alloc){let d=db.prepare("SELECT * FROM centres WHERE id=3").get(); db.prepare("UPDATE allocations SET centre_id=?,status='REALLOCATED' WHERE id=?").run(3,alloc.id); db.prepare("INSERT INTO events(allocation_id,event,ts) VALUES(?,?,?)").run(alloc.id,"Reallocated: Centre B weather risk 89/100 → Centre D",new Date().toISOString()); db.prepare("INSERT INTO alerts(type,message,status,ts) VALUES(?,?,?,?,?)").run("WEATHER","Centre B risk 89/100. Booking rerouted to Centre D.","OPEN",new Date().toISOString());}
 r.json({ok:true,message:"Weather event simulated. Existing Centre B booking rerouted to Centre D."});
});
app.post("/api/event",(q,r)=>{db.prepare("INSERT INTO events(allocation_id,event,ts) VALUES(?,?,?)").run(q.body.allocation_id,q.body.event,new Date().toISOString()); if(q.body.event==="Payment Confirmed") db.prepare("UPDATE allocations SET status='PAYMENT_CONFIRMED' WHERE id=?").run(q.body.allocation_id); r.json({ok:true})});
app.get("/api/qr/:text",async(q,r)=>{r.type("image/png"); QR.toFileStream(r,q.params.text)});
app.use(express.static(path.join(__dirname,"../dist"))); app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"../dist/index.html")));
const PORT=process.env.PORT||3000; app.listen(PORT,"0.0.0.0",()=>console.log(`Krishi Sarathi running on ${PORT}`));