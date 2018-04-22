(function (name, definition) {
    if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
        module.exports = definition();
    } else if (typeof define === 'function' && typeof define.amd === 'object') {
        define(definition);
    } else {
        this[name] = definition();
    }
})('html2bbcode', function (html2bbcode) {

    'use strict';

    html2bbcode = { version: '1.2.3' };

    //function HTMLAttribute()

    function HTMLTag() {
        this.name = '';
        this.length = 0;
        //this.attr = null;
        //this.content = null;
    }

    HTMLTag.duptags = ['div', 'span'];
    HTMLTag.headingtags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    HTMLTag.selfendtags = ['!doctype', 'meta', 'link','img', 'br'];
    HTMLTag.newlinetags = ['div', 'p', 'br', 'li', 'tr'].concat(HTMLTag.headingtags);
    HTMLTag.noemptytags = ['head', 'style', 'script',
        'span', 'a', 'font', 'color', 'size', 'face',
        'strong', 'b', 'em', 'i', 'del', 's', 'ins', 'u'];
    HTMLTag.noemptyattrtags = ['img'];

    HTMLTag.prototype.findquoteend = function (script, start, multiline) {
        var end = -1;
        var i = start ? start : 0;
        var len = script.length;
        var d = script[i] === '\"';

        i++;
        while (i < len) {
            if (script[i] === '\\') {
                i++;
                switch (script[i]) {
                    case 'u':
                        // \uXXXX
                        i += 5;
                        break;
                    case 'x':
                        // \xXX
                        i += 3;
                        break;
                    default:
                        // \n ...
                        i++;
                        break;
                }
            } else if ((d && script[i] === '\"') || (!d && script[i] === '\'')) {
                end = i;
                break;
            } else if (script[i] === '\n' && !multiline) {
                // not allow change line
                break;
            } else {
                i++;
            }
        }

        return end;
    };

    HTMLTag.prototype.findscriptend = function (script, start) {
        var end = -1;
        var i = start ? start : 0;
        var len = script.length;
        var freg = /(['"]|<\s*?\/\s*?script\s*?>)/ig;

        while (i < len) {
            if (script[i] === '\"' || script[i] === '\'') {
                var qi = this.findquoteend(script, i, true);
                if (qi === -1) {
                    break;
                }
                i = qi + 1;
            } else {
                freg.lastIndex = i;
                var m = freg.exec(script);
                if (!m || m.length <= 0) {
                    break;
                } else if (m[0][0] === '<') {
                    //script here
                    end = freg.lastIndex - m[0].length;
                    break;
                }
                // quote
                i = freg.lastIndex - 1;
                //console.log(i, script.substr(i, 5));
                continue;
            }
        }
        return end;
    };

    HTMLTag.prototype.quote = function (quotation) {
        // convert string type
        if (quotation[0] === '\'') {
            var s = '"';
            var i = 1;
            var len = quotation.length - 1; // last is \'
            var start = i;
            while (i < len) {
                if (quotation[i] === '\\') {
                    i++;
                    switch (quotation[i]) {
                        case 'u':
                            // \uXXXX
                            i += 5;
                            break;
                        case 'x':
                            // \xXX
                            i += 3;
                            break;
                        default:
                            // \n ...
                            i++;
                            break;
                    }
                } else if (quotation[i] === '\"') {
                    s += quotation.substr(start, i - start);
                    s += '\\"';
                    i++;
                    start = i;
                    break;
                } else {
                    i++;
                }
            }
            if (start < len) {
                s += quotation.substr(start, len - start);
            }
            s += '"';
            return s;
        } else {
            return quotation;
        }
    };

    HTMLTag.prototype.parseStyle = function (style) {
        var ss = style.split(';');
        var r_style = {};
        var count = 0;
        for (var i = 0; i < ss.length; i++) {
            var s = ss[i].split(':');
            if (s.length >= 2) {
                count++;
                var val;
                if (s.length > 2) {
                    // eg. url(http://example.com)
                    val = s.slice(1).join(':').trim();
                } else {
                    val = s[1].trim();
                }
                if (val[0] === '\'' && val[val.length - 1] === '\'') {
                    try {
                        val = JSON.parse(this.quote(val));
                    } catch (err) {
                    }
                }
                r_style[s[0].trim().toLowerCase()] = val;
            }
        }
        if (count > 0) {
            return r_style;
        } else {
            return undefined;
        }
    };

    HTMLTag.prototype.parseAttributes = function (attr) {
        attr = attr.trim();
        var blank = /\s/;
        var i = 0;
        var len = attr.length;
        var start = i;
        var lastkey = null;
        var invalue = false;
        var r_attr = {};
        var add_attr = function (k, v) {
            if (typeof v === 'undefined') {
                v = null;
            }
            k = k.trim().toLowerCase();
            r_attr[k] = v;
        };
        while (i < len) {
            if (attr[i] === '=') {
                // TODO: check lastkey, currently drop previous lastkey
                lastkey = attr.substr(start, i - start);
                invalue = false;
            } else if (blank.test(attr[i])) {
                if (lastkey && invalue) {
                    add_attr(lastkey, attr.substr(start, i - start));
                    invalue = false;
                    lastkey = null;
                } else if (i - start > 0) {
                    lastkey = attr.substr(start, i - start);
                    add_attr(lastkey);
                    lastkey = null;
                }
                start = i + 1;
            } else if (lastkey && !invalue) {
                start = i;
                if (attr[i] === '"' || attr[i] === '\'') {
                    var b = attr[i] === '\'';
                    i = this.findquoteend(attr, i);
                    if (i === -1) {
                        break;
                    }
                    var v = attr.substr(start, i + 1 - start);
                    if (b) {
                        v = this.quote(v);
                    }
                    try {
                        v = JSON.parse(v);
                    } catch (e) {
                    }
                    add_attr(lastkey, v);
                    lastkey = null;
                    start = i + 1;
                } else {
                    invalue = true;
                }
            }
            i++;
        }
        if (start < len) {
            var d = attr.substr(start);
            if (lastkey) {
                add_attr(lastkey, d);
            } else {
                add_attr(d);
            }
            lastkey = null;
        }
        var count = 0;
        for (var k in r_attr) {
            count++;
        }
        if (count > 0) {
            if (r_attr.style) {
                r_attr.style = this.parseStyle(r_attr.style);
            }
            this.attr = r_attr;
        }
    };

    HTMLTag.prototype.parse = function (html) {
        var i = 0;
        if (html[i] !== '<') {
            throw new Error('not a tag');
        }
        var len = html.length;
        var blank = /\s/;
        //var htmltagq = /[<>]/;
        // strip tagname head blank
        while (i < len) {
            if (html[i] === '<') {
                i++;
            } else if (html[i] === '>') {
                // drop this empty tag
                this.length = i + 1;
                return this;
            } else if (blank.test(html[i])) {
                i++;
            } else {
                break;
            }
        }
        if (i >= len) {
            // drop this
            this.length = len;
            return this;
        }

        // name
        var start = i;
        var tagheadend = false;
        while (i < len && !blank.test(html[i])) {
            if (html[i] === '>') {
                tagheadend = true;
                break;
            } else if (html[i] === '/') {
                break;
            }
            i++;
        }
        if (i >= len) {
            // drop this
            this.length = i;
            return this;
        }
        this.name = html.substr(start, i - start).trim().toLowerCase();
        if (this.name.length > 0 && this.name[0] === '/') {
            this.length = i;
            this.name = this.name.substr(1);
            this.selfend = true;
            return this;
        }
        if (HTMLTag.selfendtags.indexOf(this.name) >= 0) {
            this.selfend = true;
        }

        // attr
        if (!tagheadend) {
            start = i;
            while (i < len && html[i] !== '>') {
                i++;
            }
            if (i >= len) {
                // drop this
                this.length = i;
                return this;
            } else if (i - start > 0) {
                var sattr = html.substr(start, i - start).trim();
                var attrlen = sattr.length;
                if (attrlen > 0 && sattr[attrlen - 1] === '/') {
                    this.selfend = true;
                    sattr = sattr.substr(0, attrlen - 1);
                }
                this.parseAttributes(sattr);
            }
        }
        i++; // skip '>'

        if (this.selfend) {
            this.length = i;
            return this;
        }

        // content
        var that = this;
        var add_content = function (html) {
            var hstack = new HTMLStack().parse(html);
            if (that.content) {
                that.content.append(hstack);
            } else {
                that.content = hstack;
            }
            return hstack.length;
        };

        if (this.name === 'script') {
            var script_len = this.findscriptend(html.substr(i));
            if (script_len < 0) {
                this.length = len;
                return this;
            }

            this.content = new HTMLStack();
            var script = html.substr(i, script_len);
            this.content.length = script_len;
            this.content.stack = [ script ];

            i += script_len;
            // script tag end
            start = html.indexOf('>', i);
            if (start < 0) {
                // no possible
                this.length = len;
                return this;
            }

            this.length = start + 1;
            return this;
        }

        var j = 0;
        while (i < len) {
            // loop to tag end
            j++;
            start = i;

            while (i < len && blank.test(html[i])) {
                i++;
            }

            while (i < len && html[i] !== '<') {
                i++;
            }

            var i_tagend = i;
            i++;
            while (i < len && blank.test(html[i])) {
                i++;
            }

            if (i >= len) {
                // drop this
                this.content = new HTMLStack().parse(html.substr(start));
                this.length = len;
                return this;
            } else {
                if (i < len && html[i] === '/') {
                    i++;
                    while (i < len && blank.test(html[i])) {
                        i++;
                    }
                    if (i >= len) {
                        // drop this
                        i += add_content(html.substr(start));
                        this.length = len;
                        return this;
                    } else {
                        var t_start = i;
                        var t_tagheadend = false;
                        while (i < len && !blank.test(html[i])) {
                            if (html[i] === '>') {
                                t_tagheadend = true;
                                break;
                            }
                            i++;
                        }
                        if (i > t_start) {
                            if (!t_tagheadend) {
                                while (i < len && html[i] !== '>') {
                                    i++;
                                }
                            }
                            var ename = html.substr(t_start, i - t_start).trim().toLowerCase();
                            i++; //skip '>'
                            // force stop current tag
                            /*if (ename === this.name)*/ {
                                // end of tag
                                this.length = i;
                                if (i_tagend > start) {
                                    // add content
                                    add_content(html.substr(start, i_tagend - start));
                                }
                                return this;
                            }
                        }
                    }
                }
            }

            i = start + add_content(html.substr(start));
        }

        this.length = i;
        return this;
    };

    function HTMLStack() {
        this.stack = [];
        this.length = 0;
    }

    HTMLStack.prototype.parse = function (html) {
        // check first...
        if (!html) {
            return this;
        }

        var i = 0;
        var len = html.length;
        var lasttagend = 0;
        var blank = /\s/;
        var that = this;
        var push_plaintext = function (start, end) {
            if (start < end) {
                that.push(html.substr(start, end - start));
            }
        };
        while (i < len) {
            switch (html[i]) {
                case '<':
                    push_plaintext(lasttagend, i);

                    // check end & drop
                    var t_i = i + 1;
                    while (t_i < len && blank.test(html[t_i])) {
                        t_i++;
                    }
                    if (t_i < len && html[t_i] === '/') {
                        return this;
                    }

                    var tag = new HTMLTag().parse(html.substr(i));
                    this.push(tag);
                    i += tag.length;
                    lasttagend = i;
                    break;
                case '>':
                    // TODO: drop the >
                    i++;
                    break;
                default:
                    i++;
                    break;
            }
        }
        push_plaintext(lasttagend, len);
        return this;
    };

    HTMLStack.prototype.push = function (data) {
        this.length += data.length;
        this.stack.push(data);
    };

    HTMLStack.prototype.pop = function () {
        return this.stack.pop();
    };

    HTMLStack.prototype.append = function (hstack) {
        this.stack = this.stack.concat(hstack.stack);
        this.length += hstack.length;
    };

    (function () {
        var dupRegex = new RegExp(
            '<\\s*?(' + HTMLTag.duptags.join('|') + ')\\s*?>\\s*?'
            + '<\\s*?\\1\\s*?>'
            + '(((?!<\\s*?\\1\\s*?>)[\\S\\s])*?)'
            + '<\\s*?/\\s*?\\1\\s*?>\\s*?'
            + '<\\s*?/\\s*?\\1\\s*?>', 'ig');
        var nlsRegex = new RegExp(
            '(<\\s*?(' + HTMLTag.newlinetags.join('|') + ')[^>]*?>)\\s+', 'ig');
        var nleRegex = new RegExp(
            '\\s+(<\\s*?/\\s*?(' + HTMLTag.newlinetags.join('|') + ')\\s*?>)', 'ig');
        var empRegex = new RegExp(
            '<\\s*?(' + HTMLTag.noemptytags.join('|') + ')[^>]*?>'
            + '<\\s*?/\\s*?\\1\\s*?>', 'ig');
        HTMLStack.minify = function (html) {
            html = html.replace(empRegex, '');
            html = html.replace(nlsRegex, '$1');
            html = html.replace(nleRegex, '$1');
            html = html.replace(/\s{2,}/g, ' ');
            while (dupRegex.test(html)) {
                html = html.replace(dupRegex, '<$1>$2</$1>');
            }
            html = html.replace(/>\s{2,}/g, '> ');
            html = html.replace(/\s{2,}<\\s*?\//g, ' </');
            return html;
        };
    })();

    var escapeMap = {
        '&': 'amp',
        '<': 'lt',
        '>': 'gt',
        '"': 'quot',
        "'": '#x27',
        '`': '#x60'
    };
    var unescapeMap = {
        'nbsp': ' ',
        'amp': '&',
        'lt': '<',
        'gt': '>',
        'quot': '"'
    };

    HTMLStack.unescape = function (str, nonbsp) {
        var src = '&([a-zA-Z]+?|#[xX][\\da-fA-F]+?|#\\d+?);';
        var testRegexp = new RegExp(src);
        var escaper = function (match, m1) {
            m1 = m1.toLowerCase();
            if (nonbsp && m1 === 'nbsp') {
                return '&nbsp;';
            }
            var m = unescapeMap[m1];
            if (m) {
                return m;
            } else if (m1[0] === '#') {
                var code = 0;
                if (m1[1] == 'x') {
                    code = parseInt(m1.substr(2), 16);
                } else {
                    code = parseInt(m1.substr(1));
                }
                if (code) {
                    return String.fromCharCode(code);
                }
            }
            return '';
        };
        if (testRegexp.test(str)) {
            var replaceRegexp = new RegExp(src, 'g');
            str = str.replace(replaceRegexp, escaper);
        }
        return str;
    };

    HTMLStack.prototype.decode = function (nonbsp) {
        for (var i = 0; i < this.stack.length; i++) {
            var s = this.stack[i];
            if (typeof s === 'string') {
                this.stack[i] = HTMLStack.unescape(s, nonbsp);
            } else if (s instanceof HTMLTag && s.content) {
                s.content.decode(nonbsp);
            }
        }
        return this;
    };

    HTMLStack.prototype.dedup = function () {
        for (var i = 0; i < this.stack.length; i++) {
            var s = this.stack[i];
            if (s instanceof HTMLTag && s.content) {
                if (HTMLTag.duptags.indexOf(s.name) >= 0 && !s.attr && s.content.stack.length === 1) {
                    var ts = s.content.stack[0];
                    if (ts.name === s.name) {
                        this.stack[i] = ts;
                        i--;
                        continue;
                    }
                }
                s.content.dedup();
            }
        }
        return this;
    };

    HTMLStack.prototype.strip = function (parent, afternewline) {

        if (!afternewline) {
            afternewline = (parent && !afternewline) ? (HTMLTag.newlinetags.indexOf(parent.name) >= 0) : true;
        }

        var blanks = /^\s*$/;
        var k = 0;
        var stag = true;
        // first recursive
        for (var i = 0; i < this.stack.length; i++) {
            var s = this.stack[i];
            if (s instanceof HTMLTag) {
                stag = true;
                if (s.content) {
                    //check if is after newline
                    var anl;
                    if (k <= 0) {
                        anl = afternewline;
                    } else {
                        anl = false;
                        // fine previous one
                        for (var j = i - 1; j >= 0; j--) {
                            var ts = this.stack[j];
                            if (ts instanceof HTMLTag) {
                                anl = (HTMLTag.newlinetags.indexOf(ts.name) >= 0);
                                //anl = true;
                                break;
                            } else if (typeof ts === 'string' && blanks.test(ts)) {
                                //continue;
                            } else {
                                break;
                            }
                        }
                    }
                    s.content.strip(s, anl);
                }
            } else if (typeof s === 'string' && blanks.test(s)) {
                if (stag) {
                    continue;
                }
            }
            k++;
        }

        stag = true;
        var new_stack = [];
        var new_len = 0;
        for (var i = 0; i < this.stack.length; i++) {
            var s = this.stack[i];
            if (typeof s === 'string' && blanks.test(s) && afternewline) {
                if (stag) {
                    continue;
                }
                afternewline = false;
            } else if (s instanceof HTMLTag) {
                stag = true;
                if (HTMLTag.noemptyattrtags.indexOf(s.name) >= 0) {
                    // strip like <img src="" />
                    if (!s.attr) {
                        continue;
                    }
                    var exists = false;
                    for (var k1 in s.attr) {
                        if (s.attr[k1]) {
                            exists = true;
                            break;
                        }
                    }
                    if (!exists) {
                        continue;
                    }
                }
                if (HTMLTag.noemptytags.indexOf(s.name) >= 0 && !s.content) {
                    // null span
                    continue;
                } else if (HTMLTag.newlinetags.indexOf(s.name) >= 0) {
                    afternewline = true;
                    /*} else if (s.name === 'span' && afternewline) {*/
                    // keep newline flag
                } else {
                    afternewline = false;
                }
            } else {
                // not full empty string
                if (afternewline) {
                    // removehead space after newline
                    s = s.replace(/^\s+/g, '');
                    if (!s) {
                        // empty string
                        continue;
                    }
                }
                s = s.replace(/\s+/g, ' ');
                stag = false;
                afternewline = false;
            }
            new_len++;
            new_stack.push(s);
        }

        // check last one is empty string
        var s = new_stack[new_len - 1];
        if (typeof s === 'string') {
            if (new_len >= 2 && blanks.test(s)) {
                // remove last empty string
                new_stack.splice(new_len - 1, 1);
                new_len--;
            } else if (/\S\s+$/.test(s)) {
                // space follow with a non-space string
                new_stack[new_len - 1] = s.replace(/\s+$/, '');
            }
        }

        if (new_len <= 0 && parent) {
            delete parent.content;
            return;
        }

        this.stack = new_stack;
        return this;
    };

    HTMLStack.prototype.showtree = function (tab, depth) {
        if (!tab) tab = '';
        if (!depth) depth = 0;

        for (var i = 0; i < this.stack.length; i++) {
            var d = this.stack[i];
            if (d instanceof HTMLTag) {
                console.log(tab, d.name, d.attr ? JSON.stringify(d.attr) : '');
                if (d.content) {
                    d.content.showtree(tab + '--', depth + 1);
                }
            } else if (typeof d === 'string') {
                console.log(tab, JSON.stringify(d));
            }
        }
    };

    function BBCode() {
        this.s = '';
        this.weaknewline = true;
        this.stack = [];
    }

    BBCode.maps = {
        'a': { section: 'url', attr: 'href' },
        'img': { section: 'img', data: 'src', empty: true },
        'em': { section: 'i' },
        'i': { section: 'i' },
        'strong': { section: 'b' },
        'b': { section: 'b' },
        'del': { section: 's' },
        's': { section: 's' },
        'ins': { section: 'u' },
        'u': { section: 'u' },
        'center': { section: 'center' },
        'ul': { section: 'ul' },  // may need to treat as 'list'
        'ol': { section: 'ol' },  // may need to treat as 'list'
        'li': { section: 'li', newline: 1 },
        'blockquote': { section: 'quote' },
        'code': { section: 'code' },
        'pre': { section: 'code' },
        'font': { extend: ['color', 'face', 'size'] },
        'span': { extend: ['color', 'face', 'size'] },
        'color': { section: 'color', attr: 'color' },
        'size': { section: 'size', attr: 'size' },
        'face': { section: 'font', attr: 'face' },
        // new line tags
        'h1': { section: 'h1', newline: 1 },
        'h2': { section: 'h2', newline: 1 },
        'h3': { section: 'h3', newline: 1 },
        'h4': { section: 'h4', newline: 1 },
        'h5': { section: 'h5', newline: 1 },
        'h6': { section: 'h6', newline: 1 },
        'p': { newline: 1 },
        'br': { newline: 2, empty: true },
        'table': { newline: 1 },
        'tr': { newline: 1 },
        'div': { newline: 0 },
        // ignore tags
        '!doctype': { ignore: true },
        'head': { ignore: true },
        'style': { ignore: true },
        'script': { ignore: true },
        'meta': { ignore: true },
        'link': { ignore: true },
    };

    BBCode.prototype.open = function (section, attr, data) {
        if (!section) {
            return;
        }
        if (section instanceof Array) {
            this.stack = this.stack.concat(section);
        } else {
            this.stack.push({
                section: section,
                attr: attr,
                data: data
            });
        }
    };

    BBCode.prototype.append = function (str) {
        this.solidify();
        this._append(str);
    };

    BBCode.prototype._append = function (str) {
        if (str) {
            this.s += str;
            this.weaknewline = false;
        }
    };

    BBCode.prototype.solidify = function () {
        // write back stack
        var i;
        for (i = 0; i < this.stack.length; i++) {
            var st = this.stack[i];
            var section = st.section;
            var attr = st.attr;
            var data = st.data;

            var s = '[' + section;
            if (typeof attr === 'string') {
                s += '=' + attr;
            } else {
                for (var k in attr) {
                    s += ' ' + k + '=' + attr[k];
                }
            }
            s += ']';
            if (data) {
                s += data;
            }

            this._append(s);
        }
        if (i > 0) {
            this.stack = [];
        }
    };

    BBCode.prototype.close = function (section) {
        if (!section) {
            return;
        }
        this.solidify();
        this._append('[/' + section + ']');
    };

    BBCode.prototype.rollback = function () {
        this.stack = [];
    };

    BBCode.prototype.newline = function (n) {
        if (n === 2) {
            // br
            this.append('\n');
            this.weaknewline = true;
        } else if (n === 1) {
            // div, p
            if (!this.weaknewline) {
                this.append('\n');
                this.weaknewline = true;
            }
        } else if (!this.weaknewline) {
            this.append('\n');
            this.weaknewline = true;
        }
    };

    BBCode.prototype.toString = function () {
        return this.s;
    };

    // opts: transsize, imagescale
    function HTML2BBCode(opts) {
        this.opts = opts ? opts : {};
    }

    HTML2BBCode.prototype.color = function (c) {
        if (!c) return;
        var c1Regex = /rgba?\s*?\(\s*?(\d{1,3})\s*?,\s*?(\d{1,3})\s*?,\s*?(\d{1,3})\s*?.*?\)/i;
        if (c1Regex.test(c)) {
            var pad2 = function (s) {
                if (s.length < 2) {
                    s = '0' + s;
                }
                return s;
            }
            c = c.replace(c1Regex, function (match, r, g, b) {
                r = pad2(parseInt(r).toString(16));
                g = pad2(parseInt(g).toString(16));
                b = pad2(parseInt(b).toString(16));
                return '#' + r + g + b;
            });
        }
        return c;
    };

    HTML2BBCode.prototype.size = function (size) {
        if (!size) return;

        var px2size = [0, 12, 14, 16, 18, 24, 32, 48];
        var name2size = [null, 'smaller', 'small', 'medium', 'large',
            'x-large', 'xx-large', '-webkit-xxx-large'];

        if (/^\d+$/.test(size)) {
            return size;
        } else if (/^\d+?px$/.test(size)) {
            size = parseInt(size);
            if (!size || size < 0) {
                return;
            }
            if (this.opts.transsize) {
                for (var i = px2size.length; i >= 0; i--) {
                    if (i === 0) {
                        // smallest
                        return '1';
                    }
                    if (size >= px2size[i]) {
                        return i.toString();
                    }
                }
            } else {
                return size.toString();
            }
        } else {
            var ns = name2size.indexOf(size);
            if (ns > 0) {
                if (this.opts.transsize) {
                    return ns.toString();
                } else {
                    return px2size[ns].toString();
                }
            }

            // TODO: support other type
            return;
        }

        return size ? size.toString() : undefined;
    };

    HTML2BBCode.prototype.px = function (px) {
        if (!px) return;
        px = parseInt(px);
        return px ? px.toString() : undefined;
    };

    HTML2BBCode.prototype.convertStyle = function (htag, sec) {
        if (!sec) {
            return;
        }
        var bbs = [];
        var that = this;
        var opts = this.opts;
        var addbb = function (sec) {
            if (!sec || sec.ignore ||
                !(sec.section || (sec.extend && sec.extend.length > 0))) {
                return;
            }
            var tsec = { section: sec.section };
            if (sec.attr) {
                if (htag.attr) {
                    switch (sec.section) {
                        case 'size':
                            tsec.attr = that.size(htag.attr[sec.attr]);
                            break;
                        case 'color':
                            tsec.attr = that.color(htag.attr[sec.attr]);
                            break;
                        default:
                            tsec.attr = htag.attr[sec.attr];
                            break;
                    }
                    if (htag.attr.style) {
                        var ra;
                        switch (sec.section) {
                            case 'size':
                                ra = htag.attr.style['font-size'];
                                if (ra) ra = that.size(ra);
                                break;
                            case 'color':
                                ra = htag.attr.style['color'];
                                if (ra) ra = that.color(ra);
                                break;
                            case 'font':
                                ra = htag.attr.style['font-family'];
                                break;
                        }
                        if (ra) {
                            tsec.attr = ra;
                        }
                    }
                    if (!tsec.attr) {
                        return;
                    }
                } else {
                    return;
                }
            } else if (sec.section === 'img' && opts.imagescale) {
                // image attr
                var w, h;
                if (htag.attr) {
                    w = that.px(htag.attr['width']);
                    h = that.px(htag.attr['height']);
                    if (htag.attr.style) {
                        var w1, h1;
                        w1 = that.px(htag.attr.style['width']);
                        h1 = that.px(htag.attr.style['height']);
                        if (w1) w = w1;
                        if (h1) h = h1;
                    }
                    if (w && h) {
                        tsec.attr = w + 'x' + h;
                    } else if (w || h) {
                        if (w) {
                            tsec.attr = { width: w };
                        } else {
                            tsec.attr = { height: h };
                        }
                    }
                }
            }
            if (sec.data) {
                tsec.data = htag.attr[sec.data];
            }
            bbs.push(tsec);
        };
        // check font-weight & text-align
        if (htag.attr && htag.attr.style) {
            if (htag.name !== 'b' && htag.name !== 'strong') {
                var att = htag.attr.style['font-weight'];
                if (att === 'bold' || (/^\d+$/.test(att) && parseInt(att) >= 700)) {
                    addbb(BBCode.maps['b']);
                }
            }
            if (htag.name !== 'center') {
                var att = htag.attr.style['text-align'];
                if (att === 'center' && !opts.noalign) {
                    addbb(BBCode.maps['center']);
                }
            }
            if (htag.name !== 'em' && htag.name !== 'i') {
                var att = htag.attr.style['font-style'];
                if (att === 'italic' || att === 'oblique') {
                    // italic style
                    addbb(BBCode.maps['i']);
                }
            }
        }
        if (sec.section === 'list'
            || sec.section === 'ul' || sec.section === 'ol'
            || sec.section === 'li') {
            if (opts.nolist) {
                return [];
            }
        } else if (sec.section === 'center') {
            if (opts.noalign) {
                return [];
            }
        } else if (/^h\d+$/.test(sec.section)) {
            // HTML Headings
            if (opts.noheadings) {
                // 18.5 -> 19
                var headings2size = [ null, '32px', '24px', '19px', '16px', '14px', '12px' ];
                var m = sec.section.match(/^h(\d+)$/);
                var hi = parseInt(m[1]);
                if (hi <= 0) {
                    return [];
                } else if (hi >= headings2size.length) {
                    hi = headings2size.length;
                }
                bbs.push({ section: 'size', attr: that.size(headings2size[hi]) });
                return bbs;
            }
        }

        if ('extend' in sec) {
            for (var i = 0; i < sec.extend.length; i++) {
                var tag = sec.extend[i];
                addbb(BBCode.maps[tag]);
            }
        } else {
            addbb(sec);
        }
        return bbs;
    };

    HTML2BBCode.prototype.convert = function (hstack) {
        var bbcode = new BBCode();
        if (!hstack) {
            return bbcode;
        }
        var that = this;
        var recursive = function (hs, anl) {
            for (var i = 0; i < hs.length; i++) {
                var s = hs[i];
                if (s instanceof HTMLTag) {
                    if (s.name in BBCode.maps) {
                        var fnewline = 0;
                        var sec = BBCode.maps[s.name];
                        if (sec.ignore) {
                            continue;
                        }
                        if ('newline' in sec) {
                            fnewline = sec.newline;
                            bbcode.newline(sec.newline);
                        }
                        if (!s.content && !sec.empty) {
                            // drop this
                            continue;
                        }
                        var bbs = that.convertStyle(s, sec);
                        bbcode.open(bbs);

                        if (s.content) {
                            recursive(s.content.stack, fnewline);
                        }
                        for (var j = bbs.length - 1; j >= 0; j--) {
                            bbcode.close(bbs[j].section);
                        }
                        if (fnewline) {
                            // weak new line
                            bbcode.newline();
                        }
                    } else if (s.content) {
                        // drop section
                        recursive(s.content.stack);
                    }
                } else if (typeof s === 'string') {
                    // force space
                    //s = s.replace(/&nbsp;/gi, ' ');
                    bbcode.append(s);
                }
            }
        };
        recursive(hstack.stack);
        return bbcode;
    };

    HTML2BBCode.prototype.parse = function (html) {
        return new HTMLStack().parse(html)
            .strip().dedup().decode();
    };

    HTML2BBCode.prototype.feed = function (html) {
        var hstack = this.parse(html);
        if (this.opts.debug) {
            hstack.showtree();
        }
        var bbcode = this.convert(hstack);
        return bbcode;
    };

    return {
        HTMLTag: HTMLTag,
        HTMLStack: HTMLStack,
        BBCode: BBCode,
        HTML2BBCode: HTML2BBCode
    };

});