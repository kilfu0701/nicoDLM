/**
 * script for option page.
 * (選單頁面)
**/

THK.DB.init();

/* get setting from background.html */
var bg = chrome.extension.getBackgroundPage();
var options = bg.getOptionSetting();
var pn = options["lang"] || G_DEFAULT_LANG;
var plugin;
var VideoCounter = 0; // how many video already show on page.
var perLoad = options["perLoad"] || 20;
var TotalVideo = 0;

var j_video_cur;
var j_video_all; 
var j_edit_window;
var j_search_result;

var g_videoEditID = 0;


window.onload = function() {
    j_video_cur = j_video_cur || $("#video_cur");
    j_video_all = j_video_all || $("#video_all");
    j_edit_window = j_edit_window || $("#edit_window");
    j_search_result = j_search_result || $("#search_result");

    loadPlugin();         // 1
    restoreOption();      // 2
    setLocaleWording();   // 3
    loadAboutMe();        // 4
    addEventHandle();     // 5
    
    window.onscroll = dynamicLoad; // 6
    
    // get total video count first.
    THK.DB.getCount('dlist', function(res){
        TotalVideo = res;
    });
    
    // find 20 results from table //
    THK.DB.findByCond({limit:perLoad, offset:0, order:'download_at DESC'}, function(res){
        $(res).each(function(i, v){
            addDownloadListElemets(v);  // 7
        });
    });
    
    // starting reading msg...
    readPluginMsg();           // 8
    
    
    //THK.Validate.init();
    //var error = THK.Validate.set({
    //    none : {
    //        file_format : {
    //            notEmpty : ["no empty plz !"],
    //            alphaNumeric : ["only number and character."],
    //        }
    //    }
    //});
    //console.log(error);
    
    //var aa = THK.Validate.notEmpty([undefined]);
    //console.log(aa);
};

/**
 * Step 1: 載入plugin
**/
function loadPlugin() {
    _D("Load plugins...");

    var _plugin = document.createElement("embed");
    _plugin.style.position = "absolute";
    _plugin.style.left = "-9999px";
    _plugin.id = "npapi";
    _plugin.setAttribute("type", "application/x-thk-nico-dl");
    document.documentElement.appendChild(_plugin);

    plugin = document.getElementById("npapi"); 
}

/**
 * Step 2: 當頁面開啟後，回復選單上次的設定
**/
function restoreOption() {
    _D("restore settings...");

    var lang = localStorage["lang"];
    if(!lang) {
        //
    } else {
        switch(lang)
        {
            case "en":
                THK.get('input[name=lang]')[1].checked=true;
                break;

            case "zh-TW":
                THK.get('input[name=lang]')[2].checked=true;
                break;

            case "ja-JP":
                THK.get('input[name=lang]')[3].checked=true;
                break;
                
            default:
                THK.get('input[name=lang]')[0].checked=true;
        }
    }
    
    $("#download_dir_input").val(localStorage["download_dir"]);
    $("#file_format_input").val(localStorage["file_format"]);
    $("#comment_file_format_input").val(localStorage["comment_file_format"]);
    
    var elem = THK.get('input[name=comment_lang_n]');
    for(var i=0; i < THK.Nico.CommentLang.length; i++) {
        if( (localStorage["comments_for_download"]>>i & 0x1)==1 ) {
            elem[i].checked=true;
        }
    }
    
    $("select#save_action").val(localStorage["saveFileAction"]);
    $("select#dl_quality_action").val(localStorage["download_mode"]);
}

/**
 * Step 3: Setting Language
 */ 
function setLocaleWording() {
    _D("Set locale wording...");

    pn = options["lang"] || G_DEFAULT_LANG;
    
    if( pn=='' ) {
        // use by system default.
    
    } else if( pn in _locale) {
        loc_list = {
            "#dlist a"              : "dlist",
            "#general a"            : "general",
            "#langs a"              : "langs",
            "#lang_desc"            : "lang_desc",
            "#save"                 : "save",
            "#default"              : "default",
            "#en"                   : "en",
            "#zh-TW"                : "zh-TW",
            "#ja-JP"                : "ja-JP",
            "#download_dir"         : "download_dir",
            "#file_format"          : "file_format",
            "#comment_file_format"  : "comment_file_format",
            "#download_dir_btn"     : "download_dir_btn",
            "#clear_all"            : "delete_all_btn",
            "#comment_lang_en_span" : "en",
            "#comment_lang_jp_span" : "ja-JP",
            "#comment_lang_tw_span" : "zh-TW",
            "#comment_lang"         : "comment_lang",
            "#if_file_exist"        : "if_file_exist",
            "#overwrite"            : "overwrite",
            "#saveNew"              : "save_new",
            "#download_quality_mode": "download_quality_mode",
            "#high_quality"         : "high_quality",
            "#low_quality"          : "low_quality",
        };
        
        for(var k in loc_list) {
            $(k).html( _locale[pn][loc_list[k]]);
        }
    }
}

