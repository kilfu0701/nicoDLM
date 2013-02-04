/**
 * Some validation functions.
 * 表格驗證用 (?)
 *
 * @Dependency: THK.js
 *
 * @author: kilfu0701, kilfu0701@gmail.com
**/

/* === Usage ===

function myCustom() {
    console.log('Do my custom validation.');
}

window.onload = function() {
    THK.Validate.init();
    var error = THK.Validate.set({
        formName : {
            file_format : {
                notEmpty : ["no empty plz !"],
                alphaNumeric : ["only number and character."],
                myCustom : ["asd"],
            }
        }
    });
    console.log(error);
}

*/
var THK = THK || {};

THK.Validate = (function() {
    var _this;
    var _reflection = [];
    var _errorMsg = [];
    
    return {
        /**
         * Initialize.
        **/
        init : function() {
            _this = _this || this;
            _reflection = [];
            _errorMsg = [];
            
            for(var i in _this) {
                _reflection.push(i);
            }
        },
        
        /**
         * Put validate dataset.
         *
         *   @dataset  
         *      ExampleData = {
         *        "formID" : {
         *          "inputName1" : { 
         *            "notEmpty" : "You should input a value!",
         *            "alphanumeric", "special characters not allowed!",
         *          },
         *          "inputName2" : { 
         *            "alphanumeric", "Hey! special characters not allowed HERE!",
         *          },
         *        }
         *      }
        **/
        set : function(dataset) {
            for(var k in dataset) {
                if(k=="none") {
                    // here no need to get form.
                    var formdoc = document;
                } else {
                    var formdoc = document.forms[k];
                }
                
                for(var input in dataset[k]) {
                    var ndoc = THK.get('input[name='+input+']', formdoc)[0];
                    var inputValue = ndoc && ndoc.value;
                
                    for(var condition in dataset[k][input]) {
                        var passArgs = dataset[k][input][condition];
                        passArgs.unshift(input);
                        passArgs.unshift(inputValue);
                        if(in_array(condition, _reflection)) {
                            this[condition](passArgs);
                        } else {
                            window[condition](passArgs);
                        }
                    }
                }
            }
            
            return _errorMsg;
        },
        
        /**
         * THK.Validate.notEmpty(args)
         *
         *   The basic rule to ensure that a field is not empty.
         *
         *   @args: array(value, name='', msg='')
        **/
        notEmpty : function() {
            var value = arguments[0][0],
                name = arguments[0][1],
                msg = arguments[0][2];
            
            if(value=="" || value==undefined) {
                _errorMsg.push([name, msg]);
                return false;
            } else {
                return true;
            }
        },
        
        /**
         * THK.Validate.alphaNumeric(args)
         *
         *   The data for the field must only contain letters and numbers.:
         *
         *   @args: array(value, name='', msg='')
        **/
        alphaNumeric: function() {
            var value = arguments[0][0],
                name = arguments[0][1] || "",
                msg = arguments[0][2] || "";
            
            if (value.match(/^[0-9a-z]+$/i)) {
                return true;
            } else {
                _errorMsg.push([name, msg]);
                return false;
            }
        },
        
        between : function() {
        
        },
        
        
    };
})();