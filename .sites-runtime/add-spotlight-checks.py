from pathlib import Path
p=Path('.sites-runtime/check-voting.py');s=p.read_text(encoding='utf-8');needle=" phase('judging')\n status,data=call(admin"
insert=''' phase('judging')
 spotlight=f'/api/host/events/{event}/spotlight'
 token=uuid.uuid4().hex
 assert call(guest,spotlight,'PUT',{'photoId':photo,'token':token,'claim':True})[0]==401
 assert call(admin,spotlight,'PUT',{'photoId':'missing','token':token,'claim':True})[0]==404
 assert call(admin,spotlight,'PUT',{'photoId':photo,'token':token,'claim':True})[0]==200
 assert call(guest,f'/api/events/{code}')[1]['spotlight']['photoId']==photo
 assert call(admin,spotlight,'PUT',{'photoId':photo,'token':token})[0]==200
 newer=uuid.uuid4().hex
 assert call(admin,spotlight,'PUT',{'photoId':photo,'token':newer,'claim':True})[0]==200
 assert call(admin,spotlight,'DELETE',{'token':token})[0]==200
 assert call(guest,f'/api/events/{code}')[1]['spotlight']['photoId']==photo
 assert call(admin,spotlight,'PUT',{'photoId':photo,'token':token})[0]==409
 assert call(admin,spotlight,'DELETE',{'token':newer})[0]==200
 assert call(guest,f'/api/events/{code}')[1]['spotlight'] is None
 assert call(admin,spotlight,'PUT',{'photoId':photo,'token':token,'claim':True})[0]==200
 con.execute('UPDATE events SET spotlight_expires_at=0 WHERE id=?',(event,));con.commit()
 assert call(guest,f'/api/events/{code}')[1]['spotlight'] is None
 phase('collecting')
 assert call(admin,spotlight,'PUT',{'photoId':photo,'token':token,'claim':True})[0]==409
 phase('judging')
 print('Spotlight authorization, phase gates, synchronization, expiry and token cleanup passed')
 status,data=call(admin'''
assert needle in s;s=s.replace(needle,insert,1);p.write_text(s,encoding='utf-8')
