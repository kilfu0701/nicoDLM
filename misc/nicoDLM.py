import os, sys
import urllib, urllib2, cookielib
from datetime import *
import time

"""
    Get nico video's link.
    Save cookie in a file, for repeating request API server.
"""
class Nico:
    def __init__(self, settings={}, cookieFile='nico_cookies.lwp'):
        self.cj = cookielib.LWPCookieJar()   # cookie
        self.sm = 0                          # video ID
        self.ck_file = cookieFile            # cookie file
        self.header =  {'User-agent' : 'Mozilla/4.0 (compatible; MSIE 5.5; Windows NT)'} # header
        if settings:
            self.login_data = settings       # account / pw
        else:
            self.login_data = {
                'mail' : 'your_account',
                'password' : 'your_password',
            }

        self.flapi_info = {}
        self.post_url = 'https://secure.nicovideo.jp/secure/login?site=niconico'  # login page url
        self.api_url = 'http://flapi.nicovideo.jp/api/getflv?v={0}'               # api url
        self.thumb_url = 'http://ext.nicovideo.jp/api/getthumbinfo/{0}'           # thumb url
        self.page_url = ''                                                        # video page url
        self.video_url = ''                                                       # video real link
        self.opener = urllib2.build_opener(urllib2.HTTPCookieProcessor(self.cj))
        self.domain = '.autocookie.tt.vv'                                         # define a doamin
        self.cookie_expires = 60*60*24*30  # save cookie in a month

        urllib2.install_opener(self.opener)

        ## if cookie file exist, load it
        if os.path.isfile(self.ck_file):
            self.cj.load(self.ck_file)
            if self.validate()==False:  ## after load cookie file, validate it.
                self.get_cookie()       ## invalid, get a new cookie.
        else:
            ## try to get a new cookie
            self.get_cookie()

    """
        if cookie files exists, validate cookies first!

        @return  : bool
    """
    def validate(self):
        try:
            _user = self.get_value('user', self.domain)
            if len(_user)==1 and _user[0]==self.login_data['mail']:
                return True
            else:
                ## custom cookie value not found / account not match, maybe changed.
                return False

        except Exception, e:
            print e
            return False          

    """
        Dump cookie's data.
    """
    def pr_cookie(self):
        for index, cookie in enumerate(self.cj):
            print index, '  :  ', cookie
            print '%s --> %s' % (cookie.name, cookie.value)

        for d in self.cj._cookies:
            print d

    """
        Get a cookie from nico.
    """
    def get_cookie(self):
        self.cj.clear()
        post = urllib.urlencode(self.login_data)
        req = urllib2.Request(self.post_url, post, self.header)
        resp = urllib2.urlopen(req)
        if resp.headers['x-niconico-authflag']=='1':
            print '== get cookie from NICO success =='
            self.add_custom_cookie("user", self.login_data['mail'])   # add a custom cookie
            self.cj.save(self.ck_file)

        elif resp.headers['x-niconico-authflag']=='0':
            print '== Error: Failed getting cookie. Check ID/PW is correct =='
            self.cj.save(self.ck_file)
            sys.exit()
        else:
            print '== Error: cookie format error. =='
            sys.exit()

    """
        get value from cookies.

        @name   : index
        @domain : if domain not set, it will find all cookies without domain

        @return : a list
    """
    def get_value(self, name, domain=''):
        ret = []
        a = 0
        if domain=='':
            for c in self.cj:
                if c.name == name:
                    ret.append(c.value)
        else:
            if len(self.cj._cookies[domain]).__class__ == a.__class__:
                if self.cj._cookies[domain]["/"][name].name == name:
                    ret.append(self.cj._cookies[domain]["/"][name].value)
            else:
                pass

        return ret

    """
        add a custom datas into cookie, for validate user account

        @name  : 
        @value : 
    """
    def add_custom_cookie(self, name, value):
        _expires = int(time.time()) + self.cookie_expires

        self.cj.set_cookie(
            cookielib.Cookie(
                version=0,
                name=name,
                value=value,
                port=None,
                port_specified=False,
                domain=self.domain,
                domain_specified=True,
                domain_initial_dot=False,
                path="/",
                path_specified=True,
                secure=False,
                expires=_expires,
                discard=False,
                comment=None,
                comment_url=None,
                rest={}
            )
        )

    """
        Start request / find the nico video original link.

        @param : post data
        @url   : the nico video's URL
    """
    def req(self, url='', param={}):
        try:
            self.sm = url.rsplit('/', 1)[1]   # get ID
            return self.reqSM(self.sm, param)

        except Exception, e:
            print '== Error: cannot parse video ID in link =='
            sys.exit()

    """
        If already have video ID, than get video link by ID.

        @param : post data
        @sm    : video ID
        @retry : if failed, retry again.
    """
    def reqSM(self, sm='0', param={}, retry=True):
        try:
            self.sm = sm
            self.page_url = "http://www.nicovideo.jp/watch/{0}".format(self.sm)
            
            url = self.api_url.format(self.sm)
            post = urllib.urlencode(param)
            resp = self.opener.open(url, post)
            data = resp.read()
            for i in data.split('&'):
                x = i.split('=')
                self.flapi_info[x[0]] = x[1]

            if 'url' in self.flapi_info:
                self.video_url = self.flapi_info['url']
            else:
                if retry:
                    self.get_cookie()                                   # get a newer cookie
                    self.video_url = self.reqSM(self.sm, param, False)  # req once again
                else:
                    self.video_url = ''

            self.video_url = urllib2.unquote(self.video_url.encode("utf8"))
            return self.video_url

        except Exception, e:
            print '== Error: cannot reverse the video url =='

    """
        Download video. 
            Before doing download, make sure "req()" or "reqSM()" first! 
    """
    def DLVideo(self, url=''):
        if url=='':
            print "Video URL is empty!"
            return False
        
        if self.page_url=='':
            print "Video page link not set. Please run req()/reqSM() first."
            return False
        
        try:
            from BeautifulSoup import BeautifulSoup as Soup
        except:
            print "'BeautifulSoup' libary not found."
            return False
        
        # get thumb info
        resp = self.opener.open(self.thumb_url.format(self.sm))
        data = resp.read()
        soup = Soup(data)
        file_ext = soup.find('movie_type').text
        
        
        # open original page first
        self.opener.open(self.page_url)

        file_name = "{0}.{1}".format(self.sm, file_ext)
        u = urllib2.urlopen(url)
        f = open(file_name, 'wb')
        meta = u.info()
        file_size = int(meta.getheaders("Content-Length")[0])
        print("Downloading: {0} Bytes: {1}".format(url, file_size))

        file_size_dl = 0
        block_sz = 1024
        while True:
            buffer = u.read(block_sz)
            if not buffer:
                break

            file_size_dl += len(buffer)
            f.write(buffer)
            p = float(file_size_dl) / file_size
            status = r"{0}  [{1:.2%}]".format(file_size_dl, p)
            status = status + chr(8)*(len(status))
            sys.stdout.write(status)

        f.close()
        print "Complete!  -->  {0}".format(file_name)
        return True
        
"""
    usage:  
        python nicoDLM.py sm123456 sm345678    .....
"""
if __name__ == "__main__":
    cookie_path = 'nico_cookies.lwp'  # cookie's location
    myset = {
        'mail' : '',
        'password': ''
    }
    
    #nico = Nico(cookieFile=cookie_path, settings=myset)
    #print nico.req('http://www.nicovideo.jp/watch/sm19186604')
    #print nico.reqSM('sm19154040')
    #nico.DLVideo( nico.reqSM('sm18684948') )
    
    num = len(sys.argv)
    if num==1:
        print "no input for download"
    else:
        nico = Nico(cookieFile=cookie_path, settings=myset)
        for i in xrange(1, num):
            nico.DLVideo( nico.reqSM(sys.argv[i]) )
    
    