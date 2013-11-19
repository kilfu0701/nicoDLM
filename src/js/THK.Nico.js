/**
 * == Nico 專用script. ==
 *
 * Step: 1. Load extendsion's contents scripts. (THK.js, THK.Nico.js, exec.js)
 *       2. Initalize THK & THK.Nico, then add a download link into current nico page.
 *
 *
 * Flow: THK.Nico.addLink() -> THK.Nico.getVideoID() -> THK.Nico.getVideoInfo() -> THK.Nico._addLink()
 * 
 *       when DL-link click:  THK.Nico.getMoviePath() -> sendRequest to Background, and open a tab for downloading.
 *
 * @Dependency: THK.js
 *              jQuery.js
**/

//var riAPI_URL = "http://riapi.nicovideo.jp/api/watch/getvideoreview?video_id=nm16791686&offset=0"

/*
style 1:
  mode:list
  contentsId:nm16791686
  offset:0
  length:4
  reloadFlag:false
  user_session:user_session_595548_154404738271678611
  
style 2:
  mode:side
  watchId:nm16791686
  reloadFlag:false
  user_session:user_session_595548_154404738271678611
*/
//var niCMD_URL = "http://nicmd.nicovideo.jp/Api/index"; // POST !

var THK = THK || {};

THK.Nico = (function(){
    var _this;
    
    var time = 0;               // Current Timestamp when access API
    var movie_info = {};        // movie's all infomations
    var douga_type = '';
    var thumb_xml = '';
    var api_url = '';           // after put parameter into flapi
    var lang = 'default';
    var debug = true;
    var cached_html = '';
    
    return {
        /**
         * Initialize.
         *
         *   @param (optional): 
         *     object { lang:'default', debug:false }
        **/
        init : function() {
            var param = {};
            if(arguments.length==1 && typeof arguments[0]=="object") {
                param = arguments[0];
            }
            
            time = 0;  
            movie_info = {};  
            thumb_xml = '';
            api_url = ''; 
            lang = param.lang || 'default';
            debug = param.debug || true;
            
            this.video_id = '';
            this.flapi_params = {};
            this.thumb = {};
            this.video_url = '';
            
            _this = this;
        },
        
        FLAPI_URL : "http://flapi.nicovideo.jp/api/getflv",
        FLAPI_URL2 : "http://flapi.nicovideo.jp/api/getflv?v=%s&ts=%d&as3=1",
        THUMB_URL : "http://ext.nicovideo.jp/api/getthumbinfo/",
        
        video_id : '',          // Video ID.         Ex: sm123456
        flapi_params : {},      // parameters return from http://flapi.nicovideo.jp/api/getflv
        thumb : {},
        video_url : '',         // movie real path
        CommentLang : new Array(
            ['ja-JP' , 1],
            ['en'    , 2],
            ['zh-TW' , 4]
        ),
        
        /** 
         * 加入下載連結, 並處理"下載動畫"的onclick
        **/
        _addLink : function() {
            /* 從background 取得語言設定 */
            chrome.extension.sendRequest({greeting: "getLang", data:"" }, function(response) {
                lang = response.Lang;

                var video_title = movie_info.thumbTitle;
                var keyBtn = $("#player_bottom_textlink")[0];

                /* 
                * If user is in NICONICO.Q vesion, "#player_bottom_textlink" dose not exist. 
                * so... skip append download link.
                */
                if(keyBtn==undefined) {
                    /* here using another way, appending a node into right-click MenuList */
                    
                    
                } else {
                    /* 加入<nobr> */
                    var nobr = document.createElement("nobr"); 
                    var aTag = document.createElement("a");
                    aTag.id = "chr_nicoDLM_link";
                    aTag.style.margin = "3px";
                    aTag.style.padding = "2px";
                    aTag.style.border = "2px solid #90FF00";
                    aTag.href = "javascript:;";
                    aTag.innerHTML = _locale[lang]['dl_douga'];
                    nobr.appendChild(aTag);
         
                    keyBtn.appendChild( nobr );
                          
                    // add link click event.(加入onclick處理)
                    var link = $('#chr_nicoDLM_link')[0];
                    link.setAttribute('vid', _this.video_id);
                    link.onclick = function() {
                        if(_this.video_url=='') {
                            alert(_locale[lang]['error_get_url']);
                        } else {
                            movie_info["mvUrl"] = _this.video_url;
                            chrome.extension.sendRequest({greeting: "movieURL",
                                                          movieInfo: movie_info,
                                                          movieThumb: _this.thumb,
                                                          flapiInfo: _this.flapi_params }, function(response) {
                                //_D(response);
                            });
                        }
                    };
                }
            });
        },
        
        /**
         * 取得所有Flash variables.(重新request, 比較慢)
        **/
        getVideoInfo : function(tablink) {
            movie_info = {};
            var xhr = new XMLHttpRequest();
            /* 取得網頁原始碼 */
            xhr.open("GET", tablink, false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    var src = xhr.responseText;
                    cached_html = src;
                    
                    try{
                        /* 取得所有Flash variables */
                        var varis = new RegExp( "addVariable.+;", "g");
                        var data = src.match(varis);
                        for(var key in data){
                            var _data = data[key].split("\"");
                            movie_info[ ""+decodeURIComponent( _data[1] ) ] = decodeURIComponent( _data[3] ) ;
                        }
                    }
                    catch(e){
                        _D("Error :" + e);
                    }
                }
            }        
            xhr.send();
            /* end of 取得網頁原始碼 */
        },
        
        /**
         * 取得所有Flash variables.(直接從document取出, 比較快)
         *   (Warning: Niconico Q dont have these attr.)
        **/
        getVideoInfo2 : function() {
            movie_info = {};
            var src = document.getElementsByTagName('html')[0].innerHTML;
            try{
                /* 取得所有Flash variables */
                var varis = new RegExp( "addVariable.+;", "g");
                var data = src.match(varis);
                for(var key in data){
                    var _data = data[key].split("\"");
                    movie_info[ ""+decodeURIComponent( _data[1] ) ] = decodeURIComponent( _data[3] ) ;
                }
            }
            catch(e){
                _D("Error :" + e);
            }
        },
        
        getVideoInfo_GINZA : function(tablink) {
            movie_info = {};
            /* 取得網頁原始碼 */
            $.ajax({
                url: tablink,
                data: {},
                type: 'get',
                dataType: 'html',
                async: false,
                success: function(r) {
                    $.each($(r), function(k, v) {
                        var $v = $(v);
                        if($v.attr('id') == 'watchAPIDataContainer') {
                            var json_str = $v.text();
                            if(json_str != "") {
                                movie_info = JSON.parse(json_str);
                            }
                        }
                    });
                },
                error: function(r) {
                    //console.log(r);
                }
            });
        },
        
        /**
         * 取得影片的網址
        **/
        getMoviePath : function(vid) {
            time = new Date().getTime() / 1000;
            api_url = sprintf(_this.FLAPI_URL2, vid, time);
            
            var xhr2 = new XMLHttpRequest();
            /* 取得影片實際URL API */
            xhr2.onreadystatechange = function() {
                if (xhr2.readyState == 4) {
                    var src2 = xhr2.responseText,
                        _arr = src2.split("&");
                    for(var key in _arr){
                        var _data = _arr[key].split("=");
                        _this.flapi_params[ ""+decodeURIComponent(_data[0]) ] = decodeURIComponent(_data[1]);
                    }
                    
                    _this.video_url = _this.flapi_params["url"];
                }
            }
            xhr2.open("GET", api_url, false);
            xhr2.send();
        },
        
        /**
         * 給一個nico的網址，取得video ID.
        **/
        getVideoID : function(url) {
            var $id = '';
            var hasEnglishPrefix = url.match(/[a-z]{2}[0-9]+/i);
            var noEnglishPrefix = url.match(/[0-9]+/i);
            
            if(hasEnglishPrefix) {
                $id = hasEnglishPrefix;
                _this.douga_type = 'normal';
            } else if(noEnglishPrefix) {
                $id = noEnglishPrefix;
                _this.douga_type = 'community';
            }
            
            return $id;
        },
        
        getThumb : function(vid) {
            var _url = _this.THUMB_URL + vid;
            var xhr = new XMLHttpRequest();
            // 取得影片Thumbs
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    thumb_xml = xhr.responseText;
                    // parsing xml
                    if($!=undefined) {
                        try {
                            var xml_obj = $(thumb_xml);
                            _this.thumb["video_id"] = xml_obj.find("video_id").text();
                            _this.thumb["title"] = xml_obj.find("title").text();
                            _this.thumb["description"] = xml_obj.find("description").text();
                            _this.thumb["thumbnail_url"] = xml_obj.find("thumbnail_url").text();
                            _this.thumb["first_retrieve"] = xml_obj.find("first_retrieve").text();
                            _this.thumb["length"] = xml_obj.find("length").text();
                            _this.thumb["movie_type"] = xml_obj.find("movie_type").text();
                            _this.thumb["size_high"] = xml_obj.find("size_high").text();
                            _this.thumb["size_low"] = xml_obj.find("size_low").text();
                            _this.thumb["view_counter"] = xml_obj.find("view_counter").text();
                            _this.thumb["comment_num"] = xml_obj.find("comment_num").text();
                            _this.thumb["mylist_counter"] = xml_obj.find("mylist_counter").text();
                            _this.thumb["last_res_body"] = xml_obj.find("last_res_body").text();
                            _this.thumb["watch_url"] = xml_obj.find("watch_url").text();
                            _this.thumb["thumb_type"] = xml_obj.find("thumb_type").text();
                            _this.thumb["embeddable"] = xml_obj.find("embeddable").text();
                            _this.thumb["no_live_play"] = xml_obj.find("no_live_play").text();
                            _this.thumb["user_id"] = xml_obj.find("user_id").text();
                            
                            _this.thumb["tags"] = []
                            xml_obj.find("tag").each(function(i, v){
                                _this.thumb["tags"].push( $(v).text() );
                            });
                        } catch(e) {
                            _D(e);
                        }
                    } else {
                        _D("jquery not found");
                    }
                }
            }
            
            xhr.open("GET", _url, false);
            xhr.send();
        },
        
        evalExecute : function(url) {
            if(cached_html == "") {
                $.ajax({
                    url: url,
                    type: 'GET',
                    async: false,
                    success: function(data) {
                        cached_html = data;
                        _this._eval();
                    }
                });
            } else {
                _this._eval();
            }
        },
        
        _eval : function() {
            var dom = $(cached_html);

            dom.filter('script').each(function() {
                var txt = this.text || this.textContent || this.innerHTML || '';
                if(txt.substring(0, 18).match(/var Video/i)) {
                    $.globalEval(txt);
                }
            });
        },
        
        prepare : function(tablink) {
            _this.video_id = _this.getVideoID(tablink); /* parse video_id from a URL */
            _this.getVideoInfo_GINZA(tablink);
            
            if(Object.keys(movie_info).length === 0) {
                _this.getVideoInfo(tablink);             /* 分析影片的info */
            }

            if(_this.douga_type == "normal") {
                _this.getThumb(_this.video_id);             /* get thumb infomations */
            } else if(_this.douga_type == "community") {
                // parse parameters from 'movie_info'
                _this.evalExecute(tablink);
                
                if(typeof Video == "object") {
                    // for 原宿
                    _this.thumb['video_id'] = Video.v;
                    _this.thumb['title'] = Video.title || '';
                    _this.thumb['description'] = Video.description || '';
                    _this.thumb['thumbnail_url'] = Video.thumbnail || '';
                    _this.thumb['first_retrieve'] = Video.postedAt || '';
                    _this.thumb['length'] = Video.length || 0;
                    _this.thumb['size_high'] = 0;
                    _this.thumb['size_low'] = 0;
                    _this.thumb['view_counter'] = Video.viewCount || 0;
                    _this.thumb['comment_num'] = Video.commentCount || 0;
                    _this.thumb['mylist_counter'] = Video.mylistCount || 0;
                    _this.thumb['watch_url'] = tablink;
                    _this.thumb['movie_type'] = movie_info['movie_type'];
                    _this.thumb['user_id'] = movie_info['videoUserId'] || 0;
                } else {
                    // for GINZA
                    _this.thumb['video_id'] = movie_info.videoDetail['v'] || '';
                    _this.thumb['title'] = movie_info.videoDetail['title'] || '';
                    _this.thumb['description'] = movie_info.videoDetail['description'] || '';
                    _this.thumb['thumbnail_url'] = movie_info.videoDetail['thumbnail'] || '';
                    _this.thumb['first_retrieve'] = movie_info.videoDetail['postedAt'] || '';;
                    _this.thumb['length'] = 0;
                    _this.thumb['size_high'] = 0;
                    _this.thumb['size_low'] = 0;
                    _this.thumb['view_counter'] = movie_info.videoDetail['viewCount'] || 0;
                    _this.thumb['comment_num'] = movie_info.videoDetail['commentCount'] || 0;
                    _this.thumb['mylist_counter'] = movie_info.videoDetail['mylistCount'] || 0;
                    _this.thumb['watch_url'] = tablink;
                    _this.thumb['movie_type'] = movie_info.flashvars['movie_type'];
                    _this.thumb['user_id'] = movie_info.flashvars['community_id'] || 0;
                }
            }
            
            _this.getMoviePath(_this.video_id);         // 取得video url
        },
        
        /**
         * 加入"下載動畫"的連結到html裡
        **/
        addLink : function(tablink) {
            _this.prepare(tablink);
            _this._addLink(); /* 加入下載連結 */
        },

        onMenuListClick : function(tablink) {
            _this.prepare(tablink);
        }
        
    }
    
})();