/**
 * Step 4: Load about me files.
**/
function loadAboutMe() {
    _D("Load about me file...");

    /* Load About.md into HTML */
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            var src = xhr.responseText;
            
            var converter = new Showdown.converter();
            var cvt = converter.makeHtml(src);
            $(".markdown-body").append(cvt);
            $(".markdown-body a").each(function(i,v){
                $(v).attr('target', '_blank');
            });
        }
    }
    xhr.open("GET", "/About.md", false);
    xhr.send();
}

/**
 * Step 5: 設定所有事件處理
**/
function addEventHandle() {
    _D("Add all event handlers...");

    /* 搜尋欄位(search bar) */
    $("#search_btn").click(function(e){  searchVideo();  });
    
    /* edit window close button */
    $("img#close_edit_btn").click(function(e){  closeEditInfo();  });
    
    /* 選單儲存(save option) */
    $(".opt_btn").click(function(e){  saveOption();  });
    
    /* 清除所有資料(delete all data) */
    $("#clear_all").click(function(e){  clearDownloadList();  });
    
    /* 匯入/匯出(import/export) */
    $("#export").click(function(e){  exportList();  });
    $("#import").click(function(e){  importList();  });
    var j_import_file = $("#import_file");
    j_import_file.change(function(e){
        var _fname = j_import_file.val() || "";
        if(_fname=="") {
            $("#import").attr('disabled',true);
        } else {
            $("#import").attr('disabled',false);
        }
    });
    
    /* search result block close event */
    $("#close_search_btn").click(function(e){  $("#search_result").fadeOut(300);  });
    
    /* 選擇資料夾(browse folder selector) */
    $("#download_dir_btn").click(function(e){
        var dl_path = plugin.selectFolder();
        if(dl_path!="") {
            $("#download_dir_input").val(dl_path);
        }
    });    
    
    /* draggable blocks */
    j_edit_window.draggable();
    j_search_result.draggable();
}

/**
 * Step 6: 當畫面拉到底，自動讀取更多清單項目。
**/
function dynamicLoad() {
    var _body = THK.get('body')[0];
    var contentHeight = _body.offsetHeight;
	var yOffset = window.pageYOffset; 
	var y = yOffset + window.innerHeight;
	if(y >= contentHeight){
        _D("Read more videos...");
		// reach page bottom, load more items.
        
        // get total count
        THK.DB.getCount('dlist', function(res){
            TotalVideo = res;
        });
        
        if(TotalVideo > VideoCounter) {
            // load more
            THK.DB.findByCond({limit:perLoad, offset:VideoCounter, order:'download_at DESC'}, function(res){
                $(res).each(function(i, v){
                    addDownloadListElemets(v);
                });
            });
        }
	}
}

