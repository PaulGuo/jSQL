/*

{
    '0': {
        name: 'John',
        age: 15,
        website: ''
    },

    '1': {
        name: 'Mic Smith',
        age: 23,
        website: 'benben.cc'
    }
}

---------------------------------------
| INDEX | NAME      | AGE | WEBSITE   |
---------------------------------------
| 0     | John      | 15  |           |
---------------------------------------
| 1     | Mic Smith | 23  | benben.cc |
---------------------------------------

*/

(function() {
    var jdump, utils;
    
    jdump = function() {
        this.init.apply(this, arguments);
    };
    
    jdump.prototype = {
        version: '0.1.0-dev',

        init: function() {
            this.meta = {};
            this.output = '';
        },

        lineLen: function() {
            var len = 0, num = 0;
            utils.each(this.meta, function(o, i, r) {
                num++;
                len += 2 + o;
            });
            
            len += num + 1;
            return len;
        },

        genMeta: function(data) {
            var that = this;
            utils.each(data, function(o, i, r) {
                utils.each(o, function(o, i, r) {
                    var len = utils.getLength(o);
                    var titleLen = utils.getLength(i);
                    len = len > titleLen ? len : titleLen;
                    if(!that.meta[i] || len > that.meta[i]) {
                        that.meta[i] = len;
                    }
                });
            });
        },

        print: function(data) {
            var that = this;
            var lineLen, lineStr;
            var tmpStr;
            var titleStr;

            that.init();
            that.genMeta(data);
            lineLen = that.lineLen();
            lineStr = utils.fill('', lineLen, '-');
            console.log(that.meta);
            console.log(lineLen);

            utils.each(data, function(o, i, r) {
                if(!titleStr) {
                    that.echo(lineStr + '\n');
                    utils.each(o, function(o, i, r) {
                        tmpStr = '| ' + utils.fill(i, that.meta[i]) + ' ';
                        that.echo(tmpStr);
                    });
                    that.echo('|\n');
                    titleStr = true;
                    that.echo(lineStr + '\n');
                }
                //that.echo(lineStr + '\n');
                utils.each(o, function(o, i, r) {
                    tmpStr = '| ' + utils.fill(o, that.meta[i]) + ' ';
                    that.echo(tmpStr);
                });
                that.echo('|\n');
            });
            that.echo(lineStr);

            return that.output;
        },

        echo: function(str) {
            this.output += str;
        }
    };

    utils = {
        isArray: Array.isArray || function(obj) {
            return toString.call(obj) === '[object Array]';
        },

        isObject: function(obj) {
            return obj === Object(obj);
        },

        isPlainObject: function(obj) {
            return this.isObject(obj) && obj.constructor === Object;
        },

        each: function(list, fn) {
            if(this.isPlainObject(list)) {
                for(var i in list) {
                    if(list.hasOwnProperty(i)) {
                        fn(list[i], i, list);
                    }
                }
                return;
            }

            if(Array.prototype.forEach) {
                list.forEach(fn);
                return;
            }

            for(var i = 0; i < list.length; i++) {
                fn(list[i], i, list);
            }
        },

        getLength: function(str) {
            str = String(str);
            return str.match(/[^ -~]/g) == null ? str.length : str.length + str.match(/[^ -~]/g).length;
        },

        fill: function(str, len, char) {
            var cur_len = this.getLength(str);
            var fill_len = len - cur_len;
            char = char || ' ';
            if(this.getLength(str) < len) {
                str += char;
                str = arguments.callee.call(this, str, len, char);
            }
            return str;
        }
    };

    jdump = new jdump();
    
    typeof(module) !== 'undefined' && module.exports ? module.exports = jdump : this.jdump = jdump;
})();
