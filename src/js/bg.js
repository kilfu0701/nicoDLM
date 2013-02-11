/**
 * Background script. (背景處理)
**/

/* init DB */
THK.DB.init();

/* drop tables and re-init. */
//THK.DB.deleteAllData(function(res){
//    console.log(res);
//});

var fs2;                      // plugin object.
var mvurls = "";              // movie's URL.
var plugin_msg = new Array(); // all message send from plugin.
var nicoAppDir;

window.onload = function() {
    loadPlugin();
    Initialize();
    runDLQueue();
}

/**
 * enable functions:
 *    dl (url, filename, ext, path, video_id, overwrite)     -- video download function
 *
 *    dlComment (url, filename, ext, path, thread_id, lang)  -- comment download
 *
 *    getValueForURL (url)                                   -- get cookie
 *
 *    saveTextFile (fullpath, text)                          -- save a text file
 *
 *    
**/
function testPlugin() {
    /* multi-thread test */
    //fs2.dl("ftp://106.187.91.19/download/%E8%80%B3%E6%A9%9F%E5%B0%91%E5%A5%B3%E7%95%AB%E5%A0%B1.rar", "1", ".rar", "C:/", "id1");
    //fs2.dl("ftp://106.187.91.19/download/%E8%80%B3%E6%A9%9F%E5%B0%91%E5%A5%B3%E7%95%AB%E5%A0%B1.rar", "2", ".rar", "C:/", "id2");
    //fs2.dl("ftp://106.187.91.19/download/%E8%80%B3%E6%A9%9F%E5%B0%91%E5%A5%B3%E7%95%AB%E5%A0%B1.rar", "3", ".rar", "C:/", "id3");
    //fs2.dl("ftp://106.187.91.19/download/%E8%80%B3%E6%A9%9F%E5%B0%91%E5%A5%B3%E7%95%AB%E5%A0%B1.rar", "4", ".rar", "C:/", "id4");
    
    /* special filename test */
    fs2.dl("ftp://106.187.91.19/download/%E8%80%B3%E6%A9%9F%E5%B0%91%E5%A5%B3%E7%95%AB%E5%A0%B1.rar", "4<>:\"/\\|?*aa", ".rar", "C:/", "id4");
    
    /* comment download test */
    //fs2.dlComment("http://msg.nicovideo.jp/30/api/", "1", ".xml", "C:/", "1309980706");
    
    /* get File size */
    //console.log(fs2.getFileSize("D://Packt.Apache.Solr.3.1.Cookbook.Jul.2011.epub"));
   
    /* GET COOKIE */
    //fs2.getValueForURL("http://www.nicovideo.jp/video_top");
}

/**
 * every 30min to check & reset auto_inc.
**/
function resetAutoInc() {
    THK.DB.resetAutoInc();
}

/**
 * extension startup init...
 * (初始化)
**/
function Initialize() {
    nicoAppDir = fs2.getAppDir() || G_DL_DIR;

    // 語言環境設定
    if(localStorage["lang"]==undefined) {
        localStorage["lang"] = "default";
    }
    
    // 檔案儲存位置
    if(localStorage["download_dir"]==undefined) {
        localStorage["download_dir"] = nicoAppDir;
    }
    
    // video檔案存檔命名
    if(localStorage["file_format"]==undefined) {
        localStorage["file_format"] = "[%ID%] %TITLE%";
    }
    
    // comment檔案存檔命名
    if(localStorage["comment_file_format"]==undefined) {
        localStorage["comment_file_format"] = "[%ID%] %TITLE% [%COMMENT%]";
    }
    
    // 檔案存在時的動作,  0=另存  1=覆蓋(overwrite)
    if(localStorage["saveFileAction"]==undefined) {
        localStorage["saveFileAction"] = 0;
    }
    
    /* 字幕檔下載設定(1~7)
         1 = JP
         2 = EN
         3 = JP+EN
         4 = TW
         5 = JP+TW
         6 = EN+TW
         7 = ALL
    */
    if(localStorage["comments_for_download"]==undefined) {
        localStorage["comments_for_download"] = 1;
    }
    
    // download mode
    if(localStorage["download_mode"]==undefined) {
        localStorage["download_mode"] = 1;
    }
    
    // update DB 'dlist' all status = 2(cancel), if status = 0.(add new)
    THK.DB.initDlistAllStatus();
    THK.DB.initPluginMsg();
    window.setTimeout( resetAutoInc, 1000*60*30);
}