/**
 * Step 7: set data into page.
**/
function addDownloadListElemets(data, prepend) {
    _D("Insert a video into page");

    VideoCounter += 1;
    updateCounter();
    
    var fs = document.createElement("li");
    fs.setAttribute("id", data.video_id);
    var _li = $('<li id="'+data.video_id+'"></li>');
    
    if(prepend==undefined) {
        $("#dl_list ul").append(_li);
    } else {
        $("#dl_list ul").prepend(_li);
    }
    
    _li = $("#"+data.video_id);
    
    var dl_status = _locale[pn]["dl_status_"+data.status];
    
    var doc = $('<div class="outer_div">'+ // outer_div
          '<div class="inner_div1">'+ // inner_div1
            '<a href="'+data.video_url+'" target="_target"><img class="thumbImage" src="'+data.thumb_img_url+'"></a>'+
            '<div class="playCount">'+_locale[pn]['play_count']+'：<span>'+addCommas(data.total_view)+'</span></div>'+
            '<div class="commentCount">'+_locale[pn]['comment_count']+'：<span>'+addCommas(data.total_comment)+'</span></div>'+
            '<div class="mylistCount">'+_locale[pn]['mylist_count']+'：<span>'+addCommas(data.total_mylist)+'</span></div>'+
          '</div>'+
          '<div class="inner_div2">'+
            '<div class="videoTitle"><a href="'+data.video_url+'" target="_target">'+data.title+'</a></div>'+
            '<div class="videoComment">'+data.comment+'</div>'+
          '</div>'+
          '<div class="inner_div3">'+
            '<div id="progress_'+data.video_id+'" class="dl-status-'+data.status+'">'+dl_status+'</div>'+ // dl status
            '<div id="adv_'+data.video_id+'"></div>'+
            '<div class="editMenu">'+
              '<img title="delete" src="/images/delete_icon2.png" class="delete" id="del_'+data.video_id+'">'+
              '<img title="modify" src="/images/edit.png" class="edit" id="edit_'+data.video_id+'">'+
              '<img title="re-download" src="/images/refresh.png" class="redownload" id="redownload_'+data.video_id+'">'+
            '</div>'+
          '</div>'+
        '</div>'+
        '<hr style="border: 1px dotted #0099CC" color="white" size="1">'  
    );
    
    $("#"+data.video_id).append(doc);
    
    /* START: add events into each item */
    var _tmp = $("#"+data.video_id);
    _tmp.find('img.delete').click(function(e){
        deleteItemById( this.id.split("_")[1] );
    });
    _tmp.find('img.edit').bind("click",function(){
        editItemById( this.id.split("_")[1] );
    });
    _tmp.find('img.redownload').bind("click",function(){
        re_download( this.id.split("_")[1] );
    });
    
    // editMenu mouse
    _tmp.mouseover(function(e){
        var cc = $(this).find('div.editMenu');
        $(cc).show();
    });
    _tmp.mouseout(function(e){
        var cc = $(this).find('div.editMenu');
        $(cc).hide();
    });
    //-- END: add events --//
    
    
    /* 影片品質icon */
    var _ob = $("#adv_"+data.video_id);
    if(data.quality=="high") {
        _ob.append($('<img src="/images/high_icon.png" title="High Quality">'));
    } else {
        _ob.append($('<img src="/images/low_icon.png" title="Low Quality">'));
    }
    
    if(data.quality=="") {
    
    } else {
        /* 開啟檔案icon */
        _ob.append($('<img src="/images/folder.png" width="32" height="32" title="Open Directory" id="open_'+data.video_id+'" style="cursor:pointer;">'));
        $('#open_'+data.video_id).bind("click",function(e){
            openDir(data.dir);
        });
    }
}

/**
 * Step 8: start reading plugin messages.
**/
function readPluginMsg() {
    THK.DB.findByCond({
        table: 'plugin_msg',
        //conditions : {action: 'addNewDL'}, 
        limit:100,
        offset:0,
        order:'id ASC'
    }, function(res){
        
        var size = res.length;
        
        if(size==0) {
            return ;
        }
        
        _D(res);
        
        THK.DB.deletePluginMsgByNum(size);

        $(res).each(function(i, v){
            try{
                // update page
                var ock = $("#progress_"+v.vid);
                if(v.action=="DLProgress") {
                    ock.attr({"class": "dl-status-3"});
                    ock.html(v.progress+"%");
                } else if(v.action=="DLComplete") {
                    ock.attr({"class": "dl-status-1"});
                    ock.html(_locale[pn]['dl_status_1']);
                } else if(v.action=="DLForbidden") {
                    ock.attr({"class": "dl-status-403"});
                    ock.html("Forbidden");
                } else if(v.action=="DLNotFound") {
                    ock.attr({"class": "dl-stauts-404"});
                    ock.html("not found");
                } else if(v.action=="DLOtherError") {
                    ock.attr({"class": "dl-status-2"});
                    ock.html("Other Error");
                } else if(v.action=="addNewDL"){
                    // (when option page is opened) NEED append a li into option.html
                    THK.DB.findByCond({'conditions':{'video_id': v.vid}}, function(res){
                        $(res).each(function(i, v){
                            THK.DB.getCount('dlist', function(res){
                                TotalVideo = res;
                                
                                // remove if exist
                                var brf = $("li#"+v.video_id);
                                if(brf.length==1) {
                                    brf.remove();
                                    VideoCounter -= 1;
                                }
                                addDownloadListElemets(v, true);
                            });
                        });
                    });
                } else if(v.action=="HQWaiting") {
                    ock.attr({"class": "dl-status-4"});
                    ock.html(_locale[pn]["dl_status_4"]);
                }
            } catch(e) {
            }
        });
    });
    
    window.setTimeout( readPluginMsg, 1000);
}



