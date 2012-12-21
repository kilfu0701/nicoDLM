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

window.onload = function() {
    loadPlugin();
    restoreOption(); 
    setLocaleWording();
    
    /* dynamic load */
    window.onscroll = dynamicLoad; 
    
    /* search bar */
    $("#search_btn").click(function(e){
        searchVideo();
    });
    
    j_video_cur = j_video_cur || $("#video_cur");
    j_video_all = j_video_all || $("#video_all");
    
    /* add opt_btn onclick event */
    $(".opt_btn").click(function(e){
        saveOption();
    });
    
    /* clear all data event */
    $("#clear_all").click(function(e){
        clearDownloadList();
    });
    
    /* export event */
    $("#export").click(function(e){
        exportList();
    });
    
    /* import file select event */
    var j_import_file = $("#import_file");
    j_import_file.change(function(e){
        var _fname = j_import_file.val() || "";
        if(_fname=="") {
            $("#import").attr('disabled',true);
        } else {
            $("#import").attr('disabled',false);
        }
    });
    
    /* import event */
    $("#import").click(function(e){
        importList();
    });
    
    /* search result block close event */
    $("#close_search_btn").click(function(e){
        $("#search_result").fadeOut(300);
    });
    
    /* add download folder select event */
    $("#download_dir_btn").click(function(e){
        var dl_path = plugin.selectFolder();
        if(dl_path!="") {
            $("#download_dir_input").val(dl_path);
        }
    });
    
    // get total video count first.
    THK.DB.getCount('dlist', function(res){
        TotalVideo = res;
    });
    
    // find 20 results from table //
    THK.DB.findByCond({limit:perLoad, offset:0, order:'download_at DESC'}, function(res){
        $(res).each(function(i, v){
            addDownloadListElemets(v);
        });
    });
    
    // starting reading msg...
    readPluginMsg();
};

function readPluginMsg() {
    THK.DB.findByCond({
        table: 'plugin_msg',
        //conditions : {action: 'addNewDL'}, 
        limit:50,
        offset:0,
        order:'id ASC'
    }, function(res){
        
        var size = res.length;
        
        if(size==0) {
            return ;
        }
        
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
                    ock.html("下載完畢");
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
                }
            } catch(e) {
            }
        });
    });
    
    window.setTimeout( readPluginMsg, 1000);
}

function loadPlugin() {
    var _plugin = document.createElement("embed");
    _plugin.style.position = "absolute";
    _plugin.style.left = "-9999px";
    _plugin.id = "npapi";
    _plugin.setAttribute("type", "application/x-thk-nico-dl");
    document.documentElement.appendChild(_plugin);

    plugin = document.getElementById("npapi"); 
}

