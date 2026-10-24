import sqlite3, pathlib, uuid, urllib.request, urllib.error, json, http.cookiejar
base='http://127.0.0.1:5173'
paths=list(pathlib.Path('.wrangler/state/v3/d1').rglob('*.sqlite'))
con=None
for path in paths:
 c=sqlite3.connect(path)
 if c.execute("SELECT name FROM sqlite_master WHERE name='events'").fetchone(): con=c; break
 c.close()
assert con is not None
ids=[str(uuid.uuid4()) for _ in range(3)]
event,category,photo=ids
code='TEST'+uuid.uuid4().hex[:8].upper()
jar=http.cookiejar.CookieJar(); guest=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
admin=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(opener,path,method='GET',data=None,form=False):
 headers={'Origin':base}
 if data is not None:
  headers['Content-Type']='application/x-www-form-urlencoded' if form else 'application/json'
  data=data.encode() if form else json.dumps(data).encode()
 try:
  r=opener.open(urllib.request.Request(base+path,data=data,method=method,headers=headers)); body=r.read();return r.status,json.loads(body) if r.headers.get('Content-Type','').startswith('application/json') else body
 except urllib.error.HTTPError as e:
  body=e.read()
  return e.code,json.loads(body) if e.headers.get('Content-Type','').startswith('application/json') else body
