// Run the copied server model at explicit timestamps to compare authoritative Python.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context={};context.window=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../components/simulator/world-models.js'),'utf8'),context);
const inputs=JSON.parse(fs.readFileSync(0,'utf8'));
const result=inputs.map(({scene,now})=>context.CodyThermalWorld.advance(scene,now));
process.stdout.write(JSON.stringify(result));
