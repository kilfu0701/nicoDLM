/**
 * Access to chorme databases.
 * 使用chrome web sql
 * 
 * @Dependency: THK.js
 *
 * author: kilfu0701, kilfu0701@gmail.com
**/
var THK = THK || {};


THK.DB = (function() {
    var _db;
    var _rs;
    var _this;
    
    function _curTS() {
        return Math.round(new Date().getTime() / 1000);
    }
    
    /* params: 
       {
         conditions : {video_id: xxx}, 
         order: video_id DESC,
         limit: 10,
         offset: 0,
       } 
    */
    function sql_generator(sql, p) {
        if(p==undefined) 
            return sql;
        
        var _where = " where ";
        var _order = " order by ";
        var _limit = " limit "
        var _offset = " offset ";
        if(p.conditions!=undefined) {
            
            for(var key in p.conditions){
                _where += key + " = '" + p.conditions[key] + "' and ";
            }
            _where = _where.substring(0, _where.length - 4);
            sql += _where;
        }
        
        if(p.order!=undefined) {
            _order += p.order;
            sql += _order;
        }
        
        if(p.limit!=undefined) {
            _limit += p.limit;
            sql += _limit;
            
            // only if limit is set
            if(p.offset!=undefined) {
                _offset += p.offset;
                sql += _offset;
            }
        }
        

        //console.log(sql);
        return sql;
    }
    
    return {
        /**
         * Initialize Databases.
        **/
        init : function(callback) {
            //console.log("init DB");
            _this = _this || this;
            
            /* open database */
            _db = _db || window.openDatabase("nicoDLM", "", "nicoDLM Data", 5*1024*1024); 
            
            /* create 'dlist', 'plugin_msg' table */
            /** dlist.status => 0: new add
                                1: complete
                                2: cancel
                                3: downloading
                                4: waiting for high quality.
            **/
            _db.transaction(function(tx) {
                var sql = "create table if not exists dlist (video_id text primary key, title text, comment text, thumb_img_url text, upload_at integer, length integer, hq_size integer, lq_size integer, total_view integer, total_comment integer, total_mylist integer, video_url text, video_ext text, dir text, userid text, download_at integer, complete_at integer, status integer, quality text)";
                tx.executeSql(sql, [], function(tx, rs){});
                sql = "create table if not exists plugin_msg (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, action text, progress double, vid text, msg text, ts integer)";
                tx.executeSql(sql, [], function(tx, rs){});
                sql = "create table if not exists dl_queue (video_id text primary key, mode text, status integer)";
                tx.executeSql(sql, [], function(tx, rs){});
                sql = "create table if not exists tag_list (video_id text primary key, tag text, status integer)";
                tx.executeSql(sql, [], function(tx, rs){});
            }, function(err){ 
                console.warn(err.message);
            });
        },

        /**
         * If start downloading, then add video info into tables.
        **/
        addIntoDLM : function(d, callback) {
            _db.transaction(function(tx) {
                tx.executeSql("select video_id from dlist where video_id=?", [d.video_id], function(tx, rs) {
                    //console.log("rs=%o",rs);
                    var dl_at = _curTS();
                    if (rs.rows.length <= 0) {

                   } else {
                        // delete
                        tx.executeSql("delete from dlist where video_id=?", [d.video_id], function(tx, rs){});
                   }
                   
                   tx.executeSql("insert into dlist (video_id, title, comment, thumb_img_url, upload_at, length, hq_size, lq_size, total_view, total_comment, total_mylist, video_url, video_ext, dir, userid, download_at, complete_at, status, quality) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", 
                                  [d.video_id     , d.title         , d.description,
                                   d.thumbnail_url, d.first_retrieve, d.length, 
                                   d.size_high    , d.size_low      , d.view_counter, 
                                   d.comment_num  , d.mylist_counter, d.watch_url, 
                                   d.movie_type   , ""              , d.user_id, 
                                   dl_at          , 0               , 0,
                                   d.quality
                                  ], function(tx, rs, callback) {
                        if(typeof callback=="function") callback(rs);
                    });
                });
            }, function(err){
                console.warn(err.message);
            });
        },
    
        deleteAllData : function(callback) {
            _db.transaction(function(tx) {
                var sql = "DROP TABLE IF EXISTS dlist";
                tx.executeSql(sql, [], function(tx, rs){
                    sql = "DROP TABLE IF EXISTS plugin_msg";
                    tx.executeSql(sql, [], function(tx, rs){
                        _this.init();
                    });
                });
                
                
            }, function(err){
                console.warn(err.message);
            });
        },
         
        deleteById : function(video_id, callback) {
            _db.transaction(function(tx) {
                var sql = "DELETE FROM dlist where video_id=?";
                var ret = [];
                tx.executeSql(sql, [video_id], function(tx, rs){
                    ret = rs;
                    if(typeof callback=="function") callback(ret);

                });
            }, function(err){
                console.warn(err.message);
            });
        },
        
        deleteQueueById : function(video_id, callback) {
            _db.transaction(function(tx) {
                var sql = "DELETE FROM dl_queue where video_id=?";
                var ret = [];
                tx.executeSql(sql, [video_id], function(tx, rs){
                    ret = rs;
                    if(typeof callback=="function") callback(ret);

                });
            }, function(err){
                console.warn(err.message);
            });
        },
        
        /**
         * find data exists? By video_id. 
         *
         * Return: @ouput (object / undefined)
        **/
        findByVideoID: function(id, callback) {
            _db.transaction(function(tx) {
                tx.executeSql("select * from dlist where video_id = ?", [id], function(tx, rs){
                    var rows = rs.rows, 
                        output,
                        len = rows.length;
                        
                    if(len==1) {
                        output = rows.item(0);
                    }

                    if(typeof callback=="function") callback(output);
                });
           }, function(err){
               console.warn(err.message);
           });
        },

        /**
         * find data from DB, by conditions.
         * 
         * Input: @pams
         *
         * Return: @output (array)
        **/
        findByCond: function(pams, callback) {
            _db.transaction(function(tx) {
                //var pams = {limit:1, offset: 1};
                //var pams = {
                //    conditions: {
                //        video_id: "asd"
                //    }, 
                //    order: "video_id DESC",
                //    limit: 10
                //};
                var tbl = (pams.table!=undefined) ? pams.table : 'dlist';
                var sql = sql_generator("select * from "+tbl, pams);
                tx.executeSql(sql, [], function(tx, rs){
                    var rows = rs.rows, 
                        output = new Array(),
                        len = rows.length;
                        
                    for(var i=0; i<len; i++) {
                        output.push(rows.item(i));
                    }
                    if(typeof callback=="function") callback(output);
                });
            }, function(err){
                console.warn(err.message);
            });
        },
        
        insertIntoPluginMsg: function(d, callback) {
            _db.transaction(function(tx) {
                var ts = _curTS();
                tx.executeSql("insert into plugin_msg (action, progress, vid, msg, ts) values (?,?,?,?,?)", [d.action, d.progress, d.vid, d.msg, ts], function(tx, rs) {
                    if(typeof callback=="function") callback(rs);
                });
            }, function(err){
               console.warn(err.message);
            });
        },
        
        // DELETE FROM plugin_msg where id in (select id from (select id from plugin_msg order by ts ASC limit 20) x)
        deletePluginMsgByNum: function(d, callback) {
            _db.transaction(function(tx) {
                tx.executeSql("DELETE FROM plugin_msg where id in (select id from (select id from plugin_msg order by ts ASC limit ?) x)", [d], function(tx, rs) {
                    if(typeof callback=="function") callback(rs);
                });
            }, function(err){
               console.warn(err.message);
            });
        },
        
        // update DB 'dlist' all status = 2(cancel), if status = 0.(add new)
        initDlistAllStatus: function(callback) {
            _db.transaction(function(tx) {
                tx.executeSql("UPDATE dlist SET status = 2 where status = 0", [], function(tx, rs) {
                    if(typeof callback=="function") callback(rs);
                });
            }, function(err){
               console.warn(err.message);
            });
        },
        
        // when restart, clean all useless data.
        initPluginMsg: function(callback) {
            _db.transaction(function(tx) {
                tx.executeSql("DELETE FROM plugin_msg where action != 'DLComplete'", [], function(tx, rs) {
                    if(typeof callback=="function") callback(rs);
                });
            }, function(err){
               console.warn(err.message);
            });
        },
        
        clearAfterComplete: function(vid, callback) {
            _db.transaction(function(tx) {
                tx.executeSql("DELETE FROM plugin_msg where vid = ? and action != 'DLComplete'", [vid], function(tx, rs) {
                    if(typeof callback=="function") callback(rs);
                });
            }, function(err){
               console.warn(err.message);
            });
        },
        
        updateDlistStatusByVID: function(vid, status, callback) {
            _db.transaction(function(tx) {
                var ts = _curTS();
                tx.executeSql("UPDATE dlist set status = ?, complete_at = ? where video_id = ?", [status, ts, vid], function(tx, rs) {
                    if(typeof callback=="function") callback(rs);
                });
            }, function(err){
               console.warn(err.message);
            });
        },
        
        /**
         * arr{ title: , dir: , comment: , video_id: }
        **/
        updateByEdit: function(arr, callback) {
            _db.transaction(function(tx) {
                tx.executeSql("UPDATE dlist set title = ?, dir = ?, comment = ? where video_id = ?", [arr.title, arr.dir, arr.comment, arr.video_id], function(tx, rs) {
                    if(typeof callback=="function") callback(rs);
                });
            }, function(err){
               console.warn(err.message);
            });
        },
        
        updateDlistDirPathByVID: function(vid, path, callback) {
            _db.transaction(function(tx) {
                tx.executeSql("UPDATE dlist set dir = ? where video_id = ?", [path, vid], function(tx, rs) {
                    if(typeof callback=="function") callback(rs);
                });
            }, function(err){
               console.warn(err.message);
            });
        },
        
        // if no data in plugin_msg, every 30min for reset auto_inc to 1.
        resetAutoInc: function(callback) {
            _db.transaction(function(tx) {
                tx.executeSql("SELECT * FROM plugin_msg limit 1", [], function(tx, rs) {
                    if(rs.rows.length==0) {
                        tx.executeSql("UPDATE sqlite_sequence set seq = ? where name = 'plugin_msg'", [1], function(tx, rs) {
                            if(typeof callback=="function") callback(rs);
                        });
                    }
                });
            }, function(err){
               console.warn(err.message);
            });
        },
        
        getCount: function(table, callback) {
            _db.readTransaction(function(tx) {
                tx.executeSql("SELECT COUNT(*) AS total from "+table, [], function(tx, rs) {
                    var _total = rs.rows.item(0).total || 0;
                    if(typeof callback=="function") callback(_total);
                });
            }, function(err){
               console.warn(err.message);
            });
        },
        
        /**
         * Search in title and comment, get 'video_id' first. 
         * Then merge by 'video_id'. 
        **/
        searchByLike: function(str, callback) {
            /* Search by 'Like' will be very slow, 
            *  maybe here we can make a indexed file to access.
            */
            _db.readTransaction(function(tx) {
                tx.executeSql("SELECT * from dlist where title like '%"+str+"%'", [], function(tx, rs) {
                    var rows = rs.rows,
                        len = rows.length,
                        output = new Array(),
                        sets = new Array();
                    
                    for(var i=0; i<len; i++) {
                        sets.push(rows.item(i).video_id);
                        output.push(rows.item(i));
                    }
                    
                    tx.executeSql("SELECT * from dlist where comment like '%"+str+"%'", [], function(tx, rs) {
                        rows = rs.rows
                        len = rows.length;
                        
                        for(var i=0; i<len; i++) {
                            output.push(rows.item(i));
                        }
                        
                        var listID = new Array(),
                            result = new Array();
                        // merge
                        for(var i=0; i<output.length; i++) {
                            if( THK.in_array(output[i].video_id, listID) ) {
                                
                            } else {
                                listID.push(output[i].video_id);
                                result.push(output[i]);
                            }
                        }
                        
                        if(typeof callback=="function") callback(result);
                    });
                });
            }, function(err){
               console.warn(err.message);
            });
        },
        
        
        exportAll: function(callback) {
            _db.readTransaction(function(tx) {
                tx.executeSql("SELECT * from dlist", [], function(tx, rs) {
                    var ret = "/* nicoDLN VERSION: "+VERSION+" */\r\n"+
                              "/* IF you want to merge all video's infomation, you can just comment out the next Two Line. */\r\n";
                    var rows = rs.rows, 
                        len = rows.length;
                    
                    var max_col = 19;
                    
                    ret += "DROP TABLE IF EXISTS dlist\r\n"
                    ret += "create table if not exists dlist (video_id text primary key, title text, comment text, thumb_img_url text, upload_at integer, length integer, hq_size integer, lq_size integer, total_view integer, total_comment integer, total_mylist integer, video_url text, video_ext text, dir text, userid text, download_at integer, complete_at integer, status integer, quality text)\r\n";
                    
                    for(var i=0; i<len; i++) {
                        ret += "INSERT INTO dlist(%__KEY__%) values (%__VALUE__%)";
                        var ct = 0;
                        for(var key in rows.item(i)) {
                            ct++;
                            var _value = ""+rows.item(i)[key]; // Need cast into String type
                            _value = _value.replace(/'/g, ""); // avoid "'" in sql.
                            
                            if(key=="status") {
                                if(_value=="0") {
                                    _value = "2";
                                }
                            }
                            
                            var k = key+",%__KEY__%";
                            var v = "'"+_value+"'"+",%__VALUE__%";
                            ret = ret.replace("%__KEY__%", k);
                            ret = ret.replace("%__VALUE__%", v);
                            
                            if(ct==max_col) {
                                ret = ret.replace(",%__KEY__%", "");
                                ret = ret.replace(",%__VALUE__%", "");
                            }
                        }
                        ret += "\r\n";
                    }
                    
                    if(typeof callback=="function") callback(ret);
                });
            }, function(err){
               console.warn(err.message);
            });
        },
        
        query: function(sql, callback) {
            _db.transaction(function(tx) {
                tx.executeSql(sql, [], function(tx, rs) {
                    if(typeof callback=="function") callback(rs);
                });
            }, function(err){
               console.warn(err.message);
            });
        },
        
        addIntoDLQueue: function(vid, callback) {
            _db.transaction(function(tx) {
                tx.executeSql("INSERT INTO dl_queue (video_id, mode, status) VALUES (?,?,?)", [vid, "high", 0], function(tx, rs) {
                    if(typeof callback=="function") callback(rs);
                });
            }, function(err){
               //console.warn(err.message);
            });
        },
        
        deleteFromDLQueue: function(vid, callback) {
            _db.transaction(function(tx) {
                tx.executeSql("DELETE FROM dl_queue WHERE video_id = ?", [vid], function(tx, rs) {
                    if(typeof callback=="function") callback(rs);
                });
            }, function(err){
               console.warn(err.message);
            });
        },
        
        /* limit 3 each time */
        getAllDLQueue: function(callback) {
            _db.transaction(function(tx) {
                tx.executeSql("SELECT * FROM dl_queue limit 3", [], function(tx, rs) {
                    if(typeof callback=="function") callback(rs);
                });
            }, function(err){
               console.warn(err.message);
            });
        }
    };
    

})();
