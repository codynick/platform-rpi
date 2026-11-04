"""Authoritative RPi implementation of the server 3.20.4 classroom world models.

Geometry, units, response constants and soil equations match world-models.js.
No physical gadget or cloud access is performed here.
"""
import copy
import math
import re
import time

TYPES = {
    'sand': dict(name='Sandy', capacity=400, field=45, soak=.8, drain=9, evap=.00024),
    'loam': dict(name='Loamy', capacity=500, field=65, soak=2, drain=30, evap=.00016),
    'clay': dict(name='Clay', capacity=600, field=80, soak=4.5, drain=70, evap=.00010),
}


def number(value, low, high, label):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not low <= value <= high:
        raise ValueError('Invalid '+label)
    return value


def position(item, ids):
    if not isinstance(item, dict) or not isinstance(item.get('id'), str) or not re.fullmatch(r'[a-zA-Z0-9-]{1,80}', item['id']) or item['id'] in ids:
        raise ValueError('Invalid or duplicate asset')
    ids.add(item['id'])
    return dict(id=item['id'], x=number(item.get('x'),0,1400,'asset X'), y=number(item.get('y'),0,1500,'asset Y'))


def clean_world(world):
    if not isinstance(world, dict) or not isinstance(world.get('assets'), list) or len(world['assets'])>100:
        raise ValueError('Invalid simulation assets (maximum 100)')
    ids=set();assets=[]
    for item in world['assets']:
        asset=position(item,ids);kind=item.get('kind')
        if kind not in ('hot','cold','target'):raise ValueError('Invalid asset kind')
        asset['kind']=kind
        if kind=='target':
            asset.update(width=number(item.get('width'),10,200,'target width'),height=number(item.get('height'),10,200,'target height'))
        else:asset['temperature']=number(item.get('temperature'),0,95,'water temperature')
        assets.append(asset)
    p=world.get('probe')
    if not isinstance(p,dict):raise ValueError('Invalid temperature probe')
    result=dict(assets=assets,probe=dict(x=number(p.get('x'),25,1800,'probe X'),y=number(p.get('y'),145,1800,'probe Y'),
        temperature=number(p.get('temperature'),-55,125,'probe temperature'),at=number(p.get('at'),0,1e15,'probe timestamp')))
    if world.get('ultrasonic') is not None:
        u=world['ultrasonic']
        if not isinstance(u,dict) or not isinstance(u.get('enabled'),bool):raise ValueError('Invalid world sensing switch')
        result['ultrasonic']=dict(enabled=u['enabled'],angle=number(u.get('angle'),-180,180,'sensor angle'))
    return result


def clean_garden(garden):
    if not isinstance(garden,dict) or not isinstance(garden.get('pots'),list) or not isinstance(garden.get('cans'),list) or len(garden['pots'])+len(garden['cans'])>100 or not isinstance(garden.get('enabled'),bool):
        raise ValueError('Invalid soil world')
    ids=set();pots=[]
    for item in garden['pots']:
        pot=position(item,ids);kind=item.get('type')
        if kind not in TYPES:raise ValueError('Invalid soil type')
        pot.update(type=kind,water=number(item.get('water'),0,TYPES[kind]['capacity'],'soil water'),
            surface=number(item.get('surface'),0,100,'surface water'),overflow=number(item.get('overflow'),0,1e12,'overflow'),
            drained=number(item.get('drained',0),0,1e12,'drained water'))
        pots.append(pot)
    cans=[position(item,ids) for item in garden['cans']];p=garden.get('probe')
    if not isinstance(p,dict):raise ValueError('Missing soil probe')
    return dict(enabled=garden['enabled'],at=number(garden.get('at'),0,1e15,'soil timestamp'),pots=pots,cans=cans,
        probe=dict(x=number(p.get('x'),25,1800,'soil probe X'),y=number(p.get('y'),145,1800,'soil probe Y'),value=number(p.get('value'),0,100,'soil reading')))


def contact(world):
    p=world['probe']
    return next((a for a in reversed(world['assets']) if a['kind']!='target' and a['x']+29<p['x']<a['x']+179 and a['y']+114<p['y']<a['y']+253),None)


def nearest_in_cone(rect, origin, angle):
    theta=math.radians(angle);axis=(math.cos(theta),math.sin(theta));tan=math.tan(math.pi/12);candidates=[]
    def cross(a,b):return a[0]*b[1]-a[1]*b[0]
    def inside(p):
        dot=p[0]*axis[0]+p[1]*axis[1]
        return dot>=-1e-8 and abs(cross(axis,p))<=max(0,dot)*tan+1e-8
    x,y,w,h=rect;ox,oy=origin
    if x<=ox<=x+w and y<=oy<=y+h:return 0
    corners=[(x-ox,y-oy),(x+w-ox,y-oy),(x+w-ox,y+h-oy),(x-ox,y+h-oy)]
    for i,a in enumerate(corners):
        b=corners[(i+1)%4];d=(b[0]-a[0],b[1]-a[1])
        if inside(a):candidates.append(math.hypot(*a))
        t=max(0,min(1,-(a[0]*d[0]+a[1]*d[1])/(d[0]*d[0]+d[1]*d[1])))
        p=(a[0]+d[0]*t,a[1]+d[1]*t)
        if inside(p):candidates.append(math.hypot(*p))
        for offset in (-math.pi/12,math.pi/12):
            ray=(math.cos(theta+offset),math.sin(theta+offset));denom=cross(ray,d)
            if abs(denom)<1e-9:continue
            r=cross(a,d)/denom;u=cross(a,ray)/denom
            if r>=-1e-8 and -1e-8<=u<=1+1e-8:candidates.append(max(0,r))
    return min(candidates,default=math.inf)


