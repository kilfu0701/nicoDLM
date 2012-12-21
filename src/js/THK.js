/**
 * 
 * Step: 1. Load extendsion's contents scripts. (THK.js & exec.js)
 *       2. Initalize THK and add a download link into current nico page.
 *
 *
 * Flow: THK.addLink() -> THK.getVideoID() -> THK.getVideoInfo() -> THK._addLink()
 * 
 *       when DL-link click:  THK.getMoviePath() -> sendRequest to Background, and open a tab for downloading.
 */
var FLAPI_URL = "http://flapi.nicovideo.jp/api/getflv"; // get movie api URL
var FLAPI_URL2 = "http://flapi.nicovideo.jp/api/getflv?v=%s&ts=%d&as3=1"; 
var THUMB_URL = "http://ext.nicovideo.jp/api/getthumbinfo/";

(function(window, undefined) {
    var document = window.document,
        navigator = window.navigator,
        location = window.location;
        
    var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
    this.Class = function(){};

    Class.extend = function(prop) {
        var _super = this.prototype;
    
        initializing = true;
        var prototype = new this();
        initializing = false;
    
        for (var name in prop) {
            prototype[name] = typeof prop[name] == "function" && 
            typeof _super[name] == "function" && fnTest.test(prop[name]) ?
            (function(name, fn){
                return function() {
                    var tmp = this._super;
                    this._super = _super[name];
                    var ret = fn.apply(this, arguments);        
                    this._super = tmp;
                    return ret;
                };
            })(name, prop[name]) : prop[name];
        }
    
        function Class() {
            if ( !initializing && this.init )
            this.init.apply(this, arguments);
        }
    
        Class.prototype = prototype;
        Class.prototype.constructor = Class;
        Class.extend = arguments.callee;
    
        return Class;
    };

    
    /**
     * Build THK Class
     */
    if(typeof THK=='undefined'){
        var THK = Class.extend({});
        THK.video_id = '';          // Video ID.         Ex: sm123456
        THK.time = 0;               // Current Timestamp when access API
        THK.movie_info = {};        // movie's all infomations
        THK.flapi_params = {};      // parameters return from http://flapi.nicovideo.jp/api/getflv
        THK.thumb = {};
        THK.thumb_xml = '';
        THK.video_url = '';         // movie real path
        THK.api_url = '';           // after put parameter into flapi
        THK.lang = 'default';
        THK.debug = true;
        
        THK.init = function() {
        
        }
                
        /** 
         * 加入下載連結, 並處理"下載動畫"的onclick
         */
        THK._addLink = function() {
            // 取得語言設定
            chrome.extension.sendRequest({greeting: "getLang", data:"" }, function(response) {
                THK.lang = response.farewell["lang"];

                var video_title = THK.movie_info.thumbTitle;
                var keyBtn = $("#player_bottom_textlink")[0];

                // 加入<nobr>
                var nobr = document.createElement("nobr"); 
                var aTag = document.createElement("a");
                aTag.id = "chr_nicoDLM_link";
                aTag.style.margin = "3px";
                aTag.style.padding = "2px";
                aTag.style.border = "2px solid #90FF00";
                aTag.href = "javascript:;";
                //console.log(THK.lang);
                aTag.innerHTML = _locale[THK.lang]['dl_douga'];
                nobr.appendChild(aTag);
     
                keyBtn.appendChild( nobr );
                      
                // add link click event.(加入onclick處理)
                var link = $('#chr_nicoDLM_link')[0];
                link.setAttribute('vid', THK.video_id);
                link.onclick = function() {
                    THK.video_url = '';
                    // 取得video url
                    THK.getMoviePath(THK.video_id);
                    
                    if(THK.video_url=='') {
                        alert(_locale[THK.lang]['error_get_url']);
                    } else {
                        THK.movie_info["mvUrl"] = THK.video_url;
                        chrome.extension.sendRequest({greeting: "movieURL", movieInfo: THK.movie_info, movieThumb: THK.thumb, flapiInfo: THK.flapi_params}, function(response) {
                            _resp = response;
                            //console.log("_resp=%o", _resp);
                        });
                    }
                }
            });
        }

        /**
         * 取得所有Flash variables.(重新request, 比較慢)
         */
        THK.getVideoInfo = function(tablink) {
            THK.movie_info = {};
            var xhr = new XMLHttpRequest();
            /* 取得網頁原始碼 */
            xhr.open("GET", tablink, false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    var src = xhr.responseText;
                    try{
                        /* 取得所有Flash variables */
                        var varis = new RegExp( "addVariable.+;", "g");
                        var data = src.match(varis);
                        for(var key in data){
                            var _data = data[key].split("\"");
                            THK.movie_info[ ""+decodeURIComponent( _data[1] ) ] = decodeURIComponent( _data[3] ) ;
                        }
                    }
                    catch(e){
                        console.log("Error :" + e);
                    }
                }
            }        
            xhr.send();
            /* end of 取得網頁原始碼 */
        }
        
        /**
         * 取得所有Flash variables.(直接從document取出, 比較快)
         */
        THK.getVideoInfo2 = function() {
            THK.movie_info = {};
            var src = document.getElementsByTagName('html')[0].innerHTML;
            try{
                /* 取得所有Flash variables */
                var varis = new RegExp( "addVariable.+;", "g");
                var data = src.match(varis);
                for(var key in data){
                    var _data = data[key].split("\"");
                    THK.movie_info[ ""+decodeURIComponent( _data[1] ) ] = decodeURIComponent( _data[3] ) ;
                }
            }
            catch(e){
                console.log("Error :" + e);
            }
        }
        
        /**
         * 取得影片的網址
         */
        THK.getMoviePath = function(vid) {
            THK.time = new Date().getTime() / 1000;
            THK.api_url = sprintf(FLAPI_URL2, vid, THK.time);
            
            var xhr2 = new XMLHttpRequest();
            /* 取得影片實際URL API */
            xhr2.onreadystatechange = function() {
                if (xhr2.readyState == 4) {
                    var src2 = xhr2.responseText,
                        _arr = src2.split("&");
                        
                    for(var key in _arr){
                        var _data = _arr[key].split("=");
                        THK.flapi_params[ ""+decodeURIComponent(_data[0]) ] = decodeURIComponent(_data[1]);
                    }
                    
                    THK.video_url = THK.flapi_params["url"];
                }
            }
            xhr2.open("GET", THK.api_url, false);
            xhr2.send();
        }
        
        /**
         * 給一個nico的網址，取得video ID.
         */
        THK.getVideoID = function(url) {
            return url.match(/[a-z]{2}[0-9]+|\/[0-9]+/i)[0];
        }
        
        THK.getThumb = function(vid) {
            var _url = THUMB_URL + vid;
            var xhr = new XMLHttpRequest();
            // 取得影片Thumbs
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    THK.thumb_xml = xhr.responseText;
                    // parsing xml
                    if($!=undefined) {
                        try {
                            THK.thumb["video_id"] = $(THK.thumb_xml).find("video_id").text();
                            THK.thumb["title"] = $(THK.thumb_xml).find("title").text();
                            THK.thumb["description"] = $(THK.thumb_xml).find("description").text();
                            THK.thumb["thumbnail_url"] = $(THK.thumb_xml).find("thumbnail_url").text();
                            THK.thumb["first_retrieve"] = $(THK.thumb_xml).find("first_retrieve").text();
                            THK.thumb["length"] = $(THK.thumb_xml).find("length").text();
                            THK.thumb["movie_type"] = $(THK.thumb_xml).find("movie_type").text();
                            THK.thumb["size_high"] = $(THK.thumb_xml).find("size_high").text();
                            THK.thumb["size_low"] = $(THK.thumb_xml).find("size_low").text();
                            THK.thumb["view_counter"] = $(THK.thumb_xml).find("view_counter").text();
                            THK.thumb["comment_num"] = $(THK.thumb_xml).find("comment_num").text();
                            THK.thumb["mylist_counter"] = $(THK.thumb_xml).find("mylist_counter").text();
                            THK.thumb["last_res_body"] = $(THK.thumb_xml).find("last_res_body").text();
                            THK.thumb["watch_url"] = $(THK.thumb_xml).find("watch_url").text();
                            THK.thumb["thumb_type"] = $(THK.thumb_xml).find("thumb_type").text();
                            THK.thumb["embeddable"] = $(THK.thumb_xml).find("embeddable").text();
                            THK.thumb["no_live_play"] = $(THK.thumb_xml).find("no_live_play").text();
                            THK.thumb["user_id"] = $(THK.thumb_xml).find("user_id").text();
                            
                            THK.thumb["tags"] = []
                            $(THK.thumb_xml).find("tag").each(function(i, v){
                                v = $(v);
                                THK.thumb["tags"].push( v.text() );
                            });
                            
                        } catch(e) {
                            console.warn(e);
                        }
                    } else {
                        console.warn("jquery not found");
                    }
                }
            }
            xhr.open("GET", _url, false);
            xhr.send();
        }
        
        /**
         * 加入"下載動畫"的連結到html裡
         */
        THK.addLink = function(tablink) {
            THK.video_id = THK.getVideoID(tablink);

            THK.getVideoInfo2(tablink); /* 分析影片的info */
            THK.getThumb(THK.video_id);
            THK._addLink(); /* 加入下載連結 */
        }
        
        /**
         * Get elements from document. (取得document的element)
         */
        THK.get = function(select, ref, depth) {
            try {
                ( ref==undefined ) ? ref = document : ref;
                ( depth==undefined ) ? depth = 0 : depth;
                
                var multi = false;
                var _arr = select.split(" ");
                var _select = _arr[depth];
                var fc = _select.charAt(0);
                var tv, pat=[], ck, attr, ret=[];
                
                if(ref.length>1)
                    multi = true;
                
                /* check attr ? */
                ck = checkHaveAttr(_select);
                if( ck != undefined ) {
                    tv = ck[1];
                    attr = ck[2].split('=');
                } else {
                    if( fc=='.' || fc=='#' ) tv = _select.substring(1);
                    else tv = _select;
                }
                
                switch(fc) {
                    case '.': // class
                        if(multi) {
                            for(var i=0; i<ref.length; i++) {
                                pat.push( ref[i].getElementsByClassName(tv) );
                            }
                        } else {
                            pat = ref.getElementsByClassName(tv);
                        }
                    break;

                    case '#': // id
                        if(multi) {
                            for(var i=0; i<ref.length; i++) {
                                pat.push( ref[i].getElementById(tv) );
                            }
                        } else {
                            pat.push( ref.getElementById(tv) );
                        }
                    break;
                    
                    default: // tag name
                        
                        if(multi) {
                            for(var i=0; i<ref.length; i++) {
                                pat.push( ref[i].getElementsByTagName(tv) );
                            }
                        } else {
                            pat = ref.getElementsByTagName(tv);
                        }
                    break;
                }
                
                if( attr!=undefined && attr.length==2 ) {
                    for(var i=0; i<pat.length; i++) {
                        if( pat[i].getAttribute( attr[0] ) == attr[1] ) {
                            ret.push( pat[i] );
                        }
                    }
                } else {
                    ret = pat;
                }
    
                ( fc=='#' ) ? ret=ret[0] : ret;
                
                if( _arr.length > ++depth ) {
                    ret = THK.get(select, ret, depth);
                }
                return ret;
                
            } catch(e) {
                console.log(e);
                return ret; // Error Occur! 
            }
        }
        
    } // end of THK

    /* Check if set Attr ? */
    function checkHaveAttr(str) {
        var n = str.match(/^[\.|\#]?(\w+)\[(.+=.+)\]/);
        if( n!=null && n.length==3 ) {
            return n;
        } else {
            return ;
        }
    }
    
    /**
     * passing some data to background script for doing some things.
     * @params => {greeting: "movieURL", data: "strings" }
     */
    function pass2bg(params) {
        if(params==undefined) return ;
        
        chrome.extension.sendRequest(params, function(response) {
            //console.log(response);
        });
    }
    
    window.THK = THK;
    if ( typeof define === "function" ) {
        define( "THK", [], function () { 
                return THK; 
            } 
        );
    }
    
})( window );