function dynamicLoad() {
    var _body = THK.get('body')[0];
    var contentHeight = _body.offsetHeight;
	var yOffset = window.pageYOffset; 
	var y = yOffset + window.innerHeight;
	if(y >= contentHeight){
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

function addDownloadListElemets(data, prepend) {
    VideoCounter += 1;
    updateCounter();
    
    var fs = document.createElement("li");
    fs.setAttribute("id", data.video_id);
    var _li = $('<li id="'+data.video_id+'"></li>');
    //console.log(data);
    if(prepend==undefined) {
        $("#dl_list ul").append(_li);
    } else {
        $("#dl_list ul").prepend(_li);
    }
    
    _li = $("#"+data.video_id);
    
    var dl_status = _locale[pn]["dl_status_"+data.status];
    
    var doc = $('<div style="height:120px; position:relative;">'+ // outer_div
          '<div style="float:left; width:312px; height:114px; padding:3px; position:relative; border-right:solid 1px #ccc;">'+ // inner_div1
            '<a href="'+data.video_url+'" target="_target"><img style="position:absolute; top:10px;" src="'+data.thumb_img_url+'"></a>'+
            '<div style="position:absolute; width:175px; height:24px; top:25px; left:140px;">'+_locale[pn]['play_count']+'：<span style="position:absolute; right:5px; top:0;">'+addCommas(data.total_view)+'</span></div>'+
            '<div style="position:absolute; width:175px; height:24px; top:50px; left:140px;">'+_locale[pn]['comment_count']+'：<span style="position:absolute; right:5px; top:0;">'+addCommas(data.total_comment)+'</span></div>'+
            '<div style="position:absolute; width:175px; height:24px; top:75px; left:140px;">'+_locale[pn]['mylist_count']+'：<span style="position:absolute; right:5px; top:0;">'+addCommas(data.total_mylist)+'</span></div>'+
          '</div>'+
          '<div style="float:left; width:504px; height:114px; padding:3px; position:relative; overflow:hidden;">'+
            '<div style="font-size:20px; padding-bottom:10px; font-weight:bold;"><a href="'+data.video_url+'" target="_target">'+data.title+'</a></div>'+
            '<div>'+data.comment+'</div>'+
          '</div>'+
          '<div style="float:left; width:140px; height:114px; padding:3px; position:relative; overflow:hidden;">'+
            '<div id="progress_'+data.video_id+'" class="dl-status-'+data.status+'">'+dl_status+'</div>'+ // dl status
            '<div id="adv_'+data.video_id+'"></div>'+
            '<img src="images/delete_icon2.png" class="delete" id="del_'+data.video_id+'" style="position:absolute; bottom:0; right:10px; display:none; cursor:pointer;">'+
          '</div>'+
        '</div>'+
        '<hr style="border: 1px dotted #0099CC" color="white" size="1">'  
    );
    
    $("#"+data.video_id).append(doc);
    
    /* START: add events into each item */
    var _tmp = $("#"+data.video_id);
    _tmp.find('img.delete').click(function(e){
        var _id = this.id;
        var smid = _id.split("_")[1];
        deleteItemById(smid);
    });
    _tmp.mouseover(function(e){
        var cc = $(this).find('img.delete');
        var _id = this.id;
        $(cc).show();
    });
    _tmp.mouseout(function(e){
        var cc = $(this).find('img.delete');
        $(cc).hide();
    });
    /* END: add events */
    
    var _ob = $("#adv_"+data.video_id);
    if(data.quality=="high") {
        _ob.append($('<img src="/images/high_icon.png" title="High Quality">'));
    } else {
        _ob.append($('<img src="/images/low_icon.png" title="Low Quality">'));
    }
    
    if(data.quality=="") {
    
    } else {
        _ob.append($('<img src="/images/folder.png" width="32" height="32" title="Open Directory" id="open_'+data.video_id+'" style="cursor:pointer;">'));
        $('#open_'+data.video_id).click(function(e){
            openDir(data.dir);
        });
    }
}

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

function doRefresh() {
    window.location.href = window.location.href;
}

// Restore setting
function restoreOption()
{
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
}

/**
 * Setting Language
 */ 
function setLocaleWording() {
    pn = options["lang"] || G_DEFAULT_LANG;
    
    if( pn=='' ) {
        // use by system default.
    
    } else if( pn in _locale) {
        // use by User's select
        $("#dlist a").html( _locale[pn]['dlist']);
        $("#general a").html( _locale[pn]['general']);
        $("#langs a").html( _locale[pn]['langs']);
        $("#lang_desc").html( _locale[pn]['lang_desc']);
        $("#save").html( _locale[pn]['save']);
        $("#default").html( _locale[pn]['default']);
        $("#en").html( _locale[pn]['en']);
        $("#zh-TW").html( _locale[pn]['zh-TW']);
        $("#ja-JP").html( _locale[pn]['ja-JP']);
        $("#download_dir").html( _locale[pn]['download_dir']);
        $("#file_format").html( _locale[pn]['file_format']);
        $("#download_dir_btn").val( _locale[pn]['download_dir_btn']);
        $("#clear_all").html( _locale[pn]['delete_all_btn'] );
    }
    
    $("#version").html(VERSION);
    $("#release").html(RELEASE);
    
    var change_log = CHANGE_LOG || {};
    var j_log = $("#change_log");
    var txt = '<ul>';
    $.each(change_log, function(i, v){
        txt += '<li style="padding:5px;">'+i+': '+v+'</li>'
    });
    txt += '</ul>';
    j_log.append($(txt));
}

/** 
 * delete video from WebSQL
 */
function deleteItemById(smid) {
    var r = confirm(_locale[pn]['delete_confirm']);
    if(r==true) {
        THK.DB.deleteById(smid, function(ret) {
            if(ret.rowsAffected==1) {
                // delete ok
                // remove li item.
                $("#"+smid).remove();
                VideoCounter -= 1;
            } else {
            
            }
        });
    } else {
        // do nothing
        
    }
}

function updateCounter() {
    j_video_cur = j_video_cur || $("#video_cur");
    j_video_all = j_video_all || $("#video_all");
    j_video_cur.html(""+VideoCounter);
    j_video_all.html(""+TotalVideo);
}

function searchVideo() {
    var input_text = $("#search_text").val() || '';
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
/* // not avaliable in chrome 24 after...
        var blob = new window.Blob('');
        blob.append(res);
        var blobSave = blob.getBlob("text/plain");
        var a = document.createElement('a');
        a.download = "nicoDLM_export.txt";
        a.href = window.webkitURL.createObjectURL(blobSave);
        a.textContent = "DL Export";
        a.id = "_link";
        a.dataset.downloadurl = ["text/plain",a.download,a.href].join(":");
        $("#export_link").html(a);
        var _link = $("#_link");
        _link.click(function(e){
            $("#export_link").html("");
        });
*/

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
        for(var i=0; i<lines.length; i++) {
            if(lines[i] == "") 
                continue;
            
            var len = lines[i].length;
            
            if(len>4) {
                var pre = lines[i].substr(0,2);
                var lat = lines[i].substr(-2);
                if(pre=="/*" && lat=="*/")
                    continue;
            }
            
            THK.DB.query(lines[i]);
        }
        
    }
    
    // start reading.... 
    file_reader.readAsText(file.files[0]);
    window.setTimeout( doRefresh, 1000);
}