/**
 * 開啟windows folder explorer.
**/
function openDir(path) {
    var arr = path.split("/");
    var len = arr.length;
    
    if(len==1) {
        return ;
    }
    
    var dir = "";
    var fname = arr[len-1];
    
    for(var i=0;i<len-2;i++) {
        if(arr[i]!="") {
            dir += arr[i] + "/";
        }
    }
    
    // open dir by plugins
    _D({path: path, fname:fname});
    plugin.openDir(path, fname);
}

/**
 * 儲存設定
**/
function saveOption() {
    var input = THK.get('input[name=lang]');
    
    for(var i=0; i<input.length; i++) {
        if( input[i].checked == true ) {
            localStorage["lang"] = input[i].value;
        }
    }
    
    localStorage["download_dir"] = $("#download_dir_input").val() || G_DL_DIR;
    localStorage["file_format"] = $("#file_format_input").val() || G_FILE_FORMAT;
    localStorage["comment_file_format"] = $("#comment_file_format_input").val() || G_COMMENT_FILE_FORMAT;
    
    var _lang = 0;
    if( $("#comment_lang_jp")[0].checked==true ) 
        _lang += THK.Nico.CommentLang[0][1];
    
    if( $("#comment_lang_en")[0].checked==true ) 
        _lang += THK.Nico.CommentLang[1][1];
       
    if( $("#comment_lang_tw")[0].checked==true ) 
        _lang += THK.Nico.CommentLang[2][1];
    
    localStorage["comments_for_download"] = _lang || 1;
    localStorage["saveFileAction"] = $("select#save_action option:selected")[0].value || 0;
    localStorage["download_mode"] = $("select#dl_quality_action option:selected")[0].value || 1;
    
    THK.get("#save").style.display = 'block';
    window.setTimeout( doRefresh, 1000);
}




/**
 * 清除所有清單
**/
function clearDownloadList() {
    var r = confirm(_locale[pn]['delete_all_confirm']);
    if(r==true) {
        THK.DB.deleteAllData();
        window.setTimeout( doRefresh, 500);
    }
}

/**
 * Refresh頁面
**/
function doRefresh() {
    window.location.href = window.location.href;
}

/** 
 * delete video from WebSQL
**/
function deleteItemById(smid) {
    var r = confirm(_locale[pn]['delete_confirm']);
    if(r==true) {
        THK.DB.deleteById(smid, function(ret) {
            if(ret.rowsAffected==1) {
                // delete ok
                // remove li item.
                $("#"+smid).remove();
                VideoCounter -= 1;
                TotalVideo -= 1;
                updateCounter();
            } else {
            
            }
        });
        
        THK.DB.deleteQueueById(smid);
    } else {
        // do nothing
        
    }
}

/**
 * show edit video's info window
**/
function editItemById(smid) {
    THK.DB.findByVideoID(smid, function(res){
        if(res==undefined)
            return ;
    
        g_videoEditID = smid;
        
        // popup a edit window
        j_edit_window = j_edit_window || $("#edit_window");
        j_edit_window.fadeIn(200);
        
        var edit_content = $("div#edit_content");
        edit_content.html($(
            '<label>'+_locale[pn]['videoTitle']+'</label> <input id="edit_title" value="'+res.title+'"></input> <br>'+
            '<label>'+_locale[pn]['videoPath']+'</label> <input id="edit_dir" value="'+res.dir+'"></input> <br>'+
            '<label>'+_locale[pn]['videoComment']+'</label> <textarea id="edit_comment">'+res.comment+'</textarea> <br>'+
            '<input type="button" class="submit-button" value="Update">'
        ));
        
        /* edit_window save button */
        $("input.submit-button").click(function(e){  saveEditInfo();  });
    });
}

