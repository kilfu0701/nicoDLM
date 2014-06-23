/**
 * THK Class and some basic functions, constants. (Load this script at top) 
 * ( THK class, 基本函式, 常數 )
 *
 * @Dependency: 
 * 
 * author: kilfu0701, kilfu0701@gmail.com
**/

/* For debug. */
var G_DEBUG = false;

/* Global Vars */
var G_DL_DIR = "C:/",
    G_DEFAULT_LANG = "default",
    G_FILE_FORMAT = "[%ID%] %TITLE%",
    G_COMMENT_FILE_FORMAT = "[%ID%] %TITLE% [%COMMENT%]",
    VERSION = '0.2.0',
    RELEASE = '2014/06/22';

var NICO_URL = "www.nicovideo.jp/watch/";
var NICO_REG_URL = new RegExp( NICO_URL );


/**
 * Bulid THK class object.
**/
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
     * for Debug
    **/
    if( G_DEBUG==undefined) 
        var G_DEBUG = false;
    
    if( _D==undefined ) {
        function _D(object){
            try { 
                if(G_DEBUG==false)
                    return ;
                
                throw Error('') 
            } catch(err) {
                var caller_line = err.stack.split("\n")[3];
                var index = caller_line.indexOf("at ");
                var clean = caller_line.slice(index+2, caller_line.length);
                console.log("%o  "+clean, object);
            }
        }
    }
    
    
    /**
     * Build THK Class
     */
    if(typeof THK=='undefined'){
        var THK = Class.extend({});
        THK.debug = true;
        
        THK.init = function() {
            _D("Init THK...");
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
                _D(e);
                return ret; // Error Occur! 
            }
        }
        
        THK.in_array = in_array;
        
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
            //_D(response);
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





/* check if this url is niconico */
function isNicoURL( uri ) {
    return ( uri.match(NICO_REG_URL) != undefined );
}

/* Load javascript file into html */
function LoadScript(scriptName) {
    var elm = document.createElement('script');
    elm.type = "text/javascript";
    elm.src = scriptName;
    document.body.appendChild(elm);
}

function str_repeat(i, m) {
    for (var o = []; m > 0; o[--m] = i);
    return o.join('');
}

function sprintf() {
    var i = 0, a, f = arguments[i++], o = [], m, p, c, x, s = '';
    while (f) {
        if (m = /^[^\x25]+/.exec(f)) {
            o.push(m[0]);
        }
        else if (m = /^\x25{2}/.exec(f)) {
            o.push('%');
        }
        else if (m = /^\x25(?:(\d+)\$)?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(f)) {
            if (((a = arguments[m[1] || i++]) == null) || (a == undefined)) {
                throw('Too few arguments.');
            }
            if (/[^s]/.test(m[7]) && (typeof(a) != 'number')) {
                throw('Expecting number but found ' + typeof(a));
            }
            switch (m[7]) {
                case 'b': a = a.toString(2); break;
                case 'c': a = String.fromCharCode(a); break;
                case 'd': a = parseInt(a); break;
                case 'e': a = m[6] ? a.toExponential(m[6]) : a.toExponential(); break;
                case 'f': a = m[6] ? parseFloat(a).toFixed(m[6]) : parseFloat(a); break;
                case 'o': a = a.toString(8); break;
                case 's': a = ((a = String(a)) && m[6] ? a.substring(0, m[6]) : a); break;
                case 'u': a = Math.abs(a); break;
                case 'x': a = a.toString(16); break;
                case 'X': a = a.toString(16).toUpperCase(); break;
            }
            a = (/[def]/.test(m[7]) && m[2] && a >= 0 ? '+'+ a : a);
            c = m[3] ? m[3] == '0' ? '0' : m[3].charAt(1) : ' ';
            x = m[5] - String(a).length - s.length;
            p = m[5] ? str_repeat(c, x) : '';
            o.push(s + (m[4] ? a + p : p + a));
        } else {
            throw('Huh ?!');
        }
        f = f.substring(m[0].length);
    }
    return o.join('');
}    

function getTimestamp() {
    return Math.round(new Date().getTime() / 1000);
}

function getDate(ts) {
    var timestamp = ts || getTimestamp() || 1301090400,
        date = new Date(timestamp * 1000),
        datevalues = [
             date.getFullYear()
            ,date.getMonth()+1
            ,date.getDate()
            ,date.getHours()
            ,date.getMinutes()
            ,date.getSeconds()
         ];
    
    return datevalues;
}

function trace(msg) {
    if (THK.debug) {
        if (window.console) {
            console.log(msg);
        } else if ( typeof( jsTrace ) != 'undefined' ) {
            jsTrace.send( msg );
        } else {}
    }
}

function addCommas(nStr) {
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}

function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint16Array(buf));
}

function str2ab(str) {
    var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
    var bufView = new Uint16Array(buf);
    for (var i=0, strLen=str.length; i<strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

/**
 * for Debug
**/
function _D(object){
    try { 
        if(G_DEBUG==false)
            return ;
        
        throw Error('') 
    } catch(err) {
        var caller_line = err.stack.split("\n")[3];
        var index = caller_line.indexOf("at ");
        var clean = caller_line.slice(index+2, caller_line.length);
        console.log("%o  "+clean, object);
    }
}

function in_array (needle, haystack, argStrict) {
  // http://kevin.vanzonneveld.net
  // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   improved by: vlado houba
  // +   input by: Billy
  // +   bugfixed by: Brett Zamir (http://brett-zamir.me)
  // *     example 1: in_array('van', ['Kevin', 'van', 'Zonneveld']);
  // *     returns 1: true
  // *     example 2: in_array('vlado', {0: 'Kevin', vlado: 'van', 1: 'Zonneveld'});
  // *     returns 2: false
  // *     example 3: in_array(1, ['1', '2', '3']);
  // *     returns 3: true
  // *     example 3: in_array(1, ['1', '2', '3'], false);
  // *     returns 3: true
  // *     example 4: in_array(1, ['1', '2', '3'], true);
  // *     returns 4: false
  var key = '',
    strict = !! argStrict;

  if (strict) {
    for (key in haystack) {
      if (haystack[key] === needle) {
        return true;
      }
    }
  } else {
    for (key in haystack) {
      if (haystack[key] == needle) {
        return true;
      }
    }
  }

  return false;
}