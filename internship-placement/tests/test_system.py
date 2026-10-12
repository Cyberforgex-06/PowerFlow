import sys, io, time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import pytest, bcrypt
from app import create_app,db,User,Listing,Application,Token,Document,Session
ORIGIN={'Origin':'http://localhost'}
@pytest.fixture
def app():
    a=create_app({'TESTING':True,'READY':True,'SQLALCHEMY_DATABASE_URI':'sqlite://','SECURE_COOKIES':False})
    with a.app_context():
        db.create_all()
        pw=bcrypt.hashpw(b'StrongPassword123',bcrypt.gensalt(rounds=4))
        for id,role in [('student','student'),('other','student'),('employer','employer'),('foreign','employer'),('admin','admin')]:
            db.session.add(User(id=id,email=id+'@example.com',name=id,password=pw,role=role,verified=True,company_verified=role=='employer',profile={'university':'ABUAD','department':'Computer Science','company':'Example Co'}))
        db.session.add(Document(user_id='student',data=b'%PDF-1.7\n%%EOF'))
        db.session.commit()
    yield a
    with a.app_context(): db.drop_all()
def login(c,id):
    r=c.post('/api/auth/login',json={'email':id+'@example.com','password':'StrongPassword123'},headers=ORIGIN)
    assert r.status_code==200
    return {**ORIGIN,'X-CSRF-Token':r.json['csrf']}
def job(c,h):
    r=c.post('/api/listings',headers=h,json={'title':'Test Internship','location':'Lagos','department':'Technology','mode':'Hybrid','duration':'3 months','deadline':'2027-12-31','stipend':50000,'skills':['Python'],'description':'Meaningful supervised internship.'})
    assert r.status_code==201;return r.json['listing']['id']
def test_preview_no_database():
    a=create_app({'TESTING':True,'READY':False});c=a.test_client()
    assert c.get('/').status_code==200
    assert c.get('/api/config').json['live'] is False
    assert c.post('/api/auth/register',json={},headers=ORIGIN).status_code==503

def test_auth_cookie_csrf_and_logout(app):
    c=app.test_client()
    r=c.post('/api/auth/login',json={'email':'student@example.com','password':'StrongPassword123'},headers=ORIGIN)
    assert 'HttpOnly' in r.headers['Set-Cookie'] and 'SameSite=Lax' in r.headers['Set-Cookie']
    h={**ORIGIN,'X-CSRF-Token':r.json['csrf']}
    assert c.patch('/api/profile',json={'name':'New'},headers=ORIGIN).status_code==403
    assert c.patch('/api/profile',json={'name':'New'},headers={**h,'Origin':'https://evil.example'}).status_code==403
    assert c.post('/api/auth/logout',json={},headers=h).status_code==200
    assert c.get('/api/me').json['user'] is None

def test_no_role_escalation(app):
    c=app.test_client();h=login(c,'student')
    assert c.get('/api/admin').status_code==403
    assert c.post('/api/listings',json={},headers=h).status_code==403
    assert c.patch('/api/profile',json={'name':'Student','role':'admin'},headers=h).status_code==200
    assert c.get('/api/me').json['user']['role']=='student'
    assert c.post('/api/auth/register',json={'email':'admin2@example.com','password':'StrongPassword123','name':'X','role':'admin'},headers=h).status_code==400

def test_complete_placement_flow_and_idor(app):
    employer=app.test_client();eh=login(employer,'employer');id=job(employer,eh)
    admin=app.test_client();ah=login(admin,'admin')
    assert admin.patch('/api/admin/listings/'+id,json={'status':'published'},headers=ah).status_code==200
    student=app.test_client();sh=login(student,'student')
    assert len(student.get('/api/listings').json['listings'])==1
    r=student.post('/api/applications',json={'listing_id':id,'cover':'I am ready to learn.'},headers=sh);assert r.status_code==201;aid=r.json['id']
    assert student.post('/api/applications',json={'listing_id':id,'cover':'Duplicate'},headers=sh).status_code==409
    assert employer.get('/api/cv?student_id=student').status_code==200
    foreign=app.test_client();fh=login(foreign,'foreign')
    assert foreign.get('/api/cv?student_id=student').status_code==403
    assert foreign.patch('/api/applications/'+aid,json={'status':'accepted'},headers=fh).status_code==404
    other=app.test_client();oh=login(other,'other')
    assert other.patch('/api/applications/'+aid,json={'status':'withdrawn'},headers=oh).status_code==404
    assert employer.patch('/api/applications/'+aid,json={'status':'shortlisted','note':'Interview next week.'},headers=eh).status_code==200
    assert student.get('/api/applications').json['applications'][0]['status']=='shortlisted'
    assert employer.patch('/api/applications/'+aid,json={'status':'accepted'},headers=eh).status_code==200
    assert student.patch('/api/applications/'+aid,json={'status':'withdrawn'},headers=sh).status_code==409

def test_company_verification_gate_and_closed_deadline(app):
    c=app.test_client();h=login(c,'employer')
    with app.app_context(): db.session.get(User,'employer').company_verified=False;db.session.commit()
    assert c.post('/api/listings',json={},headers=h).status_code==403