/**
 * Load plugin into page. 
**/
function loadPlugin() {
    this.fs = document.createElement("embed");
    this.fs.style.position = "absolute";
    this.fs.style.left = "-9999px";
    this.fs.id = "fs2";
    this.fs.setAttribute("type", "application/x-thk-nico-dl");
    document.documentElement.appendChild(this.fs);

    fs2 = document.getElementById("fs2"); 
}

/**
 * from plugin call back, and write data into 'localStorage'
**/
function plugin_callback() {
    if(arguments.length > 0) {
        var _action = arguments[0];
        
        if(_action=="DLProgress") {
            THK.DB.insertIntoPluginMsg( {action: _action, progress: arguments[1], vid: arguments[2], msg:""} );
        } else if (_action=="addNewDL") {
            var dir_path = $.trim(arguments[2]);
            THK.DB.insertIntoPluginMsg( {action: _action, progress: 0, vid: arguments[1], msg:dir_path} );
            THK.DB.updateDlistDirPathByVID(arguments[1], dir_path);
        } else if (_action=="DLComplete") {
            // if recive a complete msg, delete all 'DLProgress' data & update 'dlist' status to 1.
            THK.DB.insertIntoPluginMsg( {action: _action, progress: 100, vid: arguments[1], msg:arguments[2]} );
            THK.DB.clearAfterComplete(arguments[1]);
            THK.DB.updateDlistStatusByVID(arguments[1], 1);
        } else if (_action=="DLForbidden") {
            THK.DB.insertIntoPluginMsg( {action: _action, progress: 0, vid: arguments[1], msg:arguments[2]} );
            THK.DB.updateDlistStatusByVID(arguments[1], 403);
        } else if (_action=="DLNotFound") {
            THK.DB.insertIntoPluginMsg( {action: _action, progress: 0, vid: arguments[1], msg:arguments[2]} );
            THK.DB.updateDlistStatusByVID(arguments[1], 404);
        } else if (_action=="DLOtherError") {
            THK.DB.insertIntoPluginMsg( {action: _action, progress: arguments[3], vid: arguments[1], msg:arguments[2]} );
            THK.DB.updateDlistStatusByVID(arguments[1], 2);
        } else if (_action=="DLError") {
            THK.DB.insertIntoPluginMsg( {action: _action, progress: 0, vid: arguments[1], msg:arguments[2]} );
            THK.DB.updateDlistStatusByVID(arguments[1], 2);
        } else if (_action=="HQWaiting") {
            THK.DB.insertIntoPluginMsg( {action: _action, progress: 0, vid: arguments[1], msg:arguments[2]} );
            //THK.DB.updateDlistStatusByVID(arguments[1], 4);
        }
        
    }
}

/**
 * 讀取download queue & start download.
**/
var queueID = 0;
function runDLQueue() {
    THK.DB.getCount("dl_queue", function(ct){
        if(queueID>=ct) {
            queueID = 0;
        }
        
        THK.DB.findByCond({
            table: 'dl_queue',
            limit: 1,
            offset: queueID
        }, function(ret){
            if(ret.length==1) {
                prepareDownload({
                    url: NICO_URL + ret[0].video_id, 
                    fromQueue : true
                });
            }
            queueID++;
        });
        
    });
    

    
    window.setTimeout( runDLQueue, 60*1000); // re-check per 1 minute.
}


/**
 * export/return localStorage to other script 
**/
function getOptionSetting() {
    return localStorage;
}

/**
 * get current language setting.
 * (取得 目前語言設定)
**/
function getLang() {
    return localStorage["lang"] || G_DEFAULT_LANG;
}

/**
 *  get Request from content scripts
**/
chrome.extension.onRequest.addListener(   
    function(request, sender, sendResponse) {   
        //console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
                
        if (request.greeting == "movieURL") {
            mvurls = request.movieInfo['mvUrl'];
            
            if(mvurls==undefined) {
                sendResponse({farewell: "failed"});
            } else {
                startDownload(mvurls, request.flapiInfo, request.movieThumb);
                sendResponse({farewell: "ok"});
            }
        } else if(request.greeting == "getLang") {
            var _lang = getLang();
            sendResponse({Lang: _lang});
        } else {  
            sendResponse({}); // snub them.
        }
    }
); 

