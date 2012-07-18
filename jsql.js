/*
    --------------- jSQL ---------------
    a SQL like database using javascript
    website: http://jsql.injs.org
    licence: MIT Licence
    version: 0.1.2 dev
    
    description: using jSQL to process the data easily.
*/

(function() {
    var push             = Array.prototype.push,
        slice            = Array.prototype.slice,
        unshift          = Array.prototype.unshift,
        toString         = Object.prototype.toString,
        hasOwnProperty   = Object.prototype.hasOwnProperty;

    var nativeForEach      = Array.prototype.forEach,
        nativeMap          = Array.prototype.map,
        nativeReduce       = Array.prototype.reduce,
        nativeReduceRight  = Array.prototype.reduceRight,
        nativeFilter       = Array.prototype.filter,
        nativeEvery        = Array.prototype.every,
        nativeSome         = Array.prototype.some,
        nativeIndexOf      = Array.prototype.indexOf,
        nativeLastIndexOf  = Array.prototype.lastIndexOf,
        nativeIsArray      = Array.isArray,
        nativeKeys         = Object.keys,
        nativeBind         = Function.prototype.bind;

    var _jSQL, jSQL, _DB = {};
    
    if(typeof(this.jSQL) !== 'undefined') {
        _jSQL = this.jSQL;
    }
    
    jSQL = function() {
        this.init.apply(this,arguments);
    };
    
    jSQL.prototype = {
        init: function() {
            this._jSQL = _jSQL;
            this._DB = _DB;
            this._currentDB = null;
            this._buffer = null;
        },

        /**
        * create a new database
        * @param dbname [String]
        * @param db [Object]
        */

        create: function(dbname, db) {
            if(this._DB.hasOwnProperty(dbname)) {
                throw('DB Already Exist.');
            }
            
            this._DB[dbname] = db;
            return this;
        },

        /**
        * select an exist database as current
        * @param dbname [String]
        */

        use: function(dbname) {
            if(!this._DB.hasOwnProperty(dbname)) {
                throw('Database Not Exist.');
            }

            this._currentDB = this._DB[dbname];
            return this;
        },

        /**
        * drop an exist database
        * @param dbname [String]
        */

        drop: function(dbname) {
            if(this._DB.hasOwnProperty(dbname)) {
                delete this._DB[dbname];
            }
        },

        /**
        * select object from currentDB
        * @param key
            '*':     return all
            'a':     return base value which key is 'a'
            'a.b.c': return deep value a->b->c
        *
        */

        select: function(key) {
            if(!this._currentDB) {
                throw('Please Select Database First.');
            }
            
            this._buffer = this._currentDB; //reset the _buffer
            
            if(key==='*') {
                return this;
            }
            
            this.where(function(data) {
                return typeof(this._deep(data, key)) !== 'undefined';
            });
            
            return this;
        },

        /**
        * get the count of current result set
        */

        count: function() {
            return this._objectToArray(this._buffer).length;
        },
        
        /**
        * calculate the total of spec key
        * @param key
            '*':     return first package key count
            'a':     return base value which key is 'a'
            'a.b.c': return deep value a->b->c
        *
        * @use [jSQL instance].total('a.b.c')
        */
        
        total: function(scope) {
            var rs = 0, _tmp;
            
            for(var _key in this._currentDB) {
                if(this._currentDB.hasOwnProperty(_key)) {
                    _tmp = scope === '*' ? 
                        this._currentDB[_key] : 
                        typeof(scope) === 'function' ? 
                            scope.call(this, this._currentDB[_key], _key) === true ? true : undefined : 
                            this._deep(this._currentDB[_key], scope);
                    
                    if(typeof(_tmp) !== 'undefined') {
                        rs++;
                    }
                }
            }
            
            return rs;
        },

        /**
        * sort the current result set
        * @param field [String]
        * @param callback [function]
        * @param order [String <asc | desc>]
        */

        orderby: function(field, callback, order) {
            var _array = this._objectToArray(this._buffer);
            var _this = this;
            
            if(typeof(callback) !== 'function') {
                callback = [order, order = callback][0];
            }
            
            _array.sort(function(a, b) {
                a = _this._deep(a, field);
                b = _this._deep(b, field);
                if(callback) {
                    a = callback(a);
                    b = callback(b);
                }
                return  order && order.toLowerCase() === 'asc' ? a - b : b - a;
            });
            
            this._buffer = this._arrayToObject(_array);
            return this;
        },

        where: function(fn) {
            var _tmp = {}, _swap;
            this._buffer = this._buffer || this._currentDB;
            
            for(var i in this._buffer) {
                if(this._buffer.hasOwnProperty(i)) {
                    if(typeof(fn) === 'function') {
                        _swap = fn.call(this, this._buffer[i], i);
                    }

                    if(this._isArray(fn)) {
                        _swap = false;

                        for(var f in fn) {
                            if(fn.hasOwnProperty(f)) {
                                if(fn[f].call(this, this._buffer[i], i)) {
                                    _swap = true;
                                }
                            }
                        }
                    }
                    
                    if(_swap) {
                        _tmp[i] = this._buffer[i];
                    }
                }
            }
            this._buffer = _tmp;
            return this;
        },

        iterate: function(fn) {
            var _swap;
            this._buffer = this._buffer || this._currentDB;
            
            for(var i in this._buffer) {
                if(this._buffer.hasOwnProperty(i)) {
                    _swap = fn.call(this, this._buffer[i]);
                    
                    if(_swap) {
                        this.update(i, _swap);
                    }
                }
            }
        },

        /**
        * return the current result set
        * @return [Object]
        */

        findAll: function() {
            return this._buffer;
        },

        /**
        * return a specified item of current result set
        * if the key doesn't given, it'll return the first item
        * @return [Object]
        */

        find: function(key) {
            if(!key) {
                for(var i in this._buffer) {
                    if(key) {
                        break;
                    }
                    
                    if(this._buffer.hasOwnProperty(i)) {
                        key = i;
                    }
                }
            }
            
            return this._buffer[key];
        },
        
        /**
        * return the current result set as array list
        * @return [Object]
        */

        listAll: function() {
            return this._objectToArray(this._buffer);
        },
        
        /**
        * update the current result set
        * @param key [String]
        * @param data [Object]
        */
        
        update: function(key, data) {
            if(!this._currentDB) {
                throw('Please Select Database First.');
            }
            
            if(this._currentDB.hasOwnProperty(key)) {
                this._currentDB[key] = data;
            }
        },
        
        /**
        * limie the current result set
        * @param start [Number]
        * @param end [Number]
        */
        
        limit: function(start, end) {
            var _tmp = this._objectToArray(this._buffer);
            
            if(!end) {
                start = [0, end = start][0];
            }
            
            this._buffer = this._arrayToObject(_tmp);
        },

        /**
        * private methods
        */
        
        _deep: function(data, scope) {
            var _tmp = data, scope = scope.split('.');
            for(var i = 0; i < scope.length; i++) {
                _tmp = _tmp[scope[i]];
            }
            return _tmp;
        },

        _isArray: nativeIsArray || function(obj) {
            return toString.call(obj) === '[object Array]';
        },

        _isObject: function(obj) {
            return obj === Object(obj);
        },

        _clone: function(obj) {
            var _tmp = {};
            
            if (!this._isObject(obj)) return obj;
            if(this._isArray(obj)) return obj.slice();
            
            for(var i in obj) {
                if(obj.hasOwnProperty(i)) {
                    _tmp[i] = obj[i];
                }
            }
            return _tmp;
        },

        _objectToArray: function(object) {
            var array = [], object = this._clone(object);
            
            for(var i in object) {
                if(object.hasOwnProperty(i)) {
                    object[i].__jSQL_Key = i;
                    array.push(object[i]);
                }
            }
            
            return array;
        },

        _arrayToObject: function(array, key) {
            var object = {};
            
            for(var i = 0; i < array.length; i++) {
                object[array[i][key || '__jSQL_Key']] = array[i];
                delete object[array[i][key || '__jSQL_Key']][key || '__jSQL_Key'];
            };
            
            return object;
        }
    };
    
    typeof(module) !== 'undefined' && module.exports ? module.exports = jSQL : this.jSQL = jSQL;
})();