def test_cv_validation_and_private_access(app):
    c=app.test_client();h=login(c,'student')
    assert c.post('/api/cv',data={'file':(io.BytesIO(b'not pdf'),'cv.pdf')},headers=h).status_code==400
    assert c.post('/api/cv',data={'file':(io.BytesIO(b'%PDF-1.7\n%%EOF'),'cv.pdf')},headers=h).status_code==200
    assert app.test_client().get('/api/cv?student_id=student').status_code==401

def test_lockout_and_expired_session(app):
    c=app.test_client()
    for _ in range(5): assert c.post('/api/auth/login',json={'email':'student@example.com','password':'Wrong'},headers=ORIGIN).status_code==401
    assert c.post('/api/auth/login',json={'email':'student@example.com','password':'StrongPassword123'},headers=ORIGIN).status_code==429
    other=app.test_client();login(other,'other')
    with app.app_context(): db.session.query(Session).filter_by(user_id='other').update({'expires':time.time()-1});db.session.commit()
    assert other.get('/api/profile').status_code==401

def test_verification_reset_single_use(app):
    from app import digest
    c=app.test_client()
    with app.app_context():
        u=db.session.get(User,'other');u.verified=False;db.session.add(Token(id=digest('verifytoken'),user_id='other',purpose='verify',expires=time.time()+100));db.session.commit()
    assert c.post('/api/auth/token',json={'token':'verifytoken'},headers=ORIGIN).status_code==200
    assert c.post('/api/auth/token',json={'token':'verifytoken'},headers=ORIGIN).status_code==400
    login(c,'other')
    with app.app_context(): db.session.add(Token(id=digest('resettoken'),user_id='other',purpose='reset',expires=time.time()+100));db.session.commit()
    anonymous=app.test_client()
    assert anonymous.post('/api/auth/token',json={'token':'resettoken','password':'AnotherPassword123'},headers=ORIGIN).status_code==200
    assert c.get('/api/profile').status_code==401

def test_support_isolation_and_admin_reply(app):
    c=app.test_client();h=login(c,'student')
    r=c.post('/api/tickets',json={'subject':'Placement help','message':'Please help with my application.'},headers=h);assert r.status_code==200;id=r.json['tickets'][0]['id']
    other=app.test_client();login(other,'other');assert other.get('/api/tickets').json['tickets']==[]
    admin=app.test_client();ah=login(admin,'admin')
    assert admin.patch('/api/tickets/'+id,json={'reply':'We can help.'},headers=ah).status_code==200
    assert c.get('/api/tickets').json['tickets'][0]['status']=='resolved'

def test_input_validation_and_security_headers(app):
    c=app.test_client();h=login(c,'student')
    assert c.patch('/api/profile',json={'name':'X','portfolio':'javascript:alert(1)'},headers=h).status_code==400
    r=c.get('/');assert "frame-ancestors 'none'" in r.headers['Content-Security-Policy'];assert r.headers['X-Content-Type-Options']=='nosniff'

def test_https_email_registration_and_provider_failure(app,monkeypatch):
    import json
    import app as module
    monkeypatch.setenv('BREVO_API_KEY','test-only-key')
    monkeypatch.setenv('EMAIL_FROM','sender@example.com')
    app.config.update(TESTING=False,PUBLIC_URL='http://localhost')
    requests=[]
    class Accepted:
        status=201
        def __enter__(self): return self
        def __exit__(self,*args): pass
    def accept(req,timeout):
        requests.append(req)
        assert req.full_url=='https://api.brevo.com/v3/smtp/email'
        return Accepted()
    monkeypatch.setattr(module,'urlopen',accept)
    c=app.test_client()
    assert c.get('/api/config').json['email_ready'] is True
    r=c.post('/api/auth/register',json={'name':'New Student','email':'new@example.com','password':'StrongPassword123','role':'student'},headers=ORIGIN)
    assert r.status_code==201
    payload=json.loads(requests[0].data)
    assert payload['to']==[{'email':'new@example.com'}]
    assert payload['sender']['email']=='sender@example.com'
    assert '/#verify?token=' in payload['textContent']
    with app.app_context():
        u=db.session.scalar(db.select(User).where(User.email=='new@example.com'))
        assert u is not None and not u.verified
    def reject(req,timeout): raise OSError('provider unavailable')
    monkeypatch.setattr(module,'urlopen',reject)
    r=c.post('/api/auth/register',json={'name':'Other Student','email':'failure@example.com','password':'StrongPassword123','role':'student'},headers=ORIGIN)
    assert r.status_code==503
    with app.app_context():
        assert db.session.scalar(db.select(User).where(User.email=='failure@example.com')) is None


def test_database_password_component_encoding(monkeypatch):
    from app import create_app
    from sqlalchemy.engine import make_url
    monkeypatch.delenv('DATABASE_URL',raising=False)
    monkeypatch.setenv('DATABASE_HOST','db.example.invalid')
    monkeypatch.setenv('DATABASE_USER','postgres.test-project')
    monkeypatch.setenv('DATABASE_PASSWORD','p@ss:word/#%?')
    a=create_app({'TESTING':True})
    url=a.config['SQLALCHEMY_DATABASE_URI']
    assert a.config['READY'] is True
    assert url.query['sslmode']=='require'
    assert make_url(url.render_as_string(hide_password=False)).password=='p@ss:word/#%?'
