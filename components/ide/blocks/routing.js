'use strict';
// Route only the connection placeholder in trusted block templates, before inserting user text.
const BlockRouting = (() => {
  const supported=/^(?:Joystick|LED_Matrix|RGB_Matrix|CJP_Sound_Maker|Temperature_Sensor|Soil_Moisture_Sensor|Ultrasonic_Sensor|Seven_Segment|WiFi_IoT)\./;
  const usesConnection=spec=>/\bcody\b/.test(spec.python || '');
  const supportsSimulation=spec=>usesConnection(spec) && supported.test(spec.python || '');
  function target(block,spec) {
    const value=block.getFieldValue('TARGET') || 'HARDWARE';
    if(!['HARDWARE','SIMULATION'].includes(value))throw Error('Unknown gadget target. Choose Hardware or Simulation.');
    if(value==='SIMULATION' && !supportsSimulation(spec))throw Error('Simulation is unavailable for '+spec.type+'. Use Hardware.');
    if(value==='SIMULATION' && /^(Joystick|Seven_Segment|Ultrasonic_Sensor)\./.test(spec.python)) {
      const device=String(block.getFieldValue('device') || '').replace(/[^a-zA-Z0-9]/g,'').toUpperCase();
      const allowed=spec.python.startsWith('Joystick.')?['CJP','5','STANDALONE','0']:['STANDALONE','0'];
      if(!allowed.includes(device))throw Error('This simulated block requires '+(spec.python.startsWith('Joystick.')?'CodyJoy Pro or Standalone':'Standalone')+'. Choose a supported device.');
    }
    return value;
  }
  function template(block,spec) {
    if(!usesConnection(spec))return String(spec.python || '');
    return String(spec.python).replace(/\bcody\b/g,target(block,spec)==='SIMULATION'?'simulator':'cody');
  }
  function plan(blocks,specs) {
    let hardware=false,simulation=false;
    for(const block of blocks) {
      const spec=specs.get(block.type);
      if(!spec || !usesConnection(spec))continue;
      if(target(block,spec)==='SIMULATION')simulation=true;else hardware=true;
    }
    return {hardware,simulation};
  }
  return {usesConnection,supportsSimulation,target,template,plan};
})();
if(typeof module!=='undefined')module.exports=BlockRouting;
