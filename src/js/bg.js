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
    

}

/**
 * enable functions:
 *    dl (url, filename, ext, path, video_id)          -- video download function
 *
 *    dlComment (url, filename, ext, path, thread_id)  -- comment download
 *
 *    getValueForURL (url)                             -- get cookie
 *
 *    saveTextFile (fullpath, text)                    -- save a text file
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

    if(localStorage["lang"]==undefined) {
        localStorage["lang"] = "default";
    }
    
    if(localStorage["download_dir"]==undefined) {
        localStorage["download_dir"] = nicoAppDir;
    }
    
    if(localStorage["file_format"]==undefined) {
        localStorage["file_format"] = "[%ID%] %TITLE%";
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
    //console.log('load plugin...');
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
        }
        
        
    }
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
 */
chrome.extension.onRequest.addListener(   
    function(request, sender, sendResponse) {   
        //console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
                
        if (request.greeting == "movieURL") {
            //var movieObj = request.movieInfo;
            //var movieThumb = request.movieThumb;
            //var flapi = request.flapiInfo;
            
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

function startDownload(movieURL, flapiInfo, movieThumb) {
    THK.DB.findByVideoID(movieThumb.video_id, function(abr){
        if(abr==undefined || abr.status!=0) {
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

            /* load page once at first.(not work?) */
            //fs2.getValueForURL(movieThumb['watch_url']);
            
            /* filename for save. */
            var _fname = generateDownloadFileFormat(movieThumb);
            var dir_path = localStorage["download_dir"] || G_DL_DIR;

            /* start download by plugin. */
            var _ext = movieThumb.movie_type || "thk";
            var DLcode = fs2.dl(movieURL, _fname, "."+_ext, dir_path, movieThumb.video_id);
            
            /* download commnet */
            fs2.dlComment(flapiInfo.ms, _fname, ".xml", dir_path, flapiInfo.thread_id);
            
            if(DLcode=="dl") {
                var lang = getLang();
                alert(_locale[lang]['addIntoDLSuccess']);
            } else {
            
            }
        } else {
            alert('already add into download list');
        }
    });
}


/**
 * filename formatting 
**/
function generateDownloadFileFormat(vinfo) {
    var _format = localStorage["file_format"];
    var ret = _format.replace("%ID%", vinfo.video_id);
    ret = ret.replace("%TITLE%", vinfo.title);
    
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
// NEW for version 0.1.4, will be implement after.
chrome.tabs.onUpdated.addListener( setMenuList );
chrome.tabs.onSelectionChanged.addListener( setMenuList );

function prepareDownload( aTab ) {
    /* start download video & comments */
    // b'cuz background script is separated into different part. 
    // here has two way to do. 
    //   First is re-new a THK object, and use it.
    //   Second is pass value from THK.js(content script).    
    
    if(THK==undefined) {
        console.log("THK.js not avalible...");
    } else {
        THK.init();
        THK.onMenuListClick(aTab.url);
        
        startDownload(THK.video_url, THK.flapi_params, THK.thumb);
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
