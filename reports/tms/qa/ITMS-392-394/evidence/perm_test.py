import json,hmac,hashlib,base64,time,socket,subprocess,yaml
cfg=yaml.safe_load(open("/home/vif/tuan-vu/tms_application/config.yaml"))
secret=cfg["jwt"]["secret"]; rpw=open("/tmp/.rp").read().strip()
def b64(d): return base64.urlsafe_b64encode(d).rstrip(b"=")
def jwt(uid):
    h=b64(json.dumps({"alg":"HS256","typ":"JWT"},separators=(",",":")).encode())
    p=b64(json.dumps({"tenantId":"01JX4Y4HPGJVS08S6YPJ995MZW","userId":uid,"exp":int(time.time())+1800},separators=(",",":")).encode())
    s=b64(hmac.new(secret.encode(),h+b"."+p,hashlib.sha256).digest())
    return (h+b"."+p+b"."+s).decode()
def redis(*args):
    s=socket.create_connection(("127.0.0.1",16380),timeout=5)
    def cmd(*a):
        out=f"*{len(a)}\r\n".encode()
        for x in a: out+=f"${len(str(x))}\r\n{x}\r\n".encode()
        s.sendall(out); return s.recv(4096)
    cmd("AUTH",rpw); cmd("SELECT","1")
    r=cmd(*args); s.close(); return r
def call(uid,perms,path,body):
    redis("SET",f"auth:token:{uid}",json.dumps({"userId":uid,"isAdmin":False,"permissions":perms}))
    r=subprocess.run(["curl","-s","-o","/tmp/perm-out.bin","-w","%{http_code}","-X","POST",
        f"http://127.0.0.1:8081{path}","-H",f"Authorization: Bearer {jwt(uid)}",
        "-H","Content-Type: application/json","-d",body],capture_output=True,text=True)
    return r.stdout
B='{"pagination":{"startDate":"2026-01-01T00:00:00Z","endDate":"2026-12-31T23:59:59Z","isAll":true},"debtType":"ALL"}'
for uid,perms in [("qa-bot-403",["cusdeb_hx"]),("qa-bot-200",["cusdeb_ex"])]:
    print(uid,perms,"transport=",call(uid,perms,"/api/v1/customer-debts/export",B),
          "detail=",call(uid,perms,"/api/v1/customer-debts/01M2CX0DH98T569KMJ4XCV71YE/export",B))
    redis("DEL",f"auth:token:{uid}")
print("cleanup done; out preview:", open("/tmp/perm-out.bin","rb").read()[:120])