try:
 con.execute("INSERT INTO events (id,owner_id,code,title,status) VALUES (?,?,?,?,?)",(event,'wedding-test',code,'Voting validation','collecting'))
 con.execute("INSERT INTO categories (id,event_id,title) VALUES (?,?,?)",(category,event,'Validation'))
 con.execute("INSERT INTO submissions (id,event_id,category_id,guest_name,object_key,mime_type) VALUES (?,?,?,?,?,?)",(photo,event,category,'Validation','unused-test-key','image/jpeg'));con.commit()
 # Admin uses the real wedding owner; align only the isolated test event with it.
 owner=con.execute('SELECT owner_id FROM events ORDER BY created_at ASC LIMIT 1').fetchone()[0]
 con.execute('UPDATE events SET owner_id=? WHERE id=?',(owner,event));con.commit()
 call(admin,'/api/admin/login','POST','password=ilovekokfong',True)
 assert call(guest,f'/api/submissions/{photo}/like','POST')[0]==409
 def phase(value):
  status,_=call(admin,f'/api/host/events/{event}','PATCH',{'status':value});assert status==200,status
 phase('voting')
 status,data=call(guest,f'/api/submissions/{photo}/like','POST');assert status==200 and data['likeCount']==1 and data['likedByMe']
 status,data=call(guest,f'/api/submissions/{photo}/like','POST');assert status==200 and data['likeCount']==1
 second=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 status,data=call(second,f'/api/submissions/{photo}/like','POST');assert status==200 and data['likeCount']==2
 status,data=call(guest,f'/api/submissions/{photo}/like','DELETE');assert status==200 and data['likeCount']==1 and not data['likedByMe']
 status,data=call(guest,f'/api/submissions/{photo}/like','DELETE');assert status==200 and data['likeCount']==1
 status,data=call(guest,f'/api/submissions/{photo}/like','POST');assert status==200 and data['likeCount']==2 and data['likedByMe']
 status,data=call(guest,f'/api/events/{code}');assert data['submissions'][0]['likeCount']==2 and data['submissions'][0]['likedByMe']
 assert call(guest,f'/api/events/{code}/submissions','PUT',{})[0]==409
 con.execute("UPDATE submissions SET status='hidden' WHERE id=?",(photo,));con.commit()
 assert call(second,f'/api/submissions/{photo}/like','POST')[0]==404
 con.execute("UPDATE submissions SET status='approved' WHERE id=?",(photo,));con.commit()
 for value in ['judging','closed']:
  phase(value)
  assert call(guest,f'/api/submissions/{photo}/like','POST')[0]==409
  assert call(guest,f'/api/submissions/{photo}/like','DELETE')[0]==409
  assert call(guest,f'/api/events/{code}/submissions','PUT',{})[0]==409
  assert call(guest,f'/api/events/{code}')[1]['submissions'][0]['likeCount']==2
 phase('judging')
 spotlight=f'/api/host/events/{event}/spotlight'
 token=uuid.uuid4().hex
 assert call(guest,spotlight,'PUT',{'photoId':photo,'token':token,'claim':True})[0]==401
 assert call(admin,spotlight,'PUT',{'photoId':'missing','token':token,'claim':True})[0]==404
 assert call(admin,spotlight,'PUT',{'photoId':photo,'token':token,'claim':True})[0]==200
 assert call(guest,f'/api/events/{code}')[1]['spotlight']['photoId']==photo
 assert call(guest,f'/api/events/{code}/spotlight')[1]['spotlight']['photoId']==photo
 assert call(admin,spotlight,'PUT',{'photoId':photo,'token':token})[0]==200
 newer=uuid.uuid4().hex
 assert call(admin,spotlight,'PUT',{'photoId':photo,'token':newer,'claim':True})[0]==200
 assert call(admin,spotlight,'DELETE',{'token':token})[0]==200
 assert call(guest,f'/api/events/{code}')[1]['spotlight']['photoId']==photo
 assert call(guest,f'/api/events/{code}/spotlight')[1]['spotlight']['photoId']==photo
 assert call(admin,spotlight,'PUT',{'photoId':photo,'token':token})[0]==409
 assert call(admin,spotlight,'DELETE',{'token':newer})[0]==200
 assert call(guest,f'/api/events/{code}')[1]['spotlight'] is None
 assert call(guest,f'/api/events/{code}/spotlight')[1]['spotlight'] is None
 assert call(admin,spotlight,'PUT',{'photoId':photo,'token':token,'claim':True})[0]==200
 con.execute('UPDATE events SET spotlight_expires_at=0 WHERE id=?',(event,));con.commit()
 assert call(guest,f'/api/events/{code}')[1]['spotlight'] is None
 assert call(guest,f'/api/events/{code}/spotlight')[1]['spotlight'] is None
 phase('collecting')
 assert call(admin,spotlight,'PUT',{'photoId':photo,'token':token,'claim':True})[0]==409
 phase('judging')
 print('Spotlight authorization, phase gates, synchronization, expiry and token cleanup passed')
 status,data=call(admin,f'/api/host/events/{event}','PATCH',{'judgingCategoryId':category});assert status==200 and data['event']['judgingCategoryId']==category
 status,data=call(guest,f'/api/events/{code}');assert data['event']['judgingCategoryId']==category
 assert call(admin,f'/api/host/events/{event}','PATCH',{'judgingCategoryId':'not-a-category'})[0]==400
 status,data=call(admin,f'/api/host/submissions/{photo}','PATCH',{'isFinalist':True});assert status==200
 assert call(guest,f'/api/events/{code}')[1]['submissions'][0]['isFinalist']
 status,data=call(admin,f'/api/host/events/{event}','PATCH',{'judgingCategoryId':None});assert status==200 and data['event']['judgingCategoryId'] is None
 assert call(guest,f'/api/host/submissions/{photo}','DELETE')[0]==401
 assert call(admin,f'/api/host/events/{event}','PATCH',{'judgingCategoryId':category})[0]==200
 status,data=call(admin,f'/api/host/submissions/{photo}','DELETE');assert status==200 and not data['submissions']
 row=con.execute('SELECT object_key,deleted_at FROM submissions WHERE id=?',(photo,)).fetchone();assert row[0]=='unused-test-key' and row[1]
 assert not call(guest,f'/api/events/{code}')[1]['submissions']
 assert call(guest,f'/media/{photo}')[0]==404
 assert call(admin,f'/api/host/submissions/{photo}','PATCH',{'status':'approved'})[0]==404
 status,data=call(admin,f'/api/host/categories/{category}','DELETE');assert status==200 and not data['categories'] and data['event']['judgingCategoryId'] is None
 assert con.execute('SELECT deleted_at FROM categories WHERE id=?',(category,)).fetchone()[0]
 assert call(admin,f'/api/host/categories/{category}','PATCH',{'active':True})[0]==404
 print('PASS: authenticated soft deletion, public exclusion, original object key retained, judging selection cleared, deleted items cannot be edited.')
 endpoint=f'/api/host/events/{event}/slideshow'
 assert call(guest,endpoint,'PATCH',{'seconds':7})[0]==401
 assert call(admin,endpoint,'PATCH',{'seconds':0})[0]==400
 status,data=call(admin,endpoint,'PATCH',{'seconds':7});assert status==200 and data['slideshow']['seconds']==7 and len(data['slideshow']['photos'])==8
 for slide in list(data['slideshow']['photos']):
  status,result=call(admin,endpoint,'DELETE',{'photoId':slide['id']});assert status==200
 assert result['slideshow']['photos']==[]
 assert call(guest,f'/api/events/{code}')[1]['slideshow']=={'seconds':7,'photos':[]}
 print('PASS: slideshow timing persistence, timing validation, authenticated changes, default playlist removal and empty playlist without fallback.')
 print('PASS: judging category persistence, invalid category rejection, public wall setting, shortlisting, reset to all categories.')
 print('PASS: phase changes, duplicate prevention, unlike, repeat unlike, re-like, multiple voters, persisted totals, hidden-photo protection, upload and vote locks.')
finally:
 con.execute('DELETE FROM likes WHERE submission_id=?',(photo,));con.execute('DELETE FROM submissions WHERE id=?',(photo,));con.execute('DELETE FROM categories WHERE id=?',(category,));con.execute('DELETE FROM events WHERE id=?',(event,));con.commit();con.close()
 print('Isolated validation records removed; existing wedding phase and photos unchanged.')
