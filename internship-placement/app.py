import os, re, secrets, hashlib, time, smtplib, io, json
from urllib.request import Request, urlopen
from datetime import date
from email.message import EmailMessage
from functools import wraps
import bcrypt
from flask import Flask, request, jsonify, g, send_from_directory, send_file
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import UniqueConstraint, CheckConstraint, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

db = SQLAlchemy()
def uid(): return secrets.token_hex(16)
def digest(s): return hashlib.sha256(s.encode()).hexdigest()
class User(db.Model):
    __tablename__ = 'ips_users'
    id=db.Column(db.String(32),primary_key=True,default=uid)
    email=db.Column(db.String(254),unique=True,nullable=False)
    password=db.Column(db.LargeBinary,nullable=False)
    role=db.Column(db.String(12),nullable=False)
    name=db.Column(db.String(120),nullable=False)
    verified=db.Column(db.Boolean,default=False,nullable=False)
    company_verified=db.Column(db.Boolean,default=False,nullable=False)
    active=db.Column(db.Boolean,default=True,nullable=False)
    profile=db.Column(db.JSON,default=dict,nullable=False)
    failures=db.Column(db.Integer,default=0)
    locked_until=db.Column(db.Float,default=0)
    __table_args__=(CheckConstraint("role in ('student','employer','admin')"),)
class Session(db.Model):
    __tablename__='ips_sessions'
    id=db.Column(db.String(64),primary_key=True)
    user_id=db.Column(db.String(32),db.ForeignKey('ips_users.id'),nullable=False,index=True)
    csrf=db.Column(db.String(64),nullable=False)
    expires=db.Column(db.Float,nullable=False)
class Token(db.Model):
    __tablename__='ips_tokens'
    id=db.Column(db.String(64),primary_key=True)
    user_id=db.Column(db.String(32),db.ForeignKey('ips_users.id'),nullable=False,index=True)
    purpose=db.Column(db.String(12),nullable=False)
    expires=db.Column(db.Float,nullable=False)
class Listing(db.Model):
    __tablename__='ips_listings'
    id=db.Column(db.String(32),primary_key=True,default=uid)
    employer_id=db.Column(db.String(32),db.ForeignKey('ips_users.id'),nullable=False,index=True)
    title=db.Column(db.String(120),nullable=False)
    company=db.Column(db.String(120),nullable=False)
    location=db.Column(db.String(120),nullable=False)
    department=db.Column(db.String(100),nullable=False)
    mode=db.Column(db.String(12),nullable=False)
    duration=db.Column(db.String(80),nullable=False)
    stipend=db.Column(db.Integer,default=0,nullable=False)
    deadline=db.Column(db.Date,nullable=False)
    description=db.Column(db.Text,nullable=False)
    skills=db.Column(db.JSON,default=list,nullable=False)
    status=db.Column(db.String(12),default='pending',nullable=False)
    created=db.Column(db.Float,default=time.time)
    __table_args__=(CheckConstraint("mode in ('On-site','Hybrid','Remote')"),CheckConstraint("status in ('pending','published','closed','rejected')"),CheckConstraint('stipend >= 0'),)
class Application(db.Model):
    __tablename__='ips_applications'
    id=db.Column(db.String(32),primary_key=True,default=uid)
    student_id=db.Column(db.String(32),db.ForeignKey('ips_users.id'),nullable=False,index=True)
    listing_id=db.Column(db.String(32),db.ForeignKey('ips_listings.id'),nullable=False,index=True)
    cover=db.Column(db.Text,nullable=False)
    status=db.Column(db.String(15),default='submitted',nullable=False)
    note=db.Column(db.Text,default='')
    created=db.Column(db.Float,default=time.time)
    __table_args__=(UniqueConstraint('student_id','listing_id'),CheckConstraint("status in ('submitted','shortlisted','accepted','rejected','withdrawn')"),)
