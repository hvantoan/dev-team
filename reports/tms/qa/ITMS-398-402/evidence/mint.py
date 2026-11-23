import sys, os, time, json, hmac, hashlib, base64
# minimal HS256 JWT mint, no deps
def b64(b): return base64.urlsafe_b64encode(b).rstrip(b'=')
secret = os.environ['QA_JWT_SECRET'].encode()
tenant, user = os.environ['QA_TENANT_ID'], os.environ['QA_USER_ID']
hdr = b64(json.dumps({"alg":"HS256","typ":"JWT"}).encode())
now = int(time.time())
pay = b64(json.dumps({"tenantId":tenant,"userId":user,"iss":"tms","iat":now,"exp":now+3600}).encode())
sig = b64(hmac.new(secret, hdr+b'.'+pay, hashlib.sha256).digest())
print((hdr+b'.'+pay+b'.'+sig).decode())