def ultrasound(scene):
    world=scene.get('world');sensor=scene['gadgets'].get('ultrasonic')
    if not world or not world.get('ultrasonic',{}).get('enabled') or not sensor:return dict(active=False,distance=scene.get('distance',50),id=None)
    origin=(sensor['x']+306,sensor['y']+110);angle=world['ultrasonic']['angle'];nearest=math.inf;identity=None
    for a in world['assets']:
        if a['kind']!='target':continue
        distance=nearest_in_cone((a['x']+4,a['y']+36,a['width'],a['height']),origin,angle)
        if distance<nearest:nearest,identity=distance,a['id']
    echo=2<=nearest<=400
    return dict(active=True,distance=round(nearest,1) if echo else 0,id=identity if echo else None)


def moisture(pot):return pot['water']/TYPES[pot['type']]['capacity']*100


def soil_contact(garden):
    probe=garden['probe']
    for pot in reversed(garden['pots']):
        left,right,top,bottom=pot['x']+24,pot['x']+196,pot['y']+136,pot['y']+256
        inset=max(0,min(15,(probe['y']-top)/120*15))
        if probe['x']-8>=left+inset and probe['x']+8<=right-inset and top+8<=probe['y']<=bottom:return pot
    return None


def landing(garden,can):
    best=None;area=0
    for pot in garden['pots']:
        width=min(can['x']+205,pot['x']+202)-max(can['x']+5,pot['x']+18)
        height=min(can['y']+160,pot['y']+264)-max(can['y']+15,pot['y']+95)
        overlap=max(0,width)*max(0,height)
        if overlap>area:area,best=overlap,pot
    return best


def evolve(pot,seconds):
    t=TYPES[pot['type']];soak=pot['surface']*(1-math.exp(-seconds/t['soak']))
    accepted=min(soak,t['capacity']-pot['water']);pot['surface']-=accepted;pot['water']+=accepted
    above=max(0,pot['water']-t['capacity']*t['field']/100);drain=above*(1-math.exp(-seconds/t['drain']))
    pot['water']-=drain;pot['drained']+=drain
    pot['water']-=min(pot['water'],t['capacity']*t['evap']*seconds)
    pot['surface']=max(0,pot['surface']-min(pot['surface'],t['capacity']*t['evap']*.5*seconds))


def advance(scene, now=None):
    now=time.time()*1000 if now is None else now
    world=scene.get('world')
    if world:
        if 'temperature' in scene['gadgets'] and any(a['kind'] in ('hot','cold') for a in world['assets']):
            bath=contact(world);target=bath['temperature'] if bath else 22;seconds=max(0,(now-world['probe']['at'])/1000)
            world['probe']['temperature']=target+(world['probe']['temperature']-target)*math.exp(-seconds/(5 if bath else 25))
            scene['temperature']=round(world['probe']['temperature'],1)
        else:world['probe']['temperature']=scene['temperature']
        world['probe']['at']=now;echo=ultrasound(scene)
        if echo['active']:scene['distance']=echo['distance']
    garden=scene.get('garden')
    if garden:
        real=max(0,(now-garden['at'])/1000);steps=max(1,min(600,math.ceil(real/.1)));dt=real/steps
        for _ in range(steps):
            for can in garden['cans']:
                pot=landing(garden,can)
                if pot:
                    combined=pot['surface']+60*dt;pot['surface']=min(100,combined);pot['overflow']+=max(0,combined-100)
            for pot in garden['pots']:evolve(pot,dt)
        if garden['enabled'] and 'soil' in scene['gadgets']:
            pot=soil_contact(garden);target=moisture(pot) if pot else 0
            garden['probe']['value']=target+(garden['probe']['value']-target)*math.exp(-real/1.8)
            scene['soil']=round(garden['probe']['value'],1)
        else:garden['probe']['value']=scene.get('soil',50)
        garden['at']=now
    return scene


def merge_edit(base, edited, current):
    """Apply only a view's edits, preserving newer sensor evolution/other-view edits."""
    if edited==base:return copy.deepcopy(current)
    if isinstance(base,dict) and isinstance(edited,dict) and isinstance(current,dict):
        result=copy.deepcopy(current)
        for key in base.keys()-edited.keys():result.pop(key,None)
        for key,value in edited.items():
            if key not in base:result[key]=copy.deepcopy(value)
            elif key not in current:result[key]=copy.deepcopy(value) if value!=base[key] else None
            else:result[key]=merge_edit(base[key],value,current[key])
        return {key:value for key,value in result.items() if value is not None}
    if isinstance(base,list) and isinstance(edited,list) and isinstance(current,list) and all(isinstance(a,dict) and 'id' in a for a in base+edited+current):
        b={a['id']:a for a in base};e={a['id']:a for a in edited};c={a['id']:a for a in current};result=[]
        for item in edited:
            key=item['id']
            if key not in b:result.append(copy.deepcopy(item))
            elif key in c:result.append(merge_edit(b[key],item,c[key]))
            elif item!=b[key]:result.append(copy.deepcopy(item))
        result.extend(copy.deepcopy(a) for a in current if a['id'] not in b and a['id'] not in e)
        return result
    return copy.deepcopy(edited)