class Saved(db.Model):
    __tablename__='ips_saved'
    user_id=db.Column(db.String(32),db.ForeignKey('ips_users.id'),primary_key=True)
    listing_id=db.Column(db.String(32),db.ForeignKey('ips_listings.id'),primary_key=True)
class Document(db.Model):
    __tablename__='ips_documents'
    user_id=db.Column(db.String(32),db.ForeignKey('ips_users.id'),primary_key=True)
    data=db.Column(db.LargeBinary,nullable=False)
class Ticket(db.Model):
    __tablename__='ips_tickets'
    id=db.Column(db.String(32),primary_key=True,default=uid)
    user_id=db.Column(db.String(32),db.ForeignKey('ips_users.id'),nullable=False,index=True)
    subject=db.Column(db.String(120),nullable=False)
    message=db.Column(db.Text,nullable=False)
    status=db.Column(db.String(12),default='open')
    reply=db.Column(db.Text,default='')
    created=db.Column(db.Float,default=time.time)
class Audit(db.Model):
    __tablename__='ips_audit'
    id=db.Column(db.String(32),primary_key=True,default=uid)
    actor=db.Column(db.String(32))
    action=db.Column(db.String(80),nullable=False)
    target=db.Column(db.String(64))
    created=db.Column(db.Float,default=time.time)
class Rate(db.Model):
    __tablename__='ips_rate_limits'
    key=db.Column(db.String(64),primary_key=True)
    count=db.Column(db.Integer,default=0)
    expires=db.Column(db.Float,nullable=False)

