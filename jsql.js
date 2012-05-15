/*
	--------------- jSQL ---------------
	a SQL like database using javascript
*/

(function() {
	var _jSQL, jSQL, _DB;
	
	if(typeof(this.jSQL) !== 'undefined') {
		_jSQL = this.jSQL;
	}
	
	jSQL = function() {
		this.init.apply(this,arguments);
	};
	
	jSQL.prototype = {
		init: function() {
			
		},
		create: function() {
			
		},
		use: function() {
			
		},
		count: function() {
			
		},
		orderby: function() {
			
		},
		where: function() {
			
		},
		iterate: function() {
			
		}
	};
	
	jSQL._jSQL = _jSQL;
	
	typeof(module) !== 'undefined' && module.exports ? module.exports = jSQL : this.jSQL = jSQL;
})();