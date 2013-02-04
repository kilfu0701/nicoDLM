/**
 * Some Math function.
 * 數學相關函式 
 * 
 * @Dependency: THK.js (NOT required)
 *
 * author: kilfu0701, kilfu0701@gmail.com
**/
var THK = THK || {};

THK.Math = (function() {
    var _;

    return {
        init : function() {
        
        },
        
        /**
         * Implement  1.0/sqrt(float)
         *   ref: ( http://gamedev.stackexchange.com/questions/30727/implement-fast-inverse-square-root-in-javascript )
        **/
        Q_rsqrt : function(number) {
            var buf = new ArrayBuffer(Float32Array.BYTES_PER_ELEMENT);
            var fv = new Float32Array(buf);
            var lv = new Uint32Array(buf);
            var threehalfs = 1.5;
            var x2 = number * 0.5;
            fv[0] = number;
            lv[0] = 0x5f3759df - ( lv[0] >> 1 );
            var y = fv[0];
            y = y * ( threehalfs - ( x2 * y * y ) );

            return y;
        }
    
    
    };
})();