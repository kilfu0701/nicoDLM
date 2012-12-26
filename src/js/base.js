/**
 * Some basic functions, constants. (Load this script at top)
 * 基本函式, 常數 
**/

/* Global Vars */
var G_DL_DIR = "C:/",
    G_DEFAULT_LANG = "default",
    VERSION = '0.1.4',
    RELEASE = '2012/12/26';


var NICO_URL = "www.nicovideo.jp/watch/";
var NICO_REG_URL = new RegExp( NICO_URL );
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

function getDate() {
    var timestamp = 1301090400
      , date = new Date(timestamp * 1000)
      , datevalues = [
             date.getFullYear()
            ,date.getMonth()+1
            ,date.getDate()
            ,date.getHours()
            ,date.getMinutes()
            ,date.getSeconds()
         ];
    //alert(datevalues);
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