/**
 * 儲存修改video info設定
**/
function saveEditInfo() {
    if(g_videoEditID==0) {
        // do nothing
    } else {
        // save changes
        var _title = $("input#edit_title").val() || "",
            _dir = $("input#edit_dir").val() || "",
            _comment = $("textarea#edit_comment").val() || "";
        
        // 更新DB
        THK.DB.updateByEdit({
            title: _title,
            dir: _dir,
            comment: _comment,
            video_id: g_videoEditID
        });
        
        var _ele = $("li#"+g_videoEditID);
        if(_ele==undefined) {
        
        } else {
            try{
                // 更新頁面資料
                _ele.find("div.videoTitle a").html(_title);
                _ele.find("div.videoComment").html(_comment);
                
                // update binding event
                $('#open_'+g_videoEditID).unbind('click').bind("click",function(e){
                    openDir(_dir);
                });
            } catch(e) {
            
            }
        }
        g_videoEditID = 0;
    }
    
    closeEditInfo();
}

function closeEditInfo() {
    j_edit_window = j_edit_window || $("#edit_window");
    j_edit_window.fadeOut(200);
}

function updateCounter() {
    j_video_cur = j_video_cur || $("#video_cur");
    j_video_all = j_video_all || $("#video_all");
    j_video_cur.html(""+VideoCounter);
    j_video_all.html(""+TotalVideo);
}

function searchVideo() {
    var input_text = $("#search_text").val() || '';
    console.log(input_text);
    var search_result_content = $("#search_result_content");
    var search_result = $("#search_result");
    
    if(input_text=='') 
        return;

    THK.DB.searchByLike(input_text, function(res){
        console.log(res);
        if(res.length==0) {
            search_result_content.html("No data match the search string!");
            search_result.fadeIn(300);
        } else {
            
        }
    });
}

function exportList() {
    THK.DB.exportAll(function(res){
        // use window.blob
        var mimeString = "text/plain"; 
        //var dataView = new DataView( str2ab(res) ); // if use this, file encoding will be unicode not utf-8
        var blob = new Blob([res], { type: mimeString }); 
        
        var a = document.createElement('a');
        a.download = "nicoDLM_export.txt";
        a.href = window.webkitURL.createObjectURL(blob);
        a.textContent = "DL Export";
        a.id = "_link";
        a.dataset.downloadurl = ["text/plain",a.download,a.href].join(":");
        $("#export_link").html(a);
        var _link = $("#_link");
        _link.click(function(e){
            $("#export_link").html("");
        });

    });    
}

function importList() {
    var file = $("#import_file")[0];
    var file_reader = new FileReader();
    
    file_reader.onload = function() {
        var lines = file_reader.result.split("\r\n");
        var isCMT = false;
        for(var i=0; i<lines.length; i++) {
            if(lines[i] == "") 
                continue;
            
            var len = lines[i].length;
            
            // Comment Rules. 
            //     (1) IF first character is '#', then this line will be a comment.
            //     (2) Block comment. Between with /* ... */
            //
            //   ** Changes in version 0.1.6, old version only one-line block commnet. **
            //
            if(len>0 && lines[i].substr(0,1)=="#") {
                continue;
            } else if(len>1) {
                var pre = lines[i].substr(0,2);
                var lat = lines[i].substr(-2);
                if(pre=="/*") {
                    isCMT = true;
                }
                if(lat=="*/" && isCMT) {
                    isCMT = false;
                    continue;
                }
                if(isCMT) {
                    continue;
                }
            }
            
            THK.DB.query(lines[i]);
        }
    }
    
    // start reading.... 
    file_reader.readAsText(file.files[0]);
    window.setTimeout( doRefresh, 1000);
}

/**
 * from plugin call back
**/
function plugin_callback() {
    var _action;
    if(arguments.length > 0) {
        _action = arguments[0];
    }
    
    if(_action=="FileNotExist") {
        alert( _locale[pn]['fileNotExist'] );
    }
}

function re_download(vid) {
    chrome.extension.getBackgroundPage().prepareDownload({url: NICO_URL+vid, fromQueue:true});
}