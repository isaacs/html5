var HTML5 = require('html5/parser').HTML5;
var assert = require('assert');

exports.Phase = function Phase(parser, tree) {
	this.tree = tree;
	this.parser = parser;
	this.end_tag_handlers = {"-default": 'endTagOther'};
	this.start_tag_handlers = {"-default": 'startTagOther'};
}

exports.Phase.prototype = {
	parse_error: function(code, options) {
		HTML5.debug('parser.parse_error', code)
		this.parser.parse_error(code, options);
	},
	processEOF: function() {
		this.tree.generateImpliedEndTags();
		if(this.tree.open_elements.length > 2) {
			this.parse_error('expected-closing-tag-but-got-eof');
		} else if(this.tree.open_elements.length == 2
			&& this.tree.open_elements[1].tagName != 'body') {
			// This happens for framesets or something?
			this.parse_error('expected-closing-tag-but-got-eof');
		} else if(this.parser.inner_html && this.tree.open_elements.length > 1) {
			// XXX This is not what the specification says. Not sure what to do here.
			this.parse_error('eof-in-innerhtml');
		}
	},
	processComment: function(data) {
		// For most phases the following is correct. Where it's not it will be 
		// overridden.
		this.tree.insert_comment(data, this.tree.open_elements.last());
	},
	processDoctype: function(name, publicId, systemId, correct) {
		this.parse_error('unexpected-doctype');
	},
	processSpaceCharacters: function(data) {
		this.tree.insert_text(data);
	},
	processStartTag: function(name, attributes, self_closing) {
		if(this[this.start_tag_handlers[name]]) {
			this[this.start_tag_handlers[name]](name, attributes, self_closing);
		} else if(this[this.start_tag_handlers["-default"]]) {
			this[this.start_tag_handlers["-default"]](name, attributes, self_closing);
		} else {
			throw(new Error("No handler found for "+name));
		}
	},
	processEndTag: function(name) {
		if(this[this.end_tag_handlers[name]]) {
			this[this.end_tag_handlers[name]](name);
		} else if(this[this.end_tag_handlers["-default"]]) {
			this[this.end_tag_handlers["-default"]](name);
		} else {
			throw(new Error("No handler found for "+name));
		}
	},
	inScope: function(name) {
		return this.tree.elementInScope(name);
	},
	remove_open_elements_until: function(nameOrCb) {
		var finished = false;
		while(!finished && this.tree.open_elements.length != 0) {
			var element = this.tree.open_elements.pop();
			HTML5.debug('parser.popTag', 'removing ' + element.tagName);
			finished = (typeof nameOrCb == 'function' ? nameOrCb(element) : element.tagName == nameOrCb);
		}
		return element;
	},
	startTagHtml: function(name, attributes) {
		if(this.parser.first_start_tag == false && name == 'html') {
			this.parse_error('non-html-root')
		}
		// XXX Need a check here to see if the first start tag token emitted is this token. . . if it's not, invoke parse_error.
		for(k in attributes) {
			if(!this.tree.open_elements[0].attributes[k]) {
				this.tree.open_elements[0].attributes[k] = attributes[k];
			}
		}
		this.parser.first_start_tag = false;
	}
}