function startDownload(movieURL, flapiInfo, movieThumb, fromQueue) {
    THK.DB.findByVideoID(movieThumb.video_id, function(abr) {
        if(abr==undefined || (abr.status==4 || abr.status!=0) ) {
            /* check video quality is high or low */
            if(movieURL.substr(-3)=="low") {
                movieThumb.quality = "low";
            } else {
                movieThumb.quality = "high";
            }
            
            /* insert into WebSQL */
            THK.DB.addIntoDLM(movieThumb, function(res){
                //console.log(res);
            });

            /* 判斷user設定的下載模式。如果是High Quality Only而且遇到經濟模式的情況，變更status=4. */
            if(movieThumb.quality=="low" && localStorage["download_mode"]==1) {
                THK.DB.updateDlistStatusByVID(movieThumb.video_id, 4);
                THK.DB.addIntoDLQueue(movieThumb.video_id);
                /* send a msg */
                plugin_callback('HQWaiting', movieThumb.video_id, 'Wait HQ');
                plugin_callback('addNewDL', movieThumb.video_id);
                
                if(fromQueue==undefined) {
                    alert(_locale[getLang()]['addIntoDLSuccess']);
                }
            } else {
                if(fromQueue!=undefined) {
                    THK.DB.deleteFromDLQueue(movieThumb.video_id);
                }

                /* load page once at first.(not work?) */
                //fs2.getValueForURL(movieThumb['watch_url']);
                
                /* filename for save. */
                var _fname = generateDownloadFileFormat(movieThumb);
                var dir_path = localStorage["download_dir"] || G_DL_DIR;

                /* start download by plugin. */
                var _ext = movieThumb.movie_type || "thk";
                var DLcode = fs2.dl(movieURL, _fname, "."+_ext, dir_path, movieThumb.video_id, ""+localStorage["saveFileAction"]);
                
                /* download commnet 
                        1 = JP
                        2 = EN
                        3 = JP+EN
                        4 = TW
                        5 = JP+TW
                        6 = EN+TW
                        7 = ALL
                */
                for(var i=0; i<3; i++) {
                    if( (localStorage["comments_for_download"]>>i & 0x1)==1 ) {
                        var _cmtName = generateDownloadFileFormat(movieThumb, i);
                        fs2.dlComment(flapiInfo.ms, _cmtName, ".xml", dir_path, flapiInfo.thread_id, ""+i); // here must put as String.
                    }
                }
                
                if(DLcode=="dl" && fromQueue==undefined) {
                    var lang = getLang();
                    alert(_locale[lang]['addIntoDLSuccess']);
                } else {
                
                }
            }
        } else {
            var lang = getLang();
            alert(_locale[lang]['already_added']);
        }
    });
}


/**
 * filename formatting 
 *  @vinfo:
 *  @type : undefined=video , 0=JP, 1=EN, 2=TW
**/
function generateDownloadFileFormat(vinfo, type) {
    var commentLang = new Array('JP', 'EN', 'TW');
    
    var _format;
    if(type==undefined) {
        _format = localStorage["file_format"];
    } else {
        _format = localStorage["comment_file_format"];
    }
    
    var ret = _format.replace("%ID%", vinfo.video_id);
    ret = ret.replace("%TITLE%", vinfo.title ); // bug?
    
    if(type==undefined) {
        ret = ret.replace("%COMMENT%", "");
    } else if (type>=0 && type <=2) {
        ret = ret.replace("%COMMENT%", commentLang[type]);
    } else {
    
    }

    
    //ret = ret.replace(/&amp;/g, '');
    var div = document.createElement('div');
    div.innerHTML = ret;
    ret = div.firstChild.nodeValue;

    return ret;
}

/** 
 * open option.html when extension icon click 
**/
chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.tabs.create({'url': chrome.extension.getURL('html/options.html')}, function(tab) {
        // Tab opened.
    });
});



/**
 * Insert a menu into right-click MenuList.
**/
chrome.tabs.onUpdated.addListener( setMenuList );
//chrome.tabs.onSelectionChanged.addListener( setMenuList );

function prepareDownload( aTab ) {
    /* start download video & comments */
    // b'cuz background script is separated into different part. 
    // here has two way to do. 
    //   First is re-new a THK object, and use it.
    //   Second is pass value from THK.js(content script).    
    
    if(THK.Nico==undefined) {
        console.log("THK.Nico.js not avalible...");
    } else {
        THK.Nico.init();
        THK.Nico.onMenuListClick(aTab.url);

        startDownload(THK.Nico.video_url, THK.Nico.flapi_params, THK.Nico.thumb, aTab.fromQueue);
    }
    
    
}

function nicoDLMenuOnClick(info, tab){
    chrome.tabs.getSelected( null , prepareDownload ); 
}

function setMenuList( aTabId , aChangeInfo ) {
    chrome.contextMenus.removeAll();
    chrome.tabs.get( aTabId , function( aTab ) {
        if( isNicoURL(aTab.url) ) {
            var _lang = getLang();
            var id = chrome.contextMenus.create({"title": _locale[_lang]['MenuListTitle'], "contexts":['all'], "onclick": nicoDLMenuOnClick});
        }
    });
}
