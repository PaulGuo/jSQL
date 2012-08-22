/**
 * print_r()
 * string print_r (mixed object [, boolean view = false])
 * Prints human-readable information about the object
 * @author: Alexander Guinness
 * @version: 1.1
 * @params: {mixed} data - the Object to be printed
 * @params: {boolean} view - optional boolean parameter to set an alternative view
 * @return String
 * @license: MIT
 * @date: 2/27/12 9:28 PM
**/

var print_r = function(data, view) {
	'use strict'

	/*
	- string build (mixed data [, string indent = ''])
	*/
	return function build(data, indent) {
		return {
			init: function() {
				if (this.type(data) === 'object')
					this.depth(0);

				else if (this.type(data) === 'array')
					this.depth(1);

				else
					this.output.push({
						'string':   '"' + data + '"',
						'function': data.toString().replace(/\b.*\n|\}$/g, '\t$&').replace(/^\t/, ' ')
					}[this.type(data)] || data);

				return this.output.join('');
			},

			output : [],

			/*
			 - string type (object type)
			 */
			type: function(type) {
				return Object.prototype.toString.call(type).replace(/object|[\[\]\s]/g, '').toLowerCase();
			},

			/*
			 - string type (mixed key, boolean array)
			 */
			get_view: function(key, array) {
				return (view || array ? ['\t[', key, '] => '] : ['\t', key, ': ']).join('');
			},

			/*
			 - void depth (number array)
			 */
			depth: function(array) {
				indent = indent || '';

				var brace = [['{', '}'], ['[', ']']][array],
					block = [brace[0], '\n'];

				for (var i in data) {
					if (data.hasOwnProperty(i))
						block.push(indent, this.get_view(i, array), build(data[i], indent + '\t'), ',', '\n');
				}
				block.splice(-2, 1);
				this.output.push(block.join(''), indent, brace[1]);
			}
		}.init();
	}(data);
};

//exports.print_r = print_r;