def create_app(config=None):
    app=Flask(__name__,static_folder='static')
    url=os.getenv('DATABASE_URL','')
    if url.startswith('postgres://'): url=url.replace('postgres://','postgresql+psycopg://',1)
    elif url.startswith('postgresql://'): url=url.replace('postgresql://','postgresql+psycopg://',1)
    app.config.update(SQLALCHEMY_DATABASE_URI=url or 'sqlite://',SQLALCHEMY_TRACK_MODIFICATIONS=False,MAX_CONTENT_LENGTH=2*1024*1024+8192,READY=bool(url),PUBLIC_URL=os.getenv('PUBLIC_URL',''),SECURE_COOKIES=True)
    if config: app.config.update(config)
    db.init_app(app)
    def err(message,code=400): return jsonify(error=message),code
    def audit(action,target=None): db.session.add(Audit(actor=g.user.id if getattr(g,'user',None) else None,action=action,target=target))
    def user_json(u): return dict(id=u.id,email=u.email,role=u.role,name=u.name,verified=u.verified,company_verified=u.company_verified,active=u.active,profile=u.profile,has_cv=db.session.get(Document,u.id) is not None)
    def listing_json(l): return {k:(getattr(l,k).isoformat() if k=='deadline' else getattr(l,k)) for k in ['id','employer_id','title','company','location','department','mode','duration','stipend','deadline','description','skills','status','created']}
    def field(data,key,n=120):
        value=data.get(key,'')
        if not isinstance(value,str) or not value.strip() or len(value.strip())>n: raise ValueError(f'Enter a valid {key.replace("_"," ")} (maximum {n} characters).')
        return value.strip()
    def password(data):
        p=data.get('password','')
        if not isinstance(p,str) or len(p)<10 or len(p.encode())>72 or not re.search(r'[A-Za-z]',p) or not re.search(r'\d',p): raise ValueError('Password must contain letters and numbers, at least 10 characters, and at most 72 bytes.')
        return bcrypt.hashpw(p.encode(),bcrypt.gensalt(rounds=12))
    def auth(*roles):
        def deco(fn):
            @wraps(fn)
            def wrapped(*a,**kw):
                if not g.user: return err('Sign in to continue.',401)
                if roles and g.user.role not in roles: return err('You do not have access to this action.',403)
                return fn(*a,**kw)
            return wrapped
        return deco
    def mail(u,purpose):
        raw=secrets.token_urlsafe(32)
        db.session.add(Token(id=digest(raw),user_id=u.id,purpose=purpose,expires=time.time()+3600))
        if app.testing: return raw
        sender=os.getenv('EMAIL_FROM') or os.getenv('SMTP_FROM','')
        subject='Verify your Placement account' if purpose=='verify' else 'Reset your Placement password'
        body=f"Open this link within one hour: {app.config['PUBLIC_URL']}/#{purpose}?token={raw}\nIf you did not request this, ignore this email."
        if not app.config['PUBLIC_URL'] or not sender: raise RuntimeError('Email delivery is not configured yet.')
        key=os.getenv('BREVO_API_KEY')
        if key:
            payload={'sender':{'name':'Placement','email':sender},'to':[{'email':u.email}],'subject':subject,'textContent':body}
            req=Request('https://api.brevo.com/v3/smtp/email',data=json.dumps(payload).encode(),headers={'api-key':key,'Content-Type':'application/json','Accept':'application/json'},method='POST')
            with urlopen(req,timeout=15) as response:
                if response.status!=201: raise RuntimeError('Email provider did not accept the message.')
        else:
            host=os.getenv('SMTP_HOST')
            if not host: raise RuntimeError('Email delivery is not configured yet.')
            m=EmailMessage();m['From']=sender;m['To']=u.email;m['Subject']=subject;m.set_content(body)
            with smtplib.SMTP(host,int(os.getenv('SMTP_PORT','587')),timeout=15) as smtp:
                smtp.starttls();smtp.login(os.getenv('SMTP_USER',''),os.getenv('SMTP_PASSWORD',''));smtp.send_message(m)
        return raw
    @app.before_request
    def security():
        g.user=None;g.session=None
        if not request.path.startswith('/api/'): return
        if not app.config['READY'] and request.path not in ['/api/config','/api/health']: return err('Live accounts are not enabled. Explore the demo while the separate database is connected.',503)
        if request.path in ['/api/config','/api/health']: return
        raw=request.cookies.get('ips_session','')
        s=db.session.get(Session,digest(raw)) if raw else None
        if s and s.expires>time.time():
            u=db.session.get(User,s.user_id)
            if u and u.active: g.user=u;g.session=s
        if request.method not in ['GET','HEAD','OPTIONS']:
            origin=request.headers.get('Origin','')
            allowed=app.config['PUBLIC_URL'] or request.host_url.rstrip('/')
            if origin!=allowed: return err('Request origin is not allowed.',403)
            if g.user and not secrets.compare_digest(request.headers.get('X-CSRF-Token',''),g.session.csrf): return err('Refresh the page and try again.',403)
        if request.path.startswith('/api/auth/') and request.method=='POST':
            now=time.time();key=digest(request.remote_addr+':'+str(int(now//900)))
            row=db.session.execute(select(Rate).where(Rate.key==key).with_for_update()).scalar_one_or_none()
            if not row: row=Rate(key=key,count=0,expires=now+900);db.session.add(row)
            row.count+=1;db.session.commit()
            if row.count>20: return err('Too many attempts. Try again in 15 minutes.',429)
    @app.after_request
    def headers(r):
        r.headers.update({'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()'})
        if request.path.startswith('/api/'): r.headers['Cache-Control']='no-store'
        if app.config['SECURE_COOKIES']: r.headers['Strict-Transport-Security']='max-age=31536000'
        return r
    @app.errorhandler(ValueError)
    def invalid(e): return err(str(e))
    @app.errorhandler(IntegrityError)
    def conflict(e): db.session.rollback();return err('This record already exists or conflicts with another update.',409)
    @app.errorhandler(SQLAlchemyError)
    def database_error(e): db.session.rollback();app.logger.error('Database operation failed: %s',type(e).__name__);return err('Service temporarily unavailable. Try again shortly.',503)
    @app.errorhandler(413)
    def too_large(e): return err('Upload a PDF smaller than 2 MB.',413)
    @app.get('/api/config')
    def config_route(): return jsonify(live=app.config['READY'],email_ready=app.testing or bool(app.config['PUBLIC_URL'] and (os.getenv('EMAIL_FROM') or os.getenv('SMTP_FROM')) and (os.getenv('BREVO_API_KEY') or os.getenv('SMTP_HOST'))))
    @app.get('/api/health')
    def health(): return jsonify(status='ok',accounts_enabled=app.config['READY'])
    @app.get('/api/me')
    def me(): return jsonify(user=user_json(g.user) if g.user else None,csrf=g.session.csrf if g.session else None)
    @app.post('/api/auth/register')
    def register():
        data=request.get_json() or {};email=field(data,'email',254).lower()
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email): raise ValueError('Enter a valid email address.')
        role=data.get('role','student')
        if role not in ['student','employer']: return err('Select student or employer.')
        u=User(email=email,password=password(data),role=role,name=field(data,'name'))
        db.session.add(u);db.session.flush()
        try: mail(u,'verify')
        except Exception: db.session.rollback();return err('Email delivery is not ready. Please try again later.',503)
        audit('account.register',u.id);db.session.commit();return jsonify(message='Check your email to verify your account.'),201
    @app.post('/api/auth/login')
    def login():
        data=request.get_json() or {};email=str(data.get('email','')).lower().strip();p=str(data.get('password',''))
        u=db.session.execute(select(User).where(User.email==email).with_for_update()).scalar_one_or_none()
        if u and u.locked_until>time.time(): return err('Too many attempts. Try again in 15 minutes.',429)
        if not u or len(p.encode())>72 or not bcrypt.checkpw(p.encode(),u.password):
            if u:
                u.failures+=1
                if u.failures>=5: u.locked_until=time.time()+900
                db.session.commit()
            return err('Email or password is incorrect.',401)
        if not u.verified: return err('Verify your email before signing in.',403)
        if not u.active: return err('This account has been suspended.',403)
        u.failures=0;u.locked_until=0
        raw=secrets.token_urlsafe(32);s=Session(id=digest(raw),user_id=u.id,csrf=secrets.token_hex(32),expires=time.time()+1800);db.session.add(s)
        audit('account.login',u.id);db.session.commit();r=jsonify(user=user_json(u),csrf=s.csrf)
        r.set_cookie('ips_session',raw,secure=app.config['SECURE_COOKIES'],httponly=True,samesite='Lax',max_age=1800,path='/');return r
    @app.post('/api/auth/logout')
    @auth()
    def logout():
        audit('account.logout',g.user.id);db.session.delete(g.session);db.session.commit();r=jsonify(message='Signed out.');r.delete_cookie('ips_session',path='/');return r
    @app.post('/api/auth/forgot')
    def forgot():
        email=str((request.get_json() or {}).get('email','')).lower().strip();u=db.session.scalar(select(User).where(User.email==email))
        if u:
            try: mail(u,'reset');db.session.commit()
            except Exception: db.session.rollback();return err('Email delivery is not ready. Try again later.',503)
        return jsonify(message='If an account exists, a reset link has been sent.')
    @app.post('/api/auth/token')
    def token():
        data=request.get_json() or {};t=db.session.execute(select(Token).where(Token.id==digest(str(data.get('token','')))).with_for_update()).scalar_one_or_none()
        if not t or t.expires<time.time(): return err('This link is invalid or expired.')
        u=db.session.get(User,t.user_id)
        if t.purpose=='verify': u.verified=True
        else:
            u.password=password(data);u.failures=0;u.locked_until=0
            db.session.query(Session).filter_by(user_id=u.id).delete()
        audit('account.'+t.purpose,u.id);db.session.query(Token).filter_by(user_id=u.id,purpose=t.purpose).delete();db.session.commit();return jsonify(message='Account verified. You can sign in.' if t.purpose=='verify' else 'Password reset. You can sign in.')
    @app.route('/api/profile',methods=['GET','PATCH'])
    @auth()
    def profile():
        if request.method=='PATCH':
            data=request.get_json() or {};g.user.name=field(data,'name')
            keys=['university','department','matric','level','skills','bio','portfolio','company','website','location']
            obj={}
            for k in keys:
                v=data.get(k,'')
                if not isinstance(v,str) or len(v)>2000: raise ValueError('Profile fields must be text, maximum 2000 characters.')
                if k in ['portfolio','website'] and v and not v.startswith('https://'): raise ValueError('Website links must begin with https://.')
                obj[k]=v.strip()
            g.user.profile=obj;audit('profile.update',g.user.id);db.session.commit()
        return jsonify(user=user_json(g.user))
    @app.route('/api/cv',methods=['POST','GET'])
    @auth()
    def cv():
        target=request.args.get('student_id',g.user.id)
        if request.method=='POST':
            if g.user.role!='student': return err('Only students can upload a CV.',403)
            f=request.files.get('file');data=f.read() if f else b''
            if len(data)>2*1024*1024 or not data.startswith(b'%PDF-') or b'%%EOF' not in data[-1024:]: return err('Upload a valid PDF smaller than 2 MB.')
            d=db.session.get(Document,g.user.id)
            if not d: d=Document(user_id=g.user.id);db.session.add(d)
            d.data=data;audit('cv.upload',g.user.id);db.session.commit();return jsonify(message='CV uploaded securely.')
        if target!=g.user.id and g.user.role!='admin':
            allowed=db.session.scalar(select(Application.id).join(Listing).where(Application.student_id==target,Listing.employer_id==g.user.id))
            if not allowed: return err('You do not have access to this CV.',403)
        d=db.session.get(Document,target)
        if not d: return err('No CV uploaded.',404)
        return send_file(io.BytesIO(d.data),mimetype='application/pdf',as_attachment=True,download_name='student-cv.pdf')
    @app.route('/api/listings',methods=['GET','POST'])
    def listings():
        if request.method=='POST':
            if not g.user or g.user.role!='employer': return err('Employer account required.',403)
            if not g.user.company_verified: return err('Your company must be verified by an administrator first.',403)
            d=request.get_json() or {};values={k:field(d,k,5000 if k=='description' else 120) for k in ['title','location','department','mode','duration','description']}
            if values['mode'] not in ['On-site','Hybrid','Remote']: raise ValueError('Select a valid work mode.')
            deadline=date.fromisoformat(field(d,'deadline'));stipend=d.get('stipend',0)
            if deadline<date.today() or not isinstance(stipend,int) or not 0<=stipend<=10000000: raise ValueError('Enter a future deadline and a valid monthly stipend.')
            skills=d.get('skills',[])
            if not isinstance(skills,list) or len(skills)>20 or any(not isinstance(x,str) or len(x)>60 for x in skills): raise ValueError('Enter up to 20 skills.')
            l=Listing(employer_id=g.user.id,company=g.user.profile.get('company') or g.user.name,deadline=deadline,stipend=stipend,skills=skills,**values);db.session.add(l);db.session.flush();audit('listing.create',l.id);db.session.commit();return jsonify(listing=listing_json(l)),201
        q=select(Listing).where(Listing.status=='published',Listing.deadline>=date.today())
        if request.args.get('mine')=='1':
            if not g.user or g.user.role!='employer': return err('Employer account required.',403)
            q=select(Listing).where(Listing.employer_id==g.user.id)
        term=request.args.get('q','')[:100]
        if term: q=q.where(db.or_(Listing.title.icontains(term,autoescape=True),Listing.company.icontains(term,autoescape=True),Listing.location.icontains(term,autoescape=True)))
        for key in ['department','mode']:
            if request.args.get(key): q=q.where(getattr(Listing,key)==request.args[key])
        return jsonify(listings=[listing_json(l) for l in db.session.scalars(q.order_by(Listing.created.desc()).limit(200))])
    @app.patch('/api/listings/<id>')
    @auth('employer')
    def close_listing(id):
        l=db.session.get(Listing,id)
        if not l or l.employer_id!=g.user.id: return err('Listing not found.',404)
        l.status='closed';audit('listing.close',id);db.session.commit();return jsonify(message='Listing closed.')
    @app.route('/api/saved/<id>',methods=['POST','DELETE'])
    @auth('student')
    def save(id):
        l=db.session.get(Listing,id)
        if not l or l.status!='published': return err('Listing not found.',404)
        s=db.session.get(Saved,(g.user.id,id))
        if request.method=='POST' and not s: db.session.add(Saved(user_id=g.user.id,listing_id=id))
        if request.method=='DELETE' and s: db.session.delete(s)
        db.session.commit();return jsonify(message='Saved placements updated.')
    @app.get('/api/saved')
    @auth('student')
    def saved(): return jsonify(listings=[listing_json(l) for l in db.session.scalars(select(Listing).join(Saved).where(Saved.user_id==g.user.id))])
    @app.route('/api/applications',methods=['GET','POST'])
    @auth()
    def applications():
        if request.method=='POST':
            if g.user.role!='student': return err('Student account required.',403)
            d=request.get_json() or {};l=db.session.get(Listing,str(d.get('listing_id','')))
            if not l or l.status!='published' or l.deadline<date.today(): return err('This placement is no longer accepting applications.',409)
            if not g.user.profile.get('university') or not g.user.profile.get('department') or not db.session.get(Document,g.user.id): return err('Complete your university, department, and CV before applying.')
            a=Application(student_id=g.user.id,listing_id=l.id,cover=field(d,'cover',5000));db.session.add(a);db.session.flush();audit('application.submit',a.id);db.session.commit();return jsonify(message='Application submitted.',id=a.id),201
        q=select(Application)
        if g.user.role=='student': q=q.where(Application.student_id==g.user.id)
        elif g.user.role=='employer': q=q.join(Listing).where(Listing.employer_id==g.user.id)
        result=[]
        for a in db.session.scalars(q.order_by(Application.created.desc()).limit(200)):
            u=db.session.get(User,a.student_id);l=db.session.get(Listing,a.listing_id)
            result.append(dict(id=a.id,listing=listing_json(l),student=user_json(u) if g.user.role!='student' else None,cover=a.cover,status=a.status,note=a.note,created=a.created))
        return jsonify(applications=result)
    @app.patch('/api/applications/<id>')
    @auth()
    def update_application(id):
        a=db.session.execute(select(Application).where(Application.id==id).with_for_update()).scalar_one_or_none()
        if not a: return err('Application not found.',404)
        d=request.get_json() or {};status=d.get('status');l=db.session.get(Listing,a.listing_id)
        if g.user.role=='student':
            if a.student_id!=g.user.id: return err('Application not found.',404)
            if status!='withdrawn' or a.status not in ['submitted','shortlisted']: return err('This application cannot be withdrawn.',409)
        elif g.user.role=='employer':
            if l.employer_id!=g.user.id: return err('Application not found.',404)
            if a.status not in ['submitted','shortlisted'] or status not in ['shortlisted','accepted','rejected']: return err('Invalid status transition.',409)
        else: return err('Only the applicant or responsible employer can change application status.',403)
        note=d.get('note','')
        if not isinstance(note,str) or len(note)>2000: raise ValueError('Note must be at most 2000 characters.')
        a.status=status;a.note=note;audit('application.'+status,id);db.session.commit();return jsonify(message='Application updated.')
    @app.route('/api/tickets',methods=['GET','POST'])
    @auth()
    def tickets():
        if request.method=='POST':
            d=request.get_json() or {};t=Ticket(user_id=g.user.id,subject=field(d,'subject'),message=field(d,'message',5000));db.session.add(t);audit('support.create');db.session.commit()
        q=select(Ticket)
        if g.user.role!='admin': q=q.where(Ticket.user_id==g.user.id)
        return jsonify(tickets=[dict(id=t.id,subject=t.subject,message=t.message,status=t.status,reply=t.reply,created=t.created) for t in db.session.scalars(q.order_by(Ticket.created.desc()).limit(100))])
    @app.patch('/api/tickets/<id>')
    @auth('admin')
    def reply_ticket(id):
        t=db.session.get(Ticket,id)
        if not t: return err('Ticket not found.',404)
        t.reply=field(request.get_json() or {},'reply',5000);t.status='resolved';audit('support.resolve',id);db.session.commit();return jsonify(message='Reply sent.')
    @app.get('/api/admin')
    @auth('admin')
    def admin(): return jsonify(users=[user_json(u) for u in db.session.scalars(select(User).limit(200))],listings=[listing_json(l) for l in db.session.scalars(select(Listing).limit(200))],audit=[dict(id=a.id,action=a.action,actor=a.actor,target=a.target,created=a.created) for a in db.session.scalars(select(Audit).order_by(Audit.created.desc()).limit(100))])
    @app.patch('/api/admin/users/<id>')
    @auth('admin')
    def verify_company(id):
        u=db.session.get(User,id)
        if not u or u.role!='employer': return err('Employer not found.',404)
        value=(request.get_json() or {}).get('company_verified')
        if not isinstance(value,bool): raise ValueError('Verification must be true or false.')
        u.company_verified=value
        if not value:
            db.session.query(Listing).filter_by(employer_id=id,status='published').update({'status':'closed'})
        audit('company.verify' if value else 'company.revoke',id);db.session.commit();return jsonify(message='Company verification updated.')
    @app.patch('/api/admin/listings/<id>')
    @auth('admin')
    def moderate(id):
        l=db.session.get(Listing,id);status=(request.get_json() or {}).get('status')
        if not l: return err('Listing not found.',404)
        if status not in ['published','rejected','closed']: raise ValueError('Select a valid listing status.')
        if status=='published' and (not db.session.get(User,l.employer_id).company_verified or l.deadline<date.today()): return err('Verify the company and check the deadline before publishing.',409)
        l.status=status;audit('listing.'+status,id);db.session.commit();return jsonify(message='Listing moderation updated.')
    @app.cli.command('init-db')
    def init_db():
        if not app.config['READY']: raise RuntimeError('Set DATABASE_URL before initialization.')
        db.create_all()
        if db.engine.dialect.name=='postgresql':
            from sqlalchemy import text
            for table in db.metadata.tables:
                db.session.execute(text(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY'))
                db.session.execute(text(f'REVOKE ALL ON TABLE "{table}" FROM anon, authenticated'))
            db.session.execute(text("CREATE OR REPLACE FUNCTION public.ips_prevent_audit_change() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN RAISE EXCEPTION 'Audit records are append-only'; END; $$"))
            db.session.execute(text('DROP TRIGGER IF EXISTS ips_audit_immutable ON ips_audit'))
            db.session.execute(text('CREATE TRIGGER ips_audit_immutable BEFORE UPDATE OR DELETE ON ips_audit FOR EACH ROW EXECUTE FUNCTION public.ips_prevent_audit_change()'))
            db.session.commit()
        print('Internship schema initialized. Browser Data API access is denied; use the server API.')
    @app.cli.command('promote-admin')
    def promote_admin():
        email=os.environ['ADMIN_EMAIL'].lower();u=db.session.scalar(select(User).where(User.email==email))
        if not u or not u.verified: raise RuntimeError('Register and verify the administrator email first.')
        u.role='admin';db.session.add(Audit(actor=u.id,action='admin.promote',target=u.id));db.session.commit();print('Administrator promoted.')
    @app.get('/')
    def index(): return send_from_directory(app.static_folder,'index.html')
    return app
app=create_app()
